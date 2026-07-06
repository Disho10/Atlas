import Link from 'next/link';

// The Atlas mark, shown in the correct color for the current theme:
// black mark on light backgrounds, white mark on dark. Both PNGs are the same
// artwork in the two colors — CSS shows one and hides the other based on the
// `dark` class on <html>, so the swap is instant with no flash.
export default function Logo({ withSlogan = false, className = '' }: { withSlogan?: boolean; className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Atlas — home">
      <span className="relative block h-9 w-9 shrink-0">
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/brand/atlas-mark-dark.png" alt="Atlas" className="h-9 w-9 object-contain block dark:hidden" />
        <img src="/brand/atlas-mark-light.png" alt="Atlas" className="h-9 w-9 object-contain hidden dark:block" />
        {/* eslint-enable @next/next/no-img-element */}
      </span>
      {withSlogan && (
        <span className="text-[10px] uppercase tracking-[0.2em] text-steel">Follow Through.</span>
      )}
    </Link>
  );
}
