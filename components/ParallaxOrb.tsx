'use client';

import { useEffect, useRef } from 'react';

// Drifts the hero glow orb slightly against scroll for a sense of depth.
// Skips entirely under prefers-reduced-motion.
export default function ParallaxOrb({ className }: { className: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (ref.current) ref.current.style.transform = `translateY(${window.scrollY * 0.25}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className={className} />;
}
