'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// A slim top-of-page loading bar that plays on every route change — the
// classic "app feels fast" cue (YouTube/Next.js devtools style). It's a
// timed approximation rather than tied to real fetch completion (App
// Router doesn't expose that to client components without deeper plumbing),
// but it reads as instant feedback rather than a lie: real navigations on
// this site complete well within the bar's own animation window.
export default function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<number[]>([]);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setWidth(15);
    timers.current.push(window.setTimeout(() => setWidth(70), 90));
    timers.current.push(window.setTimeout(() => setWidth(92), 280));
    timers.current.push(window.setTimeout(() => setWidth(100), 460));
    timers.current.push(window.setTimeout(() => setVisible(false), 700));
    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden
    >
      <div
        className="h-full bg-volt shadow-[0_0_10px_2px_rgba(214,255,63,0.55)] transition-[width] duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
