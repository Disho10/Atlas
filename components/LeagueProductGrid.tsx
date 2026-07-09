'use client';

import { useMemo, useState } from 'react';
import { Product } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';

export default function LeagueProductGrid({ products }: { products: Product[] }) {
  const [team, setTeam] = useState('all');
  const [category, setCategory] = useState('all');
  const teams = Array.from(new Set(products.map(p => p.team)));

  const filtered = useMemo(
    () => products.filter(p => (team === 'all' || p.team === team) && (category === 'all' || p.category === category)),
    [products, team, category]
  );

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-8">
        <Select label="Team" allLabel="All Teams" value={team} onChange={setTeam} options={['all', ...teams]} />
        <Select label="Category" allLabel="All Categories" value={category} onChange={setCategory} options={['all', 'shirts', 'socks', 'balls', 'shinpads', 'sportswear']} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-steel py-16 text-center">No products match those filters yet.</p>
      ) : (
        // key on the filter state re-triggers the fade each time results change
        <div key={`${team}-${category}`} className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 animate-rise">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </>
  );
}

function Select({ label, allLabel, value, onChange, options }: { label: string; allLabel: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-black/15 dark:border-white/20 bg-transparent rounded-full px-4 py-2 capitalize btn-press"
      >
        {options.map(o => (
          <option key={o} value={o} className="text-ink">
            {o === 'all' ? allLabel : o}
          </option>
        ))}
      </select>
    </label>
  );
}
