'use client';

import { useMemo, useState, useTransition } from 'react';
import { formatCurrency, type Product, type Order } from '@/lib/mockData';
import { saveProduct, deleteProduct, logManualOrder, setStaffRole, createPromo } from '@/app/admin/actions';

type Role = 'owner' | 'manager' | 'admin';
type LeagueOpt = { slug: string; name: string };
type StaffMember = { id: string; name: string; email: string; role: string };

export default function AdminPanel({
  role: fixedRole,
  products,
  orders,
  zeroResultSearches,
  leagues,
  staff,
  demoMode = false,
}: {
  role: Role;
  products: Product[];
  orders: Order[];
  zeroResultSearches: { term: string; count: number }[];
  leagues: LeagueOpt[];
  staff: StaffMember[];
  demoMode?: boolean;
}) {
  const [role, setRole] = useState<Role>(fixedRole);
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [salaries, setSalaries] = useState(1200);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [loggingOrder, setLoggingOrder] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canEditProducts = role === 'owner' || role === 'manager';

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 6);
  const mostRequested = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }, [query, products]);

  const tabs = [
    { id: 'overview', label: 'Overview', roles: ['owner', 'manager', 'admin'] },
    { id: 'orders', label: 'Orders', roles: ['owner', 'manager', 'admin'] },
    { id: 'products', label: 'Products', roles: ['owner', 'manager', 'admin'] },
    { id: 'requests', label: 'Requests', roles: ['owner', 'manager'] },
    { id: 'analytics', label: 'Search analytics', roles: ['owner', 'manager'] },
    { id: 'promos', label: 'Promo codes', roles: ['owner', 'manager'] },
    { id: 'team', label: 'Team', roles: ['owner'] },
    { id: 'finance', label: 'Finance', roles: ['owner'] },
  ].filter(t => t.roles.includes(role));

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl">Staff Panel</h1>
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

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm shrink-0 ${tab === t.id ? 'bg-volt text-ink' : 'bg-black/5 dark:bg-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Stat label="Revenue (30d)" value={formatCurrency(revenue, 'USD')} />
          <Stat label="Orders (30d)" value={String(orders.length)} />
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
        <Section title="Orders" desc="Includes orders placed on the website, and manually logged Instagram / WhatsApp sales">
          <div className="flex justify-end mb-3">
            <button
              disabled={demoMode}
              onClick={() => setLoggingOrder(true)}
              className="text-sm bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full px-4 py-2 btn-press disabled:opacity-40"
            >
              + Log Instagram/WhatsApp order
            </button>
          </div>
          <div className="space-y-2">
            {orders.length === 0 && <p className="text-steel text-sm py-6 text-center">No orders yet.</p>}
            {orders.map(o => (
              <Row key={o.id}>
                <span className="w-24 text-sm tabular">{o.id}</span>
                <span className="flex-1 text-sm">{o.customer}{o.items[0] ? ` · ${o.items[0].name}` : ''}</span>
                <span className="text-xs uppercase text-steel w-20">{o.channel}</span>
                <span className="text-xs capitalize px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 w-24 text-center">{o.status}</span>
                <span className="text-sm font-medium w-16 text-right tabular">{formatCurrency(o.total, 'USD')}</span>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'products' && (
        <Section title="Products" desc={canEditProducts ? 'Add, edit, or remove products. Internal codes are staff-only.' : 'View only — ask an Owner or Manager to make product changes.'}>
          <div className="flex gap-3 mb-4">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by product, tag, or internal code..."
              className="flex-1 border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm"
            />
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
            {(query ? searchResults : products).map(p => (
              <Row key={p.id}>
                <span className="text-xs font-mono text-steel w-28 truncate">{p.code || '—'}</span>
                <span className="flex-1 text-sm">
                  {p.name}
                  {p.status === 'draft' && <span className="ml-2 text-[10px] uppercase bg-black/10 dark:bg-white/15 rounded px-1.5 py-0.5">Draft</span>}
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
        <>
          <Section title="Low-stock alerts" desc="Flags anything at or below threshold (6 units)">
            <div className="space-y-2">
              {lowStock.length === 0 && <p className="text-steel text-sm">Nothing low right now.</p>}
              {lowStock.map(p => (
                <Row key={p.id}>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-sm text-crimson tabular">{p.stock} left</span>
                </Row>
              ))}
            </div>
          </Section>
          <Section title="Reorder recommendations" desc="Suggested based on recent sales velocity and demand signals">
            <div className="space-y-2">
              {mostRequested.slice(0, 3).map(p => (
                <Row key={p.id}>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-sm text-steel">High demand</span>
                </Row>
              ))}
            </div>
          </Section>
        </>
      )}

      {tab === 'analytics' && (
        <Section title="Zero-result searches" desc="What customers search for that you don't carry yet — a direct demand signal">
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
        <PromosTab demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'team' && (
        <TeamTab staff={staff} demoMode={demoMode} onDone={flash} />
      )}

      {tab === 'finance' && (
        <Section title="Real profit" desc="Owner-only — subtract employee salaries from gross profit">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm">Monthly salaries ($)</label>
            <input
              type="number"
              value={salaries}
              onChange={e => setSalaries(Number(e.target.value))}
              className="border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2 w-32 text-sm"
            />
          </div>
          <div className="space-y-2 text-sm">
            <Row><span className="flex-1">Gross revenue</span><span className="tabular">{formatCurrency(revenue, 'USD')}</span></Row>
            <Row><span className="flex-1">Salaries</span><span className="tabular text-crimson">−{formatCurrency(salaries, 'USD')}</span></Row>
            <Row><span className="flex-1 font-medium">Real profit</span><span className="tabular font-semibold">{formatCurrency(revenue - salaries, 'USD')}</span></Row>
          </div>
        </Section>
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
        <Field label="Image URL" className="sm:col-span-2"><input value={f.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className={inputCls} /></Field>
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
    address: '', city: '', product_name: '', size: '', qty: 1, unit_price_usd: 0,
  });
  const set = (k: keyof typeof f, v: any) => setF(prev => ({ ...prev, [k]: v }));

  const submit = () => {
    setError(null);
    if (!f.customer_name.trim()) { setError('Customer name is required.'); return; }
    if (!f.product_name.trim()) { setError('Product name is required.'); return; }
    if (!f.address.trim()) { setError('Delivery address is required.'); return; }
    start(async () => {
      const res = await logManualOrder({
        customer_name: f.customer_name.trim(),
        customer_phone: f.customer_phone.trim(),
        channel: f.channel,
        payment_method: f.payment_method,
        address: f.address.trim(),
        city: f.city.trim(),
        product_name: f.product_name.trim(),
        size: f.size.trim(),
        qty: Number(f.qty),
        unit_price_usd: Number(f.unit_price_usd),
      });
      if (res.ok) onLogged();
      else setError(res.error);
    });
  };

  return (
    <Modal title="Log Instagram / WhatsApp order" onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
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
        <Field label="Product name" className="sm:col-span-2"><input value={f.product_name} onChange={e => set('product_name', e.target.value)} placeholder="e.g. Real Madrid Home Shirt 25/26" className={inputCls} /></Field>
        <Field label="Size"><input value={f.size} onChange={e => set('size', e.target.value)} className={inputCls} /></Field>
        <Field label="Quantity"><input type="number" value={f.qty} onChange={e => set('qty', e.target.value)} className={inputCls} /></Field>
        <Field label="Unit price (USD)"><input type="number" value={f.unit_price_usd} onChange={e => set('unit_price_usd', e.target.value)} className={inputCls} /></Field>
      </div>

      <p className="text-xs text-steel mt-3">Total: {formatCurrency(Number(f.unit_price_usd) * Number(f.qty) || 0, 'USD')}</p>
      {error && <p className="text-crimson text-sm mt-3">{error}</p>}

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="text-sm px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20">Cancel</button>
        <button onClick={submit} disabled={pending} className="text-sm px-6 py-2.5 rounded-full bg-volt text-ink font-medium btn-press disabled:opacity-50">
          {pending ? 'Logging…' : 'Log order'}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// PROMOS TAB — create match-day / seasonal discount codes
// ---------------------------------------------------------------------------
function PromosTab({ demoMode, onDone }: { demoMode: boolean; onDone: (m: string) => void }) {
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

  return (
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
  );
}

// ---------------------------------------------------------------------------
// TEAM TAB — owner promotes / demotes staff by email
// ---------------------------------------------------------------------------
function TeamTab({ staff, demoMode, onDone }: { staff: StaffMember[]; demoMode: boolean; onDone: (m: string) => void }) {
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
// SHARED BITS
// ---------------------------------------------------------------------------
const inputCls = 'w-full border border-black/15 dark:border-white/20 bg-transparent rounded-lg px-3 py-2.5 text-sm';

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-chalk dark:bg-ink rounded-3xl p-6 md:p-8 w-full max-w-2xl my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'crimson' }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
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
  return <div className="flex items-center gap-3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3">{children}</div>;
}
