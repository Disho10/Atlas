import { leagues } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';
import HeroSlideshow from './HeroSlideshow';
import ParallaxOrb from './ParallaxOrb';

export default function Hero({ slides }: { slides?: any[] }) {
  const hasAnyImage = slides?.some(s => s.image);

  return (
    <section className="relative text-chalk">
      {/* Single, slow glow orb — only when no images configured. One light
          source instead of two keeps the backdrop calm behind the headline.
          It drifts gently against scroll for depth (ParallaxOrb). */}
      {!hasAnyImage && (
        <div className="absolute inset-0 overflow-hidden bg-ink">
          <ParallaxOrb className="glow-orb w-[44rem] h-[44rem] bg-volt -top-52 -right-40" />
        </div>
      )}
      {hasAnyImage && <div className="absolute inset-0 bg-ink" />}

      {/* Slideshow — image absolutely fills only this wrapper */}
      <div className="relative overflow-hidden">
        <HeroSlideshow slides={slides} />
        {/* Scroll cue — invites the next move without competing with the copy */}
        <div className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex-col items-center gap-1.5 text-white/50 scroll-cue pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest2">Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {/* League ticker — solid bg so it's always clean, never overlapped by hero image */}
      <div className="bg-ink border-t border-chalk/15">
        <div className="max-w-7xl mx-auto px-6 py-8 overflow-hidden">
          <div className="flex gap-14 animate-marquee w-max">
            {[...leagues, ...leagues].map((l, i) => (
              <div key={l.slug + i} className="flex items-center gap-4 shrink-0 opacity-80 hover:opacity-100 transition-opacity">
                <LeagueCrest league={l} size={64} />
                <span className="text-sm tracking-wide uppercase text-chalk/70" style={{ fontFamily: l.font }}>{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
