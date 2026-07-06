'use client';

import { useState, useRef } from 'react';
import { Product } from '@/lib/mockData';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';

// Sportswear landing: two hero panels — MEN and WOMEN — each with its own
// visual identity (men: ink + volt athletics; women: crimson + chalk energy).
// Clicking a panel filters the grid below and scrolls to it.
export default function SportswearGrid({ products }: { products: Product[] }) {
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const gridRef = useRef<HTMLDivElement>(null);

  const pick = (g: 'male' | 'female') => {
    setGender(prev => (prev === g ? 'all' : g));
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const items = products.filter(p => gender === 'all' || p.gender === gender || p.gender === 'unisex');

  return (
    <>
      {/* Split hero: two designed panels */}
      <div className="grid md:grid-cols-2 gap-5 mb-12">
        {/* MEN — dark, angular, volt accents */}
        <Reveal variant="left">
          <button
            onClick={() => pick('male')}
            className={`relative w-full overflow-hidden rounded-3xl text-left h-72 md:h-80 group card-premium grain bg-ink
              ${gender === 'male' ? 'ring-2 ring-volt' : ''}`}
          >
            <div className="glow-orb w-72 h-72 bg-volt -top-20 -right-16 opacity-25" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-20"
              style={{ background: 'repeating-linear-gradient(-45deg, #D6FF3F 0 2px, transparent 2px 18px)' }} />
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              <span className="text-volt text-xs uppercase tracking-widest2">Built for the grind</span>
              <div>
                <span className="font-display text-5xl md:text-6xl text-chalk block leading-none">MEN</span>
                <span className="text-chalk/60 text-sm mt-2 block">Training tops · track jackets · match-day layers</span>
              </div>
              <span className="inline-flex items-center gap-2 text-volt text-sm font-medium">
                Shop men's
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </button>
        </Reveal>

        {/* WOMEN — crimson gradient, flowing curve motif */}
        <Reveal variant="left" delay={120}>
          <button
            onClick={() => pick('female')}
            className={`relative w-full overflow-hidden rounded-3xl text-left h-72 md:h-80 group card-premium
              ${gender === 'female' ? 'ring-2 ring-crimson' : ''}`}
            style={{ background: 'linear-gradient(150deg, #E63946 0%, #8f1d27 70%, #0B0D10 130%)' }}
          >
            <svg className="absolute -bottom-8 -right-8 w-64 h-64 opacity-15" viewBox="0 0 100 100" fill="none" stroke="#F5F3EE" strokeWidth="1.2">
              <circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="36" /><circle cx="50" cy="50" r="24" /><circle cx="50" cy="50" r="12" />
            </svg>
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              <span className="text-chalk/80 text-xs uppercase tracking-widest2">Power in motion</span>
              <div>
                <span className="font-display text-5xl md:text-6xl text-chalk block leading-none">WOMEN</span>
                <span className="text-chalk/70 text-sm mt-2 block">Tech hoodies · training fits · everyday sport</span>
              </div>
              <span className="inline-flex items-center gap-2 text-chalk text-sm font-medium">
                Shop women's
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </button>
        </Reveal>
      </div>

      {/* Filter state + grid */}
      <div ref={gridRef} className="scroll-mt-28">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-steel">
            {gender === 'all' ? 'Showing everything' : gender === 'male' ? "Showing men's & unisex" : "Showing women's & unisex"}
            {' · '}{items.length} item{items.length === 1 ? '' : 's'}
          </p>
          {gender !== 'all' && (
            <button onClick={() => setGender('all')} className="text-sm underline underline-offset-2 text-steel">
              Clear filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 80}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
        {items.length === 0 && <p className="text-steel py-16 text-center">Nothing in this category yet — check back after the next drop.</p>}
      </div>
    </>
  );
}
