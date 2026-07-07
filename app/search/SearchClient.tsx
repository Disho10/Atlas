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

  const teams = useMemo(() => Array.from(new Set(products.map(p => p.team))).sort(), [products]);
  // Nationality/player/attribute tags all come from the product tag list.
  const tags = useMemo(() => Array.from(new Set(products.flatMap(p => p.tags))).sort(), [products]);

  const filtered = useMemo(() => {
    const t = text.toLowerCase().trim();
    return products.filter(p =>
      (team === 'all' || p.team === team) &&
      (league === 'all' || p.leagueSlug === league) &&
      (category === 'all' || p.category === category) &&
      (gender === 'all' || p.gender === gender || p.gender === 'unisex') &&
      (tag === 'all' || p.tags.includes(tag)) &&
      (!t || p.name.toLowerCase().includes(t) || p.team.toLowerCase().includes(t) || p.tags.some(x => x.toLowerCase().includes(t)))
    );
  }, [products, team, league, category, gender, tag, text]);

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
      <div className="flex flex-wrap gap-2 mb-8">
        <Filter label="Team" value={team} onChange={setTeam} options={['all', ...teams]} />
        <Filter label="League" value={league} onChange={setLeague} options={['all', ...leagues.map(l => l.slug)]} display={v => leagues.find(l => l.slug === v)?.name ?? v} />
        <Filter label="Category" value={category} onChange={setCategory} options={['all', 'shirts', 'socks', 'balls', 'shinpads', 'sportswear']} />
        <Filter label="Gender" value={gender} onChange={setGender} options={['all', 'male', 'female', 'unisex']} />
        <Filter label="Tag / nationality / player" value={tag} onChange={setTag} options={['all', ...tags]} />
        {activeFilters > 0 && (
          <button onClick={() => { setTeam('all'); setLeague('all'); setCategory('all'); setGender('all'); setTag('all'); }} className="text-sm underline underline-offset-2 text-steel px-2">
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-steel py-16 text-center">Nothing matches those filters. Try widening them.</p>
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
