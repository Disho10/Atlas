'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DEFAULT_SLIDES = [
  {
    tag: 'Matchday drop · 6 leagues live now',
    titleTop: 'WEAR THE',
    titleAccent: 'RESULT.',
    body: 'Kits, boots-up gear, and match essentials from LaLiga to the Lebanese Premier League — carried to your door.',
    image: '',
    ctaLabel: 'Shop Premier League',
    ctaHref: '/leagues/premier-league',
    secondaryLabel: 'Browse all leagues',
    secondaryHref: '/leagues',
  },
  {
    tag: 'New season · 26/27 kits in stock',
    titleTop: 'NEW KITS',
    titleAccent: 'JUST LANDED.',
    body: 'Home and away shirts for the new season, from Madrid to Manchester — sized S to XXL, delivered across Lebanon.',
    image: '',
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
    image: '',
    ctaLabel: 'Shop sportswear',
    ctaHref: '/shop/sportswear',
    secondaryLabel: 'Match essentials',
    secondaryHref: '/leagues',
  },
];

const INTERVAL_MS = 6000;

export default function HeroSlideshow({ slides: serverSlides }: { slides?: any[] }) {
  const slides = (serverSlides && serverSlides.length > 0) ? serverSlides : DEFAULT_SLIDES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[Math.min(index, slides.length - 1)];
  const hasImage = !!slide.image;

  return (
    <div className="relative w-full min-h-[70vh] flex flex-col justify-between pt-16 pb-6 md:pt-24">

      {/* Background image — plain img, no Next.js optimization, full quality */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.image}
          src={slide.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ zIndex: 0, imageRendering: 'auto' }}
          loading="eager"
          decoding="sync"
        />
      )}

      {/* Dark scrim — ONLY on the left third where text sits, leaves the right
          side of the image clean and fully visible */}
      {hasImage && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.1) 60%, transparent 80%)',
          }}
        />
      )}

      {/* Text content */}
      <div className="relative px-6 md:px-12" style={{ zIndex: 2 }}>
        <div key={index} className={hasImage ? 'max-w-xl' : 'max-w-7xl mx-auto'}>

          <div className="flex items-center gap-2 text-volt text-xs uppercase tracking-widest2 mb-6 animate-rise">
            <span className="w-2 h-2 rounded-full bg-volt inline-block" />
            {slide.tag}
          </div>

          <h1 className="font-display text-[15vw] sm:text-7xl md:text-8xl leading-[0.9] tracking-tight text-balance animate-rise [animation-delay:100ms] opacity-0 text-white">
            {slide.titleTop}
            <br />
            <span className="text-volt shimmer-text">{slide.titleAccent}</span>
          </h1>

          <p className="mt-6 max-w-md text-white/85 animate-rise [animation-delay:200ms] opacity-0">
            {slide.body}
          </p>

          <div className="mt-8 flex flex-wrap gap-3 animate-rise [animation-delay:300ms] opacity-0">
            <Link href={slide.ctaHref} className="bg-volt text-ink px-6 py-3 rounded-full font-medium text-sm btn-press">
              {slide.ctaLabel}
            </Link>
            <Link
              href={slide.secondaryHref}
              className="border border-white/50 text-white px-6 py-3 rounded-full text-sm hover:border-volt hover:text-volt transition-colors bg-black/20 backdrop-blur-sm"
            >
              {slide.secondaryLabel}
            </Link>
          </div>
        </div>
      </div>

      {/* Slide dots */}
      <div className="relative px-6 md:px-12 mt-6" style={{ zIndex: 2 }}>
        <div className={!hasImage ? 'max-w-7xl mx-auto' : ''}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`inline-block mr-2 h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-volt' : 'w-3 bg-white/40'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
