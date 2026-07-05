import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function AccountPage() {
  if (!HAS_SUPABASE) {
    // Prototype mode — no Supabase configured yet, show the page with placeholder context.
    return (
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl mb-1">Welcome back</h1>
        <p className="text-steel mb-8">Connect Supabase (see BACKEND_INTEGRATION.md) to enable real accounts.</p>
        <Tiles />
      </main>
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, loyalty_points, role')
    .eq('id', user.id)
    .single();
  const p = profile as { full_name: string | null; loyalty_points: number; role: string } | null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between mb-1">
        <h1 className="font-display text-3xl">Welcome back, {p?.full_name?.split(' ')[0] || 'there'}</h1>
        <SignOutButton />
      </div>
      <p className="text-steel mb-8">{p?.loyalty_points ?? 0} loyalty points{p?.role !== 'customer' ? ` · ${p?.role}` : ''}</p>
      <Tiles />
    </main>
  );
}

function Tiles() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Tile href="/account/orders" title="Orders" desc="Track status: placed → confirmed → shipped → delivered" />
      <Tile href="/account/wishlist" title="Wishlist" desc="Saved kits and gear" />
      <Tile href="/account/returns" title="Returns & exchanges" desc="Start a return within 14 days" />
      <Tile href="/account/referrals" title="Referrals" desc="Share your code, earn rewards" />
      <Tile href="/account/settings" title="Settings" desc="Email, notifications, addresses" />
      <Tile href="/account/loyalty" title="Loyalty points" desc="See tiers and rewards" />
    </div>
  );
}

function Tile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 card-hover block">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-steel mt-1">{desc}</p>
    </Link>
  );
}
