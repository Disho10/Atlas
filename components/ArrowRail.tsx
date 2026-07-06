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

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
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
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? '-left-3' : '-right-3'}
        w-11 h-11 rounded-full bg-ink text-chalk dark:bg-chalk dark:text-ink shadow-xl
        flex items-center justify-center btn-press transition-opacity duration-300 z-10
        ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {side === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );
}
