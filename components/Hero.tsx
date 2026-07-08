import { leagues } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';
import HeroSlideshow from './HeroSlideshow';

export default function Hero({ slides }: { slides?: any[] }) {
  const hasImage = slides && slides.length > 0 && slides[0]?.image;

  return (
    <section className="relative overflow-hidden bg-ink text-chalk grain">
      {/* Glow orbs only show when there's no background image — they clash with photos */}
      {!hasImage && (
        <>
          <div className="glow-orb w-[40rem] h-[40rem] bg-volt -top-48 -right-40" />
          <div className="glow-orb w-[32rem] h-[32rem] bg-crimson -bottom-40 -left-32 [animation-delay:-7s]" />
        </>
      )}

      <div className="relative">
        <HeroSlideshow slides={slides} />

        {/* League ticker */}
        <div className="max-w-7xl mx-auto px-6 pb-14 md:pb-20">
          <div className="mt-10 border-t border-chalk/15 pt-8 overflow-hidden">
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
      </div>
    </section>
  );
}
