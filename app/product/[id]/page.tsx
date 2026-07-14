import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductById, getReviews, getProducts, getFrequentlyBoughtWith } from '@/lib/data';
import ProductDetail from '@/components/ProductDetail';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};

  const title = `${product.name} — ${product.team}`;
  const description = `${product.name} for ${product.team}. Authentic gear, shipped across Lebanon with cash on delivery.`;
  const image = product.image || product.images?.[0];

  return {
    title,
    description,
    openGraph: { title, description, images: image ? [{ url: image }] : undefined, type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return notFound();

  const reviews = await getReviews(product.id);

  // "Customers who bought this also bought" — real purchase data first.
  // Only backfills with the same-league/category guess when there isn't
  // enough order history yet (new product, or just low volume so far).
  let related = await getFrequentlyBoughtWith(product.id, 4);

  if (related.length < 4) {
    const pool = product.leagueSlug
      ? await getProducts({ leagueSlug: product.leagueSlug })
      : await getProducts({ category: product.category });
    const backfill = pool.filter(p => p.id !== product.id && !related.some(r => r.id === p.id));
    related = [...related, ...backfill];
  }
  // Still thin (e.g. a league with only a couple of products)? Pull from the whole catalog.
  if (related.length < 4) {
    const all = await getProducts();
    const extra = all.filter(p => p.id !== product.id && !related.some(r => r.id === p.id));
    related = [...related, ...extra].slice(0, 4);
  }

  return <ProductDetail product={product} initialReviews={reviews} related={related} />;
}
