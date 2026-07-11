# Owner finance dashboard — 3 files

`app/admin/page.tsx`, `components/AdminPanel.tsx`, `lib/mockData.ts` —
overwrite at those exact paths. No migration, no new env vars.

## Two real bugs fixed along the way

1. **Orders were silently capped at 100.** The query behind every finance
   number (revenue, AOV, top sellers, everything) had `.limit(100)` — past
   your 100th order, all of this was quietly wrong, understating your real
   totals with no indication anything was missing. Bumped to 1000
   (PostgREST's own per-request ceiling). If you outgrow that too, the
   numbers need to move to a SQL `SUM`/`COUNT` instead of pulling every row
   into JS — worth flagging to me when you get there.
2. **Cost/margin matching used a fragile name-substring check** —
   `it.name.includes(p.name)` would double-count anything whose name is a
   substring of another ("Real Madrid Home Jersey" matching inside "Real
   Madrid Home Jersey (Kids)"). Fixed to match by `product_id`, which the
   data already had — the join was just never used.

## What's new in the Finance tab (owner-only)

- **Time period filter** — Last 7 / 30 / 90 days or all-time. Every stat
  in the tab now respects it.
- **Revenue trend chart** — daily bars, hover for the exact number,
  pure CSS, no charting library added.
- **Revenue by payment method** — Cash on Delivery / Whish Pay / OMT /
  Card, alongside the existing channel breakdown (website/IG/WhatsApp).
- **Customer metrics** — unique customers, repeat customers, repeat
  purchase rate. Grouped by signed-in user id, falling back to email for
  guest checkouts.
- **Discounts given** — real dollars discounted in the period, computed
  as (pre-discount items subtotal) − (what the order actually settled
  for), since `place_order()` only ever stores the post-discount total.
- **Loyalty point liability** — what it would cost you today if every
  outstanding point across every customer got redeemed at once. This is
  a real number worth watching; it grows quietly and most stores never
  look at it until it's large.
- **Promo code performance** — every code, its discount, how many times
  it's been used, active/inactive.
- **Inventory valuation** — total stock value at cost (capital tied up)
  and at retail (what it's worth if it all sold).
- **Top sellers now show margin, not just revenue** — a product can be
  your #1 seller and still be a bad one if the margin's thin; both
  numbers sit side by side now.
- **CSV export** — one click, downloads every order (date, number,
  customer, payment method, status, total) for your accountant or your
  own records. Generated client-side from data already on the page, no
  server round-trip.

## What I didn't add, and why
- **Tax/VAT handling** — Lebanon's retail tax situation varies enough by
  business structure that I didn't want to guess at something with real
  compliance consequences. Tell me your actual setup and I'll build it
  correctly instead of assuming.
- **Multi-currency P&L (USD vs LBP)** — everything here is USD, matching
  how the rest of the app already prices things. The LBP figure shown
  elsewhere in the site is a display conversion, not a second ledger —
  said so because it'd be easy to assume otherwise.
- **Returns/refund cost tracking** — `return_requests` exists in your
  schema but isn't wired into financial impact yet. Genuinely useful,
  didn't want to guess at how you want cost attributed (full refund?
  restocking fee? case by case?) without you weighing in.

## Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — no new errors (fixed one warning I introduced —
  `avgOrderValue` briefly became unused when I moved period-scoped AOV
  into the Finance tab, so I put an all-time AOV stat on the Overview tab
  instead of just deleting the variable)
- `npm run build` compiles clean; the actual build fails in my sandbox
  only because it can't reach `fonts.googleapis.com` — same known
  limitation as last time, not a code issue. Confirm on your end.
