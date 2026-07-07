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
      {/* Category header — same diagonal-split concept as before, now with subtle
          motion polish: the crest and title animate in, and there's a soft glow
          + grain for depth. Colors stay locked to the league's own brand values
          (leagues.primary_color/secondary_color), editable only by Owner/Manager
          via the RLS policy. The white/color split uses clip-path so the safe
          zones for the logo and title stay solid regardless of viewport width. */}
      <section className="relative overflow-hidden min-h-[70vh] flex flex-col justify-between pt-20 pb-40 grain">
        <DiagonalSplitBg color={league.primary} splitTop={32} splitBottom={58} />

        {/* Soft glow orb tinted with the league color, drifting behind the crest */}
        <div className="glow-orb w-[30rem] h-[30rem] top-0 left-1/4" style={{ background: league.primary }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="animate-rise inline-block">
            <LeagueCrest league={league} size={140} />
          </div>
          <span className="block mt-4 text-ink/60 text-xs uppercase tracking-widest2 animate-rise [animation-delay:120ms] opacity-0">
            {league.country}
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-right">
          <h1 className="font-display text-6xl md:text-7xl text-white animate-rise [animation-delay:200ms] opacity-0" style={{ fontFamily: league.font }}>
            {league.name}
          </h1>
          <p className="text-white/70 mt-3 max-w-md ml-auto animate-rise [animation-delay:300ms] opacity-0">
            {leagueProducts.length} products across this league
          </p>
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
