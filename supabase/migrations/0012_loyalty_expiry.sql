-- ============================================================================
-- 0012_loyalty_expiry.sql
-- Bug: engagement-jobs (0004) sends "your points are about to expire" warning
-- emails after 6 months of inactivity, but nothing anywhere ever actually
-- expired them — no cron, no pg_cron, no step in the edge function. The
-- warning threatened expiry the system never delivered on; points just
-- lived forever regardless of activity.
--
-- Fix: a real expire_inactive_loyalty_points() function, called as a new
-- step in the engagement-jobs edge function (see that file's diff). Reuses
-- apply_loyalty() — same ledger discipline as every other point movement —
-- so expired points show up in the customer's own history as 'expiry',
-- exactly like redemptions show up as 'redemption'.
-- ============================================================================

create or replace function expire_inactive_loyalty_points()
returns int
language plpgsql
security definer
as $$
declare
  v_profile record;
  v_count int := 0;
  v_cutoff timestamptz := now() - interval '6 months';
begin
  for v_profile in
    select id, loyalty_points from profiles
    where loyalty_points > 0 and last_activity_at <= v_cutoff
  loop
    perform apply_loyalty(v_profile.id, -v_profile.loyalty_points, 'expiry', null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Only the service role (used by the scheduled edge function) needs this —
-- it walks every inactive profile and zeroes points, which is exactly the
-- kind of bulk action that should never be callable by anon/authenticated.
revoke all on function expire_inactive_loyalty_points() from public, anon, authenticated;
grant execute on function expire_inactive_loyalty_points() to service_role;
