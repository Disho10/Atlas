# OMT removed, FAQ page, real product recommendations, full gift card system — 19 files

**Run `supabase/migrations/0008_frequently_bought_with.sql` and
`0009_gift_cards.sql`** against your live Supabase project before
deploying the code — the recommendations and gift card features depend on
functions those add. No env vars needed.

## OMT — actually removed, not just hidden
Removed from checkout, the manual order-logging form, the chatbot's
answer, and Terms/Privacy/Shipping page copy. Kept in exactly two places,
deliberately: the Finance tab's payment-method breakdown and the
order-list display mapping — both are about correctly showing **historical**
orders that were genuinely paid via OMT before this change, not about
letting anyone choose it going forward. The database enum still has
`'omt'` as a valid value too, for the same reason — old rows aren't
touched, only new orders can no longer select it.

## `/faq` — standalone page
Just wraps your existing `FaqSection` component in a real page with its
own metadata, so the same 5 questions are both on the homepage and
directly linkable/indexable. Content lives in one place — no duplication
to drift out of sync.

## Real "customers who bought this also bought"
Not a same-league guess — an actual SQL function (`frequently_bought_with`)
that counts how many distinct past orders contained both products, ranked
by that count. Falls back to the previous same-league/category logic only
when there isn't enough purchase history yet (a brand-new product has no
co-purchase signal, and that's correctly different from "nothing's
related"). Tested against real Postgres: seeded orders, confirmed the
ranking is correct, and confirmed a cancelled order's items don't count
toward the signal.

## Gift cards — the big one, tested like `place_order()` was
Full system: purchase page at `/gift-cards` (amount picker, recipient
email/name/message, Whish Pay or Card — deliberately no COD, there's
nothing to hand a courier for a digital code), redemption built directly
into `place_order()` as a new optional parameter, and a read-only
**Gift Cards tab** in admin showing every card, balance, and status.

Tested against real Postgres, same rigor as everything money-related in
this project: purchase, partial redemption against a real order, balance
correctly hitting zero and flipping to `redeemed`, stock still decrementing
normally alongside the gift card, a spent card correctly rejected on reuse,
full-coverage auto-confirming an order regardless of payment method chosen,
and the $10–$500 amount bounds. **All of this is now a permanent automated
test** (`supabase/tests/gift_card_test.sql`), not just something I checked
once — it runs every time `supabase/tests/run.sh` does, right alongside the
existing `place_order()` suite, and both still pass together.

**One thing I deliberately did not build**: automatic email delivery of
the gift card code to the recipient. Right now the code is shown on-screen
after purchase and the buyer has to pass it along themselves — building
real email delivery means a new Edge Function (same pattern as
`send-receipt`), its own secrets, and its own deploy step, and I didn't
want to bolt that on hastily inside an already-large batch. Straightforward
to add next if you want it; the schema already has `recipient_email` ready
for exactly that.

**Also worth knowing**: redeeming a gift card isn't previewed live at
checkout the way a promo code is — it's validated for real only when you
hit "Place order." Deliberate: a live preview would mean a new endpoint
that reveals whether a given code has balance, which is exactly the kind
of thing someone could use to probe/guess codes. The rate limiter already
covers repeated attempts either way.

## Two Postgres things worth knowing if you're reading the migrations
- Redefining `place_order()` with an extra parameter isn't as simple as
  `CREATE OR REPLACE` — Postgres treats a different parameter list as a
  *different function*, which would've left the old 9-parameter version
  still sitting in your database alongside the new one. Migration 0009
  explicitly drops the old signature first. Caught this before it became
  a real "which version did it actually call" problem, not after.
- The `frequently_bought_with()` and gift card functions are
  `SECURITY DEFINER`, meaning they read across all customers' order
  history (something normal RLS never allows a single customer to do).
  Same pattern already used for `track_order_public()` a while back —
  safe because they only ever return aggregated facts (a product ID and a
  count, or a balance tied to a code someone already has), never another
  customer's personal information.

## Still outstanding from your list
**Admin panel deep-field translation** and **blog/editorial content** are
both still not done. I want to be straight about why rather than deliver
something rushed: this batch is already 19 files including a full
financial feature I tested as carefully as checkout itself. Both of those
are genuinely large enough to be their own dedicated pass — the admin
panel alone is over 2,300 lines with dozens of tabs' worth of form labels,
and a real blog needs its own schema, admin CRUD, and public listing/detail
pages, comparable in scope to the custom-pages CMS that already exists.
Tell me which one to do next and I'll give it the same real attention
gift cards just got, rather than cram a shallow version of either into
this batch.

## Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — zero new issues (checked every touched/new file by
  hand; found and fixed two real apostrophe issues I introduced, left
  everything pre-existing alone)
- `npm test` — 16/16 passing
- **`supabase/tests/run.sh` — all 13 checks passing** (6 existing +
  7 new gift-card-specific), run against a real disposable Postgres,
  not just eyeballed
- `npm run build` — confirmed via the same isolated-build method as
  before (temporarily stub the Google Fonts calls that are blocked in my
  sandbox, run a real build, revert the stub): 32 routes generated
  cleanly, including `/faq` and `/gift-cards`
