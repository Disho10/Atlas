'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/account';

  const oauth = async (provider: 'google' | 'apple' | 'facebook') => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Supabase redirects the browser away, so nothing else runs here.
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push(next);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setError(error.message);
      else router.push(next);
    }
    setLoading(false);
  };

  return (
    <main className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display text-3xl mb-1 text-center">Welcome to Atlas</h1>
      <p className="text-steel text-sm text-center mb-8">Sign in to track orders, save your wishlist, and earn loyalty points.</p>

      <div className="space-y-3 mb-6">
        <SocialButton label="Continue with Google" onClick={() => oauth('google')} />
        <SocialButton label="Continue with Apple" onClick={() => oauth('apple')} />
        <SocialButton label="Continue with Facebook" onClick={() => oauth('facebook')} />
      </div>

      <div className="flex items-center gap-3 my-6 text-xs text-steel">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" /> OR <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <input
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm"
          />
        )}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm"
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm"
        />
        {error && <p className="text-xs text-crimson">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-volt text-ink rounded-full py-3.5 font-medium disabled:opacity-50">
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => setMode(m => (m === 'signin' ? 'signup' : 'signin'))}
        className="w-full text-center text-sm text-steel mt-4 underline"
      >
        {mode === 'signin' ? "New here? Create an account" : 'Already have an account? Sign in'}
      </button>

      <p className="text-xs text-steel text-center mt-6">
        By continuing you agree to Atlas's Terms &amp; Conditions and Privacy Policy.
      </p>
    </main>
  );
}

function SocialButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full border border-black/15 dark:border-white/20 rounded-full py-3 text-sm font-medium">
      {label}
    </button>
  );
}
