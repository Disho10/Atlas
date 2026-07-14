'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { formatCurrency, type Product, type Order } from '@/lib/mockData';
import { saveProduct, deleteProduct, logManualOrder, logManualOrderMulti, updateOrderStatus, setStaffRole, createPromo, setPromoActive, setExchangeRate, savePage, deletePage, saveHeroSlides, setReviewHidden, resolveReturn, setSiteSetting } from '@/app/admin/actions';
import { DEFAULT_SETTINGS, settingDbKey, type SiteSettings } from '@/lib/settings';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { TranslationKey } from '@/lib/i18n/dictionary';

type Role = 'owner' | 'manager' | 'admin';
type LeagueOpt = { slug: string; name: string };
type StaffMember = { id: string; name: string; email: string; role: string; lastActiveAt?: string | null };
type PageData = { id: string; slug: string; title: string; blocks: any[]; published: boolean; updatedAt: string };
type PromoCode = {
  id: string; code: string; description: string; kind: string; amount: number;
  minSubtotalUsd: number; maxUses: number | null; usedCount: number; active: boolean;
  startsAt: string | null; endsAt: string | null; createdAt: string;
};
type ReviewItem = {
  id: string; productId: string; productName: string; authorName: string; rating: number;
  body: string; hidden: boolean; hiddenReason: string | null; createdAt: string;
};
type ReturnRequestItem = {
  id: string; orderId: string; orderNumber: string; customerName: string; orderTotal: number;
  type: string; reason: string; status: string; refundAmountUsd: number | null;
  resolvedAt: string | null; createdAt: string;
};

