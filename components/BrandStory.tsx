import Link from 'next/link';
import { Reveal } from './Motion';

// "Premium quality you can feel" split section from the second design
// handoff. The photo side is driven by the brand_story_image Store Setting
// (Admin → Store Settings) rather than a hardcoded stock photo — the
// handoff's own README says its Unsplash images are placeholders to swap
// before shipping. Until a real photo is set, the image side renders as a
// brand-styled ink panel (glow + oversized wordmark) so the section ships
// looking intentional on day one.
//
// Plain <img> on purpose (same reasoning as LeagueCrest): this URL is
// admin-entered and can point at any host, while next/image throws at
// render time for hosts not allowlisted in next.config.js.
export default function BrandStory({ image }: { image?: string }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-14">
      <Reveal>
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="relative h-[380px] rounded-2xl overflow-hidden">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Atlas gear, checked before it ships" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="absolute inset-0 bg-ink grain flex items-center justify-center overflow-hidden">
                <div className="glow-orb w-72 h-72 bg-volt -bottom-16 -right-10 opacity-25" />
                <div className="glow-orb w-56 h-56 bg-crimson -top-12 -left-8 opacity-15" />
                <span className="font-display text-chalk/15 text-[7rem] leading-none select-none tracking-wide relative z-10">ATLAS</span>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-display text-4xl leading-tight mb-4">Premium quality<br />you can feel.</h2>
            <p className="text-steel leading-relaxed mb-6 max-w-md">
              From fabric to fit, every kit is checked before it ships — no guesswork, no fakes, no six-week wait. Just gear built to last through the season.
            </p>
            <Link href="/search" className="inline-block bg-ink text-chalk dark:bg-chalk dark:text-ink px-6 py-3.5 rounded-full font-semibold text-sm btn-press">
              Shop the collection →
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
