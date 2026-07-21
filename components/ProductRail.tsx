'use client';

import { Product } from '@/lib/mockData';
import ProductCard from './ProductCard';
import ArrowRail from './ArrowRail';
import { Reveal } from './Motion';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { TranslationKey } from '@/lib/i18n/dictionary';

// layout="scroll" renders a horizontal arrow-paged rail (ArrowRail) instead
// of the default 4-up grid — per the second design handoff's "New arrivals"
// treatment. Grid stays the default so existing usages are unchanged.
export default function ProductRail({ titleKey, subtitleKey, products, showNewBadge = false, layout = 'grid' }: { titleKey: TranslationKey; subtitleKey?: TranslationKey; products: Product[]; showNewBadge?: boolean; layout?: 'grid' | 'scroll' }) {
  const { t } = useLocale();
  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <Reveal>
        <div className="mb-5">
          <h2 className="font-display text-2xl">{t(titleKey)}</h2>
          {subtitleKey && <p className="text-sm text-steel mt-1">{t(subtitleKey)}</p>}
        </div>
      </Reveal>
      {layout === 'scroll' ? (
        <ArrowRail>
          {products.map((p, i) => (
            <Reveal key={p.id} delay={i * 90} className="shrink-0 w-[240px] sm:w-[260px]">
              <ProductCard product={p} isNew={showNewBadge} />
            </Reveal>
          ))}
        </ArrowRail>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <ProductCard product={p} isNew={showNewBadge} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
