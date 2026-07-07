import { getProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';
import Link from 'next/link';

export default async function MenSportswearPage() {
  const all = await getProducts({ category: 'sportswear' });
  const products = all.filter(p => p.gender === 'male' || p.gender === 'unisex');

  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-ink text-chalk p-10 md:p-14 mb-10 grain">
        <div className="glow-orb w-80 h-80 bg-volt -top-20 -right-16 opacity-25" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-15" style={{ background: 'repeating-linear-gradient(-45deg, #D6FF3F 0 2px, transparent 2px 18px)' }} />
        <div className="relative z-10">
          <Link href="/shop/sportswear" className="text-volt text-xs uppercase tracking-widest2 hover:underline underline-offset-2">← All sportswear</Link>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight">Men's Sportswear</h1>
          <p className="text-chalk/60 mt-3 max-w-md">Training tops, track jackets, hoodies, and match-day layers — built for the grind, styled for the terrace.</p>
        </div>
      </div>

      <p className="text-steel text-sm mb-6">{products.length} product{products.length === 1 ? '' : 's'}</p>

      {products.length === 0 ? (
        <p className="text-steel py-16 text-center">Nothing here yet — check back after the next drop.</p>
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
