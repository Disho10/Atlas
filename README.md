# Review moderation + refund tracking + Vercel Analytics

10 files: 1 new migration, 2 new components, 7 modified. No new env vars.

## Setup, in order
1. **Run the migration**: `supabase/migrations/0007_review_moderation_and_refunds.sql`
2. **Copy the files in**, `npm install` (picks up `@vercel/analytics` from
   `package-lock.json`), redeploy.
3. Vercel Analytics needs to be turned on for your project once in the
   Vercel dashboard (Project → Analytics tab) — the code alone won't start
   collecting data until that's enabled there.

## Reviews — moderation instead of only hard-delete
New Reviews tab (any staff tier — same bar as logging orders). Hide/show
toggle per review, with an optional internal-only reason. Hidden reviews
disappear from the product page immediately but the row isn't deleted —
nothing about ratings/counts is lost if you change your mind.

Tested directly against a real Postgres, not just read: seeded a review,
confirmed the public can see it, had staff hide it, confirmed the public
can no longer see it (down to zero rows, not just a UI toggle), confirmed
staff still sees it for un-hiding, and confirmed the *customer who wrote
it* — not staff — cannot un-hide their own moderated review. That last one
matters: it's the actual security boundary, not just the happy path.

## Refunds — now a real, tracked cost
New Returns tab. Every filed return shows the order, customer, and reason;
approving asks for a refund amount (defaults to the full order total, you
can adjust it) and records it — that number now shows up on the Finance
tab as "Refunds paid" and gets subtracted from net profit in the profit
calculator. Rejecting needs no amount. Nothing here touches stock
automatically (see note below on why).

Also tested against real Postgres: filed a return as a customer, resolved
it as staff with a refund amount, confirmed the write succeeded and the
amount stuck.

**Deliberately not done**: automatically restocking a product when a
return is approved. `return_requests` is linked to the whole order, not
specific line items, so an "auto-restock" button would put back every item
in that order even if only one was actually returned — wrong more often
than right. If you want this, it needs a small addition (which items are
being returned, not just which order) rather than a shortcut that quietly
overstates your inventory.

## Vercel Analytics
Cookieless, so it doesn't strictly need consent — but your existing
`ConsentBanner` had a standing `TODO(backend): only initialize analytics /
marketing pixels when value === 'accepted'`, so I kept that promise
consistent rather than carve out a silent exception. `ConsentBanner` now
dispatches an event when someone accepts/declines; `AnalyticsGate` listens
for it and mounts `<Analytics />` only after acceptance — no polling, no
page reload needed, works the moment someone clicks "Accept all."

## Verified
- `npx tsc --noEmit` — clean
- `npm test` — 16/16 passing
- `npm run lint` — zero new issues (checked specifically; the one
  `setState`-in-effect flag in `ConsentBanner.tsx` is on a line I didn't
  touch, same pre-existing/accepted pattern as several other spots already
  noted in earlier rounds)
- SQL regression suite (`supabase/tests/run.sh`) — all 6 checks still pass
  with migration 0007 included, run against a real disposable Postgres,
  not just read
- `npm run build` compiles clean; full build still blocked in my sandbox
  only by the Google Fonts network restriction, unrelated to this change —
  please confirm on your end as always
