-- ============================================================================
-- loyalty_expiry_test.sql
-- Regression test for 0012_loyalty_expiry.sql: the warning email existed,
-- but nothing ever actually zeroed a customer's points after 6 months of
-- inactivity. expire_inactive_loyalty_points() is the fix; this proves it
-- expires the right accounts and leaves everyone else alone.
-- ============================================================================

do $$
declare
  v_inactive uuid := '99999999-9999-9999-9999-999999999999';
  v_active uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_expired_count int;
  v_points int;
  v_ledger_reason text;
begin
  insert into auth.users (id, email) values (v_inactive, 'inactive@example.com');
  insert into auth.users (id, email) values (v_active, 'active@example.com');

  -- Both start with 50 signup points. Backdate the inactive one's clock
  -- past the 6-month cutoff; leave the active one's alone (defaults to now()).
  update profiles set last_activity_at = now() - interval '7 months' where id = v_inactive;

  select expire_inactive_loyalty_points() into v_expired_count;

  select loyalty_points into v_points from profiles where id = v_inactive;
  if v_points is distinct from 0 then
    raise exception 'FAIL: inactive account should have 0 points after expiry, got %', v_points;
  end if;
  raise notice 'PASS: points are actually zeroed after 6 months of inactivity (previously: never happened)';

  select loyalty_points into v_points from profiles where id = v_active;
  if v_points is distinct from 50 then
    raise exception 'FAIL: active account''s points should be untouched, got %', v_points;
  end if;
  raise notice 'PASS: an account active within the last 6 months is left alone';

  select reason into v_ledger_reason from loyalty_ledger
    where user_id = v_inactive and reason = 'expiry' order by created_at desc limit 1;
  if v_ledger_reason is distinct from 'expiry' then
    raise exception 'FAIL: expiry should leave an auditable ledger entry, found none';
  end if;
  raise notice 'PASS: expiry is recorded in the ledger like any other point movement';

  -- Running it again should be a no-op (no points left to expire).
  select expire_inactive_loyalty_points() into v_expired_count;
  if v_expired_count <> 0 then
    raise exception 'FAIL: re-running expiry on an already-expired account should expire 0 more — got %', v_expired_count;
  end if;
  raise notice 'PASS: expiry is idempotent — nothing left to expire twice';

  raise notice '--- all loyalty_expiry_test.sql checks passed ---';
end $$;
