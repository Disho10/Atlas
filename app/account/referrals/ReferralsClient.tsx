'use client';

import { useState, useEffect } from 'react';

type Referral = { rewarded: boolean; date: string };

export default function ReferralsClient({ code, referrals, rewardPoints, demoMode = false }: {
  code: string; referrals: Referral[]; rewardPoints: number; demoMode?: boolean;
}) {
  const [copied, setCopied] = useState(false);
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
      <h1 className="font-display text-3xl mb-2">Refer a friend</h1>
      <p className="text-steel text-sm mb-8">
        Share your code. When a friend signs up with it and completes their first order, you earn <b>{rewardPoints} points</b> — and they get a warm welcome too.
      </p>

      <div className="rounded-3xl bg-pitch text-chalk p-8 mb-8">
        <p className="text-xs uppercase tracking-widest2 text-chalk/60">Your referral code</p>
        <p className="font-display text-4xl text-volt mt-2 tracking-wider">{code || '—'}</p>
        <div className="flex flex-wrap gap-2 mt-6">
          <button onClick={copy} disabled={demoMode} className="bg-volt text-ink rounded-full px-5 py-2.5 text-sm font-medium btn-press disabled:opacity-50">
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Get authentic kits at Atlas — use my code ${code}: ${shareUrl}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="border border-chalk/30 rounded-full px-5 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-10">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 text-center">
          <p className="font-display text-3xl">{referrals.length}</p>
          <p className="text-xs text-steel mt-1">Friends signed up</p>
        </div>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 text-center">
          <p className="font-display text-3xl text-volt">{converted}</p>
          <p className="text-xs text-steel mt-1">Rewards earned</p>
        </div>
      </div>

      <h2 className="font-medium mb-3">Referral activity</h2>
      <div className="space-y-2">
        {referrals.length === 0 && <p className="text-steel text-sm">No referrals yet — share your code to get started.</p>}
        {referrals.map((r, i) => (
          <div key={i} className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm">
            <span>Friend joined · {r.date}</span>
            <span className={r.rewarded ? 'text-pitch dark:text-volt' : 'text-steel'}>
              {r.rewarded ? `+${rewardPoints} pts earned` : 'Pending first order'}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
