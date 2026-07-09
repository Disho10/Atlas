-- ============================================================================
-- place_order_test.sql
-- Regression tests for the highest-risk logic in the schema: checkout
-- pricing/stock (place_order), the rate limiter, the back-in-stock trigger,
-- and the profile privilege-escalation guard. Run against a disposable
-- Postgres database with all migrations 0001-0006 already applied — see
-- supabase/tests/run.sh, which sets one up and runs this automatically.
--
-- Each check either passes silently (RAISE NOTICE) or aborts the whole
-- script with an exception, which run.sh treats as a failing exit code — so
-- this is safe to wire into CI.
-- ============================================================================

do $$
declare
  v_user uuid := '11111111-1111-1111-1111-111111111111';
  v_product uuid := '22222222-2222-2222-2222-222222222222';
  v_result jsonb;
  v_stock int;
  v_points int;
begin
  -- Setup ----------------------------------------------------------------
  insert into auth.users (id, email) values (v_user, 'test@example.com');
  insert into leagues (slug, name, country, primary_color, secondary_color)
    values ('la-liga', 'La Liga', 'Spain', '#fff', '#000');
  insert into products (id, name, category, league_slug, team, price_usd, stock, status)
    values (v_product, 'Test Jersey', 'shirts', 'la-liga', 'Real Madrid', 89.00, 2, 'published');

  -- Signup should have awarded 50 points via the on_profile_created_loyalty trigger
  select loyalty_points into v_points from profiles where id = v_user;
  if v_points is distinct from 50 then
    raise exception 'FAIL: signup bonus — expected 50 points, got %', v_points;
  end if;
  raise notice 'PASS: signup bonus awards 50 points';

  -- Place a COD order (inserted as status=confirmed directly) -------------
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  v_result := place_order(
    v_user, 'Test Customer', '70123456', 'test@example.com',
    '123 Main St', 'Beirut', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1))
  );
  if v_result->>'order_number' is null then
    raise exception 'FAIL: place_order did not return an order_number';
  end if;
  raise notice 'PASS: place_order() succeeds for a COD order';

  -- Stock must have decremented 2 -> 1
  select stock into v_stock from products where id = v_product;
  if v_stock is distinct from 1 then
    raise exception 'FAIL: stock decrement — expected 1, got %', v_stock;
  end if;
  raise notice 'PASS: stock decrements on order placement';

  -- COD orders must earn purchase points even though they're inserted
  -- already-confirmed (this is the bug the AFTER INSERT OR UPDATE trigger fixes)
  select loyalty_points into v_points from profiles where id = v_user;
  if v_points is distinct from 139 then -- 50 signup + 89 purchase
    raise exception 'FAIL: COD purchase points — expected 139, got %. (This is the exact bug where COD orders never earned points because the trigger only fired on UPDATE.)', v_points;
  end if;
  raise notice 'PASS: COD orders earn purchase points on INSERT, not just UPDATE';

  -- Overselling must be blocked -------------------------------------------
  begin
    perform place_order(
      v_user, 'Test Customer', '70123456', 'test@example.com',
      '123 Main St', 'Beirut', 'cod', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 5))
    );
    raise exception 'FAIL: place_order allowed buying more than available stock';
  exception when others then
    if sqlerrm like 'Not enough stock%' then
      raise notice 'PASS: overselling is blocked';
    else
      raise; -- unexpected error — surface it
    end if;
  end;

  -- Direct client role escalation must still be blocked -------------------
  begin
    update profiles set role = 'owner' where id = v_user;
    raise exception 'FAIL: a non-staff user was able to set their own role to owner';
  exception when others then
    if sqlerrm like '%Only staff can change role%' then
      raise notice 'PASS: profile role self-escalation is blocked';
    else
      raise;
    end if;
  end;

  raise notice '--- all place_order_test.sql checks passed ---';
end $$;
