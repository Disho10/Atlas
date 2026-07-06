import Link from 'next/link';
import { leagues } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';
import DiagonalSplitBg from './DiagonalSplitBg';

export default function CategorySlider() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-2xl">Shop by League</h2>
        <Link href="/leagues" className="text-sm chip-underline">View all</Link>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-3 -mx-6 px-6 snap-x">
        {leagues.map(l => (
          <Link
            key={l.slug}
            href={`/leagues/${l.slug}`}
            className="relative overflow-hidden snap-start shrink-0 w-56 rounded-2xl h-60 card-premium"
          >
            <DiagonalSplitBg color={l.primary} />
            <div className="relative z-10 h-full flex flex-col justify-between p-6">
              <div>
                <span className="text-ink/60 text-xs uppercase tracking-widest2">{l.country}</span>
                <div className="mt-4">
                  <LeagueCrest league={l} size={68} />
                </div>
              </div>
              <span className="font-display text-white text-2xl leading-tight self-end text-right">{l.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
