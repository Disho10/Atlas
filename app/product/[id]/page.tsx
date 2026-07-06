import { notFound } from 'next/navigation';
import { getProductById, getReviews, getProducts } from '@/lib/data';
import ProductDetail from '@/components/ProductDetail';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return notFound();

  const reviews = await getReviews(product.id);

  // Related: same league if it has one, otherwise same category. Exclude self.
  const pool = product.leagueSlug
    ? await getProducts({ leagueSlug: product.leagueSlug })
    : await getProducts({ category: product.category });
  let related = pool.filter(p => p.id !== product.id);
  // Backfill from the general catalog if the pool is thin.
  if (related.length < 4) {
    const all = await getProducts();
    const extra = all.filter(p => p.id !== product.id && !related.some(r => r.id === p.id));
    related = [...related, ...extra].slice(0, 4);
  }

  return <ProductDetail product={product} initialReviews={reviews} related={related} />;
}
