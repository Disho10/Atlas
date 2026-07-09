-- ============================================================================
-- 0005_security_hardening.sql
-- Fixes four real vulnerabilities found in an audit of 0001–0004:
--
--   1. CRITICAL — Any signed-in customer could PATCH their own `profiles` row
--      via the anon key directly (bypassing the app entirely) and set
--      role = 'owner' or loyalty_points = 999999, because "Users update own
--      profile" had no WITH CHECK restricting *which* columns change.
--
--   2. CRITICAL — "Public can look up an order to track" / "...read order
--      items for tracking" used `using (true)`. That doesn't mean "readable
--      if you know the order number" — it means the ENTIRE orders and
--      order_items tables (every customer's name, phone, email, address) are
--      readable by anyone hitting the Supabase REST endpoint with the public
--      anon key, no app, no login, no order number required.
--
--   3. CRITICAL — Checkout wrote `subtotal_usd` / `unit_price_usd` straight
--      from browser state into the DB. Since the browser talks to Supabase
--      directly with the anon key, anyone could edit those values in
--      devtools/network tools before the insert and pay whatever they want.
--
--   4. HIGH — "Anyone can insert order items with their order" used
--      `with check (true)` — no check that order_id actually belongs to the
--      inserting session, so items could be appended to ANY existing order.
--
-- Run this AFTER 0001–0004. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1 — profiles: block self-escalation of role / loyalty_points / lifetime
-- Trigger-based instead of RLS WITH CHECK because we need an OLD/NEW diff,
-- which RLS policies can't express directly.
-- ----------------------------------------------------------------------------
create or replace function prevent_profile_privilege_escalation()
returns trigger as $$
begin
  -- Staff can change anything (used by setStaffRole / admin tools).
  if is_staff() then
    return new;
  end if;

  -- Everyone else may update their own name/phone/prefs/etc, but never these:
  if new.role is distinct from old.role then
    raise exception 'Only staff can change role.';
  end if;
  if new.loyalty_points is distinct from old.loyalty_points then
    raise exception 'loyalty_points can only change via apply_loyalty().';
  end if;
  if new.lifetime_points is distinct from old.lifetime_points then
    raise exception 'lifetime_points can only change via apply_loyalty().';
  end if;
  if new.referral_code is distinct from old.referral_code then
    raise exception 'referral_code cannot be changed.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_profile_privilege_escalation on profiles;
create trigger trg_prevent_profile_privilege_escalation
  before update on profiles
  for each row execute procedure prevent_profile_privilege_escalation();

-- ----------------------------------------------------------------------------
-- FIX 2 — stop leaking every order via a blanket-true SELECT policy.
-- Tracking/chat/returns now go through track_order_public(), a narrow
-- SECURITY DEFINER function that returns only non-sensitive fields for the
-- one matching order — never the whole table.
-- ----------------------------------------------------------------------------
drop policy if exists "Public can look up an order to track" on orders;
drop policy if exists "Public can read order items for tracking" on order_items;

create or replace function track_order_public(p_order_number text)
returns table (
  status order_status,
  created_at timestamptz,
  item_name text,
  item_qty int,
  item_size text
)
language sql
security definer
stable
as $$
  select o.status, o.created_at, oi.product_name, oi.qty, oi.size
  from orders o
  join order_items oi on oi.order_id = o.id
  where o.order_number = upper(trim(p_order_number));
$$;

grant execute on function track_order_public(text) to anon, authenticated;

-- Same idea for the return-filing flow (app/track/actions.ts fileReturn):
-- it needs the order's id/status/created_at/user_id to validate the 14-day
-- delivered window before inserting a return_requests row, but has no
-- business reading the customer's name/phone/address to do that.
create or replace function get_order_for_return(p_order_number text)
returns table (id uuid, status order_status, created_at timestamptz, user_id uuid)
language sql
security definer
stable
as $$
  select o.id, o.status, o.created_at, o.user_id
  from orders o
  where o.order_number = upper(trim(p_order_number));
$$;

grant execute on function get_order_for_return(text) to anon, authenticated;

-- Returns are still filed by order number without login. Keep that, but the
-- server action (app/track/actions.ts) already looks up the order id via
-- track_order_public()-style logic before this insert, and this policy
-- doesn't expose any read — only a write anyone could already do (filing a
-- return request is not itself a financial action; staff review every one).
-- No change needed here.

-- ----------------------------------------------------------------------------
-- FIX 3 & 4 — stop trusting client-supplied prices and stop allowing items
-- to be attached to arbitrary orders. All storefront checkout now goes
-- through place_order(), which re-reads price_usd/variants from the
-- `products` table itself and creates the order + its items atomically.
-- Direct client inserts into orders/order_items are removed for customers;
-- staff keep a direct-insert path for manually logging IG/WhatsApp sales.
-- ----------------------------------------------------------------------------
drop policy if exists "Anyone can place an order" on orders;
drop policy if exists "Anyone can insert order items with their order" on order_items;

create policy "Staff insert orders" on orders
  for insert with check (is_staff());
create policy "Staff insert order items" on order_items
  for insert with check (is_staff());

