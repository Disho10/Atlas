import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { STAFF_PRODUCT_COLUMNS, mapProductRow } from '@/lib/supabase/queries';
import AdminPanel from '@/components/AdminPanel';
import {
  products as mockProducts,
  orders as mockOrders,
  zeroResultSearches as mockZero,
  type Order,
} from '@/lib/mockData';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function AdminPage() {
  // Prototype mode — no Supabase yet: keep the demo panel with a role switcher.
  if (!HAS_SUPABASE) {
    return <AdminPanel role="owner" products={mockProducts} orders={mockOrders} zeroResultSearches={mockZero} demoMode />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin');

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  const role = (profile as any)?.role as string | undefined;

  if (!role || !['admin', 'manager', 'owner'].includes(role)) {
    // Signed in, but not staff — this page simply doesn't exist for customers.
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-3">Staff only</h1>
        <p className="text-steel mb-8">This area is restricted to the Atlas team. If you believe you should have access, contact the owner.</p>
        <Link href="/" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium">Back to the store</Link>
      </main>
    );
  }

  // Live data — RLS policies (is_staff) authorize these reads for staff sessions.
  const [{ data: productRows }, { data: orderRows }, { data: zeroRows }] = await Promise.all([
    supabase.from('products').select(`${STAFF_PRODUCT_COLUMNS}, product_tags(tags(label))`).order('created_at', { ascending: false }),
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100),
    supabase.from('search_logs').select('term').eq('result_count', 0).limit(500),
  ]);

  const products = (productRows ?? []).map((r: any) => mapProductRow(r));

  const orders: Order[] = (orderRows ?? []).map((o: any) => ({
    id: o.order_number ?? o.id,
    date: (o.created_at ?? '').slice(0, 10),
    status: o.status === 'cancelled' ? 'placed' : o.status,
    total: Number(o.subtotal_usd),
    channel: o.channel,
    paymentMethod: ({ whish_pay: 'Whish Pay', omt: 'OMT', card: 'Card', cod: 'Cash on Delivery' } as const)[o.payment_method as string] ?? 'Cash on Delivery',
    customer: o.customer_name,
    address: [o.address, o.city].filter(Boolean).join(', '),
    items: (o.order_items ?? []).map((it: any) => ({
      productId: it.product_id ?? '',
      name: it.product_name,
      qty: it.qty,
      size: it.size ?? '',
      price: Number(it.unit_price_usd),
    })),
  }));

  // Aggregate zero-result searches by term
  const zeroCounts = new Map<string, number>();
  for (const r of zeroRows ?? []) zeroCounts.set(r.term, (zeroCounts.get(r.term) ?? 0) + 1);
  const zeroResultSearches = Array.from(zeroCounts, ([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <AdminPanel
      role={role as 'admin' | 'manager' | 'owner'}
      products={products}
      orders={orders}
      zeroResultSearches={zeroResultSearches}
    />
  );
}
