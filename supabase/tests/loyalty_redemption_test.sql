-- ============================================================================
-- loyalty_redemption_test.sql
-- Regression tests for 0011_loyalty_redemption_and_referral_fix.sql:
--   1. Redeeming loyalty points at checkout actually applies the discount
--      and deducts points atomically with the order (previously: points
--      were deducted with nowhere for the discount to ever land).
--   2. An unconfirmed ('placed') order does NOT reward the referrer or burn
--      the buyer's one-time referral slot; the reward only fires once the
--      order is actually confirmed.
-- Run after place_order_test.sql / gift_card_test.sql (same throwaway DB).
-- ============================================================================

do $$
declare
  v_buyer uuid := '66666666-6666-6666-6666-666666666666';
  v_referrer uuid := '77777777-7777-7777-7777-777777777777';
  v_product uuid := '88888888-8888-8888-8888-888888888888';
  v_referrer_code text;
  v_result jsonb;
  v_points int;
  v_subtotal numeric;
  v_order_id uuid;
begin
  -- Setup ------------------------------------------------------------------
  insert into auth.users (id, email) values (v_referrer, 'referrer@example.com');
  select referral_code into v_referrer_code from profiles where id = v_referrer;

  insert into auth.users (id, email) values (v_buyer, 'buyer@example.com');
  update profiles set referred_by = v_referrer_code where id = v_buyer;

  insert into products (id, name, category, league_slug, team, price_usd, stock, status)
    values (v_product, 'Test Shorts', 'shirts', 'la-liga', 'Real Madrid', 40.00, 10, 'published');

  -- Give the buyer 100 points to redeem (on top of their 50 signup bonus)
  perform apply_loyalty(v_buyer, 100, 'purchase', null);
  select loyalty_points into v_points from profiles where id = v_buyer;
  if v_points is distinct from 150 then
    raise exception 'FAIL: test setup — expected 150 points before redemption, got %', v_points;
  end if;

  -- 1. Redemption is actually applied and actually deducted ---------------
  perform set_config('request.jwt.claim.sub', v_buyer::text, true);
  v_result := place_order(
    v_buyer, 'Test Buyer', '70999999', 'buyer@example.com',
    '456 Side St', 'Beirut', 'whish_pay', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1)),
    null, 100
  );
  v_order_id := (v_result->>'order_id')::uuid;

  if (v_result->>'loyalty_discount_usd')::numeric is distinct from 5.0 then
    raise exception 'FAIL: loyalty discount — expected $5.00 off for 100 points, got %', v_result->>'loyalty_discount_usd';
  end if;
  raise notice 'PASS: place_order() returns the correct loyalty discount for redeemed points';

  -- This buyer is also a first-time referred customer, so the $10 referral
  -- welcome AND 0013's 10% signup welcome ($4 on a $40 cart) both stack
  -- with the $5 loyalty discount: $40 - $10 - $4 - $5 = $21.
  select subtotal_usd into v_subtotal from orders where id = v_order_id;
  if v_subtotal is distinct from 21.00 then
    raise exception 'FAIL: order subtotal — expected $21.00 ($40 - $10 welcome - $4 signup welcome - $5 loyalty), got %', v_subtotal;
  end if;
  raise notice 'PASS: loyalty discount is actually reflected in the order total (stacked correctly with the welcome discounts)';

  select loyalty_points into v_points from profiles where id = v_buyer;
  if v_points is distinct from 50 then -- 150 - 100 redeemed
    raise exception 'FAIL: point deduction — expected 50 points remaining, got %', v_points;
  end if;
  raise notice 'PASS: redeemed points are deducted exactly once, tied to the order';

  -- Redeeming more points than the balance allows must fail, and must not
  -- touch stock or the balance (whole function rolls back on exception).
  begin
    perform place_order(
      v_buyer, 'Test Buyer', '70999999', 'buyer@example.com',
      '456 Side St', 'Beirut', 'whish_pay', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1)),
      null, 500
    );
    raise exception 'FAIL: over-redemption was not rejected';
  exception when others then
    if sqlerrm not like '%Not enough loyalty points%' then
      raise exception 'FAIL: unexpected error on over-redemption: %', sqlerrm;
    end if;
    raise notice 'PASS: redeeming more points than the balance allows is rejected';
  end;

  select loyalty_points into v_points from profiles where id = v_buyer;
  if v_points is distinct from 50 then
    raise exception 'FAIL: a rejected over-redemption must not touch the balance — got %', v_points;
  end if;
  raise notice 'PASS: a rejected redemption leaves the balance untouched';

  -- 2. Referral reward must NOT fire on a merely-'placed' order -----------
  -- The order above (whish_pay) was inserted as status='placed', not
  -- 'confirmed'. It should NOT have rewarded the referrer yet.
  select loyalty_points into v_points from profiles where id = v_referrer;
  if v_points is distinct from 50 then -- only their own signup bonus
    raise exception 'FAIL: referrer must not be rewarded before the order is confirmed — got %', v_points;
  end if;
  raise notice 'PASS: referral reward does not fire on an unconfirmed (placed) order';

  -- Now confirm the order (e.g. staff verifies the Whish transfer) — THIS
  -- is what should trigger the referral reward, via on_order_confirmed_loyalty.
  update orders set status = 'confirmed' where id = v_order_id;

  select loyalty_points into v_points from profiles where id = v_referrer;
  if v_points is distinct from 200 then -- 50 signup + 150 referral
    raise exception 'FAIL: referrer should be rewarded 150 pts once the order is confirmed — got %', v_points;
  end if;
  raise notice 'PASS: referral reward fires exactly once, only once the order is confirmed';

  raise notice '--- all loyalty_redemption_test.sql checks passed ---';
end $$;
