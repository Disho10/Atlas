import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function OrdersPage() {
  if (!HAS_SUPABASE) {
    return <Shell orders={[]} demoMode />;
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
  }))} />;
}

function Shell({ orders, demoMode = false }: { orders: { number: string; status: string; date: string; total: number }[]; demoMode?: boolean }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-2">Your orders</h1>
      <p className="text-steel text-sm mb-8">Tap any order for live tracking, returns, or exchanges.</p>
      {demoMode && <p className="text-steel text-sm mb-6">Connect Supabase and sign in to see your real orders.</p>}
      <div className="space-y-2">
        {orders.length === 0 && !demoMode && <p className="text-steel text-sm">No orders yet. When you place one, it'll show here.</p>}
        {orders.map(o => (
          <Link key={o.number} href="/track" className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm card-premium">
            <span className="font-mono">{o.number}</span>
            <span className="text-xs capitalize px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">{o.status}</span>
            <span className="text-steel">{o.date}</span>
            <span className="font-medium tabular">${o.total}</span>
          </Link>
        ))}
      </div>
      <Link href="/track" className="inline-block mt-8 text-sm underline underline-offset-2">Track an order by number →</Link>
    </main>
  );
}
