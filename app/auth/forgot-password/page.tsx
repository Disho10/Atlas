'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { Reveal } from '@/components/Motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    // Same confirmation whether or not the email is registered — don't
    // leak account existence through this form.
    if (error) setError(error.message);
    else setSent(true);
  };

  const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-volt focus:ring-1 focus:ring-volt/30 transition-all placeholder:text-steel';

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Reveal variant="scale" className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {!sent ? (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-display text-3xl mb-1">Reset your password</h1>
              <p className="text-steel text-sm">Enter the email on your account and we&apos;ll send a reset link.</p>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputCls}
              />
              {error && (
                <div className="rounded-xl bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson">{error}</div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-volt text-ink rounded-2xl py-4 font-semibold text-sm btn-press disabled:opacity-50 mt-2">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-volt/15 flex items-center justify-center">
              <MailIcon />
            </div>
            <h1 className="font-display text-2xl mb-2">Check your inbox</h1>
            <p className="text-steel text-sm max-w-xs mx-auto">
              If an account exists for <span className="font-medium text-ink dark:text-chalk">{email}</span>, a reset link is on its way.
            </p>
          </div>
        )}

        <p className="text-sm text-steel text-center mt-8">
          <Link href="/sign-in" className="underline underline-offset-2">Back to sign in</Link>
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
