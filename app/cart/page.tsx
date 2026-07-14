'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart, useCurrency } from '@/components/Providers';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { formatCurrency } from '@/lib/mockData';
import { Reveal } from '@/components/Motion';

export default function CartPage() {
  const { lines, remove, setQty, subtotal, hydrated } = useCart();
  const { currency } = useCurrency();
  const { t } = useLocale();
  const FREE_SHIPPING = 110;
  const toFreeShipping = Math.max(0, FREE_SHIPPING - subtotal);
  const freeShipping = subtotal >= FREE_SHIPPING;

  // Before hydration finishes reading the persisted cart, lines is always
  // [] — without this, anyone landing on /cart with real items would see a
  // flash of "Your cart is empty" for a frame before the real cart appears.
  if (!hydrated) return <main className="max-w-3xl mx-auto px-6 py-32" />;

  if (lines.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-32 text-center">
        <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-steel">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
          </svg>
        </div>
        <h1 className="font-display text-3xl mb-3">{t('cart.empty')}</h1>
        <p className="text-steel mb-8">Nothing here yet — go find your next kit.</p>
        <Link href="/" className="inline-block bg-volt text-ink px-8 py-3.5 rounded-full font-medium btn-press">
          {t('cart.continueShopping')}
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <Reveal>
      <h1 className="font-display text-3xl mb-8">{t('cart.title')} <span className="text-steel text-xl font-sans">({lines.reduce((s, l) => s + l.qty, 0)} items)</span></h1>

      {/* Free shipping progress */}
      <div className="rounded-2xl bg-black/5 dark:bg-white/5 px-5 py-4 mb-8">
        {freeShipping ? (
          <p className="text-sm font-medium text-pitch dark:text-volt flex items-center gap-2">
            <span>✓</span> You've unlocked free shipping!
          </p>
        ) : (
          <div>
            <p className="text-sm mb-2">Add <span className="font-medium">${toFreeShipping.toFixed(0)}</span> more for free shipping</p>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-volt rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-10">
        {/* Items */}
        <div className="md:col-span-2 space-y-4">
          {lines.map(l => (
            <div key={l.product.id + l.size + l.variant} className="flex gap-4 rounded-2xl border border-black/10 dark:border-white/10 p-4 card-hover">
              <div className="relative w-24 h-28 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
                {l.product.image && <Image src={l.product.image} alt={l.product.name} fill className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-sm leading-tight">{l.product.name}</p>
                  <p className="font-semibold tabular shrink-0">{formatCurrency((l.variantPrice ?? l.product.price) * l.qty, currency)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[11px] border border-black/10 dark:border-white/10 rounded-full px-2 py-0.5 text-steel">Size {l.size}</span>
                  {l.variant && <span className="text-[11px] border border-black/10 dark:border-white/10 rounded-full px-2 py-0.5 text-steel">{l.variant}</span>}
                  <span className="text-[11px] text-steel">{formatCurrency(l.variantPrice ?? l.product.price, currency)} each</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-black/15 dark:border-white/20 rounded-full">
                    <button onClick={() => setQty(l.product.id, l.size, l.qty - 1)} className="w-8 h-8 text-lg leading-none btn-press">−</button>
                    <span className="w-8 text-center text-sm tabular">{l.qty}</span>
                    <button onClick={() => setQty(l.product.id, l.size, l.qty + 1)} className="w-8 h-8 text-lg leading-none btn-press">+</button>
                  </div>
                  <button onClick={() => remove(l.product.id, l.size)} className="text-xs text-steel hover:text-crimson transition-colors btn-press">{t('cart.remove')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="md:col-span-1">
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 sticky top-28">
            <h2 className="font-medium mb-4">Order summary</h2>
            <div className="space-y-2 text-sm mb-4">
              {lines.map(l => (
                <div key={l.product.id + l.size} className="flex justify-between">
                  <span className="text-steel truncate mr-2">{l.product.name.split(' ').slice(0, 3).join(' ')} ×{l.qty}</span>
                  <span className="tabular shrink-0">{formatCurrency((l.variantPrice ?? l.product.price) * l.qty, currency)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black/10 dark:border-white/10 pt-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-steel">{t('cart.subtotal')}</span>
                <span className="tabular">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel">Shipping</span>
                <span className={freeShipping ? 'text-pitch dark:text-volt font-medium' : 'text-steel'}>
                  {freeShipping ? 'Free' : 'Calculated at checkout'}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total</span>
                <span className="tabular">{formatCurrency(subtotal, currency)}</span>
              </div>
            </div>
            <Link href="/checkout" className="block text-center bg-volt text-ink rounded-full py-4 font-semibold text-sm btn-press">
              {t('cart.checkout')} →
            </Link>
            <Link href="/" className="inline-block text-sm text-steel mt-3 nav-sweep pb-0.5">
              {t('cart.continueShopping')}
            </Link>

            {/* Trust strip */}
            <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 grid grid-cols-3 gap-2 text-center text-[10px] text-steel">
              <div className="flex flex-col items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></svg>
                2–4 day delivery
              </div>
              <div className="flex flex-col items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
                Cash on delivery
              </div>
              <div className="flex flex-col items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 109-9" /><path d="M3 4v5h5" /></svg>
                14-day returns
              </div>
            </div>
          </div>
        </div>
      </div>
      </Reveal>
    </main>
  );
}
