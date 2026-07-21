'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/mockData';
import { ApexConfig, ApexColorSwatch, BRAND_PRESETS } from '@/lib/apexConfig';
import ProductImage from './ProductImage';

// Full-screen "sneaker site" showcase — arrives mid-scroll on the homepage
// (the admin-editable slideshow stays as the first hero). Everything
// visual is driven by ApexConfig (Admin → Apex section): copy, image,
// CTA, colors, sizes, nav/social visibility, tilt angle. See
// lib/apexConfig.ts for the full field list.

// The 3 curated brand presets carry hand-picked, contrast-safe palettes.
// Custom colors and product colors are arbitrary admin/catalog hexes with
// no such palette, so their text/pill contrast is computed here instead —
// relative luminance decides ink-on-light vs chalk-on-dark, same math
// browsers use for prefers-color-scheme heuristics (WCAG relative
// luminance, simplified).
function contrastFor(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const light = luminance > 0.42;
  return {
    fg: light ? '#0B0D10' : '#F5F3EE',
    fgSoft: light ? 'rgba(11,13,16,.65)' : 'rgba(245,243,238,.75)',
    word: light ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.16)',
    pill: light ? '#0B0D10' : '#F5F3EE',
    pillText: light ? '#F5F3EE' : '#0B0D10',
    mark: light ? '/brand/atlas-mark-dark.png' : '/brand/atlas-mark-light.png',
  };
}

// Brand presets keep their hand-picked palettes (a designer chose these
// specifically); everything else uses the computed contrast above.
const BRAND_PALETTES: Record<string, ReturnType<typeof contrastFor>> = {
  '#D6FF3F': { fg: '#0B0D10', fgSoft: 'rgba(11,13,16,.65)', word: 'rgba(255,255,255,.85)', pill: '#0B0D10', pillText: '#F5F3EE', mark: '/brand/atlas-mark-dark.png' },
  '#E63946': { fg: '#F5F3EE', fgSoft: 'rgba(245,243,238,.75)', word: 'rgba(255,255,255,.28)', pill: '#F5F3EE', pillText: '#0B0D10', mark: '/brand/atlas-mark-light.png' },
  '#12224E': { fg: '#F5F3EE', fgSoft: 'rgba(245,243,238,.7)', word: 'rgba(255,255,255,.14)', pill: '#D6FF3F', pillText: '#0B0D10', mark: '/brand/atlas-mark-light.png' },
};

