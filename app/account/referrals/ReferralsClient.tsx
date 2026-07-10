'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Reveal } from '@/components/Motion';

type Referral = { rewarded: boolean; date: string };

export default function ReferralsClient({ code, referrals, rewardPoints, demoMode = false }: {
  code: string; referrals: Referral[]; rewardPoints: number; demoMode?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  // Build the absolute URL only after mount. During SSR and the first client
  // render it's the relative path (identical on both sides, so no hydration
  // mismatch); the effect then upgrades it to the full origin-based URL.
  const [shareUrl, setShareUrl] = useState(`/sign-in?ref=${code}`);
  useEffect(() => {
    setShareUrl(`${window.location.origin}/sign-in?ref=${code}`);
  }, [code]);
  const converted = referrals.filter(r => r.rewarded).length;

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-2">{t('account.referTitle')}</h1>
      <p className="text-steel text-sm mb-8">
        Share your code. Your friend gets a discount on their first order, and once that order is confirmed you earn <b>{rewardPoints} points</b> — about what a $150 purchase would earn you.
      </p>

      <div className="rounded-3xl bg-ink text-chalk p-8 mb-8 relative overflow-hidden grain">
        <div className="glow-orb w-64 h-64 bg-crimson -top-16 -right-10 opacity-20" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest2 text-chalk/60">{t('account.yourReferralCode')}</p>
          <p className="font-display text-4xl text-volt mt-2 tracking-wider">{code || '—'}</p>
          <div className="flex flex-wrap gap-2 mt-6">
            <button onClick={copy} disabled={demoMode} className="bg-volt text-ink rounded-full px-5 py-2.5 text-sm font-medium btn-press disabled:opacity-50">
              {copied ? t('account.copied') : t('account.copyInviteLink')}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Get authentic kits at Atlas — use my code ${code}: ${shareUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="border border-chalk/30 rounded-full px-5 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors btn-press"
            >
              {t('account.shareOnWhatsapp')}
            </a>
          </div>
        </div>
      </div>

      <Reveal>
      <div className="grid grid-cols-2 gap-3 mb-10">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 text-center card-hover">
          <p className="font-display text-3xl">{referrals.length}</p>
          <p className="text-xs text-steel mt-1">{t('account.friendsSignedUp')}</p>
        </div>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 text-center card-hover">
          <p className="font-display text-3xl text-volt">{converted}</p>
          <p className="text-xs text-steel mt-1">{t('account.rewardsEarned')}</p>
        </div>
      </div>
      </Reveal>

      <Reveal>
      <h2 className="font-medium mb-3">{t('account.referralActivity')}</h2>
      <div className="space-y-2">
        {referrals.length === 0 && <p className="text-steel text-sm">{t('account.noReferralsYet')}</p>}
        {referrals.map((r, i) => (
          <div key={i} className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm card-hover">
            <span>{t('account.friendJoined')} · {r.date}</span>
            <span className={r.rewarded ? 'text-pitch dark:text-volt' : 'text-steel'}>
              {r.rewarded ? `+${rewardPoints} pts` : t('account.pendingFirstOrder')}
            </span>
          </div>
        ))}
      </div>
      </Reveal>
    </main>
  );
}
