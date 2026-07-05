import { notFound } from 'next/navigation';
import { getLeagues, getProducts } from '@/lib/data';
import LeagueProductGrid from '@/components/LeagueProductGrid';
import LeagueCrest from '@/components/LeagueCrest';
import DiagonalSplitBg from '@/components/DiagonalSplitBg';

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leagues = await getLeagues();
  const league = leagues.find(l => l.slug === slug);
  if (!league) return notFound();

  const leagueProducts = await getProducts({ leagueSlug: league.slug });

  return (
    <main>
      {/* Category header — locked to this league's own colors, per the category styling rule.
          Colors come from the `leagues` table's primary_color/secondary_color, editable only
          by Owner/Manager via the RLS policy in supabase/migrations/0002_rls.sql.
          The white/color split uses clip-path (not a gradient hard-stop) so the safe zones for
          the logo and the title stay solid regardless of viewport width — a gradient angle
          bends differently depending on the box's aspect ratio and was cutting through the text. */}
      <section className="relative overflow-hidden min-h-[70vh] flex flex-col justify-between pt-20 pb-40">
        <DiagonalSplitBg color={league.primary} splitTop={32} splitBottom={58} />

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <LeagueCrest league={league} size={140} />
          <span className="block mt-4 text-ink/60 text-xs uppercase tracking-widest2">{league.country}</span>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-right">
          <h1 className="font-display text-6xl md:text-7xl text-white">{league.name}</h1>
          <p className="text-white/70 mt-3 max-w-md ml-auto">{leagueProducts.length} products across this league</p>
        </div>

        {/* Fades the league color into the page background instead of cutting off hard */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-chalk dark:to-ink z-10" />
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8 -mt-16 relative z-10">
        <LeagueProductGrid products={leagueProducts} />
      </div>
    </main>
  );
}
