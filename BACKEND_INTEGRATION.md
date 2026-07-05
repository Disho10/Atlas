# Atlas — Backend Integration Guide

The backend is now wired in. This project talks to real Supabase tables for products, leagues,
auth, orders, reviews, and wishlists — with graceful fallback to the original mock data if
`NEXT_PUBLIC_SUPABASE_URL` isn't set yet, so the site still runs before you finish setup.

## 1. Create the database

In your Supabase project → SQL Editor, run these three files in order:

1. `supabase/migrations/0001_schema.sql` — tables, enums, triggers (product codes, order numbers,
   auto-profile-on-signup, rating aggregation)
2. `supabase/migrations/0002_rls.sql` — Row Level Security policies enforcing the role rules
   (Owner/Manager/Admin visibility, customers only seeing their own orders/wishlist, etc.)
3. `supabase/seed.sql` — loads the same 12 products and 6 leagues from the prototype, plus storage
   buckets for review photos and product images

Then sign up once through the live site, find your user in Supabase → Authentication → Users, and run:
```sql
update profiles set role = 'owner' where id = '<your-user-id>';
```

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — same page, keep this one server-only
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — from your bot
- `RESEND_API_KEY` / `RECEIPT_FROM_EMAIL` — for order-confirmation emails (optional to start)

Restart `npm run dev` after adding these — every page in `lib/data.ts` checks for
`NEXT_PUBLIC_SUPABASE_URL` and automatically switches from mock data to live queries.

## 3. Enable Google/Apple/Facebook sign-in

Supabase Dashboard → Authentication → Providers → enable each one, following Supabase's docs for
the OAuth app credentials each provider needs. The sign-in page and `/auth/callback` route are
already wired — no code changes needed once the providers are turned on.

## 4. Wire order notifications (Telegram + email receipt)

The two Edge Functions in `supabase/functions/` do the actual sending. Deploy them:
```
supabase functions deploy notify-telegram
supabase functions deploy send-receipt
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... RESEND_API_KEY=... RECEIPT_FROM_EMAIL=...
```

Then in Supabase Dashboard → Database → Webhooks, create two webhooks, both on:
- Table: `orders`, Event: `INSERT`, Type: HTTP Request
- URLs: your two functions' endpoints (shown after `supabase functions deploy`)

Once that's set up, placing an order on the site automatically fires both — no extra client code
needed, since `app/checkout/page.tsx` already just inserts into `orders`/`order_items`.

## 5. What's live vs. what's still a stub

| Feature | Status |
|---|---|
| Products, leagues, categories | ✅ Real queries, fallback to mock data if not configured |
| Search + zero-result logging | ✅ Wired, logs every search to `search_logs` |
| Auth (email/password) | ✅ Wired |
| Auth (Google/Apple/Facebook) | ✅ Wired — just needs providers enabled in dashboard (step 3) |
| Reviews + photo upload | ✅ Wired to `reviews` table + Storage |
| Wishlist | ✅ Persists per-user once signed in; local-only for guests |
| Orders / checkout | ✅ Writes real rows; payment gateways themselves (Whish Pay/OMT/Card) are still UI-only — see below |
| Order tracking timeline | ✅ Reads live `orders.status` |
| Telegram + email notifications | ✅ Functions written — needs deploy + webhook setup (step 4) |
| Admin panel (`/admin`) | ⚠️ Still reads mock data — same query patterns as the storefront pages, just not wired yet (see below) |
| Payment gateways (Whish Pay/OMT/Card) | ⚠️ UI only — these need each provider's merchant API integrated server-side |
| Returns/referrals/loyalty pages | ⚠️ UI only, tables exist (`return_requests`, `referral_redemptions`, `profiles.loyalty_points`) but the pages don't write to them yet |

## What's below

The rest of this document is the original feature-by-feature map from before the backend existed.
It's still accurate for anything marked ⚠️ above — same tables, same approach, just not yet wired
into that particular page.

---

## League logos