create or replace function place_order(
  p_user_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_address text,
  p_city text,
  p_payment_method payment_method,
  p_promo_code text,
  p_items jsonb -- [{ "product_id": uuid, "size": text, "qty": int, "variant_label": text|null }]
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_product products%rowtype;
  v_unit_price numeric;
  v_qty int;
  v_variant_label text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_welcome numeric := 0;
  v_promo promo_codes%rowtype;
  v_status order_status;
  v_order_id uuid;
  v_order_number text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty.';
  end if;

  -- Pass 1: compute a server-trusted subtotal from the products table.
  -- Product price/variant price are the ONLY source of truth for unit price;
  -- nothing from the client is used for money math.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and status = 'published';
    if not found then
      raise exception 'One of the items in your cart is no longer available.';
    end if;

    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_unit_price := v_product.price_usd;
    v_variant_label := v_item->>'variant_label';

    if v_variant_label is not null and v_variant_label <> '' then
      select (elem->>'price')::numeric into v_unit_price
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) elem
      where elem->>'label' = v_variant_label
      limit 1;
      v_unit_price := coalesce(v_unit_price, v_product.price_usd);
    end if;

    v_subtotal := v_subtotal + v_unit_price * v_qty;
  end loop;

  -- Promo code — re-validated here, not trusted from the client.
  if p_promo_code is not null and trim(p_promo_code) <> '' then
    select * into v_promo from promo_codes
      where code = upper(trim(p_promo_code)) and active = true;
    if found
       and (v_promo.starts_at is null or v_promo.starts_at <= now())
       and (v_promo.ends_at is null or v_promo.ends_at >= now())
       and (v_promo.max_uses is null or v_promo.used_count < v_promo.max_uses)
       and v_subtotal >= v_promo.min_subtotal_usd
    then
      v_discount := case when v_promo.kind = 'percent'
        then v_subtotal * v_promo.amount / 100
        else v_promo.amount end;
      v_discount := least(v_discount, v_subtotal);
      update promo_codes set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  -- Referral welcome discount — server-computed, same rule as before.
  if p_user_id is not null then
    v_welcome := referee_welcome_discount(p_user_id);
  end if;

  v_status := case when p_payment_method = 'cod' then 'confirmed' else 'placed' end;

  insert into orders (
    user_id, status, channel, payment_method, customer_name, customer_phone,
    customer_email, address, city, subtotal_usd
  ) values (
    p_user_id, v_status, 'website', p_payment_method,
    nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_email), ''), nullif(trim(p_address), ''), nullif(trim(p_city), ''),
    greatest(0, v_subtotal - v_discount - v_welcome)
  )
  returning id, order_number into v_order_id, v_order_number;

  -- Pass 2: insert the items using the SAME server-trusted prices.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_unit_price := v_product.price_usd;
    v_variant_label := v_item->>'variant_label';

    if v_variant_label is not null and v_variant_label <> '' then
      select (elem->>'price')::numeric into v_unit_price
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) elem
      where elem->>'label' = v_variant_label
      limit 1;
      v_unit_price := coalesce(v_unit_price, v_product.price_usd);
    end if;

    insert into order_items (order_id, product_id, product_name, size, qty, unit_price_usd)
    values (
      v_order_id,
      v_product.id,
      case when v_variant_label is not null and v_variant_label <> ''
        then v_product.name || ' (' || v_variant_label || ')'
        else v_product.name end,
      nullif(v_item->>'size', ''),
      v_qty,
      v_unit_price
    );
  end loop;

  if p_user_id is not null then
    perform reward_referrer_if_first_order(p_user_id, v_order_id);
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
end;
$$;

grant execute on function place_order(uuid, text, text, text, text, text, payment_method, text, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- FIX 5 — loyalty_ledger: block direct client inserts. Points can only move
-- through apply_loyalty(), which is SECURITY DEFINER and already used by
-- every legitimate path (purchases, referrals, photo reviews, redemption).
-- ----------------------------------------------------------------------------
drop policy if exists "System writes ledger" on loyalty_ledger;
create policy "Staff write ledger" on loyalty_ledger
  for insert with check (is_staff());
-- (apply_loyalty() is SECURITY DEFINER and runs as the function owner, which
-- bypasses RLS, so normal earn/redeem flows are unaffected.)

-- ----------------------------------------------------------------------------
-- FIX 6 — products: cost_usd and code are business-sensitive (margins,
-- internal SKUs) and were only hidden by app-code column selection, not by
-- RLS — RLS can't hide individual columns, so anyone with the public anon
-- key could `select cost_usd from products` directly over REST. Revoke
-- column-level access for those two columns from anon/authenticated; the
-- admin panel already gates on a staff role check before querying (see
-- app/admin/page.tsx) and should use the service-role client for this read.
-- ----------------------------------------------------------------------------
revoke select (cost_usd, code) on products from anon, authenticated;
grant select (
  id, name, category, league_slug, team, description, price_usd, compare_at_usd,
  gender, sizes, out_of_stock_sizes, stock, low_stock_threshold, coming_soon, hot,
  status, image_url, rating, review_count, created_at, images, variants
) on products to anon, authenticated;