export default function ApexShowcase({ config, product, colorProducts = [], instagramHandle, whatsappNumber }: {
  config: ApexConfig;
  product?: Product;           // fallback featured product (hot[0] etc.) when config has no explicit image/products
  colorProducts?: Product[];   // resolved products for colorMode === 'products', in config.colorProductIds order
  instagramHandle: string;
  whatsappNumber: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) { setInView(true); io.disconnect(); } },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const tilt = config.tiltDeg ?? -8;
  const handleMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current, visual = visualRef.current, word = wordRef.current;
    if (!section || !visual || !word) return;
    const rect = section.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    visual.style.transform = `perspective(900px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) rotate(${tilt}deg)`;
    word.style.transform = `translate(${(-x * 28).toFixed(1)}px, ${(-y * 18).toFixed(1)}px)`;
  };
  const handleLeave = () => {
    if (visualRef.current) visualRef.current.style.transform = `perspective(900px) rotate(${tilt}deg)`;
    if (wordRef.current) wordRef.current.style.transform = 'translate(0, 0)';
  };

  // --- Resolve the swatch list for the active color mode ------------------
  type Swatch = ApexColorSwatch & { palette: ReturnType<typeof contrastFor> };
  let swatches: Swatch[];
  if (config.colorMode === 'products' && colorProducts.length > 0) {
    swatches = colorProducts.map(p => ({ hex: p.color, label: p.name, productId: p.id, palette: contrastFor(p.color) }));
  } else if (config.colorMode === 'custom' && config.customColors.length > 0) {
    swatches = config.customColors.map(s => ({ ...s, palette: contrastFor(s.hex) }));
  } else {
    swatches = BRAND_PRESETS.map(p => ({ ...p, palette: BRAND_PALETTES[p.hex] ?? contrastFor(p.hex) }));
  }

  const [idx, setIdx] = useState(0);
  const active = swatches[Math.min(idx, swatches.length - 1)] ?? swatches[0];
  const c = active.palette;

  // In 'products' mode, picking a swatch swaps the whole featured item —
  // this IS the "colors are the product's real variants" behavior.
  const swatchProduct = config.colorMode === 'products'
    ? colorProducts.find(p => p.id === active.productId)
    : undefined;
  const displayProduct = swatchProduct ?? product;

  const cutout = !!(config.imageUrl && config.imageCutout && !swatchProduct);
  const displayImage = swatchProduct ? swatchProduct.image : (config.imageUrl || displayProduct?.image);
  const productHref = swatchProduct
    ? `/product/${swatchProduct.id}`
    : config.productId
      ? `/product/${config.productId}`
      : (!config.imageUrl && displayProduct ? `/product/${displayProduct.id}` : '/search');

  const sizeLabels = config.sizeLabels?.length ? config.sizeLabels : ['S', 'M', 'L'];
  const [size, setSize] = useState(sizeLabels[Math.min(1, sizeLabels.length - 1)]);

  return (
    <section
      ref={sectionRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="relative min-h-screen flex flex-col overflow-hidden transition-colors duration-500"
      style={{ background: active.hex, color: c.fg }}
    >
      {config.showNav && (
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
      )}

      {/* Giant background word — parallax layer, drifts opposite the cursor */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <span
          ref={wordRef}
          className="font-display leading-none tracking-wide will-change-transform"
          style={{ fontSize: 'clamp(9rem, 30vw, 26rem)', color: c.word, opacity: inView ? 1 : 0, transition: 'opacity 1s ease, color .5s ease' }}
        >
          {config.word || 'APEX'}
        </span>
      </div>

      <div className="relative flex-1 grid md:grid-cols-[1fr_auto_1fr] items-center gap-8 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">

        <div
          className="relative z-10 max-w-xs order-2 md:order-1 transition-all duration-700 delay-150"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(40px)' }}
        >
          {config.eyebrow && (
            <p className="text-[11px] uppercase tracking-widest2 font-semibold mb-2" style={{ color: c.fgSoft }}>{config.eyebrow}</p>
          )}
          <h2 className="font-display text-5xl md:text-6xl leading-[.95] mb-4 whitespace-pre-line">{config.headline}</h2>
          <p className="text-sm leading-relaxed" style={{ color: c.fgSoft }}>{config.body}</p>
        </div>

        {/* Center — product layer. Entrance animates the OUTER div; the
            pointer tilt writes to the INNER div, so the two transforms
            never fight. Swaps instantly (key=productHref) when a
            'products'-mode swatch changes the active item. */}
        <div
          className="relative z-10 order-1 md:order-2 mx-auto transition-all duration-1000 delay-300"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(80px) scale(.9)' }}
        >
          <div
            key={productHref}
            ref={visualRef}
            className="will-change-transform animate-[stage-fade_.3s_ease_both]"
            style={{ transform: `perspective(900px) rotate(${tilt}deg)`, transition: 'transform .3s cubic-bezier(.16,1,.3,1)' }}
          >
            {cutout ? (
              // Transparent-PNG cutout mode: free-floating object, no card.
              // Plain <img> — the URL is admin-entered and can point at any
              // host (next/image throws for non-allowlisted hosts).
              <Link href={productHref} className="block float-idle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.imageUrl} alt={displayProduct?.name ?? 'Featured product'} className="w-64 sm:w-72 md:w-96 h-auto" style={{ filter: 'drop-shadow(0 40px 50px rgba(0,0,0,.45))' }} loading="lazy" />
              </Link>
            ) : displayImage ? (
              <Link href={productHref} className="block w-56 sm:w-64 md:w-80 aspect-[4/5] rounded-2xl overflow-hidden float-idle" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.45)' }}>
                {swatchProduct || !config.imageUrl ? (
                  <ProductImage src={displayImage} alt={displayProduct?.name ?? 'Featured product'} width={640} height={800} className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayImage} alt={displayProduct?.name ?? 'Featured product'} className="w-full h-full object-cover" loading="lazy" />
                )}
              </Link>
            ) : (
              <Link href={productHref} className="block w-56 sm:w-64 md:w-80 aspect-[4/5] rounded-2xl overflow-hidden float-idle bg-ink flex items-center justify-center" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.45)' }}>
                <span className="font-display text-chalk/20 text-6xl">ATLAS</span>
              </Link>
            )}
          </div>

          <div aria-hidden className="mx-auto mt-6 h-4 w-40 md:w-56 rounded-[50%]" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,.35), transparent 70%)' }} />

          {(config.priceLine || displayProduct) && (
            <p key={`caption-${productHref}`} className="text-center text-xs mt-3 font-medium" style={{ color: c.fgSoft }}>
              {swatchProduct ? `${swatchProduct.name} — $${swatchProduct.price}` : (config.priceLine || `${displayProduct!.name} — $${displayProduct!.price}`)}
            </p>
          )}
        </div>

        <div
          className="relative z-10 order-3 md:justify-self-end space-y-8 transition-all duration-700 delay-500"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(40px)' }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-widest2 font-semibold mb-3" style={{ color: c.fgSoft }}>
              {config.colorMode === 'products' ? 'Choose your kit' : 'Choose your color'}
            </p>
            <div className="flex gap-3 flex-wrap">
              {swatches.map((s, i) => (
                <button
                  key={s.hex + i}
                  onClick={() => setIdx(i)}
                  aria-label={s.label}
                  title={s.label}
                  className="w-9 h-9 rounded-full btn-press transition-transform"
                  style={{ background: s.hex, border: `2px solid ${c.fg}`, outline: idx === i ? `2px solid ${c.fg}` : 'none', outlineOffset: '3px', transform: idx === i ? 'scale(1.1)' : 'scale(1)' }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest2 font-semibold mb-3" style={{ color: c.fgSoft }}>Choose your size</p>
            <div className="flex gap-3 flex-wrap">
              {sizeLabels.map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className="min-w-11 h-11 px-2 rounded-full text-sm font-semibold btn-press transition-all"
                  style={{ border: `1.5px solid ${size === s ? c.fg : c.fgSoft}`, background: size === s ? c.fg : 'transparent', color: size === s ? active.hex : c.fg }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Link href="/search" className="inline-block rounded-full px-7 py-3.5 text-sm font-bold btn-press" style={{ background: c.pill, color: c.pillText }}>
            {config.ctaLabel}
          </Link>
        </div>
      </div>

      {config.showSocial && (
        <div className="relative z-10 flex gap-4 px-6 md:px-12 pb-6 transition-all duration-700 delay-700" style={{ opacity: inView ? 1 : 0 }}>
          <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="opacity-60 hover:opacity-100 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>
          </a>
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="opacity-60 hover:opacity-100 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z" /><path d="M8.8 9.2c.3-.8.7-.8 1-.8h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.5l-.5.6c-.1.2-.2.3 0 .6.5.8 1.3 1.6 2.2 2 .3.2.4.1.6-.1l.6-.7c.2-.2.3-.2.6-.1l1.5.7c.3.2.4.3.4.5 0 .9-.7 1.7-1.5 1.8-.7.1-1.6.1-3.2-.8-2-1.1-3.2-3.1-3.4-3.4-.2-.3-.8-1.3-.8-2.1 0-.4 0-.6-.1-.7z" fill="currentColor" stroke="none" /></svg>
          </a>
        </div>
      )}
    </section>
  );
}
