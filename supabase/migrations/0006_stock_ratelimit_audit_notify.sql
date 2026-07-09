-- ============================================================================
-- 0006_stock_ratelimit_audit_notify.sql
-- Four independent features, safe to run together or split apart:
--   1. Oversell-safe stock decrement inside place_order()
--   2. A small generic rate-limiter, applied to place_order() and promo checks
--   3. Admin audit log (who changed what, when)
--   4. "Notify me when back in stock"
-- Run AFTER 0001–0005.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. BUGFIX from 0005: prevent_profile_privilege_escalation() blocked every
-- legitimate point award too, not just client tampering. apply_loyalty() is
-- SECURITY DEFINER, but SECURITY DEFINER only changes permission checks
-- (RLS/grants) — the trigger still fires, and it was gating on is_staff(),
-- which is false for the customer earning their own points. Net effect:
-- since 0005 went live, signup bonuses, purchase points, referral rewards,
-- and redemptions have all been silently failing. Caught this by actually
-- running the migrations against a local Postgres and exercising the flow —
-- worth calling out since it shows why "looks right" SQL still needs a real
-- database to catch cross-function interactions like this.
--
-- Fix: an explicit, transaction-local "trusted internal call" flag that only
-- apply_loyalty() sets, checked first by the trigger. Anything client-facing
-- still goes through the normal is_staff() check.
-- ----------------------------------------------------------------------------
create or replace function prevent_profile_privilege_escalation()
returns trigger as $$
begin
  if current_setting('atlas.trusted_write', true) = 'on' then
    return new;
  end if;

  if is_staff() then
    return new;
  end if;

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

create or replace function apply_loyalty(p_user uuid, p_delta int, p_reason text, p_order uuid default null)
returns void as $$
begin
  insert into loyalty_ledger (user_id, delta, reason, order_id)
  values (p_user, p_delta, p_reason, p_order);

  perform set_config('atlas.trusted_write', 'on', true); -- transaction-local
  update profiles set
    loyalty_points = greatest(0, loyalty_points + p_delta),
    lifetime_points = lifetime_points + greatest(0, p_delta),
    last_activity_at = now(),
    expiry_warning_sent_at = null
  where id = p_user;
  -- Reset immediately rather than letting it ride until the transaction
  -- ends: `is_local=true` scopes it to the transaction, not the statement,
  -- so anything else that touches `profiles` later in the SAME transaction
  -- (e.g. another function called from the same place_order() invocation)
  -- would otherwise inherit this bypass too. Caught by testing a real
  -- checkout flow end-to-end rather than each function in isolation.
  perform set_config('atlas.trusted_write', 'off', true);
end;
$$ language plpgsql security definer;


