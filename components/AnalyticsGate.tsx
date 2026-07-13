'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Vercel Analytics is cookieless and wouldn't strictly need to wait on
// consent, but Google Analytics genuinely does — it sets real cookies
// (_ga, _ga_<container-id>) and is exactly the kind of thing GDPR-style
// consent requirements are about. ConsentBanner already promises "analytics
// / marketing pixels only initialize after acceptance"; this is the case
// where that promise actually matters, not just a nice-to-have consistency
// choice like it was for Vercel Analytics alone.
export default function AnalyticsGate() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const check = () => setAccepted(window.localStorage.getItem('atlas-consent') === 'accepted');
    check();
    // 'storage' fires for other tabs; 'atlas-consent-changed' (dispatched by
    // ConsentBanner) covers the same tab where the choice was just made.
    window.addEventListener('storage', check);
    window.addEventListener('atlas-consent-changed', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('atlas-consent-changed', check);
    };
  }, []);

  if (!accepted) return null;
  return (
    <>
      <Analytics />
      {/* Not configured yet? GA_ID is undefined until NEXT_PUBLIC_GA_MEASUREMENT_ID
          is set (Vercel project settings, or .env.local) — skip silently
          rather than load gtag.js pointed at nothing. */}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </>
  );
}
