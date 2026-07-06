'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const SLIDES = [
  {
    tag: 'Matchday drop · 6 leagues live now',
    titleTop: 'WEAR THE',
    titleAccent: 'RESULT.',
    body: 'Kits, boots-up gear, and match essentials from LaLiga to the Lebanese Premier League — carried to your door.',
    ctaLabel: 'Shop Premier League',
    ctaHref: '/leagues/premier-league',
    secondaryLabel: 'Browse all leagues',
    secondaryHref: '/leagues',
  },
  {
    tag: 'New season · 25/26 kits in stock',
    titleTop: 'NEW KITS',
    titleAccent: 'JUST LANDED.',
    body: 'Home and away shirts for the new season, from Madrid to Manchester — sized S to XXL, delivered across Lebanon.',
    ctaLabel: 'Shop new kits',
    ctaHref: '/search?q=Home%20Kit',
    secondaryLabel: 'View LaLiga',
    secondaryHref: '/leagues/la-liga',
  },
  {
    tag: 'Off the pitch · men & women',
    titleTop: 'TRAIN LIKE',
    titleAccent: 'YOU MEAN IT.',
    body: 'Hoodies, track jackets, grip socks, and everyday sportswear built for training and styled for the terrace.',
    ctaLabel: 'Shop sportswear',
    ctaHref: '/shop/sportswear',
    secondaryLabel: 'Match essentials',
    secondaryHref: '/leagues',
  },
];

const INTERVAL_MS = 6000;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="max-w-7xl mx-auto px-6 pt-16 pb-4 md:pt-24">
      {/* key on index re-triggers the rise animation on each slide change */}
      <div key={index}>
        <div className="flex items-center gap-2 text-volt text-xs uppercase tracking-widest2 mb-6 animate-rise">
          <span className="w-2 h-2 rounded-full bg-volt inline-block" />
          {slide.tag}
        </div>
        <h1 className="font-display text-[15vw] sm:text-7xl md:text-8xl leading-[0.9] tracking-tight text-balance animate-rise [animation-delay:100ms] opacity-0">
          {slide.titleTop}
          <br />
          <span className="text-volt">{slide.titleAccent}</span>
        </h1>
        <p className="mt-6 max-w-md text-chalk/70 animate-rise [animation-delay:200ms] opacity-0">
          {slide.body}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 animate-rise [animation-delay:300ms] opacity-0">
          <Link href={slide.ctaHref} className="bg-volt text-ink px-6 py-3 rounded-full font-medium text-sm">
            {slide.ctaLabel}
          </Link>
          <Link href={slide.secondaryHref} className="border border-chalk/30 px-6 py-3 rounded-full text-sm">
            {slide.secondaryLabel}
          </Link>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="flex gap-2 mt-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-volt' : 'w-3 bg-chalk/25'}`}
          />
        ))}
      </div>
    </div>
  );
}
