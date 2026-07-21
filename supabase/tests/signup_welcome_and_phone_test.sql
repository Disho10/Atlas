-- ============================================================================
-- signup_welcome_and_phone_test.sql
-- Regression tests for 0013: mandatory phone number, and the 10% first-order
-- signup welcome discount. Run via supabase/tests/run.sh after all migrations.
-- ============================================================================

do $$
declare
  v_user uuid := '33333333-3333-3333-3333-333333333333';
  v_product uuid := '44444444-4444-4444-4444-444444444444';
  v_result jsonb;
  v_order_id uuid;
  v_subtotal numeric;
begin
  -- Setup ----------------------------------------------------------------
  insert into auth.users (id, email) values (v_user, 'signup-welcome-test@example.com');
  insert into leagues (slug, name, country, primary_color, secondary_color)
    values ('premier-league', 'Premier League', 'England', '#fff', '#000');
  insert into products (id, name, category, league_slug, team, price_usd, stock, status)
    values (v_product, 'Test Kit', 'shirts', 'premier-league', 'Arsenal', 100.00, 5, 'published');

  perform set_config('request.jwt.claim.sub', v_user::text, true);

  -- Empty phone must be rejected, even signed in ---------------------------
  begin
    perform place_order(
      v_user, 'Test Customer', '', 'test@example.com',
      '123 Main St', 'Beirut', 'cod', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1))
    );
    raise exception 'FAIL: place_order allowed an empty phone number';
  exception when others then
    if sqlerrm like 'A phone number is required%' then
      raise notice 'PASS: empty phone is rejected';
    else
      raise;
    end if;
  end;

  -- Null phone must also be rejected ---------------------------------------
  begin
    perform place_order(
      v_user, 'Test Customer', null, 'test@example.com',
      '123 Main St', 'Beirut', 'cod', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1))
    );
    raise exception 'FAIL: place_order allowed a null phone number';
  exception when others then
    if sqlerrm like 'A phone number is required%' then
      raise notice 'PASS: null phone is rejected';
    else
      raise;
    end if;
  end;

  -- First order, with a phone: should get 10% off (10.00 on a $100 item) ---
  v_result := place_order(
    v_user, 'Test Customer', '70123456', 'test@example.com',
    '123 Main St', 'Beirut', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1))
  );
  if (v_result->>'signup_welcome_discount_usd')::numeric is distinct from 10.00 then
    raise exception 'FAIL: signup welcome — expected 10.00, got %', v_result->>'signup_welcome_discount_usd';
  end if;
  raise notice 'PASS: first order gets 10%% signup welcome discount';

  v_order_id := (v_result->>'order_id')::uuid;
  select subtotal_usd into v_subtotal from orders where id = v_order_id;
  if v_subtotal is distinct from 90.00 then
    raise exception 'FAIL: order total after signup welcome — expected 90.00, got %', v_subtotal;
  end if;
  raise notice 'PASS: order total reflects the 10%% signup welcome discount';

  -- Second order, same user: no longer their first order — no discount -----
  v_result := place_order(
    v_user, 'Test Customer', '70123456', 'test@example.com',
    '123 Main St', 'Beirut', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'size', 'M', 'qty', 1))
  );
  if (v_result->>'signup_welcome_discount_usd')::numeric is distinct from 0 then
    raise exception 'FAIL: signup welcome should not apply to a second order, got %', v_result->>'signup_welcome_discount_usd';
  end if;
  raise notice 'PASS: signup welcome does not apply to a second order';

  raise notice '=== signup_welcome_and_phone_test.sql: ALL CHECKS PASSED ===';
end $$;
