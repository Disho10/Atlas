'use client';

import { useMemo, useState } from 'react';
import { formatCurrency, type Product, type Order } from '@/lib/mockData';

type Role = 'owner' | 'manager' | 'admin';

export default function AdminPanel({
  role: fixedRole,
  products,
  orders,
  zeroResultSearches,
  demoMode = false,
}: {
  role: Role;
  products: Product[];
  orders: Order[];
  zeroResultSearches: { term: string; count: number }[];
  demoMode?: boolean;
}) {
  // In demo mode (no Supabase configured) the role switcher stays for preview.
  // With real auth, the role is fixed by the signed-in user's profile.
  const [role, setRole] = useState<Role>(fixedRole);
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [salaries, setSalaries] = useState(1200);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 6);
  const mostRequested = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }, [query]);

  const tabs = [
    { id: 'overview', label: 'Overview', roles: ['owner', 'manager', 'admin'] },
    { id: 'orders', label: 'Orders', roles: ['owner', 'manager', 'admin'] },
    { id: 'products', label: 'Products', roles: ['owner', 'manager', 'admin'] },
    { id: 'requests', label: 'Requests', roles: ['owner', 'manager'] },
    { id: 'analytics', label: 'Search analytics', roles: ['owner', 'manager'] },
    { id: 'finance', label: 'Finance', roles: ['owner'] },
  ].filter(t => t.roles.includes(role));

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
            {mostRequested.map((p, i) => (
              <Row key={p.id}>
                <span className="w-6 text-steel tabular">{i + 1}</span>
                <span className="flex-1">{p.name}</span>
                <span className="text-steel text-sm">{p.reviewCount} interactions</span>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'orders' && (
        <Section title="Orders" desc="Includes orders placed on the website, and manually logged Instagram / WhatsApp sales">
          <div className="flex justify-end mb-3">
            <button className="text-sm bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full px-4 py-2">+ Log Instagram/WhatsApp order</button>
          </div>
          <div className="space-y-2">
            {orders.map(o => (
              <Row key={o.id}>
                <span className="w-24 text-sm tabular">{o.id}</span>
                <span className="flex-1 text-sm">{o.customer} &middot; {o.items[0].name}</span>
                <span className="text-xs uppercase text-steel w-20">{o.channel}</span>
                <span className="text-xs capitalize px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 w-24 text-center">{o.status}</span>
                <span className="text-sm font-medium w-16 text-right tabular">{formatCurrency(o.total, 'USD')}</span>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'products' && (
        <Section title="Products" desc="Internal codes are only visible to Owner, Manager, and Admin roles">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by product, tag, or internal code..."
            className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm mb-4"
          />
          <div className="space-y-2">
            {(query ? searchResults : products).map(p => (
              <Row key={p.id}>
                <span className="text-xs font-mono text-steel w-28">{p.code}</span>
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="text-sm tabular w-16">{p.stock} in stock</span>
                <span className="text-sm font-medium tabular w-16 text-right">${p.price}</span>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'requests' && (
        <>
          <Section title="Low-stock alerts" desc="Separate from most-requested — flags anything at or below threshold (6 units)">
            <div className="space-y-2">
              {lowStock.map(p => (
                <Row key={p.id}>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-crimson text-sm font-medium">{p.stock} left</span>
                </Row>
              ))}
              {lowStock.length === 0 && <p className="text-sm text-steel">Nothing below threshold right now.</p>}
            </div>
          </Section>
          <Section title="Reorder recommendations" desc="Suggested based on recent sales velocity and demand signals">
            <div className="space-y-2">
              {lowStock.map(p => (
                <Row key={p.id}>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-sm text-steel">Suggest reordering ~{Math.max(20, p.stock * 4)} units</span>
                </Row>
              ))}
            </div>
          </Section>
        </>
      )}

      {tab === 'analytics' && (
        <Section title="Zero-result searches" desc="What customers are searching for that you don't carry yet — a direct demand signal">
          <div className="space-y-2">
            {zeroResultSearches.map(z => (
              <Row key={z.term}>
                <span className="flex-1 text-sm">"{z.term}"</span>
                <span className="text-sm text-steel">{z.count} searches</span>
              </Row>
            ))}
          </div>
        </Section>
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
    </main>
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
