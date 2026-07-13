'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Right now this just goes to the browser console and Vercel's function
    // logs — nobody's looking at either in real time. If/when an error
    // tracking service gets added (Sentry, e.g.), this is the one place
    // that needs a line added: Sentry.captureException(error).
    console.error('[Atlas] Unhandled error:', error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <Logo className="justify-center mb-8" />
        <h1 className="text-lg font-medium mb-2">Something went wrong</h1>
        <p className="text-steel text-sm mb-8">
          That&apos;s on us, not you. Try again, or head back to the store — if this keeps happening, reach out on WhatsApp and we&apos;ll sort it out.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press">
            Try again
          </button>
          <Link href="/" className="border border-black/15 dark:border-white/20 px-6 py-3 rounded-full font-medium btn-press">
            Back to the store
          </Link>
        </div>
      </div>
    </main>
  );
}
