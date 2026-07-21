-- ============================================================================
-- 0013_mandatory_phone_and_signup_welcome.sql
--
-- Two feature additions, both enforced/computed server-side inside
-- place_order() — never trusting the client, same discipline as every other
-- discount and validation already in this function:
--
--   1. Phone number is now REQUIRED to place any order (guest or signed-in).
--      The checkout form already asks for it, but until now it wasn't
--      actually enforced — someone calling place_order() directly (via the
--      anon key, bypassing the app entirely) could submit an empty phone.
--
--   2. NEW — every signed-in customer gets 10% off their first order,
--      automatically, no code needed. This is separate from the existing
--      $10 flat referee_welcome_discount() (which only applies to customers
--      who signed up with a referral code). They use the same "first order"
--      rule (no prior orders except cancelled), so a referred customer's
--      very first order gets BOTH the $10 referral welcome AND this 10%
--      signup discount stacked, same as promo/gift-card/loyalty already
--      stack in this function. If you want these mutually exclusive instead
--      (pick whichever is bigger, not both), that's a one-line change here —
--      flag it and we'll adjust.
--
-- Run AFTER 0001–0012.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Signup welcome: 10% off subtotal, first order only, any signed-in customer.
-- Mirrors referee_welcome_discount()'s own "first order" rule exactly, so a
-- pending 'placed'-but-unpaid order still counts as having ordered before.
-- ----------------------------------------------------------------------------
create or replace function signup_welcome_discount(p_user uuid, p_subtotal numeric)
returns numeric
language plpgsql
security definer
as $$
declare
  v_orders int;
begin
  if p_user is null or p_subtotal is null or p_subtotal <= 0 then
    return 0;
  end if;

  select count(*) into v_orders from orders
   where user_id = p_user and status <> 'cancelled';
  if v_orders > 0 then return 0; end if;

  return round(p_subtotal * 0.10, 2);
end;
$$;

