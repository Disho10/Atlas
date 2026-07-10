import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { translate, type Locale, type TranslationKey } from '@/lib/i18n/dictionary';
import { COOKIE_NAME } from '@/lib/i18n/LocaleProvider';
import SignOutButton from '@/components/SignOutButton';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// Account pages always require an auth check (redirect if signed out), which
// already makes them server-rendered per-request in a real deployment — so
// reading the locale cookie here costs nothing extra, unlike the marketing
// pages (see app/layout.tsx for why those avoid it).
async function getT() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(COOKIE_NAME)?.value === 'ar' ? 'ar' : 'en') as Locale;
  return (key: TranslationKey) => translate(locale, key);
}

export default async function AccountPage() {
  const t = await getT();

  if (!HAS_SUPABASE) {
    // Prototype mode — no Supabase configured yet, show the page with placeholder context.
    return (
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl mb-1">{t('account.welcomeBack')}</h1>
        <p className="text-steel mb-8">Connect Supabase (see BACKEND_INTEGRATION.md) to enable real accounts.</p>
        <Tiles t={t} />
      </main>
    );
  }

  const supabase = await createClient();
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
        <h1 className="font-display text-3xl">{t('account.welcomeBack')}, {p?.full_name?.split(' ')[0] || 'there'}</h1>
        <SignOutButton />
      </div>
      <p className="text-steel mb-8">{p?.loyalty_points ?? 0} {t('account.loyaltyPoints')}{p?.role !== 'customer' ? ` · ${p?.role}` : ''}</p>
      <Tiles t={t} />
    </main>
  );
}

function Tiles({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Tile href="/account/orders" title={t('account.orders')} desc={t('account.ordersDesc')} />
      <Tile href="/account/wishlist" title={t('account.wishlist')} desc={t('account.wishlistDesc')} />
      <Tile href="/account/returns" title={t('account.returnsExchanges')} desc={t('account.returnsDesc')} />
      <Tile href="/account/referrals" title={t('account.referrals')} desc={t('account.referralsDesc')} />
      <Tile href="/account/settings" title={t('account.settings')} desc={t('account.settingsDesc')} />
      <Tile href="/account/loyalty" title={t('account.loyaltyTile')} desc={t('account.loyaltyTileDesc')} />
    </div>
  );
}

function Tile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 card-premium block">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-steel mt-1">{desc}</p>
    </Link>
  );
}
