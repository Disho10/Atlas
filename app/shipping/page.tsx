import { getSiteSettings } from '@/lib/data';

const REGIONS: { area: string; governorates: string; estimate: string }[] = [
  { area: 'Beirut & Mount Lebanon', governorates: 'Beirut, Baabda, Metn, Keserwan, Aley, Chouf', estimate: 'Usually 1–2 days' },
  { area: 'North', governorates: 'Tripoli, Zgharta, Koura, Batroun, Akkar', estimate: 'Usually 2–3 days' },
  { area: 'South', governorates: 'Saida, Tyre, Nabatieh, Jezzine', estimate: 'Usually 2–4 days' },
  { area: 'Bekaa', governorates: 'Zahle, Baalbek, West Bekaa, Rachaya', estimate: 'Usually 2–4 days' },
];

export default async function ShippingPage() {
  const settings = await getSiteSettings();

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl mb-2">Shipping &amp; Delivery</h1>
      <p className="text-steel text-sm mb-10">Where we deliver, how long it takes, and what it costs.</p>

      <section className="mb-10">
        <h2 className="text-ink dark:text-chalk font-medium mb-3">Delivery by region</h2>
        <p className="text-sm text-steel mb-4">
          We ship across all of Lebanon. In-stock orders are dispatched the same or next day —
          from there, how long it takes depends on where you are:
        </p>
        <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden">
          {REGIONS.map((r, i) => (
            <div key={r.area} className={`px-5 py-4 ${i > 0 ? 'border-t border-black/10 dark:border-white/10' : ''}`}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-medium text-sm">{r.area}</p>
                <p className="text-sm text-volt font-medium shrink-0">{r.estimate}</p>
              </div>
              <p className="text-xs text-steel mt-1">{r.governorates}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-steel mt-3">
          These are estimates, not guarantees — weather, traffic, and courier volume can affect
          timing, especially outside Beirut and Mount Lebanon.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-ink dark:text-chalk font-medium mb-3">Delivery cost</h2>
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-5">
          <p className="text-sm">
            <span className="font-medium text-volt">Free</span> on orders over{' '}
            <span className="font-medium">${settings.freeShippingThreshold}</span>.
          </p>
          <p className="text-sm text-steel mt-1">
            Below that, a delivery fee applies — shown at checkout before you pay, based on your area.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-ink dark:text-chalk font-medium mb-3">Preorders</h2>
        <p className="text-sm text-steel">
          Preorder items ship on their own schedule, shown on that product&apos;s page — that
          window applies instead of the general estimate above. We&apos;ll notify you as soon as
          it ships.
        </p>
      </section>

      <section>
        <h2 className="text-ink dark:text-chalk font-medium mb-3">Payment on delivery</h2>
        <p className="text-sm text-steel">
          Choose Cash on Delivery at checkout and pay the courier when your order arrives — no
          online payment needed. Prefer to pay ahead? Whish Pay and card are both available
          too.
        </p>
      </section>

      <p className="text-xs text-steel mt-12 pt-6 border-t border-black/10 dark:border-white/10">
        Questions about a specific delivery? <a href="/track" className="underline underline-offset-2">Track your order</a>{' '}
        or <a href="/contact" className="underline underline-offset-2">contact us</a> — hours: {settings.businessHours}.
      </p>
    </main>
  );
}
