'use client';

import { useMemo, useState } from 'react';
import { Product } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';

export default function LeagueProductGrid({ products }: { products: Product[] }) {
  const [team, setTeam] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'relevance' | 'price-asc' | 'price-desc' | 'newest'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
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

  const activeFilters = [team, category].filter(v => v !== 'all').length + (priceCeil != null && priceCeil < maxPrice ? 1 : 0);

  return (
    <>
      {/* Filters toggle + sort — same retractable pattern as the search page */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setShowFilters(s => !s)}
          aria-expanded={showFilters}
          className={`flex items-center gap-2 text-sm rounded-full px-4 py-2 border transition-colors btn-press ${showFilters ? 'border-volt bg-volt/10' : 'border-black/15 dark:border-white/20'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filters
          {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-volt text-ink text-[11px] font-semibold flex items-center justify-center">{activeFilters}</span>}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
        </button>

        <label className="text-sm ml-auto">
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

        {activeFilters > 0 && (
          <button onClick={() => { setTeam('all'); setCategory('all'); setPriceCeil(null); }} className="text-sm underline underline-offset-2 text-steel px-2 btn-press">
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Retractable filter panel — same grid-template-rows collapse as SearchClient */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out mb-4 ${showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.03]">
            <Select label="Team" allLabel="All Teams" value={team} onChange={setTeam} options={['all', ...teams]} />
            <Select label="Category" allLabel="All Categories" value={category} onChange={setCategory} options={['all', 'shirts', 'socks', 'balls', 'shinpads']} />

            <div className="flex items-center gap-3 w-full max-w-sm pt-2">
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
          </div>
        </div>
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
