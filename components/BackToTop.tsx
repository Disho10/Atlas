'use client';

import { useEffect, useState } from 'react';

// Stacked above ChatWidget's bottom-right bubble (bottom-left is where
// Next.js's own dev-mode indicator badge lives, so we stay clear of it)
// — appears once you've scrolled a screen's worth, ring fills with how
// far down the page you are, click smooth-scrolls back to top.
export default function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0);
      setVisible(scrollTop > 700);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const r = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full bg-chalk dark:bg-ink shadow-2xl border border-black/10 dark:border-white/10 flex items-center justify-center btn-press transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-black/10 dark:text-white/10" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke="#D6FF3F" strokeWidth="2" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .15s linear' }}
        />
      </svg>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="relative text-ink dark:text-chalk">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
