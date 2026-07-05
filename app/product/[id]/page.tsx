import { notFound } from 'next/navigation';
import { getProductById, getReviews } from '@/lib/data';
import ProductDetail from '@/components/ProductDetail';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return notFound();

  const reviews = await getReviews(product.id);

  return <ProductDetail product={product} initialReviews={reviews} />;
}
