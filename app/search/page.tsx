import { searchProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const results = await searchProducts(q);

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-2">Search results</h1>
      <p className="text-steel mb-8">{q ? `${results.length} results for "${q}"` : 'Type something to search.'}</p>
      {q && results.length === 0 ? (
        <p className="text-steel">
          Nothing matched "{q}" yet. Try a team, a league, or a product type like "socks" or "shin pads".
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {results.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  );
}
