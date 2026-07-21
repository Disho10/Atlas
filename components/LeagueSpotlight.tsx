import { League, Product } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';
import ProductCard from './ProductCard';
import { Reveal } from './Motion';

// Mirrors ProductRail's layout/spacing exactly, but takes a real League
// object for its header (crest + name + "View all" → the existing
// /leagues/[slug] page) instead of a static i18n titleKey — league names
// are dynamic data from the leagues table, not fixed UI copy, so they
// don't belong in the translation dictionary the way ProductRail's
// section titles do.
export default function LeagueSpotlight({ league, products }: { league: League; products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <Reveal>
        <div className="flex items-center justify-between mb-5 gap-4">
          <div className="flex items-center gap-3">
            <LeagueCrest league={league} size={36} />
            <h2 className="font-display text-2xl">{league.name}</h2>
          </div>
          <a href={`/leagues/${league.slug}`} className="text-sm underline shrink-0 hover:text-volt transition-colors">
            View all →
          </a>
        </div>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {products.slice(0, 4).map((p, i) => (
          <Reveal key={p.id} delay={i * 90}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
