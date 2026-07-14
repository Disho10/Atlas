import { cookies } from 'next/headers';
import { getProducts } from '@/lib/data';
import { translate, type Locale } from '@/lib/i18n/dictionary';
import { COOKIE_NAME } from '@/lib/i18n/LocaleProvider';
import GlitchText from '@/components/GlitchText';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';

// "Retro" is a tag (product_tags → tags.label = 'Retro'), not a product
// category — reuses the same tagging system already driving the
// nationality/player filters on /search, rather than a new category enum
// value that would need a schema migration. Staff apply the tag from the
// product edit form same as any other tag.
export default async function RetroPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(COOKIE_NAME)?.value === 'ar' ? 'ar' : 'en') as Locale;
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const all = await getProducts();
  const products = all.filter(p => p.tags.some(tag => tag.toLowerCase() === 'retro'));

  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      <div className="relative overflow-hidden rounded-3xl bg-ink text-chalk p-10 md:p-14 mb-10 grain">
        <div className="glow-orb w-80 h-80 bg-crimson -top-20 -right-16 opacity-20" />
        <div className="relative z-10">
          <span className="text-volt text-xs uppercase tracking-widest2">{t('home.retroBadge')}</span>
          <GlitchText
            as="h1"
            text={t('retro.title')}
            className="font-display text-6xl md:text-7xl mt-3 leading-none block"
          />
          <p className="text-chalk/60 mt-4 max-w-md">{t('retro.subtitle')}</p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-steel py-16 text-center">{t('retro.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 80}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}
