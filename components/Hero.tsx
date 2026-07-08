import { leagues } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';
import HeroSlideshow from './HeroSlideshow';

export default function Hero({ slides }: { slides?: any[] }) {
  // Check if the first visible slide has an image — used to toggle orbs
  const hasImage = !!(slides && slides.length > 0 && slides[0]?.image);

  return (
    // The section itself has no background color — the image or orbs fill it.
    // overflow-hidden clips orbs; position:relative allows absolute children.
    <section className="relative overflow-hidden text-chalk">
      {hasImage ? (
        // Full-bleed image as the very first layer — covers the entire section
        // including the league ticker area below the slideshow content.
        // No grain overlay, no glow orbs — just the clean photo.
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${slides![0].image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
      ) : (
        // No image — use the dark ink background with atmospheric glow orbs
        <>
          <div className="absolute inset-0 z-0 bg-ink" />
          <div className="glow-orb w-[40rem] h-[40rem] bg-volt -top-48 -right-40" />
          <div className="glow-orb w-[32rem] h-[32rem] bg-crimson -bottom-40 -left-32 [animation-delay:-7s]" />
        </>
      )}

      {/* Everything above the background */}
      <div className="relative z-10">
        <HeroSlideshow slides={slides} />

        {/* League ticker — sits on top of the image, slight dark strip underneath for readability */}
        <div className={`max-w-7xl mx-auto px-6 pb-14 md:pb-20 ${hasImage ? 'bg-ink/20' : ''}`}>
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
