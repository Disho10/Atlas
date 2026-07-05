'use client';

import { useState } from 'react';
import { orders } from '@/lib/mockData';

export default function ReturnsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState(orders[0].id);
  const [reason, setReason] = useState('Wrong size');
  const [type, setType] = useState<'return' | 'exchange'>('exchange');

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-3">Request submitted</h1>
        <p className="text-steel">
          We've logged your {type} request for order #{orderId}. Our team will reach out with next steps within 24 hours.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Return or Exchange</h1>
      <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
        <div className="flex gap-2">
          {(['exchange', 'return'] as const).map(t => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-full py-2.5 text-sm capitalize border ${type === t ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          Which order?
          <select value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full mt-1 border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3">
            {orders.map(o => <option key={o.id} value={o.id} className="text-ink">{o.id} — {o.items[0].name}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          Reason
          <select value={reason} onChange={e => setReason(e.target.value)} className="w-full mt-1 border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3">
            {['Wrong size', 'Item damaged', 'Not as described', 'Changed my mind'].map(r => (
              <option key={r} className="text-ink">{r}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="w-full bg-volt text-ink rounded-full py-3.5 font-medium">
          Submit request
        </button>
      </form>
    </main>
  );
}