export default function AdminPanel({
  role: fixedRole,
  products,
  orders,
  zeroResultSearches,
  leagues,
  staff,
  restockScores,
  exchangeRate: initialRate,
  heroSlides: initialHeroSlides,
  pages,
  loyaltyPointsOutstanding = 0,
  promoCodes = [],
  reviews = [],
  returnRequests = [],
  storeSettings = DEFAULT_SETTINGS,
  demoMode = false,
}: {
  role: Role;
  products: Product[];
  orders: Order[];
  zeroResultSearches: { term: string; count: number }[];
  leagues: LeagueOpt[];
  staff: StaffMember[];
  restockScores: { id: string; name: string; stock: number; sold: number; searchHits: number; score: number }[];
  exchangeRate: number;
  heroSlides: any[] | null;
  pages: PageData[];
  loyaltyPointsOutstanding?: number;
  promoCodes?: PromoCode[];
  reviews?: ReviewItem[];
  returnRequests?: ReturnRequestItem[];
  storeSettings?: SiteSettings;
  demoMode?: boolean;
}) {
  const [role, setRole] = useState<Role>(fixedRole);
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [salaries, setSalaries] = useState(1200);
  const [otherCosts, setOtherCosts] = useState(0);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [loggingOrder, setLoggingOrder] = useState(false);
  const [editingPage, setEditingPage] = useState<PageData | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [staleOnly, setStaleOnly] = useState(false);
  const [deadStockOnly, setDeadStockOnly] = useState(false);
  const { t } = useLocale();
  // React's purity rule disallows Date.now() anywhere in the render path —
  // even inside useMemo, since the memo callback must itself be pure (it can
  // run more than once, e.g. under Strict Mode). The correct pattern is the
  // same one used for reading any other external/impure source: capture it
  // in an effect, which runs after render, and treat the "hasn't loaded yet"
  // instant (very first render) as though these date-relative features
  // simply have no data yet.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);

  const canEditProducts = role === 'owner' || role === 'manager';

  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const revenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const cancelledRevenue = cancelledOrders.reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 6);

  // Channel breakdown
  const byChannel = { website: 0, instagram: 0, whatsapp: 0 };
  activeOrders.forEach(o => { if (o.channel in byChannel) byChannel[o.channel as keyof typeof byChannel] += o.total; });

  // Status breakdown
  const byStatus = { placed: 0, confirmed: 0, shipped: 0, delivered: 0 };
  activeOrders.forEach(o => { if (o.status in byStatus) byStatus[o.status as keyof typeof byStatus]++; });

  // Product cost/margin — matched by productId (order_items.product_id), not
  // by name substring. The old version used `it.name.includes(p.name)`,
  // which would double-count anything whose name is a substring of another
  // product's name (e.g. "Real Madrid Home Jersey" matching inside "Real
  // Madrid Home Jersey (Kids)") — a real bug in a number that's supposed to
  // be trustworthy.
  const costById = new Map(products.filter(p => p.cost != null).map(p => [p.id, p.cost!]));
  const totalCost = activeOrders.flatMap(o => o.items).reduce((s, it) => {
    const cost = costById.get(it.productId);
    return cost != null ? s + cost * it.qty : s;
  }, 0);
  const grossMargin = revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 100) : 0;

  // Average order value
  const avgOrderValue = activeOrders.length > 0 ? revenue / activeOrders.length : 0;
  const mostRequested = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);

  // --- Finance tab additions -------------------------------------------------
  const [financePeriod, setFinancePeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const periodDays = { '7d': 7, '30d': 30, '90d': 90, all: Infinity }[financePeriod];
  const periodCutoff = new Date();
  periodCutoff.setDate(periodCutoff.getDate() - periodDays);
  const periodOrders = activeOrders.filter(o => periodDays === Infinity || new Date(o.date) >= periodCutoff);
  const periodRevenue = periodOrders.reduce((s, o) => s + o.total, 0);
  const periodAOV = periodOrders.length > 0 ? periodRevenue / periodOrders.length : 0;

  // Daily revenue series for the trend chart (last N days, oldest first)
  const trendDays = Math.min(periodDays === Infinity ? 90 : periodDays, 90);
  const dailyRevenue = Array.from({ length: trendDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (trendDays - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const total = activeOrders.filter(o => o.date === key).reduce((s, o) => s + o.total, 0);
    return { date: key, total };
  });
  const maxDailyRevenue = Math.max(1, ...dailyRevenue.map(d => d.total));

  // Payment method breakdown
  const byPaymentMethod = periodOrders.reduce((m, o) => {
    m.set(o.paymentMethod, (m.get(o.paymentMethod) ?? 0) + o.total);
    return m;
  }, new Map<string, number>());

  // Discounts given — items subtotal (qty × unit price, pre-discount) minus
  // what the order actually settled for (post promo/referral discount).
  // place_order() applies the discount before storing subtotal_usd, so this
  // difference is the only way to recover "how much did we give away."
  const totalDiscountGiven = periodOrders.reduce((s, o) => {
    const itemsSubtotal = o.items.reduce((ss, it) => ss + it.price * it.qty, 0);
    return s + Math.max(0, itemsSubtotal - o.total);
  }, 0);

  // Customer repeat-purchase rate — grouped by userId (signed-in) falling
  // back to email (guest checkout), since guests have no userId.
  const ordersByCustomer = new Map<string, number>();
  activeOrders.forEach(o => {
    const key = o.userId || o.email || o.customer;
    if (!key) return;
    ordersByCustomer.set(key, (ordersByCustomer.get(key) ?? 0) + 1);
  });
  const uniqueCustomers = ordersByCustomer.size;
  const repeatCustomers = [...ordersByCustomer.values()].filter(n => n > 1).length;
  const repeatRate = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;

  // Inventory valuation — capital tied up at cost vs. what it's worth at
  // retail if it all sold at full price.
  const inventoryAtCost = products.reduce((s, p) => s + (p.cost ?? 0) * p.stock, 0);
  const inventoryAtRetail = products.reduce((s, p) => s + p.price * p.stock, 0);

  // Loyalty liability — what redeeming every outstanding point today would cost.
  // 100 points = $5, so $0.05/point (see lib/loyalty.ts pointsToDiscount).
  const loyaltyLiabilityUsd = loyaltyPointsOutstanding * 0.05;

  // --- Signals for promo code suggestions (Promos tab) -----------------------
  // Slow movers: meaningful stock sitting on the shelf with zero sales.
  const slowMovers = restockScores.filter(r => r.stock > 10 && r.sold === 0);
  const deadStockIds = new Set(slowMovers.map(r => r.id));
  const reorderBudget = restockScores.reduce((s, r) => {
    if (r.score < 30) return s;
    const suggestedQty = Math.max(0, Math.max(r.sold, 6) - r.stock);
    const unitCost = costById.get(r.id);
    return unitCost != null ? s + unitCost * suggestedQty : s;
  }, 0);
  const slowMoverValueTied = slowMovers.reduce((s, r) => {
    const cost = costById.get(r.id);
    return cost != null ? s + cost * r.stock : s;
  }, 0);

  // Win-back candidates: customers with at least one order, but nothing in 45+ days.
  const lastOrderByCustomer = new Map<string, string>();
  activeOrders.forEach(o => {
    const key = o.userId || o.email || o.customer;
    if (!key) return;
    const prev = lastOrderByCustomer.get(key);
    if (!prev || o.date > prev) lastOrderByCustomer.set(key, o.date);
  });
  const winBackCutoff = new Date();
  winBackCutoff.setDate(winBackCutoff.getDate() - 45);
  const winBackCandidates = [...lastOrderByCustomer.values()].filter(d => new Date(d) < winBackCutoff).length;

  // Week-over-week: last 7 days vs the 7 days before that.
  const last7 = dailyRevenue.slice(-7).reduce((s, d) => s + d.total, 0);
  const prior7 = dailyRevenue.slice(-14, -7).reduce((s, d) => s + d.total, 0);
  const weekOverWeekChange = prior7 > 0 ? Math.round(((last7 - prior7) / prior7) * 100) : null;

  // Promo cadence: days since the last code was created, and whether anything's live now.
  const mostRecentPromoDate = promoCodes.length > 0
    ? promoCodes.reduce((latest, p) => (p.createdAt > latest ? p.createdAt : latest), promoCodes[0].createdAt)
    : null;
  const daysSinceLastPromo = mostRecentPromoDate && now !== null
    ? Math.floor((now - new Date(mostRecentPromoDate).getTime()) / 86400000)
    : null;
  const hasActivePromo = promoCodes.some(p => p.active);
  // --- end promo suggestion signals -------------------------------------------

  // Refunds actually paid out in the period — return_requests only becomes a
  // real cost once staff approves/completes it with an amount; a filed-but-
  // unresolved return isn't money out the door yet.
  const periodRefunds = returnRequests.filter(r =>
    (r.status === 'approved' || r.status === 'completed') &&
    r.refundAmountUsd != null &&
    r.resolvedAt &&
    (financePeriod === 'all' || new Date(r.resolvedAt) >= periodCutoff)
  );
  const totalRefundsGiven = periodRefunds.reduce((s, r) => s + (r.refundAmountUsd ?? 0), 0);
  const allTimeRefunds = returnRequests
    .filter(r => (r.status === 'approved' || r.status === 'completed') && r.refundAmountUsd != null)
    .reduce((s, r) => s + (r.refundAmountUsd ?? 0), 0);
  const pendingReturnsCount = returnRequests.filter(r => r.status === 'submitted').length;

  const exportFinanceCsv = () => {
    const header = ['Order', 'Date', 'Customer', 'Payment method', 'Status', 'Total USD'];
    const rows = orders.map(o => [o.id, o.date, o.customer, o.paymentMethod, o.status, o.total.toFixed(2)]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // --- end finance tab additions ---------------------------------------------

  // Stale = still sitting at placed/confirmed 48h+ after being created —
  // usually means it's been forgotten, not that it's genuinely slow.
  const isStale = (o: Order) => {
    if (now === null) return false;
    if (o.status !== 'placed' && o.status !== 'confirmed') return false;
    return now - new Date(o.date).getTime() > 48 * 3600 * 1000;
  };
  const staleCount = orders.filter(isStale).length;

  const filteredOrders = orders.filter(o => {
    if (staleOnly && !isStale(o)) return false;
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    const q = orderSearch.toLowerCase().trim();
    if (q && !o.id.toLowerCase().includes(q) && !o.customer.toLowerCase().includes(q)) return false;
    return true;
  });

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }, [query, products]);

  const allTabs: { id: string; labelKey: TranslationKey; roles: Role[] }[] = [
    { id: 'overview', labelKey: 'admin.overview', roles: ['owner', 'manager', 'admin'] },
    { id: 'orders', labelKey: 'admin.orders', roles: ['owner', 'manager', 'admin'] },
    { id: 'products', labelKey: 'admin.products', roles: ['owner', 'manager', 'admin'] },
    { id: 'requests', labelKey: 'admin.restockPriority', roles: ['owner', 'manager'] },
    { id: 'analytics', labelKey: 'admin.searchAnalytics', roles: ['owner', 'manager'] },
    { id: 'promos', labelKey: 'admin.promoCodes', roles: ['owner', 'manager'] },
    { id: 'hero', labelKey: 'admin.heroSlides', roles: ['owner', 'manager'] },
    { id: 'pages', labelKey: 'admin.pages', roles: ['owner', 'manager'] },
    { id: 'team', labelKey: 'admin.team', roles: ['owner'] },
    { id: 'customers', labelKey: 'admin.customers', roles: ['owner', 'manager', 'admin'] },
    { id: 'reviews', labelKey: 'admin.reviews', roles: ['owner', 'manager', 'admin'] },
    { id: 'returns', labelKey: 'admin.returns', roles: ['owner', 'manager'] },
    { id: 'finance', labelKey: 'admin.finance', roles: ['owner'] },
    { id: 'storeSettings', labelKey: 'admin.storeSettings', roles: ['owner', 'manager'] },
  ];
  const tabs = allTabs.filter(tb => tb.roles.includes(role));

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl">{t('nav.staffPanel')}</h1>
          <p className="text-steel text-sm">{demoMode ? 'Demo mode — connect Supabase for live data' : 'Signed in as'}</p>
        </div>
        {demoMode ? (
          <div className="flex gap-2">
            {(['owner', 'manager', 'admin'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setTab('overview'); }}
                className={`px-4 py-2 rounded-full text-sm capitalize border ${role === r ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}
              >
                {r}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-4 py-2 rounded-full text-sm capitalize bg-crimson text-white font-medium">{role}</span>
        )}
      </div>

      {notice && (
        <div className="mb-6 rounded-xl bg-volt/15 border border-volt/40 text-ink dark:text-chalk px-4 py-3 text-sm">{notice}</div>
      )}
      {demoMode && (
        <div className="mb-6 rounded-xl bg-black/5 dark:bg-white/10 px-4 py-3 text-sm text-steel">
          Actions like adding products or logging orders are disabled in demo mode. Connect Supabase and sign in as staff to use them.
        </div>
      )}

      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 rounded-full text-sm shrink-0 btn-press transition-colors duration-200 ${tab === tb.id ? 'bg-volt text-ink font-medium' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'}`}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-4 gap-4 mb-10">
          <Stat label="Revenue" value={formatCurrency(revenue, 'USD')} />
          <Stat label="Active orders" value={String(activeOrders.length)} />
          <Stat label="Avg. order value" value={formatCurrency(avgOrderValue, 'USD')} />
          <Stat label="Low-stock items" value={String(lowStock.length)} tone={lowStock.length > 0 ? 'crimson' : undefined} />
        </div>
      )}

      {tab === 'overview' && (
        <Section title="Most requested this week" desc="Owner-configurable time window — currently set to 7 days">
          <div className="space-y-2">
            {mostRequested.map(p => (
              <Row key={p.id}>
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="text-sm text-steel">{p.reviewCount} reviews</span>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'orders' && (
        <Section title="Orders" desc="Includes website, Instagram, and WhatsApp orders. Change status with the dropdown.">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              placeholder="Search order # or customer..."
              className="flex-1 min-w-[180px] border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-2.5 text-sm"
            />
            <select
              value={orderStatusFilter}
              onChange={e => setOrderStatusFilter(e.target.value)}
              className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-3 py-2.5 text-sm capitalize"
            >
              <option value="all">All statuses</option>
              {['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {staleCount > 0 && (
              <button
                onClick={() => setStaleOnly(v => !v)}
                className={`text-xs font-medium px-3.5 py-2 rounded-full btn-press transition-colors ${staleOnly ? 'bg-crimson text-chalk' : 'bg-crimson/10 text-crimson'}`}
              >
                ⚠ {staleCount} stale (48h+)
              </button>
            )}
            <button
              disabled={demoMode}
              onClick={() => setLoggingOrder(true)}
              className="text-sm bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full px-4 py-2 btn-press disabled:opacity-40 ml-auto"
            >
              + Log Instagram/WhatsApp order
            </button>
          </div>
          <div className="space-y-2">
            {filteredOrders.length === 0 && <p className="text-steel text-sm py-6 text-center">{orders.length === 0 ? 'No orders yet.' : 'No orders match those filters.'}</p>}
            {filteredOrders.map(o => (
              <OrderRow key={o.id} order={o} role={role} demoMode={demoMode} onDone={flash} stale={isStale(o)} />
            ))}
          </div>
        </Section>
      )}

      {tab === 'products' && (
        <Section title="Products" desc={canEditProducts ? 'Add, edit, or remove products. Internal codes are staff-only.' : 'View only — ask an Owner or Manager to make product changes.'}>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by product, tag, or internal code..."
              className="flex-1 min-w-[180px] border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm"
            />
            {deadStockIds.size > 0 && (
              <button
                onClick={() => setDeadStockOnly(v => !v)}
                className={`text-xs font-medium px-3.5 py-2 rounded-full btn-press transition-colors shrink-0 ${deadStockOnly ? 'bg-crimson text-chalk' : 'bg-crimson/10 text-crimson'}`}
              >
                {deadStockIds.size} dead stock
              </button>
            )}
            {canEditProducts && (
              <button
                disabled={demoMode}
                onClick={() => setEditing('new')}
                className="text-sm bg-volt text-ink rounded-xl px-5 btn-press shrink-0 disabled:opacity-40"
              >
                + Add product
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(deadStockOnly ? products.filter(p => deadStockIds.has(p.id)) : (query ? searchResults : products)).map(p => (
              <Row key={p.id}>
                <span className="text-xs font-mono text-steel w-28 truncate">{p.code || '—'}</span>
                <span className="flex-1 text-sm">
                  {p.name}
                  {p.status === 'draft' && <span className="ml-2 text-[10px] uppercase bg-black/10 dark:bg-white/15 rounded px-1.5 py-0.5">Draft</span>}
                  {deadStockIds.has(p.id) && <span className="ml-2 text-[10px] uppercase bg-crimson/10 text-crimson rounded px-1.5 py-0.5">Dead stock</span>}
                </span>
                <span className="text-sm tabular w-20">{p.stock} in stock</span>
                <span className="text-sm font-medium tabular w-14 text-right">${p.price}</span>
                {canEditProducts && (
                  <button
                    disabled={demoMode}
                    onClick={() => setEditing(p)}
                    className="text-xs underline underline-offset-2 text-steel w-10 text-right disabled:opacity-40"
                  >
                    Edit
                  </button>
                )}
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'requests' && (
        <Section
          title="Restock priority"
          desc="One combined score per product: sales velocity (40%) + low-stock urgency (35%) + search demand (25%). Higher = restock sooner."
        >
          {restockScores.length === 0 ? (
            <p className="text-steel text-sm">No data yet — scores build up as orders and searches come in.</p>
          ) : (
            <>
              {reorderBudget > 0 && (
                <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-5 mb-5">
                  <p className="text-xs text-steel mb-1">Estimated cost to restock everything scoring 30+</p>
                  <p className="font-display text-2xl tabular">{formatCurrency(reorderBudget, 'USD')}</p>
                  <p className="text-xs text-steel mt-1">Based on cost price × suggested reorder quantity — only for items with cost data set.</p>
                </div>
              )}
              <div className="space-y-2">
                {restockScores.map((r, i) => {
                  const suggestedQty = r.score >= 30 ? Math.max(0, Math.max(r.sold, 6) - r.stock) : 0;
                  const unitCost = costById.get(r.id);
                  return (
                    <div key={r.id} className="flex items-center gap-3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 card-hover">
                      <span className="text-xs text-steel w-5 tabular">{i + 1}</span>
                      <span className="flex-1 text-sm">{r.name}</span>
                      <span className={`text-xs tabular w-16 text-right ${r.stock <= 3 ? 'text-crimson' : 'text-steel'}`}>{r.stock} left</span>
                      <span className="text-xs text-steel tabular w-16 text-right">{r.sold} sold</span>
                      <span className="text-xs text-steel tabular w-20 text-right">{r.searchHits} searches</span>
                      {suggestedQty > 0 && (
                        <span className="text-xs text-steel tabular w-24 text-right">
                          reorder {suggestedQty}{unitCost != null ? ` (${formatCurrency(unitCost * suggestedQty, 'USD')})` : ''}
                        </span>
                      )}
                      {/* Score bar */}
                      <div className="w-24 shrink-0">
                        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div className="h-full bg-volt rounded-full" style={{ width: `${r.score}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular w-10 text-right">{r.score}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <p className="text-xs text-steel mt-4">
            A product ranks high only when multiple signals align — selling fast <em>and</em> running low <em>and</em> being searched beats a product that hits just one.
          </p>
        </Section>
      )}

      {tab === 'analytics' && (
        <Section title="Zero-result searches" desc="What customers search for that you don't carry yet — a direct demand signal">
          {zeroResultSearches.length > 0 && (
            <div className="flex justify-end mb-3">
              <button
                onClick={async () => {
                  const text = zeroResultSearches.map(z => `${z.term} (${z.count}×)`).join('\n');
                  try { await navigator.clipboard.writeText(text); flash('Copied to clipboard.'); } catch {}
                }}
                className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-black/15 dark:border-white/20 btn-press"
              >
                Copy list
              </button>
            </div>
          )}
          <div className="space-y-2">
            {zeroResultSearches.length === 0 && <p className="text-steel text-sm">No zero-result searches logged yet.</p>}
            {zeroResultSearches.map(z => (
              <Row key={z.term}>
                <span className="flex-1 text-sm">{z.term}</span>
                <span className="text-sm text-steel tabular">{z.count}×</span>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'promos' && (
        <PromosTab
          demoMode={demoMode}
          onDone={flash}
          promoCodes={promoCodes}
          suggestions={{
            grossMargin,
            slowMoverCount: slowMovers.length,
            slowMoverValueTied,
            winBackCandidates,
            weekOverWeekChange,
            daysSinceLastPromo,
            hasActivePromo,
          }}
        />
      )}

      {tab === 'hero' && (
        <HeroSlidesTab initialSlides={initialHeroSlides} demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'pages' && (
        <PagesTab pages={pages} demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'team' && (
        <TeamTab staff={staff} demoMode={demoMode} onDone={flash} now={now} />
      )}

      {tab === 'customers' && (
        <CustomersTab orders={orders} />
      )}

      {tab === 'reviews' && (
        <ReviewsTab reviews={reviews} demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'returns' && (
        <ReturnsTab returnRequests={returnRequests} demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'storeSettings' && (
        <StoreSettingsTab initialSettings={storeSettings} demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'finance' && (
        <>
          <ExchangeRateEditor initialRate={initialRate} demoMode={demoMode} onDone={flash} />

          {/* Period selector + export */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex gap-2">
              {([['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['all', 'All time']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFinancePeriod(id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium btn-press transition-colors ${financePeriod === id ? 'bg-volt text-ink' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={exportFinanceCsv} className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-black/15 dark:border-white/20 btn-press">
              Export orders (CSV)
            </button>
          </div>

          {/* Key metrics — scoped to the selected period */}
          <div className="grid sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Revenue" value={formatCurrency(periodRevenue, 'USD')} />
            <Stat label="Orders" value={String(periodOrders.length)} />
            <Stat label="Avg. order value" value={formatCurrency(periodAOV, 'USD')} />
            <Stat label="Gross margin" value={grossMargin > 0 ? `${grossMargin}%` : '—'} tone={grossMargin < 30 ? 'crimson' : undefined} />
          </div>

          {/* Cancelled orders impact */}
          {cancelledOrders.length > 0 && (
            <div className="rounded-2xl bg-crimson/10 border border-crimson/30 p-5 mb-8">
              <p className="text-sm font-medium text-crimson mb-1">Cancelled orders</p>
              <p className="text-xs text-steel">{cancelledOrders.length} order{cancelledOrders.length === 1 ? '' : 's'} cancelled — {formatCurrency(cancelledRevenue, 'USD')} excluded from revenue.</p>
            </div>
          )}

          {/* Revenue trend */}
          <Section title="Revenue trend" desc={`Daily revenue, last ${dailyRevenue.length} days`}>
            <div className="flex items-end gap-[2px] h-32 border-b border-black/10 dark:border-white/10">
              {dailyRevenue.map(d => (
                <div key={d.date} className="flex-1 group relative">
                  <div
                    className="bg-volt rounded-t-sm min-h-[2px] transition-all hover:opacity-70"
                    style={{ height: `${(d.total / maxDailyRevenue) * 128}px` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-chalk text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                    {d.date}: {formatCurrency(d.total, 'USD')}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Revenue by channel */}
          <Section title="Revenue by channel" desc="Where the money is coming from">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: 'Website', value: byChannel.website, color: 'bg-volt' },
                { label: 'WhatsApp', value: byChannel.whatsapp, color: 'bg-[#25D366]' },
                { label: 'Instagram', value: byChannel.instagram, color: 'bg-[#E1306C]' },
              ].map(ch => (
                <div key={ch.label} className="border border-black/10 dark:border-white/10 rounded-2xl p-5 card-premium">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${ch.color}`} />
                    <span className="text-xs uppercase tracking-wide text-steel">{ch.label}</span>
                  </div>
                  <p className="font-display text-2xl tabular">{formatCurrency(ch.value, 'USD')}</p>
                  {revenue > 0 && <p className="text-xs text-steel mt-1">{Math.round((ch.value / revenue) * 100)}% of total</p>}
                </div>
              ))}
            </div>
          </Section>

          {/* Revenue by payment method */}
          <Section title="Revenue by payment method" desc="Whish Pay, OMT, Card, and Cash on Delivery">
            <div className="grid sm:grid-cols-4 gap-3">
              {['Cash on Delivery', 'Whish Pay', 'OMT', 'Card'].map(pm => {
                const val = byPaymentMethod.get(pm) ?? 0;
                return (
                  <div key={pm} className="border border-black/10 dark:border-white/10 rounded-2xl p-5 card-premium">
                    <p className="text-xs uppercase tracking-wide text-steel mb-2">{pm}</p>
                    <p className="font-display text-xl tabular">{formatCurrency(val, 'USD')}</p>
                    {periodRevenue > 0 && <p className="text-xs text-steel mt-1">{Math.round((val / periodRevenue) * 100)}% of period</p>}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Order pipeline */}
          <Section title="Order pipeline" desc="Where orders currently stand">
            <div className="grid grid-cols-4 gap-2 text-center">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="border border-black/10 dark:border-white/10 rounded-xl p-4 card-premium">
                  <p className="font-display text-2xl tabular">{count}</p>
                  <p className="text-xs text-steel capitalize mt-1">{status}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Customers */}
          <Section title="Customers" desc="Repeat business is the cheapest revenue you'll ever get">
            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label="Unique customers" value={String(uniqueCustomers)} />
              <Stat label="Repeat customers" value={String(repeatCustomers)} />
              <Stat label="Repeat rate" value={`${repeatRate}%`} tone={repeatRate < 20 ? 'crimson' : undefined} />
            </div>
          </Section>

          {/* Discounts & loyalty liability */}
          <Section title="Discounts, refunds & loyalty" desc="What promotions, returns, and rewards are actually costing you">
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Stat label="Discounts given (period)" value={formatCurrency(totalDiscountGiven, 'USD')} />
              <Stat label="Refunds paid (period)" value={formatCurrency(totalRefundsGiven, 'USD')} tone={totalRefundsGiven > 0 ? 'crimson' : undefined} />
              <Stat label="Outstanding loyalty liability" value={formatCurrency(loyaltyLiabilityUsd, 'USD')} tone={loyaltyLiabilityUsd > revenue * 0.1 ? 'crimson' : undefined} />
            </div>
            {pendingReturnsCount > 0 && (
              <p className="text-xs text-crimson mb-4">{pendingReturnsCount} return{pendingReturnsCount === 1 ? '' : 's'} filed and waiting on a decision — see the Returns tab.</p>
            )}
            {promoCodes.length > 0 && (
              <div className="space-y-2">
                {promoCodes.map(p => (
                  <Row key={p.id}>
                    <span className="font-mono text-sm w-24">{p.code}</span>
                    <span className="text-xs text-steel flex-1">{p.kind === 'percent' ? `${p.amount}% off` : `${formatCurrency(p.amount, 'USD')} off`}</span>
                    <span className="text-xs text-steel">{p.usedCount} use{p.usedCount === 1 ? '' : 's'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-pitch/10 text-pitch dark:bg-volt/10 dark:text-volt' : 'bg-black/5 dark:bg-white/10 text-steel'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </Row>
                ))}
              </div>
            )}
          </Section>

          {/* Inventory valuation */}
          <Section title="Inventory valuation" desc="Capital currently tied up on your shelves">
            <div className="grid sm:grid-cols-2 gap-3">
              <Stat label="At cost" value={formatCurrency(inventoryAtCost, 'USD')} />
              <Stat label="At retail (if all sold)" value={formatCurrency(inventoryAtRetail, 'USD')} />
            </div>
          </Section>

          {/* Top sellers — revenue AND margin */}
          <Section title="Top sellers" desc="Products generating the most revenue and profit from active orders">
            {(() => {
              const byProduct = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
              activeOrders.flatMap(o => o.items).forEach(it => {
                const existing = byProduct.get(it.productId || it.name) ?? { name: it.name, qty: 0, revenue: 0, cost: 0 };
                existing.qty += it.qty;
                existing.revenue += it.price * it.qty;
                const unitCost = costById.get(it.productId);
                if (unitCost != null) existing.cost += unitCost * it.qty;
                byProduct.set(it.productId || it.name, existing);
              });
              const sorted = Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
              return sorted.length === 0 ? (
                <p className="text-steel text-sm">No sales data yet.</p>
              ) : (
                <div className="space-y-2">
                  {sorted.map((s, i) => {
                    const profit = s.revenue - s.cost;
                    const margin = s.revenue > 0 ? Math.round((profit / s.revenue) * 100) : null;
                    return (
                      <Row key={s.name}>
                        <span className="text-xs text-steel w-5 tabular">{i + 1}</span>
                        <span className="flex-1 text-sm">{s.name}</span>
                        <span className="text-xs text-steel tabular w-16">{s.qty} sold</span>
                        {margin !== null && (
                          <span className={`text-xs tabular w-12 ${margin < 30 ? 'text-crimson' : 'text-steel'}`}>{margin}% mgn</span>
                        )}
                        <span className="text-sm font-medium tabular w-20 text-right">{formatCurrency(s.revenue, 'USD')}</span>
                      </Row>
                    );
                  })}
                </div>
              );
            })()}
          </Section>

          {/* Profit calculator */}
          <Section title="Profit calculator" desc="Subtract your costs to see real profit — only you see this">
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <label className="text-sm w-40">Monthly salaries ($)</label>
                <input type="number" value={salaries} onChange={e => setSalaries(Number(e.target.value))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2 w-32 text-sm tabular" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm w-40">Other monthly costs ($)</label>
                <input type="number" value={otherCosts} onChange={e => setOtherCosts(Number(e.target.value))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2 w-32 text-sm tabular" />
              </div>
            </div>
            <div className="space-y-2 text-sm border-t border-black/10 dark:border-white/10 pt-4">
              <Row><span className="flex-1">Gross revenue</span><span className="tabular">{formatCurrency(revenue, 'USD')}</span></Row>
              {totalCost > 0 && <Row><span className="flex-1">Product costs (from cost field)</span><span className="tabular text-crimson">−{formatCurrency(totalCost, 'USD')}</span></Row>}
              <Row><span className="flex-1">Salaries</span><span className="tabular text-crimson">−{formatCurrency(salaries, 'USD')}</span></Row>
              <Row><span className="flex-1">Other costs</span><span className="tabular text-crimson">−{formatCurrency(otherCosts, 'USD')}</span></Row>
              {allTimeRefunds > 0 && <Row><span className="flex-1">Refunds paid out</span><span className="tabular text-crimson">−{formatCurrency(allTimeRefunds, 'USD')}</span></Row>}
              {cancelledRevenue > 0 && <Row><span className="flex-1">Cancelled (already excluded)</span><span className="tabular text-steel">{formatCurrency(cancelledRevenue, 'USD')}</span></Row>}
              <div className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 bg-black/5 dark:bg-white/5">
                <span className="flex-1 font-semibold">Net profit</span>
                <span className={`tabular font-bold text-lg ${(revenue - totalCost - salaries - otherCosts - allTimeRefunds) >= 0 ? 'text-pitch dark:text-volt' : 'text-crimson'}`}>
                  {formatCurrency(revenue - totalCost - salaries - otherCosts - allTimeRefunds, 'USD')}
                </span>
              </div>
            </div>
          </Section>
        </>
      )}

      {editing && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
          leagues={leagues}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); flash('Product saved.'); }}
          onDeleted={() => { setEditing(null); flash('Product deleted.'); }}
        />
      )}

      {loggingOrder && (
        <OrderLogger
          onClose={() => setLoggingOrder(false)}
          onLogged={() => { setLoggingOrder(false); flash('Order logged.'); }}
        />
      )}

      {editingPage && (
        <PageEditor
          page={editingPage === 'new' ? null : editingPage}
          onClose={() => setEditingPage(null)}
          onSaved={() => { setEditingPage(null); flash('Page saved.'); }}
          onDeleted={() => { setEditingPage(null); flash('Page deleted.'); }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// PRODUCT EDITOR MODAL
// ---------------------------------------------------------------------------
function ProductEditor({ product, leagues, onClose, onSaved, onDeleted }: {
  product: Product | null;
  leagues: LeagueOpt[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({
    name: product?.name ?? '',
    category: product?.category ?? 'shirts',
    league_slug: product?.leagueSlug ?? '',
    team: product?.team ?? '',
    price_usd: product?.price ?? 0,
    compare_at_usd: product?.compareAt ?? 0,
    cost_usd: product?.cost ?? 0,
    gender: product?.gender ?? 'unisex',
    sizes: (product?.sizes ?? []).join(', '),
    stock: product?.stock ?? 0,
    hot: product?.hot ?? false,
    coming_soon: product?.comingSoon ?? false,
    status: (product?.status ?? 'published') as 'draft' | 'published',
    image_url: product?.image ?? '',
    additional_images: product?.images ?? [] as string[],
    variants: product?.variants ?? [] as { label: string; price: number }[],
  });

  const set = (k: keyof typeof f, v: any) => setF(prev => ({ ...prev, [k]: v }));

  const submit = () => {
    setError(null);
    if (!f.name.trim()) { setError('Name is required.'); return; }
    start(async () => {
      const res = await saveProduct({
        id: product?.id,
        name: f.name.trim(),
        category: f.category,
        league_slug: f.league_slug || null,
        team: f.team.trim(),
        price_usd: Number(f.price_usd),
        compare_at_usd: Number(f.compare_at_usd) || null,
        cost_usd: Number(f.cost_usd) || null,
        gender: f.gender,
        sizes: f.sizes.split(',').map(s => s.trim()).filter(Boolean),
        stock: Number(f.stock),
        hot: f.hot,
        coming_soon: f.coming_soon,
        status: f.status,
        image_url: f.image_url.trim() || null,
        images: f.additional_images.filter(Boolean),
        variants: f.variants.filter(v => v.label.trim()),
      });
      if (res.ok) onSaved();
      else setError(res.error);
    });
  };

  const remove = () => {
    if (!product) return;
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    start(async () => {
      const res = await deleteProduct(product.id);
      if (res.ok) onDeleted();
      else setError(res.error);
    });
  };

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name" className="sm:col-span-2"><input value={f.name} onChange={e => set('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Category">
          <select value={f.category} onChange={e => set('category', e.target.value)} className={inputCls}>
            {['shirts', 'socks', 'balls', 'shinpads', 'sportswear'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="League (optional)">
          <select value={f.league_slug} onChange={e => set('league_slug', e.target.value)} className={inputCls}>
            <option value="">— None (general) —</option>
            {leagues.map(l => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Team / Brand"><input value={f.team} onChange={e => set('team', e.target.value)} className={inputCls} /></Field>
        <Field label="Gender">
          <select value={f.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
            {['unisex', 'male', 'female'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Price (USD)"><input type="number" value={f.price_usd} onChange={e => set('price_usd', e.target.value)} className={inputCls} /></Field>
        <Field label="Compare-at (USD, optional)"><input type="number" value={f.compare_at_usd} onChange={e => set('compare_at_usd', e.target.value)} className={inputCls} /></Field>
        <Field label="Cost (USD, for margins)"><input type="number" value={f.cost_usd} onChange={e => set('cost_usd', e.target.value)} className={inputCls} /></Field>
        <Field label="Stock"><input type="number" value={f.stock} onChange={e => set('stock', e.target.value)} className={inputCls} /></Field>
        <Field label="Sizes (comma-separated)" className="sm:col-span-2"><input value={f.sizes} onChange={e => set('sizes', e.target.value)} placeholder="S, M, L, XL" className={inputCls} /></Field>
        <Field label="Product image" className="sm:col-span-2">
          <div className="flex gap-2 items-center">
            <input value={f.image_url} onChange={e => set('image_url', e.target.value)} placeholder="Paste a URL, or upload →" className={inputCls} />
            <label className={`shrink-0 text-sm border border-black/15 dark:border-white/20 rounded-lg px-4 py-2.5 cursor-pointer ${uploading ? 'opacity-50' : 'btn-press'}`}>
              {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return;
                setUploading(true);
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const { data, error } = await supabase.storage.from('product-images').upload(path, file);
                if (data) set('image_url', supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl);
                else if (error) setError(error.message);
                setUploading(false);
              }} />
            </label>
          </div>
          {f.image_url && <img src={f.image_url} alt="" className="mt-2 w-20 h-24 object-cover rounded-lg border border-black/10 dark:border-white/10" />}
        </Field>
        <Field label="Additional gallery images" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {f.additional_images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-16 h-20 object-cover rounded-lg border border-black/10 dark:border-white/10" />
                <button
                  type="button"
                  onClick={() => setF(prev => ({ ...prev, additional_images: prev.additional_images.filter((_, j) => j !== i) }))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-crimson text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >×</button>
              </div>
            ))}
            <label className={`w-16 h-20 rounded-lg border-2 border-dashed border-black/15 dark:border-white/20 flex items-center justify-center cursor-pointer text-steel text-lg ${uploading ? 'opacity-50' : 'hover:border-volt hover:text-volt transition-colors'}`}>
              +
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return;
                setUploading(true);
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const path = `gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const { data, error } = await supabase.storage.from('product-images').upload(path, file);
                if (data) {
                  const publicUrl = supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl;
                  setF(prev => ({ ...prev, additional_images: [...prev.additional_images, publicUrl] }));
                } else if (error) setError(error.message);
                setUploading(false);
              }} />
            </label>
          </div>
          <p className="text-xs text-steel">Click + to upload more shots. Hover and × to remove. These show as a gallery on the product page.</p>
        </Field>
        <Field label="Product variants (e.g. Jersey / Jersey + Shorts)" className="sm:col-span-2">
          <div className="space-y-2 mb-2">
            {f.variants.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={v.label} onChange={e => setF(prev => ({ ...prev, variants: prev.variants.map((vv, j) => j === i ? { ...vv, label: e.target.value } : vv) }))} placeholder="Label (e.g. Jersey)" className={`flex-1 ${inputCls}`} />
                <input type="number" value={v.price} onChange={e => setF(prev => ({ ...prev, variants: prev.variants.map((vv, j) => j === i ? { ...vv, price: Number(e.target.value) } : vv) }))} placeholder="Price" className={`w-24 ${inputCls}`} />
                <button onClick={() => setF(prev => ({ ...prev, variants: prev.variants.filter((_, j) => j !== i) }))} className="text-crimson text-lg">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setF(prev => ({ ...prev, variants: [...prev.variants, { label: '', price: Number(prev.price_usd) }] }))} className="text-xs border border-black/10 dark:border-white/20 rounded-full px-3 py-1.5 btn-press">+ Add variant</button>
          <p className="text-xs text-steel mt-1.5">Leave empty for products with a single price. When variants exist, customers choose one on the product page.</p>
        </Field>
        <Field label="Status">
          <select value={f.status} onChange={e => set('status', e.target.value as any)} className={inputCls}>
            <option value="published">Published (visible in store)</option>
            <option value="draft">Draft (hidden)</option>
          </select>
        </Field>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.hot} onChange={e => set('hot', e.target.checked)} /> Hot</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.coming_soon} onChange={e => set('coming_soon', e.target.checked)} /> Coming soon</label>
        </div>
      </div>

      {error && <p className="text-crimson text-sm mt-4">{error}</p>}

      <div className="flex items-center justify-between mt-6">
        {product ? (
          <button onClick={remove} disabled={pending} className="text-sm text-crimson underline underline-offset-2 disabled:opacity-50">Delete</button>
        ) : <span />}
        <div className="flex gap-2">
          {product && (
            <a
              href={`/admin/preview/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20 btn-press"
            >
              Preview
            </a>
          )}
          <button onClick={onClose} className="text-sm px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20">Cancel</button>
          <button onClick={submit} disabled={pending} className="text-sm px-6 py-2.5 rounded-full bg-volt text-ink font-medium btn-press disabled:opacity-50">
            {pending ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// MANUAL ORDER LOGGER MODAL
// ---------------------------------------------------------------------------
function OrderLogger({ onClose, onLogged }: { onClose: () => void; onLogged: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    customer_name: '', customer_phone: '', channel: 'whatsapp' as 'whatsapp' | 'instagram',
    payment_method: 'cod' as 'whish_pay' | 'omt' | 'card' | 'cod',
    address: '', city: '',
  });
  type Item = { product_name: string; size: string; qty: number; unit_price_usd: number };
  const [items, setItems] = useState<Item[]>([{ product_name: '', size: '', qty: 1, unit_price_usd: 0 }]);
  const set = (k: keyof typeof f, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const setItem = (idx: number, k: keyof Item, v: any) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  const addItem = () => setItems(prev => [...prev, { product_name: '', size: '', qty: 1, unit_price_usd: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, it) => s + Number(it.unit_price_usd) * Number(it.qty), 0);

  const submit = () => {
    setError(null);
    if (!f.customer_name.trim()) { setError('Customer name is required.'); return; }
    if (!f.address.trim()) { setError('Delivery address is required.'); return; }
    const cleaned = items.filter(it => it.product_name.trim());
    if (cleaned.length === 0) { setError('Add at least one product.'); return; }
    start(async () => {
      const res = await logManualOrderMulti({
        customer_name: f.customer_name.trim(),
        customer_phone: f.customer_phone.trim(),
        channel: f.channel,
        payment_method: f.payment_method,
        address: f.address.trim(),
        city: f.city.trim(),
        items: cleaned.map(it => ({ product_name: it.product_name.trim(), size: it.size.trim(), qty: Number(it.qty), unit_price_usd: Number(it.unit_price_usd) })),
      });
      if (res.ok) onLogged();
      else setError(res.error);
    });
  };

  return (
    <Modal title="Log Instagram / WhatsApp order" onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Customer name"><input value={f.customer_name} onChange={e => set('customer_name', e.target.value)} className={inputCls} /></Field>
        <Field label="Phone"><input value={f.customer_phone} onChange={e => set('customer_phone', e.target.value)} className={inputCls} /></Field>
        <Field label="Channel">
          <select value={f.channel} onChange={e => set('channel', e.target.value)} className={inputCls}>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
          </select>
        </Field>
        <Field label="Payment method">
          <select value={f.payment_method} onChange={e => set('payment_method', e.target.value)} className={inputCls}>
            <option value="cod">Cash on Delivery</option>
            <option value="whish_pay">Whish Pay</option>
            <option value="omt">OMT</option>
            <option value="card">Card</option>
          </select>
        </Field>
        <Field label="Address" className="sm:col-span-2"><input value={f.address} onChange={e => set('address', e.target.value)} className={inputCls} /></Field>
        <Field label="City"><input value={f.city} onChange={e => set('city', e.target.value)} className={inputCls} /></Field>
      </div>

      <div className="border-t border-black/10 dark:border-white/10 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Items</p>
          <button type="button" onClick={addItem} className="text-xs bg-black/5 dark:bg-white/10 rounded-full px-3 py-1.5 btn-press">+ Add item</button>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_60px_80px_32px] gap-2 items-end">
              <Field label={i === 0 ? 'Product' : ''}><input value={it.product_name} onChange={e => setItem(i, 'product_name', e.target.value)} placeholder="Product name" className={inputCls} /></Field>
              <Field label={i === 0 ? 'Size' : ''}><input value={it.size} onChange={e => setItem(i, 'size', e.target.value)} className={inputCls} /></Field>
              <Field label={i === 0 ? 'Qty' : ''}><input type="number" value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} className={inputCls} /></Field>
              <Field label={i === 0 ? 'Price' : ''}><input type="number" value={it.unit_price_usd} onChange={e => setItem(i, 'unit_price_usd', e.target.value)} className={inputCls} /></Field>
              {items.length > 1 ? (
                <button onClick={() => removeItem(i)} className="text-steel hover:text-crimson text-lg pb-1" aria-label="Remove">×</button>
              ) : <span />}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm font-medium mt-4">Total: {formatCurrency(total, 'USD')}</p>
      {error && <p className="text-crimson text-sm mt-2">{error}</p>}

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="text-sm px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20">Cancel</button>
        <button onClick={submit} disabled={pending} className="text-sm px-6 py-2.5 rounded-full bg-volt text-ink font-medium btn-press disabled:opacity-50">
          {pending ? 'Logging…' : `Log order (${items.filter(i => i.product_name.trim()).length} item${items.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// EXCHANGE RATE — owner/manager sets USD/LBP
// ---------------------------------------------------------------------------
function ExchangeRateEditor({ initialRate, demoMode, onDone }: { initialRate: number; demoMode: boolean; onDone: (m: string) => void }) {
  const [rate, setRate] = useState(initialRate);
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      const res = await setExchangeRate(rate);
      if (res.ok) onDone(`Rate updated to ${rate.toLocaleString()} LBP.`);
    });
  };

  return (
    <Section title="USD / LBP exchange rate" desc="Customers see prices in both currencies. Change the rate here — no API dependency.">
      <div className="flex items-center gap-3">
        <span className="text-sm">$1 =</span>
        <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2 w-36 text-sm tabular" />
        <span className="text-sm">LBP</span>
        <button onClick={save} disabled={pending || demoMode} className="text-sm bg-volt text-ink rounded-full px-5 py-2 font-medium btn-press disabled:opacity-40">
          {pending ? 'Saving…' : 'Update'}
        </button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// STORE SETTINGS TAB — WhatsApp number, free-shipping threshold, delivery
// estimate text, business hours. These were hardcoded directly in 6+ files
// before (the WhatsApp number alone) — changing any of them meant editing
// code and redeploying. Now a key-value row each in site_settings.
// ---------------------------------------------------------------------------
function StoreSettingsTab({ initialSettings, demoMode, onDone }: { initialSettings: SiteSettings; demoMode: boolean; onDone: (m: string) => void }) {
  const [f, setF] = useState(initialSettings);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const saveAll = () => {
    setError(null);
    start(async () => {
      const results = await Promise.all([
        setSiteSetting(settingDbKey('whatsappNumber'), f.whatsappNumber),
        setSiteSetting(settingDbKey('freeShippingThreshold'), String(f.freeShippingThreshold)),
        setSiteSetting(settingDbKey('deliveryEstimateText'), f.deliveryEstimateText),
        setSiteSetting(settingDbKey('businessHours'), f.businessHours),
      ]);
      const failed = results.find(r => !r.ok);
      if (failed && !failed.ok) setError(failed.error);
      else onDone('Store settings updated.');
    });
  };

  return (
    <Section title="Store Settings" desc="Values used across the site — the customer Contact and Shipping pages, checkout, and cart all read from here instead of hardcoded text.">
      <div className="space-y-4 max-w-md">
        <Field label="WhatsApp number (digits only, no + or spaces)">
          <input
            value={f.whatsappNumber}
            onChange={e => setF(s => ({ ...s, whatsappNumber: e.target.value.replace(/[^\d]/g, '') }))}
            placeholder="96181752873"
            className={inputCls}
          />
        </Field>
        <Field label="Free shipping threshold (USD)">
          <input
            type="number"
            value={f.freeShippingThreshold}
            onChange={e => setF(s => ({ ...s, freeShippingThreshold: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="Delivery estimate text">
          <input
            value={f.deliveryEstimateText}
            onChange={e => setF(s => ({ ...s, deliveryEstimateText: e.target.value }))}
            placeholder="2–4 business days"
            className={inputCls}
          />
        </Field>
        <Field label="Business hours">
          <input
            value={f.businessHours}
            onChange={e => setF(s => ({ ...s, businessHours: e.target.value }))}
            placeholder="Sun–Fri, 9am–7pm Beirut time"
            className={inputCls}
          />
        </Field>
      </div>
      {error && <p className="text-crimson text-sm mt-3">{error}</p>}
      <button onClick={saveAll} disabled={pending || demoMode} className="mt-5 text-sm bg-volt text-ink rounded-full px-6 py-2.5 font-medium btn-press disabled:opacity-40">
        {pending ? 'Saving…' : 'Save all'}
      </button>
      <p className="text-xs text-steel mt-4">
        Changes apply immediately on next page load — no redeploy needed. Cart/checkout pick these up within a few seconds since they're cached client-side for the session.
      </p>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// PROMOS TAB — create match-day / seasonal discount codes
// ---------------------------------------------------------------------------
function PromosTab({ demoMode, onDone, promoCodes, suggestions }: {
  demoMode: boolean;
  onDone: (m: string) => void;
  promoCodes: PromoCode[];
  suggestions: {
    grossMargin: number;
    slowMoverCount: number;
    slowMoverValueTied: number;
    winBackCandidates: number;
    weekOverWeekChange: number | null;
    daysSinceLastPromo: number | null;
    hasActivePromo: boolean;
  };
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    code: '', description: '', kind: 'percent' as 'percent' | 'fixed',
    amount: 10, min_subtotal_usd: 0, starts_at: '', ends_at: '', max_uses: '',
  });
  const set = (k: keyof typeof f, v: any) => setF(prev => ({ ...prev, [k]: v }));

  const create = () => {
    setError(null);
    if (!f.code.trim()) { setError('Enter a code.'); return; }
    start(async () => {
      const res = await createPromo({
        code: f.code, description: f.description, kind: f.kind,
        amount: Number(f.amount), min_subtotal_usd: Number(f.min_subtotal_usd),
        starts_at: f.starts_at || null, ends_at: f.ends_at || null,
        max_uses: f.max_uses ? Number(f.max_uses) : null,
      });
      if (res.ok) { onDone(`Promo ${f.code.toUpperCase()} created.`); setF({ ...f, code: '', description: '' }); }
      else setError(res.error);
    });
  };

  const toggleActive = (p: PromoCode) => {
    start(async () => {
      const res = await setPromoActive(p.id, !p.active);
      if (res.ok) onDone(`${p.code} ${p.active ? 'deactivated' : 'activated'}.`);
      else setError(res.error);
    });
  };

  // Margin-aware depth: don't suggest a discount deeper than the margin can
  // comfortably absorb. Below 25% margin, suggest a smaller % or switch to a
  // capped fixed-dollar amount instead of an open-ended percentage.
  const marginHealthy = suggestions.grossMargin === 0 || suggestions.grossMargin >= 30;
  const suggestedDepth = marginHealthy ? 15 : suggestions.grossMargin >= 20 ? 10 : 5;

  const cards: { title: string; rationale: string; code: string; kind: 'percent' | 'fixed'; amount: number; description: string }[] = [];

  if (suggestions.slowMoverCount > 0) {
    cards.push({
      title: 'Clear slow-moving stock',
      rationale: `${suggestions.slowMoverCount} product${suggestions.slowMoverCount === 1 ? '' : 's'} with real stock on the shelf haven't sold at all recently — ${formatCurrency(suggestions.slowMoverValueTied, 'USD')} sitting there at cost. Promo codes here are storewide (there's no per-product targeting yet), so frame this as a general clearance and feature those specific items on the homepage/Instagram while it runs.`,
      code: 'CLEARANCE' + suggestedDepth,
      kind: 'percent',
      amount: suggestedDepth,
      description: 'Clearance — slow-moving stock',
    });
  }

  if (suggestions.winBackCandidates > 0) {
    cards.push({
      title: 'Win back quiet customers',
      rationale: `${suggestions.winBackCandidates} customer${suggestions.winBackCandidates === 1 ? '' : 's'} ordered before but not in the last 45 days. A code alone won't reach them — pair it with a WhatsApp/email nudge to that specific list.`,
      code: 'WELCOMEBACK' + suggestedDepth,
      kind: 'percent',
      amount: suggestedDepth,
      description: 'Win-back — lapsed customers',
    });
  }

  if (suggestions.weekOverWeekChange !== null && suggestions.weekOverWeekChange <= -15) {
    cards.push({
      title: 'This week is down',
      rationale: `Revenue is down ${Math.abs(suggestions.weekOverWeekChange)}% versus the week before. A short, time-boxed flash sale (24–72h) tends to work better here than an open-ended one — set an end date when you create it.`,
      code: 'FLASH' + suggestedDepth,
      kind: 'percent',
      amount: suggestedDepth,
      description: 'Flash sale — short window',
    });
  }

  if (!suggestions.hasActivePromo && (suggestions.daysSinceLastPromo === null || suggestions.daysSinceLastPromo > 30)) {
    cards.push({
      title: suggestions.daysSinceLastPromo === null ? "You've never run a promo" : 'Nothing running right now',
      rationale: suggestions.daysSinceLastPromo === null
        ? "A first code — even a modest one — is a low-risk way to see how price-sensitive your customers are."
        : `It's been ${suggestions.daysSinceLastPromo} days since your last code, and nothing's active. Worth having at least a small standing offer available.`,
      code: 'ATLAS' + suggestedDepth,
      kind: 'percent',
      amount: suggestedDepth,
      description: 'Standing offer',
    });
  }

  if (!marginHealthy) {
    cards.push({
      title: 'Margin is thin right now',
      rationale: `Gross margin is around ${suggestions.grossMargin}%. Suggestions above are already capped lower than usual (${suggestedDepth}% instead of 15%) to account for this — consider a fixed-dollar discount instead of a percentage if you want tighter control over what a big order actually costs you.`,
      code: '',
      kind: 'fixed',
      amount: 3,
      description: '',
    });
  }

  return (
    <>
      {cards.length > 0 && (
        <Section title="Suggested promo codes" desc="Grounded in your actual order/stock data, not generic advice — review before using any of these.">
          <div className="grid sm:grid-cols-2 gap-3">
            {cards.map(c => (
              <div key={c.title} className="border border-black/10 dark:border-white/10 rounded-2xl p-5 card-premium flex flex-col">
                <p className="font-medium text-sm mb-1.5">{c.title}</p>
                <p className="text-xs text-steel mb-4 flex-1">{c.rationale}</p>
                {c.code && (
                  <button
                    onClick={() => setF(prev => ({ ...prev, code: c.code, kind: c.kind, amount: c.amount, description: c.description }))}
                    className="self-start text-xs font-medium bg-volt text-ink rounded-full px-4 py-2 btn-press"
                  >
                    Use this →
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Create a promo code" desc="Match-day codes, seasonal sales, El Clásico weekend — tie a discount to any event.">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Code (customers type this)"><input value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="CLASICO25" className={inputCls} /></Field>
          <Field label="Description (internal)"><input value={f.description} onChange={e => set('description', e.target.value)} placeholder="El Clásico weekend" className={inputCls} /></Field>
          <Field label="Discount type">
            <select value={f.kind} onChange={e => set('kind', e.target.value)} className={inputCls}>
              <option value="percent">Percent off (%)</option>
              <option value="fixed">Fixed amount off ($)</option>
            </select>
          </Field>
          <Field label={f.kind === 'percent' ? 'Percent (0–100)' : 'Amount (USD)'}><input type="number" value={f.amount} onChange={e => set('amount', e.target.value)} className={inputCls} /></Field>
          <Field label="Min. spend (USD)"><input type="number" value={f.min_subtotal_usd} onChange={e => set('min_subtotal_usd', e.target.value)} className={inputCls} /></Field>
          <Field label="Max uses (blank = unlimited)"><input type="number" value={f.max_uses} onChange={e => set('max_uses', e.target.value)} className={inputCls} /></Field>
          <Field label="Starts (optional)"><input type="datetime-local" value={f.starts_at} onChange={e => set('starts_at', e.target.value)} className={inputCls} /></Field>
          <Field label="Ends (optional)"><input type="datetime-local" value={f.ends_at} onChange={e => set('ends_at', e.target.value)} className={inputCls} /></Field>
        </div>
        {error && <p className="text-crimson text-sm mt-3">{error}</p>}
        <button onClick={create} disabled={pending || demoMode} className="mt-4 text-sm bg-volt text-ink rounded-full px-6 py-2.5 font-medium btn-press disabled:opacity-40">
          {pending ? 'Creating…' : 'Create promo code'}
        </button>
        <p className="text-xs text-steel mt-4">
          Tip: use the Match Results page (owner/manager) to spot upcoming fixtures, then create a code timed to that weekend.
        </p>
      </Section>

      <Section title="Existing codes" desc="Toggle any code on or off without deleting it — history and usage count stay intact.">
        {promoCodes.length === 0 ? (
          <p className="text-steel text-sm">No promo codes yet.</p>
        ) : (
          <div className="space-y-2">
            {promoCodes.map(p => (
              <Row key={p.id}>
                <span className="font-mono text-sm w-28">{p.code}</span>
                <span className="text-xs text-steel flex-1 truncate">{p.description || '—'}</span>
                <span className="text-xs text-steel w-24">{p.kind === 'percent' ? `${p.amount}% off` : `${formatCurrency(p.amount, 'USD')} off`}</span>
                <span className="text-xs text-steel w-20">{p.usedCount}{p.maxUses ? `/${p.maxUses}` : ''} used</span>
                <button
                  onClick={() => toggleActive(p)}
                  disabled={pending || demoMode}
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 disabled:opacity-40 ${p.active ? 'bg-pitch/10 text-pitch dark:bg-volt/10 dark:text-volt' : 'bg-black/5 dark:bg-white/10 text-steel'}`}
                >
                  {p.active ? 'Active — tap to disable' : 'Inactive — tap to enable'}
                </button>
              </Row>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// TEAM TAB — owner promotes / demotes staff by email
// ---------------------------------------------------------------------------
function TeamTab({ staff, demoMode, onDone, now }: { staff: StaffMember[]; demoMode: boolean; onDone: (m: string) => void; now: number | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'owner'>('admin');

  const promote = () => {
    setError(null);
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    start(async () => {
      const res = await setStaffRole({ email, role: newRole });
      if (res.ok) { setEmail(''); onDone(`${email} is now ${newRole}.`); }
      else setError(res.error);
    });
  };

  const changeRole = (m: StaffMember, role: 'customer' | 'admin' | 'manager' | 'owner') => {
    start(async () => {
      const res = await setStaffRole({ email: m.email, role });
      if (res.ok) onDone(`${m.email} updated to ${role}.`);
      else setError(res.error);
    });
  };

  return (
    <>
      <Section title="Add a team member" desc="They must sign up on the site first — then enter their email here to grant a role.">
        <div className="flex flex-wrap gap-2">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="flex-1 min-w-[220px] border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm"
          />
          <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm">
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
          <button onClick={promote} disabled={pending || demoMode} className="text-sm bg-volt text-ink rounded-xl px-5 btn-press disabled:opacity-40">
            {pending ? 'Saving…' : 'Grant role'}
          </button>
        </div>
        {error && <p className="text-crimson text-sm mt-3">{error}</p>}
        <p className="text-xs text-steel mt-3">
          Roles: <b>Admin</b> logs orders &amp; views products · <b>Manager</b> also edits products &amp; sees analytics · <b>Owner</b> full access incl. finance &amp; team.
        </p>
      </Section>

      <Section title="Current team">
        <div className="space-y-2">
          {staff.length === 0 && <p className="text-steel text-sm">No staff yet — you're the first.</p>}
          {staff.map(m => (
            <Row key={m.id}>
              <span className="flex-1 text-sm">{m.name}<span className="text-steel"> · {m.email}</span></span>
              <span className="text-xs text-steel w-32 shrink-0">
                {m.lastActiveAt && now !== null ? `Active ${timeAgo(m.lastActiveAt, now)}` : 'No activity logged'}
              </span>
              <select
                value={m.role}
                onChange={e => changeRole(m, e.target.value as any)}
                disabled={pending || demoMode}
                className="text-sm capitalize border border-black/15 dark:border-white/20 bg-transparent rounded-full px-3 py-1.5 disabled:opacity-40"
              >
                {['owner', 'manager', 'admin', 'customer'].map(r => <option key={r} value={r}>{r === 'customer' ? 'Remove (customer)' : r}</option>)}
              </select>
            </Row>
          ))}
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMERS TAB — was a genuine blind spot: the Finance tab computed
// aggregate stats (repeat rate, unique count) but there was no browsable
// list of who your customers actually are. Built from order data already
// in hand (no new query needed) — grouped by signed-in user id, falling
// back to phone or email for guest checkouts, since a guest still deserves
// to be findable if they message support without their order number.
// ---------------------------------------------------------------------------
function CustomersTab({ orders }: { orders: Order[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'spent' | 'orders'>('recent');

  const customers = useMemo(() => {
    const byKey = new Map<string, {
      key: string; name: string; phone: string; email: string;
      orderCount: number; totalSpent: number; lastOrderDate: string; registered: boolean;
    }>();

    for (const o of orders) {
      if (o.status === 'cancelled') continue; // don't count cancelled orders toward spend
      const key = o.userId || o.email || o.customer;
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += o.total;
        if (o.date > existing.lastOrderDate) existing.lastOrderDate = o.date;
        // Fill in contact details if an earlier order for this customer was missing them
        if (!existing.phone && o.phone) existing.phone = o.phone;
      } else {
        byKey.set(key, {
          key, name: o.customer, phone: o.phone ?? '', email: o.email ?? '',
          orderCount: 1, totalSpent: o.total, lastOrderDate: o.date, registered: !!o.userId,
        });
      }
    }

    let list = Array.from(byKey.values());
    const q = query.toLowerCase().trim();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));

    if (sort === 'recent') list.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));
    else if (sort === 'spent') list.sort((a, b) => b.totalSpent - a.totalSpent);
    else list.sort((a, b) => b.orderCount - a.orderCount);

    return list;
  }, [orders, query, sort]);

  return (
    <Section title="Customers" desc={`${customers.length} customer${customers.length === 1 ? '' : 's'} — built from order history, so guest checkouts show up too, not just accounts.`}>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, phone, or email..."
          className="flex-1 min-w-[180px] border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-2.5 text-sm"
        />
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-3 py-2.5 text-sm">
          <option value="recent">Most recent order</option>
          <option value="spent">Highest spend</option>
          <option value="orders">Most orders</option>
        </select>
      </div>
      {customers.length === 0 ? (
        <p className="text-steel text-sm">No customers match that search.</p>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <Row key={c.key}>
              <span className="flex-1 min-w-0">
                <span className="text-sm font-medium">{c.name}</span>
                {c.registered && <span className="ml-1.5 text-[10px] uppercase bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 align-middle">Account</span>}
                <br />
                <span className="text-xs text-steel truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</span>
              </span>
              <span className="text-xs text-steel w-20 text-right shrink-0">{c.orderCount} order{c.orderCount === 1 ? '' : 's'}</span>
              <span className="text-sm font-medium tabular w-20 text-right shrink-0">{formatCurrency(c.totalSpent, 'USD')}</span>
              <span className="text-xs text-steel w-24 text-right shrink-0">{c.lastOrderDate}</span>
            </Row>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// REVIEWS TAB — moderate customer reviews (hide/show, not hard-delete)
// ---------------------------------------------------------------------------
function ReviewsTab({ reviews, demoMode, onDone }: { reviews: ReviewItem[]; demoMode: boolean; onDone: (m: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});

  const toggle = (r: ReviewItem) => {
    setError(null);
    start(async () => {
      const res = await setReviewHidden(r.id, !r.hidden, !r.hidden ? (reasonDraft[r.id] || undefined) : undefined);
      if (res.ok) onDone(r.hidden ? 'Review shown again.' : 'Review hidden.');
      else setError(res.error);
    });
  };

  const filtered = reviews.filter(r => filter === 'all' || (filter === 'hidden') === r.hidden);
  const hiddenCount = reviews.filter(r => r.hidden).length;

  return (
    <Section title="Reviews" desc="Hidden reviews disappear from the product page immediately but aren't deleted — usage history and the review itself stay intact.">
      <div className="flex gap-2 mb-4">
        {(['all', 'visible', 'hidden'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full btn-press transition-colors capitalize ${filter === f ? 'bg-volt text-ink' : 'bg-black/5 dark:bg-white/10'}`}
          >
            {f}{f === 'hidden' && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
          </button>
        ))}
      </div>
      {error && <p className="text-crimson text-sm mb-3">{error}</p>}
      {filtered.length === 0 ? (
        <p className="text-steel text-sm">No reviews match that filter.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 card-hover">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{r.authorName}</span>
                    <span className="text-steel"> · {r.productName} · {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.createdAt}</span>
                  </p>
                  <p className="text-sm text-steel mt-1">{r.body}</p>
                  {r.hidden && r.hiddenReason && <p className="text-xs text-crimson mt-1">Hidden: {r.hiddenReason}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggle(r)}
                    disabled={pending || demoMode}
                    className={`text-xs px-2.5 py-1 rounded-full disabled:opacity-40 ${r.hidden ? 'bg-black/5 dark:bg-white/10 text-steel' : 'bg-pitch/10 text-pitch dark:bg-volt/10 dark:text-volt'}`}
                  >
                    {r.hidden ? 'Show again' : 'Hide'}
                  </button>
                </div>
              </div>
              {!r.hidden && (
                <input
                  value={reasonDraft[r.id] ?? ''}
                  onChange={e => setReasonDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Reason if you hide this (optional, staff-only)"
                  className="mt-2 w-full text-xs border border-black/10 dark:border-white/10 bg-transparent rounded-lg px-3 py-1.5"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// RETURNS TAB — approve/reject filed returns and record the actual refund
// amount, so it shows up as a real cost on the Finance tab instead of the
// return_requests row just sitting there unresolved forever.
// ---------------------------------------------------------------------------
function ReturnsTab({ returnRequests, demoMode, onDone }: { returnRequests: ReturnRequestItem[]; demoMode: boolean; onDone: (m: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refundDraft, setRefundDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const resolve = (r: ReturnRequestItem, decision: 'approved' | 'rejected' | 'completed') => {
    setError(null);
    const amount = decision === 'rejected' ? undefined : Number(refundDraft[r.id] ?? r.orderTotal);
    start(async () => {
      const res = await resolveReturn(r.id, decision, amount);
      if (res.ok) onDone(`${r.orderNumber} marked ${decision}.`);
      else setError(res.error);
    });
  };

  const filtered = returnRequests.filter(r => filter === 'all' || r.status === 'submitted');

  return (
    <Section title="Returns & exchanges" desc="Approving records the refund amount so it counts as a real cost on the Finance tab — nothing here touches stock automatically.">
      <div className="flex gap-2 mb-4">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full btn-press transition-colors capitalize ${filter === f ? 'bg-volt text-ink' : 'bg-black/5 dark:bg-white/10'}`}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <p className="text-crimson text-sm mb-3">{error}</p>}
      {filtered.length === 0 ? (
        <p className="text-steel text-sm">{filter === 'pending' ? 'Nothing waiting on a decision.' : 'No return requests yet.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 card-hover">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm w-24">{r.orderNumber}</span>
                <span className="text-sm flex-1 truncate">{r.customerName} <span className="text-steel">· {formatCurrency(r.orderTotal, 'USD')} order</span></span>
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">{r.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  r.status === 'submitted' ? 'bg-crimson/10 text-crimson' :
                  r.status === 'approved' || r.status === 'completed' ? 'bg-pitch/10 text-pitch dark:bg-volt/10 dark:text-volt' :
                  'bg-black/5 dark:bg-white/10 text-steel'
                }`}>{r.status}</span>
              </div>
              <p className="text-sm text-steel mb-2">{r.reason}</p>
              {r.status === 'submitted' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-steel">Refund $</label>
                  <input
                    type="number"
                    defaultValue={r.orderTotal}
                    onChange={e => setRefundDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-24 border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-2.5 py-1.5 text-sm tabular"
                  />
                  <button onClick={() => resolve(r, 'approved')} disabled={pending || demoMode} className="text-xs font-medium bg-volt text-ink rounded-full px-4 py-1.5 btn-press disabled:opacity-40">
                    Approve &amp; refund
                  </button>
                  <button onClick={() => resolve(r, 'rejected')} disabled={pending || demoMode} className="text-xs px-4 py-1.5 rounded-full border border-black/15 dark:border-white/20 disabled:opacity-40">
                    Reject
                  </button>
                </div>
              ) : (
                r.refundAmountUsd != null && (
                  <p className="text-xs text-steel">Refunded {formatCurrency(r.refundAmountUsd, 'USD')} on {(r.resolvedAt ?? '').slice(0, 10)}</p>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// PAGES TAB — list, create, edit, delete custom pages
// ---------------------------------------------------------------------------
function PagesTab({ pages, demoMode, onDone }: { pages: PageData[]; demoMode: boolean; onDone: (m: string) => void }) {
  // We need to lift setEditingPage from the parent. The cleanest way without
  // a refactor is to access it via the parent's flash + state. But since the
  // parent already renders the page editor modal, we need to trigger it from here.
  // We'll use a callback pattern: the parent passes setEditingPage down through
  // the tab. But to keep the diff small, let me use a simple local state approach
  // where PagesTab manages its own editor inline.
  const [editing, setEditing] = useState<PageData | 'new' | null>(null);

  return (
    <>
      <Section title="Custom pages" desc="Create pages for announcements, campaigns, guides — anything you want on the site. They live at /p/your-slug.">
        <div className="flex justify-end mb-3">
          <button disabled={demoMode} onClick={() => setEditing('new')} className="text-sm bg-volt text-ink rounded-full px-4 py-2 btn-press disabled:opacity-40">
            + New page
          </button>
        </div>
        <div className="space-y-2">
          {pages.length === 0 && <p className="text-steel text-sm">No custom pages yet.</p>}
          {pages.map(p => (
            <div key={p.id} className="flex items-center gap-3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3">
              <span className="flex-1 text-sm font-medium">{p.title}</span>
              <span className="text-xs font-mono text-steel">/p/{p.slug}</span>
              <span className={`text-[11px] px-2 py-1 rounded-full ${p.published ? 'bg-volt/20 text-ink' : 'bg-black/10 dark:bg-white/10 text-steel'}`}>
                {p.published ? 'Live' : 'Draft'}
              </span>
              <button disabled={demoMode} onClick={() => setEditing(p)} className="text-xs underline underline-offset-2 text-steel disabled:opacity-40">Edit</button>
              {p.published && <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2 text-steel">View</a>}
            </div>
          ))}
        </div>
      </Section>

      {editing && (
        <PageEditor
          page={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onDone('Page saved — refresh to see it in the list.'); }}
          onDeleted={() => { setEditing(null); onDone('Page deleted.'); }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PAGE EDITOR — block-based: heading, text, image, logo, spacer, banner
// ---------------------------------------------------------------------------
type Block = { type: string; content?: string; src?: string; align?: string; bg?: string };
const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading' },
  { type: 'text', label: 'Text paragraph' },
  { type: 'image', label: 'Image' },
  { type: 'logo', label: 'Logo / brand mark' },
  { type: 'banner', label: 'Full-width banner' },
  { type: 'spacer', label: 'Spacer' },
];

function PageEditor({ page, onClose, onSaved, onDeleted }: {
  page: PageData | null; onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(page?.title ?? '');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [published, setPublished] = useState(page?.published ?? false);
  const [blocks, setBlocks] = useState<Block[]>(page?.blocks ?? []);

  const addBlock = (type: string) => {
    const b: Block = { type };
    if (type === 'heading') b.content = 'Your heading here';
    if (type === 'text') b.content = 'Write your content here.';
    if (type === 'image' || type === 'logo' || type === 'banner') b.src = '';
    if (type === 'banner') { b.content = 'Banner text'; b.bg = '#0B0D10'; }
    setBlocks(prev => [...prev, b]);
  };

  const updateBlock = (idx: number, updates: Partial<Block>) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...updates } : b));
  };

  const removeBlock = (idx: number) => setBlocks(prev => prev.filter((_, i) => i !== idx));

  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const uploadImage = async (idx: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setUploading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const path = `pages/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error: err } = await supabase.storage.from('product-images').upload(path, file);
      if (data) updateBlock(idx, { src: supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl });
      else if (err) setError(err.message);
      setUploading(false);
    };
    input.click();
  };

  const submit = () => {
    setError(null);
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!slug.trim()) { setError('URL slug is required.'); return; }
    start(async () => {
      const res = await savePage({ id: page?.id, slug, title, blocks, published });
      if (res.ok) onSaved();
      else setError(res.error);
    });
  };

  const remove = () => {
    if (!page) return;
    if (!confirm(`Delete "${page.title}"?`)) return;
    start(async () => {
      const res = await deletePage(page.id);
      if (res.ok) onDeleted();
      else setError(res.error);
    });
  };

  return (
    <Modal title={page ? 'Edit page' : 'New page'} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Page title"><input value={title} onChange={e => { setTitle(e.target.value); if (!page) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')); }} className={inputCls} /></Field>
        <Field label="URL slug (/p/...)"><input value={slug} onChange={e => setSlug(e.target.value)} className={inputCls} /></Field>
      </div>

      {/* Block editor */}
      <div className="border-t border-black/10 dark:border-white/10 pt-4 mb-4">
        <p className="text-sm font-medium mb-3">Content blocks</p>
        <div className="space-y-3">
          {blocks.map((b, i) => (
            <div key={i} className="border border-black/10 dark:border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase text-steel tracking-wide">{b.type}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="text-xs text-steel disabled:opacity-30">↑</button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="text-xs text-steel disabled:opacity-30">↓</button>
                  <button onClick={() => removeBlock(i)} className="text-xs text-crimson ml-2">×</button>
                </div>
              </div>

              {(b.type === 'heading' || b.type === 'text') && (
                <textarea value={b.content ?? ''} onChange={e => updateBlock(i, { content: e.target.value })} rows={b.type === 'heading' ? 1 : 3} className={inputCls} />
              )}

              {(b.type === 'image' || b.type === 'logo') && (
                <div className="flex gap-2 items-center">
                  <input value={b.src ?? ''} onChange={e => updateBlock(i, { src: e.target.value })} placeholder="Paste URL or upload →" className={`flex-1 ${inputCls}`} />
                  <button onClick={() => uploadImage(i)} disabled={uploading} className="text-xs border border-black/15 dark:border-white/20 rounded-lg px-3 py-2 btn-press disabled:opacity-50">
                    {uploading ? '…' : 'Upload'}
                  </button>
                </div>
              )}
              {(b.type === 'image' || b.type === 'logo') && b.src && (
                <img src={b.src} alt="" className="mt-2 max-h-24 rounded-lg" />
              )}

              {b.type === 'banner' && (
                <div className="space-y-2">
                  <input value={b.content ?? ''} onChange={e => updateBlock(i, { content: e.target.value })} placeholder="Banner text" className={inputCls} />
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-steel">Background:</label>
                    <input type="color" value={b.bg ?? '#0B0D10'} onChange={e => updateBlock(i, { bg: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
                    <input value={b.src ?? ''} onChange={e => updateBlock(i, { src: e.target.value })} placeholder="Background image URL (optional)" className={`flex-1 ${inputCls}`} />
                  </div>
                </div>
              )}

              {b.type === 'spacer' && <div className="h-4 bg-black/5 dark:bg-white/5 rounded" />}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)} className="text-xs border border-black/10 dark:border-white/20 rounded-full px-3 py-1.5 btn-press">+ {bt.label}</button>
          ))}
        </div>
      </div>

      {/* Live miniature preview */}
      {blocks.length > 0 && (
        <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden mb-4">
          <div className="px-3 py-2 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest2 text-steel">Live preview — /p/{slug || '…'}</span>
            <span className="text-[10px] text-steel">{blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
          </div>
          <div className="bg-chalk dark:bg-ink max-h-56 overflow-y-auto">
            {blocks.map((b, i) => (
              <MiniBlockPreview key={i} block={b} />
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm mb-4">
        <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="w-4 h-4 accent-[#D6FF3F]" />
        Published (visible at /p/{slug || '...'})
      </label>

      {error && <p className="text-crimson text-sm mb-3">{error}</p>}

      <div className="flex items-center justify-between">
        {page ? <button onClick={remove} disabled={pending} className="text-sm text-crimson underline underline-offset-2 disabled:opacity-50">Delete page</button> : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20">Cancel</button>
          <button onClick={submit} disabled={pending} className="text-sm px-6 py-2.5 rounded-full bg-volt text-ink font-medium btn-press disabled:opacity-50">
            {pending ? 'Saving…' : 'Save page'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// MINI BLOCK PREVIEW — renders blocks inside the page editor modal
// ---------------------------------------------------------------------------
function MiniBlockPreview({ block: b }: { block: any }) {
  switch (b.type) {
    case 'heading':
      return <div className="px-4 py-2"><p className="font-display text-xl text-ink dark:text-chalk leading-tight">{b.content || <span className="opacity-30">Heading text</span>}</p></div>;
    case 'text':
      return <div className="px-4 py-2"><p className="text-sm text-ink/70 dark:text-chalk/70 leading-relaxed whitespace-pre-line">{b.content || <span className="opacity-30">Text content</span>}</p></div>;
    case 'image':
      return b.src ? (
        <div className="px-4 py-2"><img src={b.src} alt="" className="w-full rounded-lg max-h-28 object-cover" /></div>
      ) : <div className="mx-4 my-2 h-16 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-xs text-steel">Image</div>;
    case 'logo':
      return b.src ? (
        <div className="px-4 py-2 flex justify-center"><img src={b.src} alt="" className="max-h-10 object-contain" /></div>
      ) : <div className="mx-4 my-2 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-xs text-steel">Logo</div>;
    case 'banner':
      return (
        <div className="py-6 px-4 text-center" style={{ background: b.src ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url(${b.src}) center/cover` : (b.bg ?? '#0B0D10') }}>
          <p className="font-display text-lg text-white">{b.content || 'Banner text'}</p>
        </div>
      );
    case 'spacer':
      return <div className="h-6 border-t border-dashed border-black/10 dark:border-white/10 mx-4" />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// HERO SLIDES TAB — edit homepage slideshow with live miniature preview
// ---------------------------------------------------------------------------
const DEFAULT_SLIDE = { tag: '', titleTop: '', titleAccent: '', body: '', image: '', imageScale: 100, imageX: 50, imageY: 50, imageRotation: 0, ctaLabel: '', ctaHref: '/', secondaryLabel: '', secondaryHref: '/' };

function HeroSlidesTab({ initialSlides, demoMode, onDone }: { initialSlides: any[] | null; demoMode: boolean; onDone: (m: string) => void }) {
  const [pending, start] = useTransition();
  const [slides, setSlides] = useState<any[]>(initialSlides ?? [
    { tag: 'Matchday drop · 6 leagues live now', titleTop: 'WEAR THE', titleAccent: 'RESULT.', body: 'Kits, boots-up gear, and match essentials from LaLiga to the Lebanese Premier League — carried to your door.', image: '', ctaLabel: 'Shop Premier League', ctaHref: '/leagues/premier-league', secondaryLabel: 'Browse all leagues', secondaryHref: '/leagues' },
    { tag: 'New season · 25/26 kits in stock', titleTop: 'NEW KITS', titleAccent: 'JUST LANDED.', body: 'Home and away shirts for the new season, from Madrid to Manchester — sized S to XXL, delivered across Lebanon.', image: '', ctaLabel: 'Shop new kits', ctaHref: '/search?q=Home%20Kit', secondaryLabel: 'View LaLiga', secondaryHref: '/leagues/la-liga' },
    { tag: 'From the archive · limited numbers', titleTop: 'THE KITS THAT', titleAccent: 'STARTED IT.', body: 'Classic and vintage shirts from eras before this one — sourced in limited numbers. When a size sells out, it\'s gone for good.', image: '', ctaLabel: 'Shop retro', ctaHref: '/retro', secondaryLabel: 'Match essentials', secondaryHref: '/leagues' },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slide = slides[activeIdx] ?? DEFAULT_SLIDE;

  const setSlide = (k: string, v: string) => setSlides(prev => prev.map((s, i) => i === activeIdx ? { ...s, [k]: v } : s));

  const addSlide = () => { setSlides(prev => [...prev, { ...DEFAULT_SLIDE }]); setActiveIdx(slides.length); };
  const removeSlide = (i: number) => { setSlides(prev => prev.filter((_, j) => j !== i)); setActiveIdx(Math.max(0, activeIdx - 1)); };

  const uploadBg = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setUploading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const path = `hero/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, err } = await supabase.storage.from('product-images').upload(path, file) as any;
      if (data) setSlide('image', supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl);
      else if (err) setError(err.message);
      setUploading(false);
    };
    input.click();
  };

  const save = () => {
    start(async () => {
      const res = await saveHeroSlides(slides);
      if (res.ok) onDone('Hero slides saved.');
      else setError(res.error);
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Editor panel */}
      <div>
        <Section title="Homepage hero slides" desc="Edit each slide — changes reflect in the preview instantly.">
          {/* Slide tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} className={`text-xs px-3 py-1.5 rounded-full border ${i === activeIdx ? 'bg-volt text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}>
                Slide {i + 1}
              </button>
            ))}
            <button onClick={addSlide} className="text-xs px-3 py-1.5 rounded-full border border-dashed border-black/20 dark:border-white/20">+ Add slide</button>
          </div>

          <div className="space-y-3">
            <Field label="Tag line (small text above title)">
              <input value={slide.tag} onChange={e => setSlide('tag', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title — first line">
                <input value={slide.titleTop} onChange={e => setSlide('titleTop', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Title — accent line (volt)">
                <input value={slide.titleAccent} onChange={e => setSlide('titleAccent', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Body text">
              <textarea value={slide.body} onChange={e => setSlide('body', e.target.value)} rows={2} className={inputCls} />
            </Field>
            <Field label="Background image (optional)">
              <div className="flex gap-2">
                <input value={slide.image} onChange={e => setSlide('image', e.target.value)} placeholder="Paste URL or upload →" className={`flex-1 ${inputCls}`} />
                <button onClick={uploadBg} disabled={uploading} className="text-xs border border-black/15 dark:border-white/20 rounded-lg px-3 py-2 btn-press disabled:opacity-50">{uploading ? '…' : 'Upload'}</button>
              </div>
            </Field>
            {slide.image && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
                <p className="text-xs font-medium text-steel uppercase tracking-wide">Image transform</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-steel w-20 shrink-0">Zoom {slide.imageScale ?? 100}%</label>
                    <input type="range" min="100" max="200" step="1" value={Math.max(100, slide.imageScale ?? 100)} onChange={e => setSlide('imageScale', e.target.value)} className="flex-1 accent-[#D6FF3F]" />
                    <button onClick={() => setSlide('imageScale', '100')} className="text-xs text-steel hover:text-ink dark:hover:text-chalk">↺</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-steel w-20 shrink-0">Left/Right {slide.imageX ?? 50}%</label>
                    <input type="range" min="0" max="100" step="1" value={slide.imageX ?? 50} onChange={e => setSlide('imageX', e.target.value)} className="flex-1 accent-[#D6FF3F]" />
                    <button onClick={() => setSlide('imageX', '50')} className="text-xs text-steel hover:text-ink dark:hover:text-chalk">↺</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-steel w-20 shrink-0">Up/Down {slide.imageY ?? 50}%</label>
                    <input type="range" min="0" max="100" step="1" value={slide.imageY ?? 50} onChange={e => setSlide('imageY', e.target.value)} className="flex-1 accent-[#D6FF3F]" />
                    <button onClick={() => setSlide('imageY', '50')} className="text-xs text-steel hover:text-ink dark:hover:text-chalk">↺</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-steel w-20 shrink-0">Rotate {slide.imageRotation ?? 0}°</label>
                    <input type="range" min="-45" max="45" step="1" value={slide.imageRotation ?? 0} onChange={e => setSlide('imageRotation', e.target.value)} className="flex-1 accent-[#D6FF3F]" />
                    <button onClick={() => setSlide('imageRotation', '0')} className="text-xs text-steel hover:text-ink dark:hover:text-chalk">↺</button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary CTA label"><input value={slide.ctaLabel} onChange={e => setSlide('ctaLabel', e.target.value)} className={inputCls} /></Field>
              <Field label="Primary CTA link"><input value={slide.ctaHref} onChange={e => setSlide('ctaHref', e.target.value)} className={inputCls} /></Field>
              <Field label="Secondary CTA label"><input value={slide.secondaryLabel} onChange={e => setSlide('secondaryLabel', e.target.value)} className={inputCls} /></Field>
              <Field label="Secondary CTA link"><input value={slide.secondaryHref} onChange={e => setSlide('secondaryHref', e.target.value)} className={inputCls} /></Field>
            </div>
            {slides.length > 1 && (
              <button onClick={() => removeSlide(activeIdx)} className="text-xs text-crimson underline underline-offset-2">Delete this slide</button>
            )}
          </div>

          {error && <p className="text-crimson text-sm mt-3">{error}</p>}
          <button onClick={save} disabled={pending || demoMode} className="mt-5 text-sm bg-volt text-ink rounded-full px-6 py-2.5 font-medium btn-press disabled:opacity-40">
            {pending ? 'Saving…' : 'Save all slides'}
          </button>
        </Section>
      </div>

      {/* Live miniature preview */}
      <div className="lg:sticky lg:top-28 self-start">
        <p className="text-xs uppercase tracking-widest2 text-steel mb-3">Preview — slide {activeIdx + 1}</p>
        <div
          className="relative rounded-2xl overflow-hidden bg-ink text-chalk"
          style={{ aspectRatio: '16/9' }}
        >
          {slide.image && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: Number(slide.imageScale ?? 100) > 100 ? `${slide.imageScale}%` : 'cover',
                backgroundPosition: `${slide.imageX ?? 50}% ${slide.imageY ?? 50}%`,
                backgroundRepeat: 'no-repeat',
                transform: `rotate(${slide.imageRotation ?? 0}deg)`,
                transformOrigin: 'center center',
              }}
            />
          )}
          {!slide.image && <div className="absolute inset-0 bg-[#0B0D10]" />}
          {slide.image && (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)' }} />
          )}
          <div className="absolute inset-0 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6FF3F]" />
                <span className="text-[#D6FF3F] text-[9px] uppercase tracking-widest">{slide.tag || 'Tag line here'}</span>
              </div>
              <div className="font-display text-xl leading-tight">
                <div className="text-chalk">{slide.titleTop || 'FIRST LINE'}</div>
                <div className="text-[#D6FF3F]">{slide.titleAccent || 'ACCENT LINE'}</div>
              </div>
              <p className="text-chalk/60 text-[9px] mt-2 max-w-[60%] leading-relaxed">{slide.body || 'Body text appears here'}</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-[#D6FF3F] text-[#0B0D10] text-[9px] px-2.5 py-1 rounded-full font-medium">{slide.ctaLabel || 'Primary CTA'}</span>
              <span className="border border-chalk/30 text-[9px] px-2.5 py-1 rounded-full">{slide.secondaryLabel || 'Secondary'}</span>
            </div>
          </div>
          {/* Slide dots */}
          <div className="absolute bottom-3 left-5 flex gap-1">
            {slides.map((_, i) => (
              <span key={i} className={`h-1 rounded-full ${i === activeIdx ? 'w-5 bg-[#D6FF3F]' : 'w-2 bg-chalk/30'}`} />
            ))}
          </div>
        </div>
        <p className="text-xs text-steel mt-2 text-center">Actual size on site is much larger — this is a 16:9 miniature</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ORDER ROW — expandable, with status dropdown and cancel
// ---------------------------------------------------------------------------
const STATUS_FLOW = ['placed', 'confirmed', 'shipped', 'delivered'] as const;
const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-black/5 dark:bg-white/10',
  confirmed: 'bg-volt/20 text-ink',
  shipped: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  cancelled: 'bg-crimson/15 text-crimson',
};

function OrderRow({ order: o, role, demoMode, onDone, stale = false }: { order: Order; role: string; demoMode: boolean; onDone: (m: string) => void; stale?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const [localStatus, setLocalStatus] = useState(o.status);
  const [statusError, setStatusError] = useState<string | null>(null);
  const canCancel = role === 'owner' || role === 'manager';

  const changeStatus = (newStatus: string) => {
    setStatusError(null);
    start(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Confirm we actually have a logged-in session in the browser client
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setStatusError('Not signed in (browser session missing).'); return; }

        const { data, error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', o.dbId)
          .select('id, status');

        if (error) { setStatusError(`DB error: ${error.message}`); return; }
        if (!data || data.length === 0) {
          setStatusError('No rows updated — RLS is blocking this write for your account. Check that your profile role is set correctly in the database.');
          return;
        }
        if (data[0].status !== newStatus) { setStatusError(`Still "${data[0].status}" after update.`); return; }

        setLocalStatus(newStatus as any);
        onDone(`${o.id} → ${newStatus}`);
      } catch (e) {
        setStatusError(`Exception: ${String(e)}`);
      }
    });
  };

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden card-hover">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="w-24 text-sm tabular font-mono">{o.id}</span>
        {stale && <span className="text-crimson text-xs shrink-0" title="No progress in 48h+">⚠</span>}
        <span className="flex-1 text-sm truncate">
          {o.customer}
          <span className="text-steel"> · {o.items.length} item{o.items.length === 1 ? '' : 's'}</span>
        </span>
        <span className="text-xs uppercase text-steel w-16 shrink-0">{o.channel}</span>
        <span className={`text-[11px] capitalize px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[localStatus] ?? ''}`}>{localStatus}</span>
        <span className="text-sm font-medium w-16 text-right tabular shrink-0">{formatCurrency(o.total, 'USD')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
          <div className="text-xs text-steel">{o.date} · {o.paymentMethod} · {o.address}</div>
          <div className="space-y-1.5">
            {o.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm border border-black/5 dark:border-white/5 rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium">{it.name}</span>
                  {it.size && <span className="text-steel"> · Size {it.size}</span>}
                  <span className="text-steel"> · ×{it.qty}</span>
                </div>
                <span className="tabular font-medium">${it.price * it.qty}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-steel">Status:</span>
            <select
              value={localStatus}
              disabled={pending || demoMode}
              onChange={e => changeStatus(e.target.value)}
              className="text-sm border border-black/15 dark:border-white/20 bg-transparent rounded-full px-3 py-1.5 capitalize disabled:opacity-40"
            >
              {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="cancelled">Cancelled</option>
            </select>
            {localStatus !== 'cancelled' && localStatus !== 'delivered' && canCancel && (
              <button
                disabled={pending || demoMode}
                onClick={() => { if (confirm(`Cancel order ${o.id}?`)) changeStatus('cancelled'); }}
                className="text-xs text-crimson underline underline-offset-2 disabled:opacity-40"
              >
                Cancel order
              </button>
            )}
            {localStatus === 'cancelled' && canCancel && (
              <button
                disabled={pending || demoMode}
                onClick={() => changeStatus('placed')}
                className="text-xs text-volt underline underline-offset-2 disabled:opacity-40"
              >
                Restore to placed
              </button>
            )}
            {pending && <span className="text-xs text-steel">Saving…</span>}
            {statusError && <span className="text-xs text-crimson">{statusError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHARED BITS
// ---------------------------------------------------------------------------
const inputCls = 'w-full border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2.5 text-sm';

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-chalk dark:bg-ink rounded-3xl p-6 md:p-8 w-full max-w-2xl my-8 shadow-2xl animate-rise" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-steel mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function timeAgo(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'crimson' }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 card-premium">
      <p className="text-xs uppercase tracking-widest2 text-steel">{label}</p>
      <p className={`font-display text-3xl mt-2 tabular ${tone === 'crimson' ? 'text-crimson' : ''}`}>{value}</p>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-medium mb-1">{title}</h2>
      {desc && <p className="text-xs text-steel mb-4">{desc}</p>}
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 card-hover">{children}</div>;
}
