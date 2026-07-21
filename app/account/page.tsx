import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { translate, type Locale, type TranslationKey } from '@/lib/i18n/dictionary';
import { COOKIE_NAME } from '@/lib/i18n/LocaleProvider';
import { ORDER_STATUS_COLORS } from '@/lib/orderStatus';
import SignOutButton from '@/components/SignOutButton';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const RECENT_ORDERS_LIMIT = 3;

type RecentOrder = { number: string; status: string; date: string; total: number };

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

  const { data: recentOrdersData } = await supabase
    .from('orders')
    .select('order_number, status, created_at, subtotal_usd')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(RECENT_ORDERS_LIMIT);
  const recentOrders: RecentOrder[] = (recentOrdersData ?? []).map(o => ({
    number: o.order_number ?? '—', status: o.status, date: (o.created_at ?? '').slice(0, 10), total: Number(o.subtotal_usd),
  }));

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between mb-1">
        <h1 className="font-display text-3xl">{t('account.welcomeBack')}, {p?.full_name?.split(' ')[0] || 'there'}</h1>
        <SignOutButton />
      </div>
      <p className="text-steel mb-8">{p?.loyalty_points ?? 0} {t('account.loyaltyPoints')}{p?.role !== 'customer' ? ` · ${p?.role}` : ''}</p>
      <Tiles t={t} />
      {recentOrders.length > 0 && <RecentOrders orders={recentOrders} t={t} />}
    </main>
  );
}

function RecentOrders({ orders, t }: { orders: RecentOrder[]; t: (key: TranslationKey) => string }) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">{t('account.yourOrders')}</h2>
        <Link href="/account/orders" className="text-sm underline underline-offset-2 shrink-0">{t('account.orders')} →</Link>
      </div>
      <div className="space-y-2">
        {orders.map(o => (
          <Link key={o.number} href="/track" className="flex items-center justify-between gap-3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm card-premium">
            <span className="font-mono truncate">{o.number}</span>
            <span className={`text-xs capitalize px-2 py-1 rounded-full shrink-0 ${ORDER_STATUS_COLORS[o.status] ?? 'bg-black/5 dark:bg-white/10'}`}>{o.status}</span>
            <span className="text-steel shrink-0 hidden sm:inline">{o.date}</span>
            <span className="font-medium tabular shrink-0">${o.total}</span>
          </Link>
        ))}
      </div>
    </div>
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