Real, licensed logos are wired in for LaLiga, Premier League, Serie A, Bundesliga, and Ligue 1 —
they live in `public/logos/` and are referenced via `logoUrl` in `lib/mockData.ts` (and via
`leagues.logo_url` if you're reading from Supabase). I cleaned up the files you provided: removed
baked-in checkerboard/white backgrounds so they're properly transparent PNGs, and cropped the
Serie A file down to just the league mark (it had a TIM sponsor banner attached, which is a
separate company's trademark, not part of the Serie A logo itself).

`components/LeagueCrest.tsx` renders the real logo in a white chip (for legibility over any
colored background) when `logoUrl` is set. All six leagues — including the Lebanese Premier
League now that you have that license — have licensed logos in `public/logos/`. The placeholder
shield badge in `LeagueCrest.tsx` is still there as a fallback for if you ever add a league you
don't have a logo for yet; to add a new one:
1. Add the logo file to `public/logos/<slug>.png` (clean, transparent background), **or**
   upload it to the `product-images` Supabase Storage bucket if you'd rather manage it from the DB
2. Set `logoUrl` for that league in `lib/mockData.ts` (prototype mode) and/or `leagues.logo_url` in
   Supabase (live mode) to the file's path/URL
3. No component changes needed — `LeagueCrest` picks it up automatically

---


## Categories & Products

| Feature | Where it lives | To make it real |
|---|---|---|
| Categories per product type + leagues | `lib/mockData.ts` (`leagues`, `ProductCategory`) | Supabase tables: `leagues`, `categories`, `products` |
| Multiple tags per product | `Product.tags` | `product_tags` join table for many-to-many |
| Shirts/socks/balls/shin pads/sportswear, male/female | `Product.category`, `Product.gender` | Same table, enum columns |
| Per-category colors/fonts/logo, Owner+Manager only | `app/leagues/[slug]/page.tsx` header block | Add `category_styles` table (primary/secondary hex, logo_url); gate the edit UI in `/admin` behind `role IN ('owner','manager')` via Supabase RLS |
| Add/delete categories & tags | Not yet a UI — planned in `/admin` "Products" tab | Add create/delete forms wired to `categories`/`tags` tables, RLS restricted to owner/manager |
| Auto internal product code, owner/manager/admin only | `Product.code`, shown in `/admin` "Products" tab | Generate server-side (Postgres sequence or trigger) on insert; never expose in the public product API response |
| Adjust price/margin by tag/name/category | Not yet built | Add a pricing-rules table + admin UI; compute effective price server-side |

## Account & Auth

| Feature | Where it lives | To make it real |
|---|---|---|
| Sign-in page | `app/sign-in/page.tsx` | Wire to Supabase Auth (`supabase.auth.signInWithPassword`) |
| Google/Apple/Facebook sign-in | Buttons in `app/sign-in/page.tsx` (currently inert) | Supabase Auth social providers — enable each in the Supabase dashboard and call `supabase.auth.signInWithOAuth({ provider })` |
| Settings page | `app/account/settings/page.tsx` | Read/write a `profiles` table |
| Email subscriptions (new categories, tag-based) | Toggles in `app/account/settings/page.tsx` | Store booleans on `profiles`; trigger emails via Supabase Edge Function + Resend/Postmark on `categories.insert` and on tag-view events |
| Order tracking (placed→confirmed→shipped→delivered) | `app/account/orders/page.tsx` | `orders.status` enum column, updated from `/admin` |
| Returns/exchange flow | `app/account/returns/page.tsx` | `return_requests` table, status workflow |
| Loyalty points / repeat-customer tiers | `app/account/loyalty/page.tsx` | `loyalty_points` column on profile + a trigger that adds points on order completion |
| Referral program | `app/account/referrals/page.tsx` | `referral_codes` + `referral_redemptions` tables |
| Wishlist | `components/Providers.tsx` (`WishlistProvider`, currently in-memory) | Persist to a `wishlists` table keyed by user id instead of React state |

## Storefront

| Feature | Where it lives | To make it real |
|---|---|---|
| Search by name/tag + filters | `app/search/page.tsx`, filters in `app/leagues/[slug]/page.tsx` | Swap the in-memory `.filter()` for a Postgres full-text search or Supabase `textSearch` query; log every query for the analytics feature below |
| Hot/newest slideshow | `components/ProductRail.tsx`, `Hero.tsx` | Replace mock arrays with a query sorted by `created_at` / a `hot` flag |
| Category slider | `components/CategorySlider.tsx` | Already data-driven off `leagues` — just point it at the DB table |
| Most-searched items | `ProductRail` on homepage | Needs the search-log table above; sort by frequency |
| Dark/light mode, system-aware | `components/Providers.tsx` (`ThemeProvider`) | Already fully functional, no backend needed |
| Multi-currency (USD/LBP) | `components/Providers.tsx` (`CurrencyProvider`), `lib/mockData.ts` (`usdToLbp`) | Replace the hardcoded rate with a daily cron pulling from a live FX source |
| Cookie consent + terms popup | `components/ConsentBanner.tsx` | Already functional (writes to localStorage); hook analytics init to the "accepted" branch |

## Product Pages

| Feature | Where it lives | To make it real |
|---|---|---|
| Reviews: stars, text, photo upload | `app/product/[id]/page.tsx` | Persist to a `reviews` table; photo upload to Supabase Storage |
| Admin-triggered preview before publish | Not yet built | Add a `status: draft/published` column + a "Preview" button in `/admin` that renders the product page with an unlisted token |
| "Coming soon" + preorder | `Product.comingSoon` flag, product page CTA | `orders` table needs a `is_preorder` flag |
| Out-of-stock sizes / full product | `Product.outOfStockSizes`, `Product.stock` | Live stock column, decremented on order confirmation |

## Checkout & Payments

| Feature | Where it lives | To make it real |
|---|---|---|
| Whish Pay, OMT, Card, COD | `app/checkout/page.tsx` (UI only) | Whish Pay and OMT both offer merchant APIs/redirect flows — integrate server-side via a Supabase Edge Function; card payments typically go through a gateway like Areeba or Stripe (availability varies for LB) |
| Email receipt after purchase | Confirmation screen in `app/checkout/page.tsx` | Trigger from an Edge Function on `orders.insert`, via Resend/Postmark, with a PDF or HTML receipt |

## Order Notifications

| Feature | Where it lives | To make it real |
|---|---|---|
| Telegram forward on order placed | Noted in checkout confirmation copy | Create a Telegram bot (BotFather), store the bot token + chat ID as Supabase secrets, and call the Telegram `sendMessage` API from an Edge Function triggered on `orders.insert` |

## Admin / Manager / Owner Panel

All of this lives in `app/admin/page.tsx`, with a role switcher at the top so you can preview all
three views right now.

| Feature | Where it lives | To make it real |
|---|---|---|
| Role-based access | Role buttons at top of `/admin` | Supabase RLS policies keyed off a `role` column on `profiles`; today it's a UI-only toggle for demo purposes |
| Owner revenue/sales/demand stats | "Overview" tab | Aggregate queries over `orders` |
| Manager sees requests | "Requests" tab (owner+manager only) | Same data, RLS-scoped |
| Manually log Instagram/WhatsApp orders | "Orders" tab, "+ Log order" button (UI only so far) | Build the form; insert into `orders` with `channel = 'instagram' | 'whatsapp'` |
| Admin panel search (products/tags/categories) | "Products" tab search box | Already wired to mock data — swap for a DB query |
| Most-requested notifications, configurable window | "Overview" tab | Add a `window_days` setting; recompute via a scheduled function |
| Low-stock threshold alerts | "Requests" tab | Threshold currently hardcoded at 6 — move to a `settings` table |
| Zero-result search analytics | "Search analytics" tab | Needs the search-log table mentioned above |
| Stock/reorder recommendations | "Requests" tab | Simple velocity model (units sold / day × lead time) as a starting point |
| Owner "real profit" (revenue − salaries) | "Finance" tab | Add a `salaries` table if you want history instead of a single editable number |

## Support

| Feature | Where it lives | To make it real |
|---|---|---|
| Chatbot with WhatsApp fallback | `components/ChatWidget.tsx` | Currently rule-based on a few quick replies; swap for a real chatbot (e.g. an Edge Function calling the Claude API) if you want open-ended answers |
| Football results, top 5 leagues | `app/scores/page.tsx`, linked from the footer | Swap `MOCK_RESULTS` for a live scores API (API-Football, Sportradar) |

## About

| Feature | Where it lives |
|---|---|
| About Us page | `app/about/page.tsx` — copy is a draft, written to match your actual story; edit freely |

---

## Suggested build order

1. Stand up Supabase tables for `products`, `categories`, `leagues`, `orders`, `profiles` — you've
   already done this shape of work on AlBayan, so the schema instincts carry over directly.
2. Wire real auth (email + Google to start; Apple/Facebook can come later since they need extra
   developer-account setup).
3. Replace `lib/mockData.ts` reads with Supabase queries, one page at a time — the components don't
   need to change, only what feeds them.
4. Add the Telegram order-notification Edge Function — this is the same pattern as your AlBayan
   Telegram bot, just triggered by a database insert instead of a channel message.
5. Payments last, since Whish Pay/OMT integration and testing takes the longest lead time.

## Fonts

The build currently falls back to system fonts because this sandbox can't reach
`fonts.googleapis.com`. On Vercel (or any environment with normal internet access), swap
`app/layout.tsx` back to:

```tsx
import { Anton, Manrope, JetBrains_Mono } from 'next/font/google';
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Manrope({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
// then add className={`${display.variable} ${body.variable} ${mono.variable}`} to <body>
```
and delete the fallback `--font-*` block at the top of `app/globals.css`.
