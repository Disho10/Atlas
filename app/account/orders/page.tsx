import { orders, OrderStatus, formatCurrency } from '@/lib/mockData';

const STEPS: OrderStatus[] = ['placed', 'confirmed', 'shipped', 'delivered'];

export default function OrdersPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Your Orders</h1>
      <div className="space-y-8">
        {orders.map(o => (
          <div key={o.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="font-medium">Order #{o.id}</p>
                <p className="text-sm text-steel">{o.date} &middot; {o.paymentMethod}</p>
              </div>
              <p className="font-semibold tabular">{formatCurrency(o.total, 'USD')}</p>
            </div>

            <div className="flex items-center mb-6">
              {STEPS.map((s, i) => {
                const reached = STEPS.indexOf(o.status) >= i;
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${reached ? 'bg-volt' : 'bg-black/15 dark:bg-white/15'}`} />
                      <span className={`text-[11px] capitalize ${reached ? '' : 'text-steel'}`}>{s}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 ${STEPS.indexOf(o.status) > i ? 'bg-volt' : 'bg-black/15 dark:bg-white/15'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <ul className="text-sm text-steel space-y-1">
              {o.items.map((it, i) => (
                <li key={i}>{it.name} × {it.qty} (Size {it.size})</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
