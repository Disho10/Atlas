'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { Reveal } from '@/components/Motion';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) setError(error.message);
    else setResent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Reveal variant="scale" className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {/* Signature: a single restrained "kickoff" pulse — same ping/volt
            vocabulary as the chat widget's live dot, not a new motif. */}
        <div className="relative mx-auto mb-6 w-16 h-16 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-volt/20 animate-ping" aria-hidden="true" />
          <span className="relative w-16 h-16 rounded-full bg-volt/15 flex items-center justify-center">
            <MailIcon />
          </span>
        </div>

        <h1 className="font-display text-3xl mb-2">You&apos;re almost in</h1>
        <p className="text-steel text-sm max-w-xs mx-auto mb-1">
          We sent a confirmation link{email && <> to <span className="font-medium text-ink dark:text-chalk">{email}</span></>}. Open it to activate your account.
        </p>
        <p className="text-steel text-xs mb-8">Didn&apos;t get it? Check spam, or send it again.</p>

        {error && (
          <div className="rounded-xl bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson mb-4 text-left">{error}</div>
        )}

        {email && (
          <button
            onClick={resend}
            disabled={loading || resent}
            className="border border-black/15 dark:border-white/20 rounded-2xl px-6 py-3 text-sm font-medium btn-press disabled:opacity-50"
          >
            {resent ? 'Sent again ✓' : loading ? 'Sending…' : 'Resend email'}
          </button>
        )}

        <p className="text-sm text-steel mt-8">
          <a href="/sign-in" className="underline underline-offset-2">Back to sign in</a>
        </p>
      </Reveal>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-volt">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
