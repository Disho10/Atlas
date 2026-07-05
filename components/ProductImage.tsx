'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

// Wraps next/image with a graceful fallback. Product photos here are
// external Unsplash placeholder URLs (see BACKEND_INTEGRATION.md) — those
// occasionally get taken down or renamed upstream, which otherwise shows a
// broken-image icon. Falls back to a simple gradient tile with a bag glyph
// instead, so a dead link never looks like a bug on the page.
export default function ProductImage(props: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-black/10 to-black/5 dark:from-white/10 dark:to-white/5">
        <svg width="28%" height="28%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-steel">
          <path d="M6 8h12l-1 12H7L6 8z" />
          <path d="M9 8V6a3 3 0 016 0v2" />
        </svg>
      </div>
    );
  }

  return <Image {...props} loading={props.priority ? undefined : 'lazy'} quality={70} onError={() => setFailed(true)} />;
}
