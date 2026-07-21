import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { translate, type Locale, type TranslationKey } from '@/lib/i18n/dictionary';
import { COOKIE_NAME } from '@/lib/i18n/LocaleProvider';
import { ORDER_STATUS_COLORS } from '@/lib/orderStatus';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

async function getT() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(COOKIE_NAME)?.value === 'ar' ? 'ar' : 'en') as Locale;
  return (key: TranslationKey) => translate(locale, key);
}

export default async function OrdersPage() {
  const t = await getT();
  if (!HAS_SUPABASE) {
    return <Shell orders={[]} demoMode t={t} />;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/orders');

  const { data } = await supabase
    .from('orders')
    .select('order_number, status, created_at, subtotal_usd')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <Shell orders={(data ?? []).map(o => ({
    number: o.order_number ?? '—', status: o.status, date: (o.created_at ?? '').slice(0, 10), total: Number(o.subtotal_usd),
  }))} t={t} />;
}

function Shell({ orders, demoMode = false, t }: { orders: { number: string; status: string; date: string; total: number }[]; demoMode?: boolean; t: (key: TranslationKey) => string }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-2">{t('account.yourOrders')}</h1>
      <p className="text-steel text-sm mb-8">{t('account.tapForTracking')}</p>
      {demoMode && <p className="text-steel text-sm mb-6">Connect Supabase and sign in to see your real orders.</p>}
      <div className="space-y-2">
        {orders.length === 0 && !demoMode && <p className="text-steel text-sm">{t('account.noOrdersYet')}</p>}
        {orders.map(o => (
          <Link key={o.number} href="/track" className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm card-premium">
            <span className="font-mono">{o.number}</span>
            <span className={`text-xs capitalize px-2 py-1 rounded-full ${ORDER_STATUS_COLORS[o.status] ?? 'bg-black/5 dark:bg-white/10'}`}>{o.status}</span>
            <span className="text-steel">{o.date}</span>
            <span className="font-medium tabular">${o.total}</span>
          </Link>
        ))}
      </div>
      <Link href="/track" className="inline-block mt-8 text-sm underline underline-offset-2">{t('account.trackByNumber')}</Link>
    </main>
  );
}
