'use client';

import { useWishlist } from '@/components/Providers';
import { products } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

export default function WishlistPage() {
  const { ids } = useWishlist();
  const items = products.filter(p => ids.includes(p.id));

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Wishlist</h1>
      {items.length === 0 ? (
        <p className="text-steel">
          Nothing saved yet. Tap the heart on any product to add it here —{' '}
          <Link href="/" className="underline">start browsing</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {items.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  );
}