grant execute on function signup_welcome_discount(uuid, numeric) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- place_order() — same body as 0011, plus the phone check and signup welcome.
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
  p_items jsonb,
  p_gift_card_code text default null,
  p_loyalty_points_redeemed int default 0
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
  v_signup_welcome numeric := 0;
  v_promo promo_codes%rowtype;
  v_status order_status;
  v_order_id uuid;
  v_order_number text;
  v_rl_key text;
  v_updated int;
  v_gift_card gift_cards%rowtype;
  v_gift_card_applied numeric := 0;
  v_total_after_discounts numeric;
  v_loyalty_points int := 0;
  v_loyalty_discount numeric := 0;
  v_available_points int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty.';
  end if;

  -- FEATURE 1 — phone is now mandatory for every order, guest or signed-in.
  if p_customer_phone is null or trim(p_customer_phone) = '' then
    raise exception 'A phone number is required to place an order.';
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
  -- stock atomically.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and status = 'published'
      for update;
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

  -- Promo code
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
    -- FEATURE 2 — 10% off for any signed-in customer's first order.
    v_signup_welcome := signup_welcome_discount(p_user_id, v_subtotal);
  end if;

  -- Loyalty redemption — re-validated here against the real, current balance
  -- (never trusted from the client), same discipline as promo/gift card.
  -- Points are only deducted below, after the order actually exists, so a
  -- failed/abandoned checkout never costs the customer anything.
  if p_loyalty_points_redeemed is not null and p_loyalty_points_redeemed > 0 then
    if p_user_id is null then
      raise exception 'Sign in to redeem loyalty points.';
    end if;
    if p_loyalty_points_redeemed < 100 or p_loyalty_points_redeemed % 100 <> 0 then
      raise exception 'Redeem loyalty points in multiples of 100.';
    end if;
    select loyalty_points into v_available_points from profiles where id = p_user_id;
    if v_available_points is null or v_available_points < p_loyalty_points_redeemed then
      raise exception 'Not enough loyalty points for that redemption.';
    end if;
    v_loyalty_points := p_loyalty_points_redeemed;
    v_loyalty_discount := v_loyalty_points / 20.0; -- 20 pts = $1, see lib/loyalty.ts
  end if;

  v_total_after_discounts := greatest(0, v_subtotal - v_discount - v_welcome - v_signup_welcome - v_loyalty_discount);
  -- Points are worth more than the remaining total covers (e.g. a small
  -- cart with a big redemption) — don't let the discount exceed what's
  -- actually owed, and don't deduct more points than were actually used.
  if v_loyalty_discount > v_subtotal - v_discount - v_welcome - v_signup_welcome then
    v_loyalty_discount := greatest(0, v_subtotal - v_discount - v_welcome - v_signup_welcome);
    v_loyalty_points := floor(v_loyalty_discount * 20);
    -- Keep redemption in the same 100-point increments it's sold in.
    v_loyalty_points := (v_loyalty_points / 100) * 100;
    v_loyalty_discount := v_loyalty_points / 20.0;
  end if;

  -- Gift card — applied last, against whatever's left after promo/welcome/
  -- loyalty discounts. Locks the row (for update) so two concurrent orders
  -- can't both spend the same balance.
  if p_gift_card_code is not null and trim(p_gift_card_code) <> '' then
    select * into v_gift_card from gift_cards
      where code = upper(trim(p_gift_card_code)) and status = 'active'
      for update;
    if not found then
      raise exception 'That gift card code isn''t valid or has already been used up.';
    end if;
    if v_gift_card.expires_at is not null and v_gift_card.expires_at < now() then
      raise exception 'That gift card has expired.';
    end if;
    v_gift_card_applied := least(v_gift_card.remaining_balance_usd, v_total_after_discounts);
  end if;

  v_status := case when p_payment_method = 'cod' then 'confirmed' else 'placed' end;
  -- Fully covered by a gift card with nothing left to pay? Confirm
  -- immediately regardless of the chosen method — there's no outstanding
  -- payment left to collect.
  if v_gift_card_applied > 0 and v_total_after_discounts - v_gift_card_applied <= 0 then
    v_status := 'confirmed';
  end if;

  insert into orders (
    user_id, status, channel, payment_method, customer_name, customer_phone,
    customer_email, address, city, subtotal_usd
  ) values (
    p_user_id, v_status, 'website', p_payment_method,
    nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_email), ''), nullif(trim(p_address), ''), nullif(trim(p_city), ''),
    greatest(0, v_total_after_discounts - v_gift_card_applied)
  )
  returning id, order_number into v_order_id, v_order_number;

  -- Deduct redeemed points now that the order exists — tied to this order's
  -- id in the ledger, exactly like every other loyalty movement.
  if v_loyalty_points > 0 then
    perform apply_loyalty(p_user_id, -v_loyalty_points, 'redemption', v_order_id);
  end if;

  if v_gift_card_applied > 0 then
    update gift_cards set
      remaining_balance_usd = remaining_balance_usd - v_gift_card_applied,
      status = case when remaining_balance_usd - v_gift_card_applied <= 0 then 'redeemed' else status end
    where id = v_gift_card.id;
    insert into gift_card_redemptions (gift_card_id, order_id, amount_usd) values (v_gift_card.id, v_order_id, v_gift_card_applied);
  end if;

  -- Pass 2: insert items using the same server-trusted prices.
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

  -- NOTE: the referral reward is intentionally NOT triggered here — see
  -- 0011's note. on_order_confirmed_loyalty already handles it correctly.

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'gift_card_applied_usd', v_gift_card_applied,
    'loyalty_points_redeemed', v_loyalty_points,
    'loyalty_discount_usd', v_loyalty_discount,
    'signup_welcome_discount_usd', v_signup_welcome
  );
end;
$$;

grant execute on function place_order(uuid, text, text, text, text, text, payment_method, text, jsonb, text, int) to anon, authenticated;
