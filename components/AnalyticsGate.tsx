'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';

// Vercel Analytics is cookieless (no persistent identifiers, nothing written
// to the browser) and wouldn't strictly need to wait on cookie consent — but
// ConsentBanner already has a standing TODO promising that "analytics /
// marketing pixels" only initialize after acceptance, and it's cheap to keep
// that promise consistent rather than have one exception no one remembers
// the reasoning for later. Same 'atlas-consent' key the banner itself writes.
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
  return <Analytics />;
}
