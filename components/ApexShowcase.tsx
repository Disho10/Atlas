'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/mockData';
import { ApexConfig } from '@/lib/apexConfig';
import ProductImage from './ProductImage';

// Full-screen "sneaker site" showcase — arrives mid-scroll on the homepage
// (the admin-editable slideshow stays as the first hero). Scroll-in
// entrance, giant background word, and a product visual that responds to
// the cursor in pseudo-3D:
//
//   - Pointer tilt: the product rotates toward the cursor (perspective
//     rotateX/rotateY), and the giant word drifts the OPPOSITE way a
//     little — two layers moving against each other is what sells depth.
//   - Transparent-PNG mode: if the apex_image Store Setting (Admin →
//     Store Settings) is set to a background-removed PNG, the product
//     renders free-floating with a real drop-shadow and a soft ground
//     shadow beneath it — no rectangular card — which is the clean
//     "object popping off the page" look. Remove a photo's background
//     with any tool (e.g. remove.bg) and paste the resulting PNG's URL.
//   - Fallback: with no PNG set, the featured product's regular photo
//     shows in a rounded card with the same tilt.
//
// Mouse/fine-pointer only for the tilt; touch devices and
// prefers-reduced-motion get the static composition.
export default function ApexShowcase({ config, product, instagramHandle, whatsappNumber }: {
  config: ApexConfig;
  product?: Product;
  instagramHandle: string;
  whatsappNumber: string;
}) {
  // Everything visual comes from the admin-editable config (Admin → Apex
  // section): giant word, headline/body copy, image URL + cutout flag,
  // link target, CTA label, price caption. See lib/apexConfig.ts.
  const cutout = !!(config.imageUrl && config.imageCutout);
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  // Scroll-in entry — same IO pattern as <Reveal>, more dramatic distances
  // for the full-screen moment.
  useEffect(() => {
    const el = sectionRef.current;
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

  // Pointer-driven pseudo-3D: tilt the product toward the cursor and slide
  // the giant word gently the other way. Writes styles directly (no React
  // state) so pointermove never re-renders the tree.
  const handleMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    const visual = visualRef.current;
    const word = wordRef.current;
    if (!section || !visual || !word) return;
    const rect = section.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 … 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    visual.style.transform = `perspective(900px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) rotate(-8deg)`;
    word.style.transform = `translate(${(-x * 28).toFixed(1)}px, ${(-y * 18).toFixed(1)}px)`;
  };

  const handleLeave = () => {
    if (visualRef.current) visualRef.current.style.transform = 'perspective(900px) rotate(-8deg)';
    if (wordRef.current) wordRef.current.style.transform = 'translate(0, 0)';
  };

  // Three contrasting brand moods; picking one recolors the whole section.
  // `mark` selects which real Atlas logo file has contrast on that bg.
  const COLORS = [
    { name: 'Volt', bg: '#D6FF3F', word: 'rgba(255,255,255,.85)', fg: '#0B0D10', fgSoft: 'rgba(11,13,16,.65)', pill: '#0B0D10', pillText: '#F5F3EE', mark: '/brand/atlas-mark-dark.png' },
    { name: 'Crimson', bg: '#E63946', word: 'rgba(255,255,255,.28)', fg: '#F5F3EE', fgSoft: 'rgba(245,243,238,.75)', pill: '#F5F3EE', pillText: '#0B0D10', mark: '/brand/atlas-mark-light.png' },
    { name: 'Night', bg: '#12224E', word: 'rgba(255,255,255,.14)', fg: '#F5F3EE', fgSoft: 'rgba(245,243,238,.7)', pill: '#D6FF3F', pillText: '#0B0D10', mark: '/brand/atlas-mark-light.png' },
  ] as const;
  const [colorIdx, setColorIdx] = useState(0);
  const c = COLORS[colorIdx];

  const SIZES = ['S', 'M', 'L'] as const;
  const [size, setSize] = useState<(typeof SIZES)[number]>('M');

  const productHref = config.productId
    ? `/product/${config.productId}`
    : (!config.imageUrl && product ? `/product/${product.id}` : '/search');

  return (
    <section
      ref={sectionRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="relative min-h-screen flex flex-col overflow-hidden transition-colors duration-500"
      style={{ background: c.bg, color: c.fg }}
    >
      {/* Mini nav — real Atlas mark, correct variant for the current bg */}
      <div
        className="flex items-center justify-between px-6 md:px-12 pt-6 transition-all duration-700"
        style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(-16px)' }}
      >
        <Link href="/" aria-label="Atlas — home" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.mark} alt="Atlas" className="h-9 w-9 object-contain" />
          <span className="text-[10px] uppercase tracking-widest2 font-semibold hidden sm:inline" style={{ color: c.fgSoft }}>Follow Through.</span>
        </Link>
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

      {/* Giant background word — parallax layer, drifts opposite the cursor */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <span
          ref={wordRef}
          className="font-display leading-none tracking-wide will-change-transform"
          style={{
            fontSize: 'clamp(9rem, 30vw, 26rem)',
            color: c.word,
            opacity: inView ? 1 : 0,
            transition: 'opacity 1s ease, color .5s ease',
          }}
        >
          {config.word || 'APEX'}
        </span>
      </div>

      {/* Main content grid */}
      <div className="relative flex-1 grid md:grid-cols-[1fr_auto_1fr] items-center gap-8 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">

        {/* Left column — headline + punchy copy */}
        <div
          className="relative z-10 max-w-xs order-2 md:order-1 transition-all duration-700 delay-150"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(40px)' }}
        >
          <h2 className="font-display text-5xl md:text-6xl leading-[.95] mb-4 whitespace-pre-line">{config.headline}</h2>
          <p className="text-sm leading-relaxed" style={{ color: c.fgSoft }}>
            {config.body}
          </p>
        </div>

        {/* Center — product layer. Entrance animates the OUTER div; the
            pointer tilt writes to the INNER div, so the two transforms
            never fight each other. */}
        <div
          className="relative z-10 order-1 md:order-2 mx-auto transition-all duration-1000 delay-300"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'translateY(80px) scale(.9)',
          }}
        >
          <div ref={visualRef} className="will-change-transform" style={{ transform: 'perspective(900px) rotate(-8deg)', transition: 'transform .3s cubic-bezier(.16,1,.3,1)' }}>
            {cutout ? (
              // Transparent-PNG cutout mode: free-floating object, no card.
              // Plain <img> on purpose — the URL is admin-entered and can
              // point at any host (next/image throws for non-allowlisted hosts).
              <Link href={productHref} className="block float-idle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.imageUrl}
                  alt={product?.name ?? 'Featured product'}
                  className="w-64 sm:w-72 md:w-96 h-auto"
                  style={{ filter: 'drop-shadow(0 40px 50px rgba(0,0,0,.45))' }}
                  loading="lazy"
                />
              </Link>
            ) : config.imageUrl ? (
              <Link href={productHref} className="block w-56 sm:w-64 md:w-80 aspect-[4/5] rounded-2xl overflow-hidden float-idle" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.45)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.imageUrl} alt={product?.name ?? 'Featured product'} className="w-full h-full object-cover" loading="lazy" />
              </Link>
            ) : (
              <Link href={productHref} className="block w-56 sm:w-64 md:w-80 aspect-[4/5] rounded-2xl overflow-hidden float-idle" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.45)' }}>
                {product ? (
                  <ProductImage src={product.image} alt={product.name} width={640} height={800} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-ink flex items-center justify-center">
                    <span className="font-display text-chalk/20 text-6xl">ATLAS</span>
                  </div>
                )}
              </Link>
            )}
          </div>

          {/* Ground shadow puddle — anchors the floating object to a
              surface, which is most of what makes the PNG mode read as 3D */}
          <div
            aria-hidden
            className="mx-auto mt-6 h-4 w-40 md:w-56 rounded-[50%]"
            style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,.35), transparent 70%)' }}
          />

          {(config.priceLine || product) && (
            <p className="text-center text-xs mt-3 font-medium" style={{ color: c.fgSoft }}>
              {config.priceLine || `${product!.name} — $${product!.price}`}
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
            {config.ctaLabel}
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
