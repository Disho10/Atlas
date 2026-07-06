export default function AboutPage() {
  return (
    <main>
      <section className="bg-ink text-chalk py-20">
        <div className="max-w-3xl mx-auto px-6">
          <span className="text-volt text-xs uppercase tracking-widest2">Our story</span>
          <h1 className="font-display text-5xl mt-3 leading-tight">Built by someone who played the game.</h1>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-14 space-y-6 text-lg leading-relaxed">
        <p>
          Atlas started the way most real football businesses do — with a jersey collection and a group chat.
          Before it was a store, it was a way to stay close to the game after an injury changed what "playing"
          meant.
        </p>
        <p>
          What began as reselling kits through Instagram DMs grew into something bigger: a proper storefront for
          fans across Lebanon who want authentic gear from LaLiga to the Lebanese Premier League, without
          waiting weeks or guessing on sizing.
        </p>
        <p>
          Today Atlas is building toward a full storefront and, eventually, a physical space where fans can try
          before they buy — carrying the same standard for quality and speed that got this started in the first
          place.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-6">
        <h2 className="font-display text-3xl mb-10">The journey so far</h2>
        <div className="relative border-l-2 border-black/10 dark:border-white/15 pl-8 space-y-12">
          {TIMELINE.map(t => (
            <div key={t.year} className="relative">
              <span className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-volt border-4 border-chalk dark:border-ink" />
              <p className="font-display text-2xl text-crimson">{t.year}</p>
              <p className="font-medium mt-1">{t.title}</p>
              <p className="text-steel text-sm mt-2 leading-relaxed max-w-md">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-14 pb-20">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <Stat n="6" l="Leagues carried" />
          <Stat n="500+" l="Kits shipped" />
          <Stat n="4.7★" l="Average rating" />
        </div>
      </section>
    </main>
  );
}

// Edit these to match your real milestones — dates and wording are yours to own.
const TIMELINE = [
  {
    year: '2023',
    title: 'The first kits',
    body: 'It started with a personal jersey collection and Instagram DMs — sourcing kits for friends, then friends of friends.',
  },
  {
    year: '2024',
    title: 'A real business takes shape',
    body: 'The Instagram store found its people: fans across Lebanon who wanted authentic gear without the wait or the guesswork.',
  },
  {
    year: '2025',
    title: 'Beyond football shirts',
    body: 'The catalog grew — training wear, match essentials, and gear for men and women, from LaLiga to the Lebanese Premier League.',
  },
  {
    year: '2026',
    title: 'Atlas goes online',
    body: 'A full storefront built from scratch — with a physical location on the horizon. Same standard, bigger pitch.',
  },
];

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-display text-4xl">{n}</p>
      <p className="text-steel text-sm mt-1">{l}</p>
    </div>
  );
}
