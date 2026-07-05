export default function ReferralsPage() {
  return (
    <main className="max-w-lg mx-auto px-6 py-12 text-center">
      <h1 className="font-display text-3xl mb-3">Give $10, Get $10</h1>
      <p className="text-steel mb-8">Share your code — your friend gets $10 off their first order, and you get $10 in credit once they order.</p>
      <div className="border border-dashed border-black/20 dark:border-white/20 rounded-2xl py-6 mb-6">
        <p className="font-display text-3xl tracking-widest2">ALI-ATLAS10</p>
      </div>
      <div className="flex gap-3 justify-center">
        <button className="bg-ink text-chalk dark:bg-chalk dark:text-ink px-6 py-3 rounded-full text-sm font-medium">Copy code</button>
        <button className="border border-black/15 dark:border-white/20 px-6 py-3 rounded-full text-sm">Share</button>
      </div>
      <p className="text-xs text-steel mt-8">3 friends referred &middot; $30 earned so far</p>
    </main>
  );
}
