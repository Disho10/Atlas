'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// <Reveal> — wraps any content; it animates in the first time it scrolls into
// view. variant: 'up' (default) | 'left' | 'scale'. delay staggers children.
// ---------------------------------------------------------------------------
export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  variant?: 'up' | 'left' | 'scale';
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect(); // animate once, don't re-hide on scroll-away
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const variantClass = variant === 'left' ? 'reveal reveal-left' : variant === 'scale' ? 'reveal reveal-scale' : 'reveal';

  return (
    <div
      ref={ref}
      data-in={inView}
      className={`${variantClass} ${className}`}
      style={{ ['--reveal-delay' as any]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// <CountUp> — animates a number from 0 to its target when it scrolls into
// view. Handles suffixes like "+", "★", "h" (e.g. "500+", "4.7★", "48h").
// ---------------------------------------------------------------------------
export function CountUp({ value, duration = 1600, className = '' }: { value: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState('0');
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const match = value.match(/^([\d.]+)(.*)$/);
    if (!match) { setDisplay(value); return; } // non-numeric — show as-is

    const target = parseFloat(match[1]);
    const suffix = match[2];
    const decimals = (match[1].split('.')[1] || '').length;

    const io = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          setDisplay((target * eased).toFixed(decimals) + suffix);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return <span ref={ref} className={className}>{display}</span>;
}
