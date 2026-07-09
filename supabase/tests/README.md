# Tests

Two separate suites, because the riskiest logic (checkout pricing, stock,
rate limiting) lives in Postgres functions, not JS.

## `npm test` — JS unit tests (Vitest)
Pure-function tests: cart subtotal math, loyalty point conversion, and the
Markdown/HTML escaping helpers used before customer text goes into a
Telegram message or receipt email. No database needed.

## `npm run test:db` — SQL regression tests
Spins up a **disposable local Postgres database**, applies every migration
in `supabase/migrations/` in order, then runs `supabase/tests/place_order_test.sql`
against it: places a real order through `place_order()` and asserts stock
decremented, purchase points were awarded (including the COD case, which
inserts as already-confirmed rather than transitioning through an update),
overselling is rejected, and a non-staff user still can't grant themselves
`owner` directly.

Requires a local Postgres reachable via `psql` — e.g. `apt-get install
postgresql` (Debian/Ubuntu) or `brew install postgresql` (macOS). Never
point this at a real/production database; it creates and drops a throwaway
one (`atlas_ci_test_<pid>`) using whatever `psql` connects to by default.

This suite is what caught three real bugs during development (not
hypothetical — each one reproduced and then got fixed):
1. `apply_loyalty()`'s writes to `profiles` were being blocked by the
   privilege-escalation trigger, because SECURITY DEFINER doesn't exempt a
   function from triggers, and the trigger was checking `is_staff()` — false
   for the customer legitimately earning their own points.
2. The purchase-points trigger only fired on order `UPDATE`, so COD orders
   (inserted as already-`confirmed`, never transitioning) never earned
   points at all.
3. The fix for #1 used a transaction-local "trusted write" flag that, once
   set by a legitimate points award, stayed active for the *rest of that
   transaction* — briefly reopening the escalation hole for anything else
   touching `profiles` in the same transaction.

None of these were visible from reading the SQL in isolation; all three only
showed up when actually exercising the checkout flow end-to-end.
