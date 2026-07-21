'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/mockData';
import ProductImage from './ProductImage';

// Full-screen "sneaker site" showcase section — appears mid-scroll on the
// homepage (deliberately NOT the first hero; the admin-editable slideshow
// keeps that job). Scroll-triggered entrance, giant background typography,
// a real catalog product angled to pop out over it, and interactive
// color/size elements. Requested to spec from a high-energy sneaker-site
// concept, adapted to Atlas:
//   - swatch colors are the brand palette (volt / crimson / deep blue),
//     and picking one recolors the whole section live
//   - sizes are jersey sizes (S/M/L) rather than shoe sizes, since that's
//     what Atlas actually sells; tapping one is decorative selection here,
//     the real size picker lives on the product page this links to
//   - social icons are the store's REAL channels (Instagram + WhatsApp)
//     rather than placeholder Facebook/Behance links pointing nowhere
//   - all CTAs go to real routes: the featured product, /search, /checkout
export default function ApexShowcase({ product, instagramHandle, whatsappNumber }: {
  product?: Product;
  instagramHandle: string;
  whatsappNumber: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Scroll-in entry: the section content rises + scales in the first time
  // the section reaches the viewport, same IO pattern as <Reveal> but with
  // a more dramatic distance for the full-screen moment.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Three contrasting brand moods. Each defines the section bg, the giant
  // word's tint, and whether foreground text is ink or chalk for contrast.
  const COLORS = [
    { name: 'Volt', bg: '#D6FF3F', word: 'rgba(255,255,255,.85)', fg: '#0B0D10', fgSoft: 'rgba(11,13,16,.65)', pill: '#0B0D10', pillText: '#F5F3EE' },
    { name: 'Crimson', bg: '#E63946', word: 'rgba(255,255,255,.28)', fg: '#F5F3EE', fgSoft: 'rgba(245,243,238,.75)', pill: '#F5F3EE', pillText: '#0B0D10' },
    { name: 'Night', bg: '#12224E', word: 'rgba(255,255,255,.14)', fg: '#F5F3EE', fgSoft: 'rgba(245,243,238,.7)', pill: '#D6FF3F', pillText: '#0B0D10' },
  ] as const;
  const [colorIdx, setColorIdx] = useState(0);
  const c = COLORS[colorIdx];

  const SIZES = ['S', 'M', 'L'] as const;
  const [size, setSize] = useState<(typeof SIZES)[number]>('M');

  const productHref = product ? `/product/${product.id}` : '/search';

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col overflow-hidden transition-colors duration-500"
      style={{ background: c.bg, color: c.fg }}
    >
      {/* Mini nav — this section reads as a page-within-the-page when it
          fills the viewport, so it carries its own slim top bar. Links go
          to real routes; "Place Order" jumps straight to checkout. */}
      <div
        className="flex items-center justify-between px-6 md:px-12 pt-6 transition-all duration-700"
        style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(-16px)' }}
      >
        <span className="font-display text-2xl tracking-wide">[ATLAS]</span>
        <nav className="hidden md:flex gap-8 text-xs uppercase tracking-widest2 font-medium">
          <Link href="/" className="hover:opacity-70 transition-opacity">Home</Link>
          <Link href="/search" className="hover:opacity-70 transition-opacity">Products</Link>
          <Link href="/contact" className="hover:opacity-70 transition-opacity">Contact</Link>
        </nav>
        <Link
          href="/checkout"
          className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide btn-press transition-transform"
          style={{ background: c.pill, color: c.pillText }}
        >
          Place Order
        </Link>
      </div>

      {/* Giant background word — pure design element behind the product */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <span
          className="font-display leading-none tracking-wide transition-all duration-1000"
          style={{
            fontSize: 'clamp(9rem, 30vw, 26rem)',
            color: c.word,
            opacity: inView ? 1 : 0,
            transform: inView ? 'scale(1)' : 'scale(1.15)',
          }}
        >
          APEX
        </span>
      </div>

      {/* Main content grid */}
      <div className="relative flex-1 grid md:grid-cols-[1fr_auto_1fr] items-center gap-8 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">

        {/* Left column — headline + punchy copy */}
        <div
          className="relative z-10 max-w-xs order-2 md:order-1 transition-all duration-700 delay-150"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(40px)' }}
        >
          <h2 className="font-display text-5xl md:text-6xl leading-[.95] mb-4">Find your<br />apex.</h2>
          <p className="text-sm leading-relaxed" style={{ color: c.fgSoft }}>
            Match-grade kits built for pace. Breathable, featherweight fabric that moves when you do — checked piece by piece before it ships.
          </p>
        </div>

        {/* Center — product popping out over the giant word */}
        <div
          className="relative z-10 order-1 md:order-2 mx-auto transition-all duration-1000 delay-300"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'rotate(-8deg) translateY(0)' : 'rotate(-8deg) translateY(80px) scale(.9)',
          }}
        >
          <Link href={productHref} className="block w-56 sm:w-64 md:w-80 aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl float-idle" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.45)' }}>
            {product ? (
              <ProductImage src={product.image} alt={product.name} width={640} height={800} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-ink flex items-center justify-center">
                <span className="font-display text-chalk/20 text-6xl">ATLAS</span>
              </div>
            )}
          </Link>
          {product && (
            <p className="text-center text-xs mt-4 font-medium" style={{ color: c.fgSoft }}>
              {product.name} — ${product.price}
            </p>
          )}
        </div>

        {/* Right column — interactive color + size + CTA */}
        <div
          className="relative z-10 order-3 md:justify-self-end space-y-8 transition-all duration-700 delay-500"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(40px)' }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-widest2 font-semibold mb-3" style={{ color: c.fgSoft }}>Choose your color</p>
            <div className="flex gap-3">
              {COLORS.map((col, i) => (
                <button
                  key={col.name}
                  onClick={() => setColorIdx(i)}
                  aria-label={`${col.name} theme`}
                  className="w-9 h-9 rounded-full btn-press transition-transform"
                  style={{
                    background: col.bg,
                    border: `2px solid ${c.fg}`,
                    outline: colorIdx === i ? `2px solid ${c.fg}` : 'none',
                    outlineOffset: '3px',
                    transform: colorIdx === i ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest2 font-semibold mb-3" style={{ color: c.fgSoft }}>Choose your size</p>
            <div className="flex gap-3">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className="w-11 h-11 rounded-full text-sm font-semibold btn-press transition-all"
                  style={{
                    border: `1.5px solid ${size === s ? c.fg : c.fgSoft}`,
                    background: size === s ? c.fg : 'transparent',
                    color: size === s ? c.bg : c.fg,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/search"
            className="inline-block rounded-full px-7 py-3.5 text-sm font-bold btn-press"
            style={{ background: c.pill, color: c.pillText }}
          >
            See all products →
          </Link>
        </div>
      </div>

      {/* Bottom-left social icons — the store's real channels */}
      <div
        className="relative z-10 flex gap-4 px-6 md:px-12 pb-6 transition-all duration-700 delay-700"
        style={{ opacity: inView ? 1 : 0 }}
      >
        <a
          href={`https://instagram.com/${instagramHandle}`}
          target="_blank" rel="noopener noreferrer" aria-label="Instagram"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>
        </a>
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z" /><path d="M8.8 9.2c.3-.8.7-.8 1-.8h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.5l-.5.6c-.1.2-.2.3 0 .6.5.8 1.3 1.6 2.2 2 .3.2.4.1.6-.1l.6-.7c.2-.2.3-.2.6-.1l1.5.7c.3.2.4.3.4.5 0 .9-.7 1.7-1.5 1.8-.7.1-1.6.1-3.2-.8-2-1.1-3.2-3.1-3.4-3.4-.2-.3-.8-1.3-.8-2.1 0-.4 0-.6-.1-.7z" fill="currentColor" stroke="none" /></svg>
        </a>
      </div>
    </section>
  );
}
