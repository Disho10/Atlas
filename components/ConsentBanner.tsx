'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ConsentBanner() {
  const [status, setStatus] = useState<'unset' | 'set'>('unset');

  useEffect(() => {
    const stored = window.localStorage.getItem('atlas-consent');
    if (stored) setStatus('set');
  }, []);

  if (status === 'set') return null;

  const decide = (value: 'accepted' | 'declined') => {
    window.localStorage.setItem('atlas-consent', value);
    // AnalyticsGate (and anything else gated on consent) listens for this
    // instead of polling — the native 'storage' event only fires in OTHER
    // tabs, never the one that made the change.
    window.dispatchEvent(new CustomEvent('atlas-consent-changed', { detail: value }));
    setStatus('set');
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-6 animate-rise">
      <div className="max-w-3xl mx-auto bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm flex-1">
          We use cookies to keep your cart working and to understand which kits you're into. Read our{' '}
          <Link href="/terms" className="underline underline-offset-2">Terms &amp; Conditions</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => decide('declined')} className="text-sm px-4 py-2 rounded-full border border-chalk/30 dark:border-ink/30">
            Decline non-essential
          </button>
          <button onClick={() => decide('accepted')} className="text-sm px-4 py-2 rounded-full bg-volt text-ink font-medium">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
