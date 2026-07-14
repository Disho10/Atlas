import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { STAFF_PRODUCT_COLUMNS, mapProductRow } from '@/lib/supabase/queries';
import { parseSiteSettings, DEFAULT_SETTINGS } from '@/lib/settings';
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
    return <AdminPanel role="owner" products={mockProducts} orders={mockOrders} zeroResultSearches={mockZero} leagues={[]} staff={[]} restockScores={[]} exchangeRate={89500} heroSlides={null} pages={[]} loyaltyPointsOutstanding={2450} promoCodes={[]} reviews={[]} returnRequests={[]} giftCards={[]} storeSettings={DEFAULT_SETTINGS} demoMode />;
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
  // Products specifically use the service-role client: cost_usd/code are
  // business-sensitive (margins, internal SKUs), so column-level grants now
  // block the authenticated/anon roles from selecting them directly over
  // REST — the service-role key is the only way to read them, and we only
  // reach this line after the staff role check above.
  const svc = createServiceRoleClient();
  const [{ data: productRows }, { data: orderRows }, { data: zeroRows }, { data: leagueRows }, { data: staffRows }, { data: settingsRows }, { data: pagesRows }, { data: loyaltyRows }, { data: promoRows }, { data: auditRows }, { data: reviewRows }, { data: returnRows }, { data: giftCardRows }] = await Promise.all([
    svc.from('products').select(`${STAFF_PRODUCT_COLUMNS}, product_tags(tags(label))`).order('created_at', { ascending: false }),
    // Was .limit(100) — silently capped every finance figure (revenue, AOV,
    // top sellers, etc.) to only the 100 most recent orders, understating
    // real totals for any store past that point. 1000 is PostgREST's own
    // per-request ceiling; if you outgrow that, this needs to move to a SQL
    // aggregate (SUM/COUNT in Postgres) instead of pulling every row into JS.
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(1000),
    supabase.from('search_logs').select('term').eq('result_count', 0).limit(500),
    supabase.from('leagues').select('slug, name').order('sort_order'),
    // Team list — owner uses this to manage roles. Reads all profiles (allowed for staff via RLS).
    supabase.from('profiles').select('id, full_name, email, role').order('role'),
    supabase.from('site_settings').select('key, value'),
    supabase.from('custom_pages').select('id, slug, title, blocks, published, updated_at').order('updated_at', { ascending: false }),
    // Outstanding loyalty points across every customer — a real liability
    // (what it'd cost if everyone redeemed today), only meaningful to the owner.
    supabase.from('profiles').select('loyalty_points'),
    supabase.from('promo_codes').select('id, code, description, kind, amount, min_subtotal_usd, max_uses, used_count, active, starts_at, ends_at, created_at').order('created_at', { ascending: false }),
    // Last action per staff member, for the "last active" column on the Team tab.
    supabase.from('admin_audit_log').select('actor_id, action, created_at').order('created_at', { ascending: false }).limit(500),
    // All reviews including hidden ones — staff-only via RLS ("not hidden or is_staff()").
    supabase.from('reviews').select('id, product_id, author_name, rating, body, hidden, hidden_reason, created_at, products(name)').order('created_at', { ascending: false }).limit(300),
    // Return/exchange requests with enough order context to act on them without a second click-through.
    supabase.from('return_requests').select('id, order_id, type, reason, status, refund_amount_usd, resolved_at, created_at, orders(order_number, customer_name, subtotal_usd)').order('created_at', { ascending: false }).limit(200),
    supabase.from('gift_cards').select('id, code, initial_balance_usd, remaining_balance_usd, purchaser_email, recipient_email, recipient_name, status, source, created_at').order('created_at', { ascending: false }).limit(300),
  ]);

  const pages = (pagesRows ?? []).map((p: any) => ({ id: p.id, slug: p.slug, title: p.title, blocks: p.blocks ?? [], published: p.published, updatedAt: (p.updated_at ?? '').slice(0, 10) }));

  const leagueOptions = (leagueRows ?? []).map((l: any) => ({ slug: l.slug, name: l.name }));
  const staff = (staffRows ?? [])
    .filter((p: any) => ['admin', 'manager', 'owner'].includes(p.role))
    .map((p: any) => ({ id: p.id, name: p.full_name ?? '—', email: p.email ?? '—', role: p.role }));

  const products = (productRows ?? []).map((r: any) => mapProductRow(r));

  const orders: Order[] = (orderRows ?? []).map((o: any) => ({
    id: o.order_number ?? o.id,
    dbId: o.id,
    date: (o.created_at ?? '').slice(0, 10),
    status: o.status as any,
    total: Number(o.subtotal_usd),
    channel: o.channel,
    paymentMethod: ({ whish_pay: 'Whish Pay', omt: 'OMT', card: 'Card', cod: 'Cash on Delivery' } as const)[o.payment_method as string] ?? 'Cash on Delivery',
    customer: o.customer_name,
    address: [o.address, o.city].filter(Boolean).join(', '),
    userId: o.user_id ?? undefined,
    email: o.customer_email ?? undefined,
    phone: o.customer_phone ?? undefined,
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

  const loyaltyPointsOutstanding = (loyaltyRows ?? []).reduce((s: number, r: any) => s + (r.loyalty_points ?? 0), 0);
  const promoCodes = (promoRows ?? []).map((p: any) => ({
    id: p.id, code: p.code, description: p.description ?? '', kind: p.kind, amount: Number(p.amount),
    minSubtotalUsd: Number(p.min_subtotal_usd ?? 0), maxUses: p.max_uses, usedCount: p.used_count ?? 0,
    active: p.active, startsAt: p.starts_at, endsAt: p.ends_at, createdAt: p.created_at,
  }));

  // Last action per staff member — admin_audit_log rows are already newest
  // first, so the first match per actor_id is their most recent action.
  const lastActiveByStaff = new Map<string, string>();
  for (const row of auditRows ?? []) {
    if (row.actor_id && !lastActiveByStaff.has(row.actor_id)) lastActiveByStaff.set(row.actor_id, row.created_at);
  }
  const staffWithActivity = staff.map(s => ({ ...s, lastActiveAt: lastActiveByStaff.get(s.id) ?? null }));

  const reviews = (reviewRows ?? []).map((r: any) => ({
    id: r.id, productId: r.product_id, productName: r.products?.name ?? 'Unknown product',
    authorName: r.author_name, rating: r.rating, body: r.body,
    hidden: r.hidden, hiddenReason: r.hidden_reason, createdAt: (r.created_at ?? '').slice(0, 10),
  }));

  const returnRequests = (returnRows ?? []).map((r: any) => ({
    id: r.id, orderId: r.order_id, orderNumber: r.orders?.order_number ?? '—',
    customerName: r.orders?.customer_name ?? '—', orderTotal: Number(r.orders?.subtotal_usd ?? 0),
    type: r.type, reason: r.reason, status: r.status,
    refundAmountUsd: r.refund_amount_usd != null ? Number(r.refund_amount_usd) : null,
    resolvedAt: r.resolved_at, createdAt: (r.created_at ?? '').slice(0, 10),
  }));

  const giftCards = (giftCardRows ?? []).map((g: any) => ({
    id: g.id, code: g.code, initialBalanceUsd: Number(g.initial_balance_usd),
    remainingBalanceUsd: Number(g.remaining_balance_usd), purchaserEmail: g.purchaser_email,
    recipientEmail: g.recipient_email, recipientName: g.recipient_name, status: g.status,
    source: g.source ?? 'purchase', createdAt: (g.created_at ?? '').slice(0, 10),
  }));

  return (
    <AdminPanel
      role={role as 'admin' | 'manager' | 'owner'}
      products={products}
      orders={orders}
      zeroResultSearches={zeroResultSearches}
      leagues={leagueOptions}
      staff={staffWithActivity}
      restockScores={restockScores}
      exchangeRate={Number((settingsRows ?? []).find((s: any) => s.key === 'usd_to_lbp')?.value ?? 89500)}
      heroSlides={(settingsRows ?? []).find((s: any) => s.key === 'hero_slides')?.value ? JSON.parse((settingsRows ?? []).find((s: any) => s.key === 'hero_slides')!.value) : null}
      pages={pages}
      loyaltyPointsOutstanding={loyaltyPointsOutstanding}
      promoCodes={promoCodes}
      reviews={reviews}
      returnRequests={returnRequests}
      giftCards={giftCards}
      storeSettings={parseSiteSettings(settingsRows)}
    />
  );
}
