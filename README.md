# Round 4 — full re-audit + the 5 missing features

This supersedes the round-3 zip from earlier — everything in that one
(the ESLint fix, the `proxy.ts` tweak, the league-page typo fix) is
included here too, so you only need to apply this one.

40 files: 17 new, 23 modified. All paths below are relative to your repo
root — copy each file to the matching path, overwriting where it exists.

## What's in here

**Real bugs found by actually running things** (not just reading code):
- `npm run lint` was dead — Next 16 removed `next lint` entirely (round 3).
- League page showed "All Categorys" — pluralization bug (round 3).
- **The security migration from last round had a real bug**: the trigger
  that stops customers self-promoting to Owner also silently blocked the
  *entire loyalty system* — signup bonuses, purchase points, referral
  rewards, redemptions. Found by actually running the migrations against a
  local Postgres and placing a test order, not by re-reading the SQL.
- **COD orders have never earned loyalty points**, full stop, since before
  any of my changes — the points trigger only fired on order *status
  updates*, but COD orders are inserted already-confirmed, so the trigger
  never ran for what's probably your most common payment method.
- `rate_limit_hits` (new table, see below) had no RLS enabled — would have
  leaked customer phone numbers/emails and let anyone reset their own
  rate limit by deleting their rows.
- Product page's "out of stock" button only checked per-size flags, never
  overall stock — a product with total stock at 0 but no size individually
  flagged could still be added to cart.

**The 5 things from your list:**
1. **Stock decrement** — `place_order()` now atomically decrements stock
   and rejects the order if there isn't enough (blocks overselling under
   concurrent checkouts, verified with a real double-checkout test).
2. **Rate limiting** — a small Postgres-backed limiter, applied to
   checkout (5 orders / 15 min per phone-or-account) and promo code
   validation (20/min per IP). Sign-in itself is already rate-limited by
   Supabase's own Auth service, so no extra code needed there.
3. **Admin audit log** — every admin action (product edits, order status
   changes, staff role changes, promo creation, etc.) now logs who did
   what. View it at `/admin/activity` (staff only).
4. **Sort + price range** — added to both `/search` and the league pages.
5. **"Notify me when back in stock"** — shows up on the product page when
   an item's out of stock; emails everyone who asked once it's restocked.

**SEO** — `sitemap.xml`, `robots.txt`, and every product/league page now
gets its own title/description/share-image instead of one generic one
site-wide.

**Tests** — `npm test` runs 16 unit tests (Vitest) for the pure logic
(cart math, loyalty conversion, the Telegram/email escaping). More
importantly, `supabase/tests/run.sh` spins up a real disposable Postgres,
applies every migration, and exercises `place_order()` end to end —
signup bonus, COD purchase points, stock decrement, overselling rejection,
and the role-escalation guard. This is what caught the two loyalty bugs
above. Re-run it after any future migration change.

**Arabic + RTL** — real infrastructure (language switcher in the header,
persisted preference, `dir="rtl"` applied at the document level), with
navigation, footer, cart, and checkout translated. This is deliberately
**not full-site coverage** — product descriptions, the admin panel, and
most account subpages are still English-only. `lib/i18n/dictionary.ts` is
where you add more strings; every page already has the plumbing to use
them. I also caught and fixed a real performance regression this
introduced (reading the locale from a cookie server-side turned every
static page into a server-rendered-per-request one) — locale is now
resolved client-side on mount instead, so static generation is untouched.

## Setup, in order

1. **Run the new migration** against your live Supabase project:
   `supabase/migrations/0006_stock_ratelimit_audit_notify.sql`
   (SQL Editor or `supabase db push`)
2. **Redeploy the two edge functions** (their imports changed):
   ```
   supabase functions deploy notify-telegram
   supabase functions deploy send-receipt
   ```
3. **Copy the files in**, then:
   ```
   npm install
   npm run build   # sanity check
   npm test        # 16 unit tests
   ```
4. **(Optional but recommended) run the DB regression suite** — needs a
   local Postgres reachable via `psql`:
   ```
   bash supabase/tests/run.sh
   ```
5. **Set `NEXT_PUBLIC_SITE_URL`** in your environment (Vercel project
   settings) to your real domain once you have one — it's used for the
   sitemap and social-share links. Falls back to the current Vercel URL
   if unset.

No other env vars needed — everything else reuses what you already have.
