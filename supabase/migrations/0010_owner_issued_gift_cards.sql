-- ============================================================================
-- 0010_owner_issued_gift_cards.sql
-- Lets the store owner (only the owner — not manager, not admin) issue a
-- gift card directly from the admin panel, e.g. for compensation or a
-- promotional giveaway, with no purchase behind it.
-- ============================================================================

-- Matches the existing is_staff() / is_manager_or_owner() pattern from 0002.
create or replace function is_owner()
returns boolean as $$
  select atlas_role() = 'owner';
$$ language sql stable security definer;

-- Distinguishes real revenue (a customer paid for this) from a pure
-- liability (the owner comped it, nothing was collected) — matters for
-- the Finance tab: these should never be counted as revenue anywhere.
alter table gift_cards add column if not exists source text not null default 'purchase'
  check (source in ('purchase', 'staff_issued'));
alter table gift_cards add column if not exists issued_by uuid references profiles(id);

create or replace function issue_gift_card(
  p_recipient_email text,
  p_recipient_name text,
  p_amount_usd numeric,
  p_message text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_code text;
  v_gift_card_id uuid;
  v_issuer_email text;
begin
  -- Checked here, not just in the app's server action — the same
  -- defense-in-depth reasoning as prevent_profile_privilege_escalation()
  -- and every other sensitive write in this schema: the UI role check is
  -- real, but this function is reachable directly via the API too, and
  -- should refuse on its own regardless of what called it.
  if not is_owner() then
    raise exception 'Only the store owner can issue gift cards.';
  end if;

  -- More permissive than the $10–$500 customer-purchase range (0009) —
  -- an owner comping a large goodwill gesture is a real, deliberate
  -- decision, not something that needs the same guardrail a public,
  -- unauthenticated purchase form needs.
  if p_amount_usd is null or p_amount_usd <= 0 or p_amount_usd > 1000 then
    raise exception 'Gift card amount must be between $0.01 and $1000.';
  end if;
  if p_recipient_email is null or p_recipient_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid recipient email.';
  end if;

  select email into v_issuer_email from auth.users where id = auth.uid();

  loop
    v_code := 'ATLAS-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;

  insert into gift_cards (
    code, initial_balance_usd, remaining_balance_usd, purchaser_user_id,
    purchaser_email, recipient_email, recipient_name, message, source, issued_by
  ) values (
    v_code, p_amount_usd, p_amount_usd, auth.uid(),
    coalesce(v_issuer_email, 'staff'), p_recipient_email, nullif(p_recipient_name, ''),
    nullif(p_message, ''), 'staff_issued', auth.uid()
  )
  returning id into v_gift_card_id;

  return jsonb_build_object('gift_card_id', v_gift_card_id, 'code', v_code);
end;
$$;

grant execute on function issue_gift_card(text, text, numeric, text) to authenticated;
