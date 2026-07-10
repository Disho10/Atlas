'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Product } from '@/lib/mockData';
import ProductImage from './ProductImage';
import TiltCard from './TiltCard';
import { Reveal } from './Motion';

export default function SportswearPromo({ products = [] }: { products?: Product[] }) {
  const { t } = useLocale();
  const [a, b] = products;

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="rounded-3xl bg-pitch text-chalk p-10 md:p-14 grid md:grid-cols-2 gap-10 items-center overflow-hidden">
        <Reveal variant="left">
          <span className="text-volt text-xs uppercase tracking-widest2">{t('home.sportswearBadge')}</span>
          <h2 className="font-display text-4xl mt-3 leading-tight">{t('home.sportswearHeadline')}</h2>
          <p className="text-chalk/70 mt-4 max-w-sm">
            {t('home.sportswearBody')}
          </p>
          <a href="/shop/sportswear" className="inline-block mt-6 bg-volt text-ink px-6 py-3 rounded-full text-sm font-medium btn-press">
            {t('home.shopSportswear')}
          </a>
        </Reveal>
        <Reveal variant="scale">
          <div className="grid grid-cols-2 gap-4">
            <TiltCard className="aspect-[4/5] rounded-2xl overflow-hidden bg-white/10 relative" intensity={10}>
              {a ? (
                <ProductImage src={a.image} alt={a.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 grain" />
              )}
            </TiltCard>
            <TiltCard className="aspect-[4/5] rounded-2xl overflow-hidden bg-white/10 relative mt-10" intensity={10}>
              {b ? (
                <ProductImage src={b.image} alt={b.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 grain" />
              )}
            </TiltCard>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
