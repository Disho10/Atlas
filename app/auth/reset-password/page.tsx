'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { Reveal } from '@/components/Motion';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<'checking' | 'ok' | 'none'>('checking');
  const router = useRouter();

  useEffect(() => {
    // /auth/callback already exchanged the emailed code for a recovery
    // session before redirecting here — confirm it actually landed before
    // showing the form, rather than letting updateUser() fail silently
    // on an unauthenticated request.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? 'ok' : 'none'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else { setDone(true); setTimeout(() => router.push('/account'), 1800); }
  };

  const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-volt focus:ring-1 focus:ring-volt/30 transition-all placeholder:text-steel';

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Reveal variant="scale" className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-volt/15 flex items-center justify-center">
              <CheckIcon />
            </div>
            <h1 className="font-display text-2xl mb-2">Password updated</h1>
            <p className="text-steel text-sm">Taking you to your account…</p>
          </div>
        ) : session === 'checking' ? (
          <p className="text-steel text-sm text-center">Checking your link…</p>
        ) : session === 'none' ? (
          <p className="text-steel text-sm text-center">
            This link isn&apos;t valid or has expired.{' '}
            <a href="/auth/forgot-password" className="underline underline-offset-2">Request a new one</a>.
          </p>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-display text-3xl mb-1">Set a new password</h1>
              <p className="text-steel text-sm">Make it something you haven&apos;t used here before.</p>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <input
                  placeholder="New password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required minLength={6}
                  className={`${inputCls} pr-12`}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-steel text-xs">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                placeholder="Confirm new password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required minLength={6}
                className={inputCls}
              />
              {error && (
                <div className="rounded-xl bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson">{error}</div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-volt text-ink rounded-2xl py-4 font-semibold text-sm btn-press disabled:opacity-50 mt-2">
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </Reveal>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-volt">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
