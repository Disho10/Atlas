# Sportswear — disabled pre-launch, not deleted

This folder is prefixed with `_` on purpose. Next.js App Router treats any
folder starting with `_` as a "private folder" — completely excluded from
routing, with zero config. `/shop/sportswear`, `/shop/sportswear/men`, and
`/shop/sportswear/women` currently all 404, and the nav link, homepage
promo section, and sitemap entry pointing to them have all been removed
elsewhere in the codebase too.

The code itself is untouched — same files, same logic, still fully
functional. To bring sportswear back:

1. Rename this folder from `_sportswear` back to `sportswear`
2. Re-add the nav link in `components/Header.tsx` (see how the Retro link
   is currently wired for the pattern)
3. Swap `RetroPromo`/`components/RetroPromo.tsx` back for
   `SportswearPromo`/`components/SportswearPromo.tsx` in `app/page.tsx`
   (that file's still there too, untouched)
4. Add `/shop/sportswear` back to `app/sitemap.ts`
5. Remove `'sportswear'` from `HIDDEN_CATEGORIES` in `lib/data.ts` — this
   is the one that actually matters most: until this line changes, any
   sportswear products are invisible to search, browsing, and direct
   product links even with everything else above reverted, by design.
