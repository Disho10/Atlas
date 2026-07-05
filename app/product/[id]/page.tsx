import { notFound } from 'next/navigation';
import { getProductById, getReviews } from '@/lib/data';
import ProductDetail from '@/components/ProductDetail';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) return notFound();

  const reviews = await getReviews(product.id);

  return <ProductDetail product={product} initialReviews={reviews} />;
}
