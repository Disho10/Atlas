'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import Logo from '@/components/Logo';
import { Reveal } from '@/components/Motion';

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const { t } = useLocale();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/account';
  const refCode = params.get('ref') ?? '';

  const oauth = async (provider: 'google' | 'apple' | 'facebook') => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
        email, password,
        options: { data: { full_name: fullName, birthday: birthday || null, referred_by: refCode || '' } },
      });
      if (error) setError(error.message);
      else router.push(next);
    }
    setLoading(false);
  };

  const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-volt focus:ring-1 focus:ring-volt/30 transition-all placeholder:text-steel';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark brand side */}
      <Reveal variant="left" className="hidden lg:flex lg:w-2/5">
      <div className="w-full h-full flex flex-col justify-between p-10 bg-ink text-chalk relative overflow-hidden">
        <div className="glow-orb w-80 h-80 bg-volt -bottom-20 -left-20 opacity-20" />
        <div className="glow-orb w-64 h-64 bg-crimson top-20 -right-10 opacity-15" />
        <div className="relative z-10">
          <Logo />
        </div>
        <div className="relative z-10">
          <blockquote className="font-display text-4xl leading-tight mb-4">
            {t('signin.wearTheCulture')}
          </blockquote>
          <p className="text-chalk/60 text-sm max-w-xs">
            {t('signin.leftPanelBody')}
          </p>
        </div>
        <div className="relative z-10 flex gap-4 text-xs text-chalk/40">
          <span>{t('signin.statLeagues')}</span>
          <span>·</span>
          <span>{t('signin.statKits')}</span>
          <span>·</span>
          <span>{t('signin.statCod')}</span>
        </div>
      </div>
      </Reveal>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Reveal variant="scale" className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl mb-1">
              {mode === 'signin' ? t('signin.welcomeBack') : t('signin.createAccount')}
            </h1>
            <p className="text-steel text-sm">
              {mode === 'signin'
                ? t('signin.signInSubtitle')
                : t('signin.createSubtitle')}
            </p>
          </div>

          {refCode && (
            <div className="mb-6 rounded-2xl bg-volt/10 border border-volt/30 px-4 py-3 text-sm">
              <span className="font-medium text-volt">You were invited!</span>{' '}
              Use code <b>{refCode}</b> to claim your welcome discount.
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-3 mb-6">
            <SocialButton icon={<GoogleIcon />} label="Continue with Google" onClick={() => oauth('google')} />
            <SocialButton icon={<AppleIcon />} label="Continue with Apple" onClick={() => oauth('apple')} />
            <SocialButton icon={<FacebookIcon />} label="Continue with Facebook" onClick={() => oauth('facebook')} />
          </div>

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className="text-xs text-steel uppercase tracking-widest">or</span>
            <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          {/* Toggle tabs */}
          <div className="flex gap-6 border-b border-black/10 dark:border-white/10 mb-6">
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} data-active={mode === m}
                className={`chip-underline py-2.5 text-sm font-medium ${mode === m ? '' : 'text-steel'}`}>
                {m === 'signin' ? t('nav.signIn') : t('signin.createAccount')}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <input placeholder={t('signin.fullName')} value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
            )}
            <input placeholder={t('signin.emailAddress')} type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
            <div className="relative">
              <input
                placeholder={t('signin.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required minLength={6}
                className={`${inputCls} pr-12`}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-steel text-xs">
                {showPassword ? t('signin.hide') : t('signin.show')}
              </button>
            </div>
            {mode === 'signup' && (
              <label className="block">
                <span className="block text-xs text-steel mb-1.5">{t('signin.birthdayHint')}</span>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={inputCls} />
              </label>
            )}

            {error && (
              <div className="rounded-xl bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-volt text-ink rounded-2xl py-4 font-semibold text-sm btn-press disabled:opacity-50 mt-2">
              {loading ? t('signin.pleaseWait') : mode === 'signin' ? t('nav.signIn') : t('signin.createAccount')}
            </button>
          </form>

          <p className="text-xs text-steel text-center mt-6">
            {t('signin.agreeTermsPrefix')}{' '}
            <a href="/terms" className="underline">{t('footer.terms')}</a> {t('signin.and')}{' '}
            <a href="/privacy" className="underline">{t('footer.privacy')}</a>.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function SocialButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 border border-black/10 dark:border-white/10 rounded-2xl py-3.5 px-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors btn-press">
      <span className="w-5 h-5 shrink-0">{icon}</span>
      <span className="flex-1 text-center">{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
