'use client';

import { useState } from 'react';
import { Product } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';

export default function SportswearGrid({ products }: { products: Product[] }) {
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const items = products.filter(p => gender === 'all' || p.gender === gender || p.gender === 'unisex');

  return (
    <>
      <div className="flex gap-2 mb-8">
        {(['all', 'male', 'female'] as const).map(g => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={`px-4 py-2 rounded-full text-sm capitalize border ${gender === g ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}
          >
            {g === 'all' ? 'All' : g === 'male' ? "Men's" : "Women's"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {items.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </>
  );
}
