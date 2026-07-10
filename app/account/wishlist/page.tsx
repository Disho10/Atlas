'use client';

import { useWishlist } from '@/components/Providers';
import { products } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import Link from 'next/link';

export default function WishlistPage() {
  const { ids, toggle } = useWishlist();
  const { t } = useLocale();
  const items = products.filter(p => ids.includes(p.id));

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">{t('account.wishlistTitle')}</h1>
          <p className="text-steel text-sm mt-1">
            {items.length === 0 ? t('account.nothingSavedYet') : `${items.length} saved item${items.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {items.length > 0 && (
          <Link href="/" className="text-sm underline underline-offset-2 text-steel">{t('account.continueBrowsing')}</Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-dashed border-black/15 dark:border-white/15">
          <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-steel">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl mb-2">{t('account.nothingSavedYet')}</h2>
          <p className="text-steel text-sm mb-6 max-w-xs mx-auto">
            {t('account.tapHeartToSave')}
          </p>
          <Link href="/" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press text-sm">
            {t('account.startBrowsing')}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            {items.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>

          {/* Clear all */}
          <div className="mt-10 text-center">
            <button
              onClick={() => items.forEach(p => toggle(p.id))}
              className="text-sm text-steel underline underline-offset-2 hover:text-crimson transition-colors"
            >
              {t('account.clearWishlist')}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