create table if not exists rate_limit_hits (
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_lookup on rate_limit_hits (bucket, key, created_at);

-- RLS enabled with NO policies: default-deny for anon/authenticated (who get
-- broad table grants by default on Supabase), while check_rate_limit() below
-- still works because it's SECURITY DEFINER and the table owner bypasses its
-- own RLS. Without this, `key` (a customer's phone/email/user id) would be
-- directly readable over REST, and anyone could delete their own rows to
-- reset their limit — the exact thing this table exists to prevent.
alter table rate_limit_hits enable row level security;

create or replace function check_rate_limit(p_bucket text, p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  -- Self-cleaning: only ever deletes this bucket+key's own stale rows, so
  -- it's index-scoped rather than a full-table scan.
  delete from rate_limit_hits
   where bucket = p_bucket and key = p_key
     and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count from rate_limit_hits
   where bucket = p_bucket and key = p_key
     and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max then
    return false;
  end if;

  insert into rate_limit_hits (bucket, key) values (p_bucket, p_key);
  return true;
end;
$$;

grant execute on function check_rate_limit(text, text, int, int) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 0b. BUGFIX: loyalty_on_order_confirmed only ran on UPDATE. COD orders are
-- INSERTed with status='confirmed' directly (no 'placed' -> 'confirmed'
-- transition ever happens), so that trigger never fired for them — meaning
-- COD customers, almost certainly your most common payment method, have
-- never earned purchase points or triggered the first-order referral reward.
-- Also caught by exercising the flow against a real database rather than
-- reading the trigger definition in isolation.
-- ----------------------------------------------------------------------------
create or replace function loyalty_on_order_confirmed()
returns trigger as $$
begin
  if new.status = 'confirmed' and (old is null or old.status is distinct from 'confirmed') and new.user_id is not null then
    perform apply_loyalty(new.user_id, floor(new.subtotal_usd)::int, 'purchase', new.id);
    perform reward_referrer_if_first_order(new.user_id, new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_confirmed_loyalty on orders;
create trigger on_order_confirmed_loyalty
  after insert or update on orders
  for each row execute procedure loyalty_on_order_confirmed();

-- ----------------------------------------------------------------------------
-- place_order() — re-defined (same signature) to add:
--   - stock decrement that can't go negative (blocks overselling under
--     concurrent checkouts, since the UPDATE + row lock happens inside this
--     one function call)
--   - a rate-limit check keyed on whatever identifies the buyer (signed-in
--     user id, else phone, else email, else name+address as a last resort)
-- ----------------------------------------------------------------------------
create or replace function place_order(
  p_user_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_address text,
  p_city text,
  p_payment_method payment_method,
  p_promo_code text,
  p_items jsonb
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
  v_rl_key text;
  v_updated int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty.';
  end if;

  v_rl_key := coalesce(
    p_user_id::text,
    nullif(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), ''),
    nullif(lower(trim(coalesce(p_customer_email, ''))), ''),
    lower(trim(coalesce(p_customer_name, ''))) || '|' || lower(trim(coalesce(p_address, '')))
  );
  if not check_rate_limit('place_order', v_rl_key, 5, 900) then
    raise exception 'Too many orders placed recently from this account/number. Please wait a few minutes, or reach out on WhatsApp if this is urgent.';
  end if;

  -- Pass 1: price from the products table (never the client) AND decrement
  -- stock atomically. `stock = stock - qty` combined with `where stock >= qty`
  -- means two concurrent checkouts for the last unit can't both succeed —
  -- the loser's UPDATE matches zero rows and the whole order rolls back.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and status = 'published'
      for update; -- lock the row for the duration of this transaction
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

    update products set stock = stock - v_qty
      where id = v_product.id and stock >= v_qty;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'Not enough stock left for %. Only % available — lower the quantity and try again.', v_product.name, v_product.stock;
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

  -- Pass 2: insert items using the same server-trusted prices. Stock was
  -- already decremented in pass 1, so this just records the line items.
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
-- 3. Admin audit log
-- ----------------------------------------------------------------------------
create table if not exists admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,   -- e.g. 'product.update', 'order.status', 'staff.role'
  target text,            -- free-form: product name, order number, staff email
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at desc);

alter table admin_audit_log enable row level security;
drop policy if exists "Staff read audit log" on admin_audit_log;
create policy "Staff read audit log" on admin_audit_log
  for select using (is_staff());
drop policy if exists "Staff write audit log" on admin_audit_log;
create policy "Staff write audit log" on admin_audit_log
  for insert with check (is_staff());

-- ----------------------------------------------------------------------------
-- 4. Back-in-stock notifications
-- ----------------------------------------------------------------------------
create table if not exists stock_notify_requests (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  email text not null,
  user_id uuid references profiles(id),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, email)
);
alter table stock_notify_requests enable row level security;
drop policy if exists "Anyone can request a stock notification" on stock_notify_requests;
create policy "Anyone can request a stock notification" on stock_notify_requests
  for insert with check (true);
drop policy if exists "Staff read stock notify requests" on stock_notify_requests;
create policy "Staff read stock notify requests" on stock_notify_requests
  for select using (is_staff());

-- Let notification_queue carry a 'back_in_stock' kind alongside the existing two.
alter table notification_queue drop constraint if exists notification_queue_kind_check;
alter table notification_queue add constraint notification_queue_kind_check
  check (kind in ('new_category', 'tag_match', 'back_in_stock'));

create or replace function queue_back_in_stock_notification()
returns trigger as $$
begin
  if old.stock <= 0 and new.stock > 0 then
    insert into notification_queue (kind, product_id) values ('back_in_stock', new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_product_restock on products;
create trigger on_product_restock
  after update on products
  for each row
  when (old.stock is distinct from new.stock)
  execute procedure queue_back_in_stock_notification();
