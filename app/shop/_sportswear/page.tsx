import Link from 'next/link';
import { Reveal } from '@/components/Motion';

// Sportswear landing: two hero panels that link to dedicated men's/women's pages.
export default function SportswearPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="font-display text-4xl mb-2">Sportswear</h1>
      <p className="text-steel mb-10">Training wear, match-day layers, and everyday sport — pick your section.</p>

      <div className="grid md:grid-cols-2 gap-5">
        {/* MEN */}
        <Reveal variant="left">
          <Link href="/shop/sportswear/men" className="relative block overflow-hidden rounded-3xl h-80 group card-premium grain bg-ink">
            <div className="glow-orb w-72 h-72 bg-volt -top-20 -right-16 opacity-25" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-20" style={{ background: 'repeating-linear-gradient(-45deg, #D6FF3F 0 2px, transparent 2px 18px)' }} />
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              <span className="text-volt text-xs uppercase tracking-widest2">Built for the grind</span>
              <div>
                <span className="font-display text-6xl text-chalk block leading-none">MEN</span>
                <span className="text-chalk/60 text-sm mt-2 block">Training tops · track jackets · match-day layers</span>
              </div>
              <span className="inline-flex items-center gap-2 text-volt text-sm font-medium">
                Shop men's
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </Link>
        </Reveal>

        {/* WOMEN */}
        <Reveal variant="left" delay={120}>
          <Link href="/shop/sportswear/women" className="relative block overflow-hidden rounded-3xl h-80 group card-premium" style={{ background: 'linear-gradient(150deg, #E63946 0%, #8f1d27 70%, #0B0D10 130%)' }}>
            <svg className="absolute -bottom-8 -right-8 w-64 h-64 opacity-15" viewBox="0 0 100 100" fill="none" stroke="#F5F3EE" strokeWidth="1.2">
              <circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="36" /><circle cx="50" cy="50" r="24" /><circle cx="50" cy="50" r="12" />
            </svg>
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              <span className="text-chalk/80 text-xs uppercase tracking-widest2">Power in motion</span>
              <div>
                <span className="font-display text-6xl text-chalk block leading-none">WOMEN</span>
                <span className="text-chalk/70 text-sm mt-2 block">Tech hoodies · training fits · everyday sport</span>
              </div>
              <span className="inline-flex items-center gap-2 text-chalk text-sm font-medium">
                Shop women's
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
