'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSiteSettings } from '@/components/Providers';
import { whatsappLink } from '@/lib/settings';

const AMOUNTS = [25, 50, 100, 150];
const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function GiftCardsPage() {
  const { settings } = useSiteSettings();
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [method, setMethod] = useState<'whish_pay' | 'card'>('whish_pay');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; orderNumber: string } | null>(null);

  const finalAmount = useCustom ? Number(customAmount) || 0 : amount;

  const submit = async () => {
    setError(null);
    if (finalAmount < 10 || finalAmount > 500) { setError('Choose an amount between $10 and $500.'); return; }
    if (!purchaserEmail.includes('@')) { setError('Enter your email.'); return; }
    if (!recipientEmail.includes('@')) { setError("Enter the recipient's email."); return; }

    setSubmitting(true);
    if (!HAS_SUPABASE) {
      setResult({ code: 'ATLAS-DEMO-0000', orderNumber: 'ATL-DEMO' });
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: rpcError } = await supabase.rpc('purchase_gift_card', {
      p_user_id: user?.id ?? null,
      p_purchaser_email: purchaserEmail.trim(),
      p_recipient_email: recipientEmail.trim(),
      p_recipient_name: recipientName.trim() || null,
      p_message: message.trim() || null,
      p_amount_usd: finalAmount,
      p_payment_method: method,
    });

    if (rpcError || !data) {
      setError(rpcError?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }
    setResult({ code: data.code, orderNumber: data.order_number });
    setSubmitting(false);
  };

  if (result) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-volt/15 text-pitch dark:text-volt flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h1 className="font-display text-3xl mb-2">Gift card created</h1>
        <p className="text-steel text-sm mb-6">
          Order {result.orderNumber}. Complete payment the same way as a regular order — we&apos;ll confirm on WhatsApp.
        </p>
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-6 mb-6">
          <p className="text-xs text-steel uppercase tracking-widest2 mb-2">Gift card code</p>
          <p className="font-mono text-2xl tracking-wider">{result.code}</p>
        </div>
        <p className="text-xs text-steel mb-6">
          Save this code and share it with {recipientName || 'the recipient'} yourself — we don&apos;t currently send it
          by email automatically, so hold onto it until you&apos;ve passed it along.
        </p>
        <a
          href={whatsappLink(settings.whatsappNumber, `Hi, I just bought a gift card (order ${result.orderNumber}) and need to complete payment.`)}
          target="_blank" rel="noopener noreferrer"
          className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press"
        >
          Confirm payment on WhatsApp
        </a>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-14">
      <h1 className="font-display text-3xl mb-2">Gift cards</h1>
      <p className="text-steel text-sm mb-8">
        Digital gift card, redeemable at checkout for anything on the site. No shipping — the code is all they need.
      </p>

      <div className="mb-6">
        <p className="text-xs text-steel uppercase tracking-widest2 mb-2">Amount</p>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setUseCustom(false); setAmount(a); }}
              className={`py-3 rounded-xl text-sm font-medium border btn-press ${!useCustom && amount === a ? 'bg-volt text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}
            >
              ${a}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUseCustom(true)}
          className={`w-full py-2.5 rounded-xl text-sm border btn-press ${useCustom ? 'border-volt' : 'border-black/15 dark:border-white/20 text-steel'}`}
        >
          {useCustom ? (
            <input
              type="number"
              autoFocus
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Custom amount ($10–$500)"
              className="w-full bg-transparent text-center outline-none"
            />
          ) : 'Custom amount'}
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <input value={purchaserEmail} onChange={e => setPurchaserEmail(e.target.value)} placeholder="Your email" type="email" className={inputCls} />
        <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Recipient's email" type="email" className={inputCls} />
        <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient's name (optional)" className={inputCls} />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Personal message (optional)" rows={3} className={inputCls} />
      </div>

      <div className="mb-6">
        <p className="text-xs text-steel uppercase tracking-widest2 mb-2">Payment method</p>
        <div className="flex gap-2">
          {(['whish_pay', 'card'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border btn-press ${method === m ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}
            >
              {m === 'whish_pay' ? 'Whish Pay' : 'Card'}
            </button>
          ))}
        </div>
        <p className="text-xs text-steel mt-2">Cash on Delivery isn&apos;t offered here — there&apos;s nothing to hand a courier for a digital code.</p>
      </div>

      {error && <p className="text-crimson text-sm mb-4">{error}</p>}
      <button onClick={submit} disabled={submitting} className="w-full bg-volt text-ink rounded-full py-4 font-semibold text-sm btn-press disabled:opacity-50">
        {submitting ? 'Creating…' : `Buy ${formatAmount(finalAmount)} gift card`}
      </button>
    </main>
  );
}

function formatAmount(n: number) {
  return n > 0 ? `$${n}` : '';
}

const inputCls = 'w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-volt';
