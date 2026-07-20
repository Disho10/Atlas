-- ============================================================================
-- 0011_loyalty_redemption_and_referral_fix.sql
-- Two independent bugs found in a manual audit:
--
--   1. CRITICAL — redeemPoints() (app/account/actions.ts) deducted points
--      from the customer's balance immediately via apply_loyalty(), then told
--      them "use it at checkout" — but place_order() had no parameter for a
--      loyalty redemption and checkout had no code referencing it at all.
--      The discount was never actually applicable anywhere. Customers who
--      redeemed lost real points for nothing.
--
--      Fix: redemption now happens *inside* place_order(), atomically with
--      the order itself — same pattern already used for promo codes and gift
--      cards ("preview client-side, re-validate and apply server-side, only
--      commit if the order actually goes through"). Points are only ever
--      deducted once an order is successfully created, tied to that order's
--      id in the ledger, exactly like apply_loyalty() is used everywhere else.
--
--   2. place_order() unconditionally called reward_referrer_if_first_order()
--      for every order at the moment it's placed — including a 'placed'
--      (unpaid, unconfirmed) order via Whish Pay / Card. That immediately
--      pays the referrer and permanently consumes the buyer's one-time
--      "first order" referral slot, even if the order is later cancelled
--      and never paid. This duplicates — and races ahead of — the
--      on_order_confirmed_loyalty trigger (0006), which already fires
--      correctly on both INSERT and UPDATE but only when status actually
--      reaches 'confirmed'. The direct call in place_order() bypassed that
--      gate entirely.
--
--      Fix: remove the direct call. The trigger alone is sufficient — it
--      already covers COD (confirmed at INSERT) and non-COD (confirmed via
--      later UPDATE), and only rewards once status is truly 'confirmed'.
--
-- Run AFTER 0001–0010.
-- ============================================================================

drop function if exists place_order(uuid, text, text, text, text, text, payment_method, text, jsonb, text);

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

  v_total_after_discounts := greatest(0, v_subtotal - v_discount - v_welcome - v_loyalty_discount);
  -- Points are worth more than the remaining total covers (e.g. a small
  -- cart with a big redemption) — don't let the discount exceed what's
  -- actually owed, and don't deduct more points than were actually used.
  if v_loyalty_discount > v_subtotal - v_discount - v_welcome then
    v_loyalty_discount := greatest(0, v_subtotal - v_discount - v_welcome);
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

  -- NOTE: the referral reward is intentionally NOT triggered here anymore.
  -- on_order_confirmed_loyalty (0006) already fires on both INSERT and
  -- UPDATE and only rewards once status is genuinely 'confirmed' — calling
  -- reward_referrer_if_first_order() unconditionally here (as the previous
  -- version did) rewarded referrers, and burned the buyer's one-time slot,
  -- for orders that were merely 'placed' and might never be paid.

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'gift_card_applied_usd', v_gift_card_applied,
    'loyalty_points_redeemed', v_loyalty_points,
    'loyalty_discount_usd', v_loyalty_discount
  );
end;
$$;

grant execute on function place_order(uuid, text, text, text, text, text, payment_method, text, jsonb, text, int) to anon, authenticated;
