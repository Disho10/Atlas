import Link from 'next/link';

// Promo module: tells signed-out visitors that signing in gets them 10% off
// their first order (see signup_welcome_discount() in
// supabase/migrations/0013_mandatory_phone_and_signup_welcome.sql — this is
// purely the announcement, the actual discount is computed/enforced there).
// Drop this anywhere it's useful for guests (cart, checkout, etc.) — it
// renders nothing once useAuth().signedIn is true.
export default function SignupWelcomeBanner({ next, className = '' }: { next?: string; className?: string }) {
  return (
    <div className={`rounded-2xl bg-volt/10 border border-volt/30 px-4 py-3.5 text-sm flex items-center gap-3 ${className}`}>
      <span className="shrink-0 w-9 h-9 rounded-full bg-volt/20 flex items-center justify-center font-display text-volt text-xs">
        10%
      </span>
      <span className="flex-1">
        <span className="font-medium">New here?</span> Sign in and get <b>10% off your first order</b> — automatically, no code needed.
      </span>
      <Link
        href={next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in'}
        className="shrink-0 text-xs font-medium bg-volt text-ink rounded-full px-4 py-2 btn-press"
      >
        Sign in
      </Link>
    </div>
  );
}
