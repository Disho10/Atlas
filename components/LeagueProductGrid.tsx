'use client';

import { useMemo, useState } from 'react';
import { Product } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';

export default function LeagueProductGrid({ products }: { products: Product[] }) {
  const [team, setTeam] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'relevance' | 'price-asc' | 'price-desc' | 'newest'>('relevance');
  const teams = Array.from(new Set(products.map(p => p.team)));
  const maxPrice = useMemo(() => Math.max(1, ...products.map(p => p.price)), [products]);
  const [priceCeil, setPriceCeil] = useState<number | null>(null);
  const effectiveCeil = priceCeil ?? maxPrice;

  const filtered = useMemo(() => {
    const base = products.filter(p =>
      (team === 'all' || p.team === team) &&
      (category === 'all' || p.category === category) &&
      p.price <= effectiveCeil
    );
    const sorted = [...base];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return sorted;
  }, [products, team, category, effectiveCeil, sort]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select label="Team" allLabel="All Teams" value={team} onChange={setTeam} options={['all', ...teams]} />
        <Select label="Category" allLabel="All Categories" value={category} onChange={setCategory} options={['all', 'shirts', 'socks', 'balls', 'shinpads']} />
        <label className="text-sm">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="border border-black/15 dark:border-white/20 bg-transparent rounded-full px-4 py-2 btn-press"
          >
            <option value="relevance">Sort: featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3 mb-8 max-w-sm">
        <label htmlFor="league-price-range" className="text-xs text-steel shrink-0">Max price</label>
        <input
          id="league-price-range"
          type="range"
          min={0}
          max={maxPrice}
          step={1}
          value={effectiveCeil}
          onChange={e => setPriceCeil(Number(e.target.value))}
          className="range-volt flex-1"
          style={{ backgroundImage: `linear-gradient(to right, #D6FF3F ${(effectiveCeil / maxPrice) * 100}%, transparent ${(effectiveCeil / maxPrice) * 100}%)` }}
        />
        <span className="text-xs tabular w-14 text-right font-medium">${effectiveCeil}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-steel py-16 text-center">No products match those filters yet.</p>
      ) : (
        // key on the filter state re-triggers the fade each time results change
        <div key={`${team}-${category}-${sort}-${effectiveCeil}`} className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 animate-rise">
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
