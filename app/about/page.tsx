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

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <Stat n="6" l="Leagues carried" />
          <Stat n="500+" l="Kits shipped" />
          <Stat n="4.7★" l="Average rating" />
        </div>
      </section>
    </main>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-display text-4xl">{n}</p>
      <p className="text-steel text-sm mt-1">{l}</p>
    </div>
  );
}
