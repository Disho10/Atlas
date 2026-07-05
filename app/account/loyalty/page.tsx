const TIERS = [
  { name: 'Bronze', min: 0, perk: 'Earn 1 point per $1 spent' },
  { name: 'Silver', min: 300, perk: '10% off every order + early drops' },
  { name: 'Gold', min: 800, perk: '15% off, free shipping, VIP support' },
];

export default function LoyaltyPage() {
  const points = 240;
  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-1">Loyalty</h1>
      <p className="text-steel mb-8">{points} points &middot; $12 available in rewards</p>
      <div className="space-y-3">
        {TIERS.map(t => {
          const active = points >= t.min;
          return (
            <div key={t.name} className={`rounded-2xl border p-5 ${active ? 'border-ink dark:border-chalk' : 'border-black/10 dark:border-white/10 opacity-60'}`}>
              <div className="flex justify-between">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-steel">{t.min}+ pts</p>
              </div>
              <p className="text-sm text-steel mt-1">{t.perk}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
