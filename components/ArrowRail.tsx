'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';

// Horizontal rail navigated by arrow buttons instead of drag-scrolling.
// Buttons page by ~80% of the visible width with smooth motion, and disable
// themselves at each end. (Touch swipe still works on mobile as a fallback,
// but the scrollbar is hidden and buttons are the primary navigation.)
export default function ArrowRail({ children, className = '' }: { children: ReactNode; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Modern browsers report scrollLeft as 0..maxScroll in LTR, but 0..-maxScroll
  // in RTL (the spec-compliant "negative" convention). scrollBy({left}) already
  // moves the viewport in a consistent physical direction either way — it's
  // only this boundary math that assumed scrollLeft is never negative, which
  // silently pinned canLeft to false and broke canRight the moment someone
  // switched the page to Arabic. Normalizing to "distance scrolled left" fixes
  // both directions with the same logic.
  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) { setCanLeft(false); setCanRight(false); return; }
    const isRtl = getComputedStyle(el).direction === 'rtl';
    const scrolledLeft = isRtl ? -el.scrollLeft : el.scrollLeft;
    setCanLeft(scrolledLeft > 4);
    setCanRight(scrolledLeft < maxScroll - 4);
  };

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={trackRef} className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth">
        {children}
      </div>

      <RailButton side="left" disabled={!canLeft} onClick={() => page(-1)} />
      <RailButton side="right" disabled={!canRight} onClick={() => page(1)} />
    </div>
  );
}

function RailButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? '-left-1' : '-right-1'}
        w-8 h-14 rounded-md
        bg-chalk/80 dark:bg-ink/80 backdrop-blur-sm
        border border-black/8 dark:border-white/8
        text-black/40 dark:text-white/40
        hover:text-black/80 dark:hover:text-white/80
        hover:bg-chalk dark:hover:bg-ink
        flex items-center justify-center
        transition-all duration-200 z-10
        ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {side === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );
}
