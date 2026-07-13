# Google Analytics — 3 files

`components/AnalyticsGate.tsx`, `package.json`, `package-lock.json` —
overwrite at those paths, `npm install` to pick up `@next/third-parties`.

## One thing you need to do yourself
Create a GA4 property at analytics.google.com (if you haven't already) and
grab its Measurement ID — looks like `G-XXXXXXXXXX`. Then set an env var:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

In Vercel: Project → Settings → Environment Variables. Locally, add it to
`.env.local`. Nothing loads until this is set — no broken script tag
pointed at nothing, it just silently skips GA (Vercel Analytics still
works independently either way).

## Why this one's gated more strictly than Vercel Analytics was
Vercel Analytics is cookieless — gating it behind consent last round was
really just about keeping a promise your `ConsentBanner` already made in
its own code comment, not a hard requirement. Google Analytics is
different: it sets real cookies (`_ga`, `_ga_<container-id>`) and tracks
across sessions, which is exactly the category cookie-consent banners
exist for. Same gate, same event-driven mechanism (no polling) — but this
time it's not optional politeness, it's the actual point of having a
consent banner at all.

Uses `@next/third-parties/google` — Next.js's own official package for
this, not a hand-rolled script tag, so it gets the loading-strategy and
performance handling Next already tuned for third-party scripts.

## Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — zero issues on the changed file
- `npm test` — 16/16 passing
- `npm run build` compiles clean; full build still blocked in my sandbox
  only by the Google Fonts network restriction, unrelated to this change
