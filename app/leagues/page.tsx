import Link from 'next/link';
import { getLeagues } from '@/lib/data';
import LeagueCrest from '@/components/LeagueCrest';
import DiagonalSplitBg from '@/components/DiagonalSplitBg';
import { Reveal } from '@/components/Motion';

export default async function LeaguesPage() {
  const leagues = await getLeagues();

  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="font-display text-4xl mb-8">All Leagues</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {leagues.map((l, i) => (
          <Reveal key={l.slug} delay={(i % 3) * 80}>
            <Link
              href={`/leagues/${l.slug}`}
              className="relative overflow-hidden rounded-2xl h-64 card-premium block"
            >
              <DiagonalSplitBg color={l.primary} />
              <div className="relative z-10 h-full flex flex-col justify-between p-8">
                <div>
                  <span className="text-ink/60 text-xs uppercase tracking-widest2">{l.country}</span>
                  <div className="mt-4">
                    <LeagueCrest league={l} size={80} />
                  </div>
                </div>
                <span className="font-display text-white text-2xl self-end text-right" style={{ fontFamily: l.font }}>{l.name}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
