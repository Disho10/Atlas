'use client';

import { Product } from '@/lib/mockData';
import ProductCard from './ProductCard';
import { Reveal } from './Motion';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { TranslationKey } from '@/lib/i18n/dictionary';

export default function ProductRail({ titleKey, subtitleKey, products }: { titleKey: TranslationKey; subtitleKey?: TranslationKey; products: Product[] }) {
  const { t } = useLocale();
  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <Reveal>
        <div className="mb-5">
          <h2 className="font-display text-2xl">{t(titleKey)}</h2>
          {subtitleKey && <p className="text-sm text-steel mt-1">{t(subtitleKey)}</p>}
        </div>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {products.map((p, i) => (
          <Reveal key={p.id} delay={i * 90}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
