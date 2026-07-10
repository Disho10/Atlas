'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function SportswearPromo() {
  const { t } = useLocale();
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="rounded-3xl bg-pitch text-chalk p-10 md:p-14 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="text-volt text-xs uppercase tracking-widest2">{t('home.sportswearBadge')}</span>
          <h2 className="font-display text-4xl mt-3 leading-tight">{t('home.sportswearHeadline')}</h2>
          <p className="text-chalk/70 mt-4 max-w-sm">
            {t('home.sportswearBody')}
          </p>
          <a href="/shop/sportswear" className="inline-block mt-6 bg-volt text-ink px-6 py-3 rounded-full text-sm font-medium">
            {t('home.shopSportswear')}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="aspect-square rounded-2xl bg-white/10" />
          <div className="aspect-square rounded-2xl bg-white/10 mt-6" />
        </div>
      </div>
    </section>
  );
}
