'use client';

import { useState, useTransition } from 'react';
import { redeemPoints } from '../actions';

type Ledger = { delta: number; reason: string; date: string };

const TIERS = [
  { id: 'bronze', label: 'Bronze', min: 0, perks: ['Standard 1 pt per $1 earning'] },
  { id: 'silver', label: 'Silver', min: 500, perks: ['Early access to "coming soon" & preorder drops'] },
  { id: 'gold', label: 'Gold', min: 1500, perks: ['Early access', 'Free shipping on all orders', 'Small permanent discount on top of redemptions'] },
];

function tierFor(lifetime: number) {
  if (lifetime >= 1500) return TIERS[2];
  if (lifetime >= 500) return TIERS[1];
  return TIERS[0];
}

const REASON_LABELS: Record<string, string> = {
  purchase: 'Purchase', review_photo: 'Photo review', referral: 'Referral reward',
  signup: 'Welcome bonus', redemption: 'Redeemed for discount', expiry: 'Expired (inactivity)',
};

export default function LoyaltyClient({ balance, lifetime, ledger, demoMode = false }: {
  balance: number; lifetime: number; ledger: Ledger[]; demoMode?: boolean;
}) {
  const [redeemAmt, setRedeemAmt] = useState(100);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [localBalance, setLocalBalance] = useState(balance);

  const tier = tierFor(lifetime);
  const tierIndex = TIERS.findIndex(t => t.id === tier.id);
  const nextTier = TIERS[tierIndex + 1];
  const progress = nextTier ? Math.min(100, ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100) : 100;

  const redeem = () => {
    if (demoMode) { setMsg({ ok: false, text: 'Connect Supabase and sign in to redeem.' }); return; }
    setMsg(null);
    start(async () => {
      const res = await redeemPoints(redeemAmt);
      if (res.ok) { setLocalBalance(b => b - redeemAmt); setMsg({ ok: true, text: `Redeemed for $${res.discountUsd} off — use it at checkout.` }); }
      else setMsg({ ok: false, text: res.error });
    });
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-2">Loyalty</h1>
      <p className="text-steel text-sm mb-8">Earn 1 point per $1 spent, plus bonuses for photo reviews, referrals, and signing up.</p>

      {/* Balance + tier card */}
      <div className="rounded-3xl bg-ink text-chalk p-8 mb-8 relative overflow-hidden grain">
        <div className="glow-orb w-64 h-64 bg-volt -top-16 -right-10 opacity-25" />
        <div className="relative z-10">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest2 text-chalk/60">Points balance</p>
              <p className="font-display text-5xl text-volt mt-1 tabular">{localBalance}</p>
            </div>
            <span className={`text-xs uppercase tracking-wide px-3 py-1.5 rounded-full font-medium
              ${tier.id === 'gold' ? 'bg-volt text-ink' : tier.id === 'silver' ? 'bg-chalk/20 text-chalk' : 'bg-chalk/10 text-chalk/80'}`}>
              {tier.label}
            </span>
          </div>

          {nextTier ? (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-chalk/60 mb-1.5">
                <span>{lifetime} lifetime pts</span>
                <span>{nextTier.min - lifetime} to {nextTier.label}</span>
              </div>
              <div className="h-2 rounded-full bg-chalk/15 overflow-hidden">
                <div className="h-full bg-volt rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-volt">Top tier — you've unlocked everything.</p>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        {TIERS.map((t, i) => (
          <div key={t.id} className={`rounded-2xl border p-4 ${i === tierIndex ? 'border-volt' : 'border-black/10 dark:border-white/10'}`}>
            <p className="font-medium text-sm">{t.label}</p>
            <p className="text-xs text-steel mb-2">{t.min}+ lifetime pts</p>
            <ul className="text-xs text-steel space-y-1">
              {t.perks.map(p => <li key={p}>· {p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Redemption */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 mb-10">
        <h2 className="font-medium mb-1">Redeem points</h2>
        <p className="text-xs text-steel mb-4">100 points = $5 off. Redeeming never lowers your tier.</p>
        <div className="flex items-center gap-3">
          <select value={redeemAmt} onChange={e => setRedeemAmt(Number(e.target.value))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-2.5 text-sm">
            {[100, 200, 300, 500].filter(n => n <= localBalance || n === 100).map(n => (
              <option key={n} value={n}>{n} pts → ${n / 20} off</option>
            ))}
          </select>
          <button onClick={redeem} disabled={pending || localBalance < redeemAmt} className="bg-volt text-ink rounded-full px-5 py-2.5 text-sm font-medium btn-press disabled:opacity-40">
            {pending ? 'Redeeming…' : 'Redeem'}
          </button>
        </div>
        {msg && <p className={`text-sm mt-3 ${msg.ok ? 'text-pitch dark:text-volt' : 'text-crimson'}`}>{msg.text}</p>}
        <p className="text-xs text-steel mt-4">Points can also go toward specific low-cost items (socks, shin pads) — ask at checkout.</p>
      </div>

      {/* History */}
      <h2 className="font-medium mb-3">Recent activity</h2>
      <div className="space-y-2">
        {ledger.length === 0 && <p className="text-steel text-sm">No activity yet. Your first order starts the clock.</p>}
        {ledger.map((l, i) => (
          <div key={i} className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm">
            <span>{REASON_LABELS[l.reason] ?? l.reason}<span className="text-steel"> · {l.date}</span></span>
            <span className={`tabular font-medium ${l.delta >= 0 ? 'text-pitch dark:text-volt' : 'text-crimson'}`}>
              {l.delta >= 0 ? '+' : ''}{l.delta}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-steel mt-8">
        Points expire after 6 months of inactivity — but we'll email you a heads-up before they do, so you have time to use them.
      </p>
    </main>
  );
}
