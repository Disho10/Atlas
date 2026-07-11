'use client';

import { useMemo, useState } from 'react';
import { Product } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';

// Filters: team, nationality (via tags), league, category, gender. "Player"
// searches also fall out of tags, since player names live in product tags.
export default function SearchClient({ query, products, leagues }: {
  query: string; products: Product[]; leagues: { slug: string; name: string }[];
}) {
  const [team, setTeam] = useState('all');
  const [league, setLeague] = useState('all');
  const [category, setCategory] = useState('all');
  const [gender, setGender] = useState('all');
  const [tag, setTag] = useState('all');
  const [text, setText] = useState('');
  const [sort, setSort] = useState<'relevance' | 'price-asc' | 'price-desc' | 'newest'>('relevance');

  const maxPrice = useMemo(() => Math.max(1, ...products.map(p => p.price)), [products]);
  // null = "no filter applied yet", so it naturally tracks maxPrice until the
  // person actually touches the slider — no effect/sync needed.
  const [priceCeil, setPriceCeil] = useState<number | null>(null);
  const effectiveCeil = priceCeil ?? maxPrice;

  const teams = useMemo(() => Array.from(new Set(products.map(p => p.team))).sort(), [products]);
  // Nationality/player/attribute tags all come from the product tag list.
  const tags = useMemo(() => Array.from(new Set(products.flatMap(p => p.tags))).sort(), [products]);

  const filtered = useMemo(() => {
    const t = text.toLowerCase().trim();
    const base = products.filter(p =>
      (team === 'all' || p.team === team) &&
      (league === 'all' || p.leagueSlug === league) &&
      (category === 'all' || p.category === category) &&
      (gender === 'all' || p.gender === gender || p.gender === 'unisex') &&
      (tag === 'all' || p.tags.includes(tag)) &&
      p.price <= effectiveCeil &&
      (!t || p.name.toLowerCase().includes(t) || p.team.toLowerCase().includes(t) || p.tags.some(x => x.toLowerCase().includes(t)))
    );
    const sorted = [...base];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return sorted;
  }, [products, team, league, category, gender, tag, text, effectiveCeil, sort]);

  const activeFilters = [team, league, category, gender, tag].filter(v => v !== 'all').length;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-2">{query ? `Results for "${query}"` : 'Search & filter'}</h1>
      <p className="text-steel mb-6">{filtered.length} product{filtered.length === 1 ? '' : 's'}</p>

      {/* Refine text search (name / team / player / nationality via tags) */}
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Refine by name, team, player, or nationality…"
        className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm mb-4"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Filter label="Team" value={team} onChange={setTeam} options={['all', ...teams]} />
        <Filter label="League" value={league} onChange={setLeague} options={['all', ...leagues.map(l => l.slug)]} display={v => leagues.find(l => l.slug === v)?.name ?? v} />
        <Filter label="Category" value={category} onChange={setCategory} options={['all', 'shirts', 'socks', 'balls', 'shinpads', 'sportswear']} />
        <Filter label="Gender" value={gender} onChange={setGender} options={['all', 'male', 'female', 'unisex']} />
        <Filter label="Tag / nationality / player" value={tag} onChange={setTag} options={['all', ...tags]} />
        <label className="text-sm">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="border border-black/15 dark:border-white/20 bg-transparent rounded-full px-4 py-2 max-w-[180px]"
          >
            <option value="relevance">Sort: relevance</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        {activeFilters > 0 && (
          <button onClick={() => { setTeam('all'); setLeague('all'); setCategory('all'); setGender('all'); setTag('all'); setPriceCeil(null); }} className="text-sm underline underline-offset-2 text-steel px-2 btn-press">
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Price range */}
      <div className="flex items-center gap-3 mb-8 max-w-sm">
        <label htmlFor="price-range" className="text-xs text-steel shrink-0">Max price</label>
        <input
          id="price-range"
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
        <div className="text-center py-24 rounded-3xl border border-dashed border-black/15 dark:border-white/15">
          <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-steel">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h2 className="font-display text-2xl mb-2">Nothing matches</h2>
          <p className="text-steel text-sm mb-6 max-w-xs mx-auto">Try widening your filters or searching a different term.</p>
          {activeFilters > 0 && (
            <button onClick={() => { setTeam('all'); setLeague('all'); setCategory('all'); setGender('all'); setTag('all'); setPriceCeil(null); }} className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press text-sm">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 70}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}

function Filter({ label, value, onChange, options, display }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; display?: (v: string) => string;
}) {
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-black/15 dark:border-white/20 bg-transparent rounded-full px-4 py-2 max-w-[180px] truncate"
      >
        <option value="all">{label}: all</option>
        {options.filter(o => o !== 'all').map(o => (
          <option key={o} value={o} className="text-ink">{display ? display(o) : o}</option>
        ))}
      </select>
    </label>
  );
}
