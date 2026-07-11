# Promo suggestions + more across every tab — 3 files

`app/admin/actions.ts`, `app/admin/page.tsx`, `components/AdminPanel.tsx` —
overwrite at those exact paths. No migration, no new env vars.

## Promo codes — the main ask

**Suggestions panel** at the top of the Promos tab, grounded in your actual
data (not generic advice), each with a "Use this →" button that pre-fills
the creation form:

- **Clear slow-moving stock** — fires when products have real stock sitting
  with zero recent sales. Tells you how much value ($) is tied up.
- **Win back quiet customers** — fires when customers who've ordered before
  haven't in 45+ days. Honest caveat included: a promo code alone won't
  reach them, since Atlas's promo codes are storewide, not sent to specific
  people — you'd still need to pair it with a WhatsApp/email nudge.
- **This week is down** — fires when revenue is down 15%+ vs the week
  before, suggests a short flash sale.
- **Nothing running right now** — fires when you have no active code and
  it's been 30+ days (or you've never made one).
- **Margin-aware depth** — every suggested discount is scaled down if your
  margin's thin (15% when margin ≥30%, down to 5% below 20%), with an
  explicit note when that's happening so it's never a silent guess.

**Also fixed a real gap**: you could create promo codes but never see or
turn off the ones you'd already made. Added a full list with a one-tap
activate/deactivate toggle (new `setPromoActive` action) — nothing gets
deleted, just switched on/off, so usage history stays intact.

## Everything else, one addition per tab

- **Team** — each staff member now shows "Active 2h ago" / "3d ago" etc.,
  pulled from the audit log I added a few rounds back. First real use of
  that data beyond the activity log page itself.
- **Orders** — search by order number or customer, filter by status, and a
  "⚠ N stale (48h+)" toggle for orders stuck at placed/confirmed with no
  progress — the ones most likely to have just been forgotten.
- **Products** — a "dead stock" badge and filter toggle for products
  sitting on real stock with zero recent sales.
- **Restock priority** — an estimated dollar cost to restock everything
  scoring 30+, plus a suggested reorder quantity per product (using cost
  data where you've set it).
- **Search analytics** — one-click "Copy list" of zero-result search terms,
  for when you're actually deciding what to source next.

## Two real bugs fixed along the way
1. **Orders were silently capped at 100** for every finance figure —
   already flagged and fixed last round, still worth restating since it
   affects several of the new features here too (win-back count, week-
   over-week trend, etc. all need real order history to be accurate).
2. **`Date.now()` called during render** (React 19's stricter purity
   rules now catch this) in three new places I added — the "stale order"
   check, "days since last promo," and "time ago" display. Fixed properly:
   the timestamp is captured once via `useEffect` after mount rather than
   computed inline during render, which is the pattern React actually
   wants here (the same treatment already used for the Arabic-locale
   cookie read a few rounds back).

## Verified
- `npx tsc --noEmit` — clean
- `npm test` — 16/16 passing
- `npm run lint` — zero purity errors, no new issues beyond the same
  pre-existing style debt from before (unescaped apostrophes, `any` types,
  a handful of other setState-in-effect instances already accepted earlier
  in our work)
- `npm run build` compiles clean; full build still blocked in my sandbox
  only by the Google Fonts network restriction — same known non-issue as
  every round since PHASE 6.0, please confirm on your end
