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
    imageScale: 100, imageX: 50, imageY: 50, imageRotation: 0,
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
    imageScale: 100, imageX: 50, imageY: 50, imageRotation: 0,
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
    imageScale: 100, imageX: 50, imageY: 50, imageRotation: 0,
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

  // Zoom above 100% scales from cover (e.g. 130% = 30% larger than cover)
  const scale = Number(slide.imageScale ?? 100);
  const bgSize = scale > 100
    ? `calc(${scale}% * (100vw / max(100vw, 1px)))` // keep it relative
    : 'cover'; // always fills at 100% — matches desktop feel on any screen

  return (
    <div className="relative w-full flex flex-col"
      style={{ height: 'clamp(480px, 75vh, 720px)' }}>

      {/* Background image — `cover` as baseline so it always fills edge-to-edge
          on every screen size. Admin zoom slider adds extra zoom on top of cover. */}
      {hasImage && (
        <div
          key={slide.image}
          className="absolute inset-0"
          style={{
            zIndex: 0,
            backgroundImage: `url(${slide.image})`,
            backgroundSize: scale > 100 ? `${scale}%` : 'cover',
            backgroundPosition: `${slide.imageX ?? 50}% ${slide.imageY ?? 50}%`,
            backgroundRepeat: 'no-repeat',
            transform: `rotate(${slide.imageRotation ?? 0}deg)`,
            transformOrigin: 'center center',
          }}
        />
      )}

      {/* Left-side scrim — gives text readability without darkening the whole image.
          On mobile where the image fills the whole width, scrim covers more of the
          image so text is always readable. */}
      {hasImage && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            background: [
              // Mobile: darker scrim bottom-to-top so text on left half is readable
              'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
              'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.05) 70%, transparent 90%)',
            ].join(', '),
          }}
        />
      )}

      {/* Text content — absolutely positioned so it doesn't affect height */}
      <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-8 md:px-12 pb-16"
        style={{ zIndex: 2 }}>
        <div key={index} className={hasImage ? 'max-w-xs sm:max-w-sm md:max-w-xl' : 'max-w-7xl mx-auto w-full'}>

          <div className="flex items-center gap-2 text-volt text-[10px] sm:text-xs uppercase tracking-widest2 mb-4 sm:mb-6 animate-rise">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-volt inline-block" />
            {slide.tag}
          </div>

          <h1 className="font-display leading-[0.9] tracking-tight text-white"
            style={{ fontSize: 'clamp(2.8rem, 12vw, 6rem)' }}>
            <span aria-label={slide.titleTop}>
              {slide.titleTop.split('').map((ch: string, i: number) => (
                <span key={i} className="letter-rise" style={{ ['--letter-delay' as any]: `${100 + i * 28}ms` }} aria-hidden>
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </span>
            <br />
            <span className="inline-block animate-rise [animation-delay:250ms] opacity-0">
              <span className="text-volt shimmer-text">{slide.titleAccent}</span>
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-white/85 animate-rise [animation-delay:200ms] opacity-0 max-w-sm">
            {slide.body}
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-rise [animation-delay:300ms] opacity-0">
            <Link href={slide.ctaHref}
              className="bg-volt text-ink px-5 sm:px-6 py-3 rounded-full font-medium text-sm btn-press text-center">
              {slide.ctaLabel}
            </Link>
            <Link href={slide.secondaryHref}
              className="border border-white/50 text-white px-5 sm:px-6 py-3 rounded-full text-sm hover:border-volt hover:text-volt transition-colors bg-black/20 backdrop-blur-sm text-center">
              {slide.secondaryLabel}
            </Link>
          </div>
        </div>
      </div>

      {/* Slide dots — pinned to bottom of the fixed-height container */}
      <div className="absolute bottom-5 left-5 sm:left-8 md:left-12" style={{ zIndex: 2 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`inline-block mr-2 h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-8 bg-volt' : 'w-3 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
