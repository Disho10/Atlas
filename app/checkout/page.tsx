'use client';

import { useState } from 'react';
import { useCart, useCurrency } from '@/components/Providers';
import { formatCurrency } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from '@/components/icons';

const METHODS = [
  { label: 'Whish Pay', value: 'whish_pay' },
  { label: 'OMT', value: 'omt' },
  { label: 'Card', value: 'card' },
  { label: 'Cash on Delivery', value: 'cod' },
] as const;

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function CheckoutPage() {
  const { lines, subtotal } = useCart();
  const { currency } = useCurrency();
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('cod');
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', email: '' });
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  const applyPromo = async () => {
    setPromoChecking(true);
    setPromoMsg(null);
    const { validatePromo } = await import('@/app/account/actions');
    const res = await validatePromo(promoCode, subtotal);
    if (res.ok) { setDiscount(res.discountUsd); setPromoMsg(`Applied: ${res.description}`); }
    else { setDiscount(0); setPromoMsg(res.error); }
    setPromoChecking(false);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError(null);

    if (!HAS_SUPABASE) {
      // Prototype mode — no backend connected yet.
      setOrderNumber('ATL-' + Math.floor(10000 + Math.random() * 90000));
      setPlaced(true);
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id ?? null,
        payment_method: method,
        customer_name: form.name || 'Guest',
        customer_phone: form.phone,
        customer_email: form.email || user?.email || null,
        address: form.address,
        city: form.city,
        subtotal_usd: Math.max(0, subtotal - discount),
        channel: 'website',
      })
      .select()
      .single();

    if (orderError || !order) {
      setError('Something went wrong placing your order. Please try again.');
      setSubmitting(false);
      return;
    }

    const itemRows = lines.map(l => ({
      order_id: order.id,
      product_id: l.product.id,
      product_name: l.product.name,
      size: l.size,
      qty: l.qty,
      unit_price_usd: l.product.price,
    }));
    await supabase.from('order_items').insert(itemRows);

    // Mark any open abandoned-cart snapshot as recovered so no reminder is sent.
    if (user) {
      await supabase.from('abandoned_carts').update({ recovered_at: new Date().toISOString() })
        .eq('user_id', user.id).is('recovered_at', null);
    }

    // The `orders` INSERT above fires the notify-telegram and send-receipt
    // Database Webhooks (once configured in the Supabase dashboard) —
    // no extra client-side call needed. See BACKEND_INTEGRATION.md.

    setOrderNumber(order.order_number ?? order.id);
    setPlaced(true);
    setSubmitting(false);
  };

  if (placed) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-volt text-ink flex items-center justify-center mx-auto mb-6"><CheckIcon className="w-7 h-7" /></div>
        <h1 className="font-display text-3xl mb-2">Order placed</h1>
        <p className="text-steel mb-1">Order #{orderNumber}</p>
        <p className="text-steel text-sm mb-8">
          A receipt has been emailed to you, and your order details have been forwarded to our Telegram desk for fulfillment.
        </p>
        <a href="/account/orders" className="inline-block bg-ink text-chalk dark:bg-chalk dark:text-ink px-6 py-3 rounded-full font-medium">
          Track this order
        </a>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>

      <div className="space-y-6">
        <fieldset>
          <legend className="text-sm font-medium mb-2">Delivery address</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm" />
            <input placeholder="Phone number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm" />
            <input placeholder="Email (for your receipt)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm sm:col-span-2" />
            <input placeholder="City / area" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm sm:col-span-2" />
            <input placeholder="Street & building details" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm sm:col-span-2" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium mb-2">Payment method</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {METHODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`border rounded-xl px-4 py-3 text-sm text-left ${method === m.value ? 'border-ink dark:border-chalk' : 'border-black/15 dark:border-white/20'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
          {lines.map(l => (
            <div key={l.product.id + l.size} className="flex justify-between text-sm mb-2">
              <span>{l.product.name} × {l.qty} ({l.size})</span>
              <span className="tabular">{formatCurrency(l.product.price * l.qty, currency)}</span>
            </div>
          ))}
          <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/10">
            <div className="flex gap-2 mb-3">
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Discount / match-day code"
                className="flex-1 border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-3 py-2 text-sm"
              />
              <button type="button" onClick={applyPromo} disabled={promoChecking} className="text-sm border border-black/15 dark:border-white/20 rounded-xl px-4 btn-press disabled:opacity-50">
                {promoChecking ? '…' : 'Apply'}
              </button>
            </div>
            {promoMsg && <p className={`text-xs mb-2 ${discount > 0 ? 'text-pitch dark:text-volt' : 'text-crimson'}`}>{promoMsg}</p>}
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-steel">Discount</span>
                <span className="tabular text-crimson">−{formatCurrency(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular">{formatCurrency(Math.max(0, subtotal - discount), currency)}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-crimson">{error}</p>}

        <button onClick={placeOrder} disabled={submitting || lines.length === 0} className="w-full bg-volt text-ink rounded-full py-3.5 font-medium disabled:opacity-50">
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
        <p className="text-xs text-steel text-center">
          By placing this order you agree to Atlas's Terms &amp; Conditions.
        </p>
      </div>
    </main>
  );
}
