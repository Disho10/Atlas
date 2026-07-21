'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, useCurrency, useSiteSettings, useAuth } from '@/components/Providers';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { formatCurrency } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from '@/components/icons';
import SignupWelcomeBanner from '@/components/SignupWelcomeBanner';

const METHODS = [
  {
    label: 'Cash on Delivery',
    value: 'cod',
    icon: '💵',
    desc: 'Pay cash when your order arrives',
  },
  {
    label: 'Whish Pay',
    value: 'whish_pay',
    icon: '📲',
    desc: 'Transfer via Whish app',
  },
  {
    label: 'Card',
    value: 'card',
    icon: '💳',
    desc: 'Visa / Mastercard',
  },
] as const;

// Payment instructions shown after order is placed for non-COD methods.
// whatsappNumber comes from Store Settings (Admin → Store Settings) instead
// of being hardcoded here — was duplicated as a literal string in 3 spots
// in this file alone before that existed.
function paymentInstructions(whatsappNumber: string): Record<string, { title: string; steps: string[] }> {
  const displayNumber = `+${whatsappNumber.slice(0, 3)} ${whatsappNumber.slice(3, 5)} ${whatsappNumber.slice(5, 8)} ${whatsappNumber.slice(8)}`;
  return {
    whish_pay: {
      title: 'Complete your Whish Pay transfer',
      steps: [
        'Open your Whish app',
        `Tap "Send Money" and enter our number: ${displayNumber}`,
        'Enter the exact amount shown on your order',
        'In the note write your order number',
        'Send the transfer — your order ships once we confirm receipt (usually within 1 hour during business hours)',
      ],
    },
    card: {
      title: 'Pay by card',
      steps: [
        'We\'ll send you a secure payment link by WhatsApp or SMS within 15 minutes',
        'Click the link and enter your card details on our secure payment page',
        'Your order ships once payment is confirmed',
        'Need it faster? Message us on WhatsApp and we\'ll send the link immediately',
      ],
    },
  };
}

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const inputCls = 'w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-volt transition-colors';

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const { lines, subtotal, remove, clear } = useCart();
  const { currency } = useCurrency();
  const { t } = useLocale();
  const { settings } = useSiteSettings();
  const PAYMENT_INSTRUCTIONS = paymentInstructions(settings.whatsappNumber);
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('cod');
  const [stage, setStage] = useState<'form' | 'payment' | 'confirmed'>('form');
  const [orderNumber, setOrderNumber] = useState('');
  const [giftCardApplied, setGiftCardApplied] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', email: '' });
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [welcomeDiscount, setWelcomeDiscount] = useState(0);
  const [signupWelcome, setSignupWelcome] = useState(0);
  const { signedIn } = useAuth();
  const searchParams = useSearchParams();
  // Loyalty points chosen on the account/loyalty page, handed off via
  // ?redeem=N. Re-validated here (and again server-side in place_order())
  // rather than trusted outright — the balance may have changed since.
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyMsg, setLoyaltyMsg] = useState<string | null>(null);
  const finalTotal = Math.max(0, subtotal - discount - welcomeDiscount - signupWelcome - loyaltyDiscount);

  useEffect(() => {
    import('@/app/account/actions').then(async m => {
      const res = await m.getRefereeWelcome();
      setWelcomeDiscount(res.discountUsd);
    });
  }, []);

  useEffect(() => {
    if (subtotal <= 0) { setSignupWelcome(0); return; }
    import('@/app/account/actions').then(async m => {
      const res = await m.getSignupWelcome(subtotal);
      setSignupWelcome(res.discountUsd);
    });
  }, [subtotal]);

  useEffect(() => {
    const redeemParam = Number(searchParams.get('redeem'));
    if (!redeemParam || redeemParam <= 0) return;
    import('@/app/account/actions').then(async m => {
      const res = await m.previewLoyaltyRedemption(redeemParam);
      if (res.ok) {
        setLoyaltyPoints(redeemParam);
        setLoyaltyDiscount(res.discountUsd);
        setLoyaltyMsg(`${redeemParam} points applied - $${res.discountUsd} off.`);
      } else {
        setLoyaltyMsg(res.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Please fill in your name, phone number, and delivery address.'); return;
    }
    setSubmitting(true);
    setError(null);

    if (!HAS_SUPABASE) {
      setOrderNumber('ATL-' + Math.floor(10000 + Math.random() * 90000));
      setStage(method === 'cod' ? 'confirmed' : 'payment');
      setSubmitting(false);
      clear();
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Order creation (and all price math) happens server-side in the
    // place_order() Postgres function — it re-reads price_usd/variants from
    // the products table itself rather than trusting anything computed here
    // in the browser (subtotal/discount/promo above are for display only).
    const { data: result, error: orderError } = await supabase.rpc('place_order', {
      p_user_id: user?.id ?? null,
      p_customer_name: form.name.trim(),
      p_customer_phone: form.phone.trim(),
      p_customer_email: form.email.trim() || user?.email || null,
      p_address: form.address.trim(),
      p_city: form.city.trim(),
      p_payment_method: method,
      p_promo_code: promoCode || null,
      p_gift_card_code: giftCardCode || null,
      p_loyalty_points_redeemed: loyaltyPoints || 0,
      p_items: lines.map(l => ({
        product_id: l.product.id,
        size: l.size,
        qty: l.qty,
        variant_label: l.variant ?? null,
      })),
    });

    if (orderError || !result) {
      // place_order() raises specific, customer-useful messages ("Not enough
      // stock left for X — only 2 available", the rate-limit message, etc.)
      // — this was discarding all of that and always showing a generic
      // "Something went wrong," which is actively unhelpful for exactly the
      // cases (out of stock, too many recent orders) where the customer
      // needs to know what happened and what to do about it.
      setError(orderError?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    if (user) {
      await supabase.from('abandoned_carts')
        .update({ recovered_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('recovered_at', null);
    }

    setOrderNumber(result.order_number ?? result.order_id);
    const appliedGiftCard = Number(result.gift_card_applied_usd) || 0;
    setGiftCardApplied(appliedGiftCard);
    // COD confirms immediately either way. A gift card that fully covers the
    // order also confirms immediately regardless of the method picked (the
    // DB already does this — see place_order()'s v_status logic — this just
    // needs to route to the same screen instead of showing "pay via Whish/
    // Card" instructions for an order that's already fully paid).
    const fullyCoveredByGiftCard = appliedGiftCard > 0 && finalTotal - appliedGiftCard <= 0;
    setStage(method === 'cod' || fullyCoveredByGiftCard ? 'confirmed' : 'payment');
    setSubmitting(false);
    clear();
  };

  // -------------------------------------------------------------------------
  // CONFIRMED SCREEN (COD)
  // -------------------------------------------------------------------------
  if (stage === 'confirmed') {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center stage-pop">
        <div className="w-16 h-16 rounded-full bg-volt flex items-center justify-center mx-auto mb-6" style={{ boxShadow: '0 0 0 10px rgba(214,255,63,.15)' }}>
          <CheckIcon className="w-7 h-7 text-ink" />
        </div>
        <h1 className="font-display text-3xl mb-2">Order confirmed!</h1>
        <p className="text-steel text-sm mb-1">Order <span className="font-mono font-medium">{orderNumber}</span></p>
        {giftCardApplied > 0 && <p className="text-xs text-volt mb-1">${giftCardApplied.toFixed(2)} covered by your gift card</p>}
        <p className="text-steel text-sm mb-8">
          {method === 'cod'
            ? "We'll prepare your order and deliver it with cash on delivery. You'll receive a message before the driver heads out."
            : "Your gift card covered the full amount — nothing left to pay. We'll prepare your order and message you before the driver heads out."}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/account/orders" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press">
            Track your order
          </a>
          <Link href="/" className="inline-block text-sm text-steel underline underline-offset-2">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // PAYMENT INSTRUCTIONS SCREEN (non-COD)
  // -------------------------------------------------------------------------
  if (stage === 'payment') {
    const instructions = PAYMENT_INSTRUCTIONS[method];
    return (
      <main className="max-w-lg mx-auto px-6 py-16 stage-fade">
        <div className="rounded-3xl border border-black/10 dark:border-white/10 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-volt/20 flex items-center justify-center text-lg">
              {METHODS.find(m => m.value === method)?.icon}
            </div>
            <div>
              <h1 className="font-display text-2xl">{instructions?.title}</h1>
              <p className="text-steel text-sm">Order <span className="font-mono">{orderNumber}</span></p>
              {giftCardApplied > 0 && <p className="text-xs text-volt">${giftCardApplied.toFixed(2)} already covered by your gift card</p>}
            </div>
          </div>

          <div className="bg-black/5 dark:bg-white/5 rounded-2xl px-5 py-4 mb-6">
            <p className="text-xs text-steel uppercase tracking-wide mb-1">Amount to send</p>
            <p className="font-display text-3xl text-volt">{formatCurrency(finalTotal, currency)}</p>
          </div>

          <ol className="space-y-3 mb-8">
            {instructions?.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-volt/20 text-volt text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <a
            href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(`Hi, I just placed order ${orderNumber} and completed my ${METHODS.find(m => m.value === method)?.label} payment of $${finalTotal.toFixed(2)}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-[#25D366] text-white rounded-full py-3.5 font-medium mb-3 btn-press"
          >
            Confirm payment on WhatsApp
          </a>
          <a href="/account/orders" className="block text-center text-sm text-steel underline underline-offset-2">
            Track order status
          </a>
        </div>

        <p className="text-xs text-steel text-center mt-6">
          Your order is reserved. We'll confirm and ship once payment is received.
        </p>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // CHECKOUT FORM
  // -------------------------------------------------------------------------
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 stage-fade">
      {!signedIn && <SignupWelcomeBanner next="/checkout" className="mb-6" />}
      <h1 className="font-display text-3xl mb-8">{t('checkout.title')}</h1>
      <div className="grid md:grid-cols-5 gap-10">

        {/* Form */}
        <div className="md:col-span-3 space-y-8">

          {/* Delivery */}
          <section>
            <h2 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-chalk dark:bg-chalk dark:text-ink text-xs flex items-center justify-center font-bold">1</span>
              Delivery details
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input placeholder={`${t('checkout.name')} *`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              <input placeholder={`${t('checkout.phone')} *`} type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
              <input placeholder={t('checkout.email')} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`${inputCls} sm:col-span-2`} />
              <input placeholder={`${t('checkout.city')} *`} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={`${inputCls} sm:col-span-2`} />
              <input placeholder={`${t('checkout.address')} *`} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={`${inputCls} sm:col-span-2`} />
            </div>
          </section>

          {/* Payment */}
          <section>
            <h2 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-chalk dark:bg-chalk dark:text-ink text-xs flex items-center justify-center font-bold">2</span>
              {t('checkout.paymentMethod')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {METHODS.map(m => (
                <button key={m.value} onClick={() => setMethod(m.value)}
                  className={`border rounded-xl px-4 py-3.5 text-left transition-all btn-press ${
                    method === m.value
                      ? 'border-volt bg-volt/5 dark:bg-volt/10'
                      : 'border-black/15 dark:border-white/20 hover:border-black/30 dark:hover:border-white/30'
                  }`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span>{m.icon}</span>
                    <span className="text-sm font-medium">
                      {m.value === 'cod' ? t('checkout.cod') : m.value === 'card' ? t('checkout.card') : m.label}
                    </span>
                    {method === m.value && <CheckIcon className="w-3.5 h-3.5 text-volt ml-auto" />}
                  </div>
                  <p className="text-xs text-steel">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Payment method note */}
            {method !== 'cod' && (
              <div className="mt-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-3 text-sm text-steel">
                <span className="font-medium text-ink dark:text-chalk">How it works:</span>{' '}
                {method === 'whish_pay' && 'Your order is reserved, then we send you our Whish number to transfer the amount.'}
                {method === 'card' && 'Your order is reserved, then we send you a secure card payment link within 15 minutes.'}
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 sticky top-28">
            <h2 className="font-medium mb-4">Your order</h2>
            <div className="space-y-2 mb-4">
              {lines.map(l => (
                <div key={l.product.id + l.size} className="flex justify-between text-sm gap-2">
                  <span className="text-steel truncate">{l.product.name}{l.variant ? ` · ${l.variant}` : ''} ×{l.qty}</span>
                  <span className="tabular shrink-0">{formatCurrency((l.variantPrice ?? l.product.price) * l.qty, currency)}</span>
                </div>
              ))}
            </div>

            {/* Promo */}
            <div className="border-t border-black/10 dark:border-white/10 pt-4 mb-4">
              <div className="flex gap-2 mb-2">
                <input value={promoCode} onChange={e => setPromoCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyPromo()} placeholder="Promo code" className="flex-1 border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2 text-sm" />
                <button onClick={applyPromo} disabled={promoChecking} className="text-xs border border-black/15 dark:border-white/20 rounded-lg px-3 py-2 btn-press disabled:opacity-50">
                  {promoChecking ? '…' : 'Apply'}
                </button>
              </div>
              {promoMsg && <p className={`text-xs ${discount > 0 ? 'text-volt' : 'text-crimson'}`}>{promoMsg}</p>}
              {loyaltyMsg && <p className={`text-xs mt-1 ${loyaltyDiscount > 0 ? 'text-volt' : 'text-crimson'}`}>{loyaltyMsg}</p>}
            </div>

            {/* Gift card — applied for real at checkout, not previewed ahead of
                time, so there's nowhere for someone to probe codes for balance
                without actually spending an attempt against the rate limiter. */}
            <div className="border-t border-black/10 dark:border-white/10 pt-4 mb-4">
              <input
                value={giftCardCode}
                onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                placeholder="Gift card code (optional)"
                className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5 text-sm border-t border-black/10 dark:border-white/10 pt-4 mb-5">
              {welcomeDiscount > 0 && (
                <div className="flex justify-between"><span className="text-steel">Welcome discount</span><span className="text-crimson tabular">−{formatCurrency(welcomeDiscount, currency)}</span></div>
              )}
              {signupWelcome > 0 && (
                <div className="flex justify-between"><span className="text-steel">New customer discount (10%)</span><span className="text-crimson tabular">−{formatCurrency(signupWelcome, currency)}</span></div>
              )}
              {discount > 0 && (
                <div className="flex justify-between"><span className="text-steel">Promo</span><span className="text-crimson tabular">−{formatCurrency(discount, currency)}</span></div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between"><span className="text-steel">Loyalty points ({loyaltyPoints})</span><span className="text-crimson tabular">−{formatCurrency(loyaltyDiscount, currency)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-steel">Shipping</span><span className={subtotal >= settings.freeShippingThreshold ? 'text-volt font-medium' : 'text-steel'}>{subtotal >= settings.freeShippingThreshold ? 'Free' : 'COD'}</span></div>
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total</span>
                <span className="tabular">{formatCurrency(finalTotal, currency)}</span>
              </div>
            </div>

            {error && <p className="text-xs text-crimson mb-3">{error}</p>}

            <button onClick={placeOrder} disabled={submitting || lines.length === 0}
              className="w-full bg-volt text-ink rounded-full py-4 font-semibold text-sm btn-press disabled:opacity-50">
              {submitting ? 'Placing order…' : method === 'cod' ? t('checkout.placeOrder') : 'Reserve & pay →'}
            </button>
            <p className="text-[10px] text-steel text-center mt-2">
              {method === 'cod'
                ? 'Pay cash when your order arrives.'
                : 'Your order is reserved. Payment instructions follow.'}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
