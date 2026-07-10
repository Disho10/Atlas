'use client';

import { useEffect, useRef, useState } from 'react';

// Literal split-flap departure-board digit flip — each character flips
// into place once when it scrolls into view, staggered left to right.
// One-shot (not a loop), and prefers-reduced-motion disables the flip
// entirely via the .flap-digit CSS rule, showing the value immediately.
export default function Scoreboard({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setFlipped(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={className}>
      {value.split('').map((c, i) => (
        <span
          key={i}
          className="flap-digit"
          data-flip={flipped}
          style={flipped ? { animationDelay: `${i * 90}ms` } : undefined}
        >
          {c}
        </span>
      ))}
    </span>
  );
}
