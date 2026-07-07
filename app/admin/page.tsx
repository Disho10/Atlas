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
    return <AdminPanel role="owner" products={mockProducts} orders={mockOrders} zeroResultSearches={mockZero} leagues={[]} staff={[]} restockScores={[]} exchangeRate={89500} demoMode />;
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
  const [{ data: productRows }, { data: orderRows }, { data: zeroRows }, { data: leagueRows }, { data: staffRows }, { data: settingsRows }] = await Promise.all([
    supabase.from('products').select(`${STAFF_PRODUCT_COLUMNS}, product_tags(tags(label))`).order('created_at', { ascending: false }),
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100),
    supabase.from('search_logs').select('term').eq('result_count', 0).limit(500),
    supabase.from('leagues').select('slug, name').order('sort_order'),
    // Team list — owner uses this to manage roles. Reads all profiles (allowed for staff via RLS).
    supabase.from('profiles').select('id, full_name, email, role').order('role'),
    supabase.from('site_settings').select('key, value'),
  ]);

  const leagueOptions = (leagueRows ?? []).map((l: any) => ({ slug: l.slug, name: l.name }));
  const staff = (staffRows ?? [])
    .filter((p: any) => ['admin', 'manager', 'owner'].includes(p.role))
    .map((p: any) => ({ id: p.id, name: p.full_name ?? '—', email: p.email ?? '—', role: p.role }));

  const products = (productRows ?? []).map((r: any) => mapProductRow(r));

  const orders: Order[] = (orderRows ?? []).map((o: any) => ({
    id: o.order_number ?? o.id,
    dbId: o.id,
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

  // --- Restock recommendation score -----------------------------------------
  // Combine three signals per product into ONE ranked list:
  //   sales velocity (units sold recently), low-stock urgency, and search demand.
  // Each is normalized 0–1 against the max in its category, then weighted.
  const { data: allSearches } = await supabase.from('search_logs').select('term').limit(1000);
  const searchCounts = new Map<string, number>();
  for (const s of allSearches ?? []) {
    const t = (s.term ?? '').toLowerCase();
    searchCounts.set(t, (searchCounts.get(t) ?? 0) + 1);
  }

  // Units sold per product name (from confirmed/any recent orders)
  const soldByName = new Map<string, number>();
  for (const o of orderRows ?? []) {
    for (const it of (o.order_items ?? [])) {
      soldByName.set(it.product_name, (soldByName.get(it.product_name) ?? 0) + (it.qty ?? 0));
    }
  }

  const rawScores = products.map(p => {
    const sold = soldByName.get(p.name) ?? 0;
    // search demand: how often this product's name/team/tags were searched
    const nameL = p.name.toLowerCase();
    let searchHits = searchCounts.get(nameL) ?? 0;
    searchCounts.forEach((count, term) => {
      if (term && (nameL.includes(term) || p.team.toLowerCase().includes(term) || p.tags.some(t => t.toLowerCase().includes(term)))) {
        searchHits += count;
      }
    });
    // low-stock urgency: lower stock = higher urgency (0 stock is max unless coming soon)
    const urgency = p.stock <= 0 ? 1 : p.stock <= 3 ? 0.85 : p.stock <= 6 ? 0.6 : p.stock <= 12 ? 0.3 : 0.05;
    return { product: p, sold, searchHits, urgency };
  });

  const maxSold = Math.max(1, ...rawScores.map(s => s.sold));
  const maxSearch = Math.max(1, ...rawScores.map(s => s.searchHits));

  const restockScores = rawScores
    .map(s => {
      const velocity = s.sold / maxSold;
      const demand = s.searchHits / maxSearch;
      // Weighted blend: velocity 40%, urgency 35%, demand 25%.
      const score = velocity * 0.4 + s.urgency * 0.35 + demand * 0.25;
      return {
        id: s.product.id,
        name: s.product.name,
        stock: s.product.stock,
        sold: s.sold,
        searchHits: s.searchHits,
        score: Math.round(score * 100),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

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
      leagues={leagueOptions}
      staff={staff}
      restockScores={restockScores}
      exchangeRate={Number((settingsRows ?? []).find((s: any) => s.key === 'usd_to_lbp')?.value ?? 89500)}
    />
  );
}
