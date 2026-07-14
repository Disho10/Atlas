-- ============================================================================
-- gift_card_test.sql
-- Regression tests for gift card purchase (purchase_gift_card) and
-- redemption (place_order()'s p_gift_card_code parameter). Run against a
-- disposable Postgres database with all migrations applied — see
-- supabase/tests/run.sh.
-- ============================================================================

do $$
declare
  v_product uuid := '33333333-3333-3333-3333-333333333333';
  v_result jsonb;
  v_code text;
  v_stock int;
  v_order_status text;
  v_order_subtotal numeric;
  v_remaining numeric;
  v_gc_status text;
begin
  insert into leagues (slug, name, country, primary_color, secondary_color)
    values ('serie-a', 'Serie A', 'Italy', '#fff', '#000')
    on conflict (slug) do nothing;
  insert into products (id, name, category, league_slug, team, price_usd, stock, status)
    values (v_product, 'Gift Test Jersey', 'shirts', 'serie-a', 'Juventus', 89.00, 5, 'published');

  -- Purchase a $50 gift card as a guest ------------------------------------
  v_result := purchase_gift_card(null, 'buyer@test.com', 'friend@test.com', 'A Friend', 'Enjoy!', 50, 'card');
  v_code := v_result->>'code';
  if v_code is null or v_code !~ '^ATLAS-' then
    raise exception 'FAIL: purchase_gift_card did not return a valid code (got %)', v_code;
  end if;
  raise notice 'PASS: gift card purchase returns a valid code';

  -- Redeem it against an $89 item (COD, partial coverage) ------------------
  v_result := place_order(
    null, 'Recipient', '70000001', 'friend@test.com', 'Beirut', 'Beirut', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1)),
    v_code
  );
  if (v_result->>'gift_card_applied_usd')::numeric is distinct from 50 then
    raise exception 'FAIL: expected $50 applied, got %', v_result->>'gift_card_applied_usd';
  end if;

  select subtotal_usd, status into v_order_subtotal, v_order_status
    from orders where id = (v_result->>'order_id')::uuid;
  if v_order_subtotal is distinct from 39.00 then
    raise exception 'FAIL: expected order subtotal $39 (89 - 50 gift card), got %', v_order_subtotal;
  end if;
  raise notice 'PASS: gift card partially covers an order, remainder billed normally';

  select remaining_balance_usd, status into v_remaining, v_gc_status from gift_cards where code = v_code;
  if v_remaining is distinct from 0 or v_gc_status is distinct from 'redeemed' then
    raise exception 'FAIL: expected gift card fully spent and marked redeemed, got balance=% status=%', v_remaining, v_gc_status;
  end if;
  raise notice 'PASS: gift card balance decrements and flips to redeemed when spent';

  -- Stock still decremented normally despite the gift card involvement
  select stock into v_stock from products where id = v_product;
  if v_stock is distinct from 4 then
    raise exception 'FAIL: stock decrement — expected 4, got %', v_stock;
  end if;
  raise notice 'PASS: stock still decrements correctly on a gift-card-paid order';

  -- A spent gift card cannot be reused -------------------------------------
  begin
    perform place_order(
      null, 'Cheater', '70000002', 'x@test.com', 'Beirut', 'Beirut', 'cod', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'S', 'qty', 1)),
      v_code
    );
    raise exception 'FAIL: an already-spent gift card was accepted a second time';
  exception when others then
    if sqlerrm like '%gift card%' then
      raise notice 'PASS: a spent gift card cannot be redeemed twice';
    else
      raise;
    end if;
  end;

  -- Full coverage auto-confirms regardless of payment method ---------------
  v_result := purchase_gift_card(null, 'buyer2@test.com', 'recipient2@test.com', null, null, 100, 'whish_pay');
  v_result := place_order(
    null, 'Buyer Two', '70000003', 'buyer2@test.com', 'Beirut', 'Beirut', 'whish_pay', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'L', 'qty', 1)),
    v_result->>'code'
  );
  select status into v_order_status from orders where id = (v_result->>'order_id')::uuid;
  if v_order_status is distinct from 'confirmed' then
    raise exception 'FAIL: expected auto-confirm when gift card fully covers a non-COD order, got status=%', v_order_status;
  end if;
  raise notice 'PASS: a gift card fully covering an order auto-confirms it regardless of payment method';

  -- Amount bounds are enforced ----------------------------------------------
  begin
    perform purchase_gift_card(null, 'x@test.com', 'y@test.com', null, null, 5, 'card');
    raise exception 'FAIL: a $5 gift card (below the $10 minimum) was accepted';
  exception when others then
    if sqlerrm like '%between $10 and $500%' then
      raise notice 'PASS: gift card amount bounds are enforced';
    else
      raise;
    end if;
  end;

  raise notice '--- all gift_card_test.sql checks passed ---';
end $$;
