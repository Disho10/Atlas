import { getProducts } from '@/lib/data';
import SportswearGrid from '@/components/SportswearGrid';

export default async function SportswearPage() {
  const products = await getProducts({ category: 'sportswear' });

  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="font-display text-4xl mb-2">General Sportswear</h1>
      <p className="text-steel mb-8">Training wear for men and women, on and off the pitch.</p>
      <SportswearGrid products={products} />
    </main>
  );
}
