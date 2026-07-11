-- ============================================================================
-- 0007_review_moderation_and_refunds.sql
-- Two independent features:
--   1. Review moderation — hide instead of only hard-delete
--   2. Refund cost tracking on return_requests, so approved refunds show up
--      as a real financial number instead of just sitting in the table
-- Run AFTER 0001–0006.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Review moderation
-- ----------------------------------------------------------------------------
alter table reviews add column if not exists hidden boolean not null default false;
alter table reviews add column if not exists hidden_reason text;

-- Public can no longer see a hidden review; staff still can (for the
-- moderation UI itself, and to un-hide something hidden by mistake).
drop policy if exists "Reviews are public" on reviews;
create policy "Reviews are public" on reviews
  for select using (not hidden or is_staff());

-- Staff already had delete via "Staff moderate reviews" (0002) — add update
-- so hide/show can be a toggle instead of a one-way delete.
drop policy if exists "Staff update reviews" on reviews;
create policy "Staff update reviews" on reviews
  for update using (is_staff());

-- ----------------------------------------------------------------------------
-- 2. Refund cost tracking
-- ----------------------------------------------------------------------------
-- Staff read/update access to this table already exists ("Users manage own
-- return requests" and "Staff update return requests", both from 0002) — just
-- adding the columns needed to record what a resolved return actually cost.
alter table return_requests add column if not exists refund_amount_usd numeric;
alter table return_requests add column if not exists resolved_at timestamptz;
alter table return_requests add column if not exists resolved_by uuid references profiles(id);
