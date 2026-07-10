'use client';

import { useRef } from 'react';

// Mouse-tracked 3D tilt + a soft light that follows the cursor. Mouse-only
// (pointerType check) and skipped under prefers-reduced-motion via the CSS
// media query in globals.css — on touch devices and for reduced-motion users
// this renders as a completely static card.
export default function TiltCard({
  children,
  className = '',
  intensity = 8,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--tilt-x', `${(0.5 - y) * intensity}deg`);
    el.style.setProperty('--tilt-y', `${(x - 0.5) * intensity}deg`);
    el.style.setProperty('--spot-x', `${x * 100}%`);
    el.style.setProperty('--spot-y', `${y * 100}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`tilt-card ${className}`}
    >
      {children}
      <div className="tilt-spotlight" aria-hidden />
    </div>
  );
}
