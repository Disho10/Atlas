import { Reveal, CountUp } from '@/components/Motion';
import LeagueCrest from '@/components/LeagueCrest';
import { getLeagues } from '@/lib/data';

export default async function AboutPage() {
  const leagues = await getLeagues();

  return (
    <main>
      <section className="bg-ink text-chalk py-20 grain relative overflow-hidden">
        <div className="glow-orb w-[32rem] h-[32rem] bg-crimson -top-32 -left-24 opacity-20" />
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <span className="text-volt text-xs uppercase tracking-widest2">Our story</span>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight">Built by someone who<br />played the game.</h1>
          <p className="text-chalk/60 mt-4 max-w-xl">Atlas isn't a reseller template. It came from the pitch — literally.</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-14 space-y-6 text-lg leading-relaxed">
        {FOUNDER_STORY.map((p, i) => (
          <Reveal key={i} delay={i * 70}>
            <p className={p.emphasis ? 'font-medium' : undefined}>{p.text}</p>
          </Reveal>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-6">
        <h2 className="font-display text-3xl mb-10">The journey so far</h2>
        <div className="relative border-l-2 border-black/10 dark:border-white/15 pl-8 space-y-12">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.year} delay={i * 70}>
              <div className="relative">
                <span className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-volt border-4 border-chalk dark:border-ink" />
                <p className="font-display text-2xl text-crimson">{t.year}</p>
                <p className="font-medium mt-1">{t.title}</p>
                <p className="text-steel text-sm mt-2 leading-relaxed max-w-md">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-14">
        <h2 className="font-display text-3xl mb-8">Leagues we carry</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
          {leagues.map((l, i) => (
            <Reveal key={l.slug} delay={i * 60} variant="scale">
              <a href={`/leagues/${l.slug}`} className="flex flex-col items-center gap-2 text-center group">
                <div className="w-full aspect-square rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center card-hover">
                  <LeagueCrest league={l} size={40} />
                </div>
                <span className="text-xs text-steel group-hover:text-ink dark:group-hover:text-chalk transition-colors">{l.name}</span>
              </a>
            </Reveal>
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

const FOUNDER_STORY = [
  { text: "I grew up on the field. Football wasn't a hobby — it was what I was going to do. I played for Al Nahda in Lebanon, training and competing at a level where the next step was supposed to be the only step. Then a back injury changed everything." },
  { text: "When you lose the thing you built your identity around, you don't just move on — you redirect. The love for the game didn't disappear; it just had to find a different channel. For me, that channel became the gear, the culture, the community around football, and eventually this store." },
  { text: "Atlas started as a personal kit collection and a few Instagram DMs — sourcing jerseys for friends who trusted my taste and my standards. That grew into friends of friends, then strangers across Lebanon who just wanted authentic gear without the guesswork, the fakes, or the six-week shipping wait." },
  { text: "Today Atlas carries six leagues and ships across all of Lebanon. Every product is checked before it ships. Every customer gets the same standard I'd expect myself — because when you come from the game, you know what good gear means." },
  { text: 'Follow Through.', emphasis: true },
];

const TIMELINE = [
  {
    year: 'Before Atlas',
    title: 'On the pitch',
    body: 'Playing for Al Nahda in Lebanon — football was the plan, the path, the identity. Until a back injury ended that chapter.',
  },
  {
    year: '2023',
    title: 'The first kits',
    body: 'A personal jersey collection turned into sourcing for friends via Instagram DMs. The standard was set: quality gear, no guesswork.',
  },
  {
    year: '2024',
    title: 'A real business',
    body: 'The Instagram store found its people — fans across Lebanon who wanted authentic gear without the wait. Atlas had a name.',
  },
  {
    year: '2025',
    title: 'Beyond football shirts',
    body: 'Training wear, match-day essentials, men\'s and women\'s sportswear — from LaLiga to the Lebanese Premier League.',
  },
  {
    year: '2026',
    title: 'Atlas goes online',
    body: 'A full e-commerce storefront built from scratch — bringing authentic kit culture to Lebanon, delivered to your door.',
  },
];

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <CountUp value={n} className="font-display text-4xl" />
      <p className="text-steel text-sm mt-1">{l}</p>
    </div>
  );
}
