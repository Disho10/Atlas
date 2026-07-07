import { getProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';
import Link from 'next/link';

export default async function WomenSportswearPage() {
  const all = await getProducts({ category: 'sportswear' });
  const products = all.filter(p => p.gender === 'female' || p.gender === 'unisex');

  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 mb-10" style={{ background: 'linear-gradient(150deg, #E63946 0%, #8f1d27 70%, #0B0D10 130%)' }}>
        <svg className="absolute -bottom-10 -right-10 w-72 h-72 opacity-15" viewBox="0 0 100 100" fill="none" stroke="#F5F3EE" strokeWidth="1.2">
          <circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="36" /><circle cx="50" cy="50" r="24" /><circle cx="50" cy="50" r="12" />
        </svg>
        <div className="relative z-10 text-chalk">
          <Link href="/shop/sportswear" className="text-chalk/80 text-xs uppercase tracking-widest2 hover:underline underline-offset-2">← All sportswear</Link>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight">Women's Sportswear</h1>
          <p className="text-chalk/70 mt-3 max-w-md">Tech hoodies, training fits, and everyday sport — power in motion, on and off the pitch.</p>
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
