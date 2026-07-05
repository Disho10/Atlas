import Link from 'next/link';
import { leagues } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-chalk">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="flex items-center gap-2 text-volt text-xs uppercase tracking-widest2 mb-6 animate-rise">
          <span className="w-2 h-2 rounded-full bg-volt inline-block" />
          Matchday drop &middot; 6 leagues live now
        </div>
        <h1 className="font-display text-[15vw] sm:text-7xl md:text-8xl leading-[0.9] tracking-tight text-balance animate-rise [animation-delay:100ms] opacity-0">
          WEAR THE
          <br />
          <span className="text-volt">RESULT.</span>
        </h1>
        <p className="mt-6 max-w-md text-chalk/70 animate-rise [animation-delay:200ms] opacity-0">
          Kits, boots-up gear, and match essentials from LaLiga to the Lebanese Premier League — carried to your door.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 animate-rise [animation-delay:300ms] opacity-0">
          <Link href="/leagues/premier-league" className="bg-volt text-ink px-6 py-3 rounded-full font-medium text-sm">
            Shop Premier League
          </Link>
          <Link href="/leagues" className="border border-chalk/30 px-6 py-3 rounded-full text-sm">
            Browse all leagues
          </Link>
        </div>

        {/* Scoreboard strip — the signature element: a live-look ticker of league identities,
            echoing a stadium scoreboard rather than a generic logo row. */}
        <div className="mt-16 border-t border-chalk/15 pt-8 overflow-hidden">
          <div className="flex gap-14 animate-marquee w-max">
            {[...leagues, ...leagues].map((l, i) => (
              <div key={l.slug + i} className="flex items-center gap-4 shrink-0">
                <LeagueCrest league={l} size={64} />
                <span className="text-sm tracking-wide uppercase text-chalk/70">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
