import { getProducts } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function SalePage() {
  const all = await getProducts();
  // "On sale" = has a compareAt price higher than the current price — the
  // same struck-through-price signal already shown on product cards, just
  // filtered into its own page instead of scattered across the catalog.
  const products = all.filter(p => p.compareAt && p.compareAt > p.price);

  // If there's a currently active storewide promo code, show it as a banner
  // — this is the landing page those clearance-code suggestions in the
  // admin Finance/Promos tabs are meant to point people to.
  let activeCode: { code: string; kind: string; amount: number; description: string | null } | null = null;
  if (HAS_SUPABASE) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('promo_codes')
      .select('code, kind, amount, description')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    activeCode = data;
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-14">
      <div className="relative overflow-hidden rounded-3xl bg-pitch text-chalk p-10 md:p-14 mb-8 grain">
        <div className="glow-orb w-80 h-80 bg-crimson -top-20 -left-16 opacity-25" />
        <div className="relative z-10">
          <span className="text-volt text-xs uppercase tracking-widest2">Marked down, while it lasts</span>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight">Sale</h1>
          <p className="text-chalk/60 mt-3 max-w-md">
            {products.length > 0
              ? `${products.length} product${products.length === 1 ? '' : 's'} currently reduced — once they're gone, they're gone.`
              : "Nothing's marked down right now — check back soon."}
          </p>
        </div>
      </div>

      {activeCode && (
        <div className="rounded-2xl border border-volt/30 bg-volt/5 px-6 py-4 mb-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              Extra {activeCode.kind === 'percent' ? `${activeCode.amount}% off` : `$${activeCode.amount} off`} storewide right now
            </p>
            {activeCode.description && <p className="text-xs text-steel mt-0.5">{activeCode.description}</p>}
          </div>
          <span className="font-mono text-sm bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full px-4 py-1.5">
            {activeCode.code}
          </span>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-steel py-16 text-center">No markdowns at the moment — follow us or check back for the next one.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 80}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}
