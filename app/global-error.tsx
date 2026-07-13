'use client';

import { useEffect } from 'react';

// Catches errors that even app/error.tsx can't — specifically, failures in
// the root layout itself (Header, Providers, LocaleProvider, etc.). Because
// of that, this can't assume any of those are working, so it renders its
// own minimal <html>/<body> with no dependency on the rest of the app —
// no Logo, no Tailwind classes tied to globals.css, nothing that could
// itself be part of what broke.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Atlas] Root layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0B0D10', color: '#F5F3EE' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 360 }}>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>
              The page failed to load. Try again in a moment.
            </p>
            <button
              onClick={reset}
              style={{ background: '#D6FF3F', color: '#0B0D10', padding: '12px 24px', borderRadius: 999, fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
