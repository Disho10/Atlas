'use client';

import { useState } from 'react';
import { Reveal, CountUp } from './Motion';

// ---------------------------------------------------------------------------
// STATS BAND — scoreboard-style numbers. Replace with real figures as the
// store grows; these live here as a single source of truth.
// ---------------------------------------------------------------------------
const STATS = [
  { n: '6', label: 'Leagues carried' },
  { n: '500+', label: 'Kits shipped' },
  { n: '4.7★', label: 'Average rating' },
  { n: '48h', label: 'Avg. delivery in Lebanon' },
];

export function StatsBand() {
  return (
    <section className="bg-ink text-chalk">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 120}>
            <p className="font-display text-4xl md:text-5xl text-volt tabular">
              <CountUp value={s.n} />
            </p>
            <p className="text-chalk/60 text-sm mt-2">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TRUST BADGES — delivery / support / quality / secure checkout
// ---------------------------------------------------------------------------
const BADGES = [
  {
    title: 'Fast delivery across Lebanon',
    body: 'Orders processed same-day, delivered to every governorate. Free pickup in Saida.',
    icon: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z" />,
  },
  {
    title: 'Real support, real fast',
    body: 'Questions before or after your order? Chat with us here or on WhatsApp any time.',
    icon: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
  },
  {
    title: 'Quality you can feel',
    body: 'Every kit and piece of gear is checked before it ships. If it is not right, we make it right.',
    icon: <path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-1.2z" />,
  },
  {
    title: 'Pay how you want',
    body: 'Whish Pay, OMT, card, or cash on delivery — every order confirmed instantly.',
    icon: <path d="M2 7h20v10H2zM2 10h20M6 14h4" />,
  },
];

export function TrustBadges() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {BADGES.map((b, i) => (
        <Reveal key={b.title} delay={i * 100}>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 card-premium h-full">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-crimson mb-4">
              {b.icon}
            </svg>
            <p className="font-medium">{b.title}</p>
            <p className="text-sm text-steel mt-2 leading-relaxed">{b.body}</p>
          </div>
        </Reveal>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TESTIMONIALS — carousel. Swap the placeholder entries for real customer
// quotes / creators as you collect them (names below are placeholders,
// NOT real endorsements — replace before launch).
// ---------------------------------------------------------------------------
const TESTIMONIALS = [
  { quote: 'Ordered on Sunday, wearing it at the game on Wednesday. Quality is honestly better than what I paid for.', name: 'Placeholder — replace with a real customer quote', role: 'Verified buyer' },
  { quote: 'The sizing guide was spot on and the fabric feels like the real matchday kit.', name: 'Placeholder — replace with a real customer quote', role: 'Verified buyer' },
  { quote: 'Cash on delivery to Tripoli with zero hassle. Will be back for the away kit.', name: 'Placeholder — replace with a real customer quote', role: 'Verified buyer' },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];

  return (
    <section className="bg-pitch text-chalk">
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-volt text-xs uppercase tracking-widest2 mb-6">What customers say</p>
        <blockquote key={i} className="font-display text-2xl md:text-3xl leading-snug animate-rise">
          “{t.quote}”
        </blockquote>
        <p className="mt-5 text-chalk/60 text-sm">{t.name} · {t.role}</p>
        <div className="flex gap-2 justify-center mt-8">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Testimonial ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? 'w-8 bg-volt' : 'w-3 bg-chalk/25'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ — accordion
// ---------------------------------------------------------------------------
const FAQS = [
  { q: 'How long does delivery take?', a: 'In-stock items ship same or next day and typically arrive within 2–4 days anywhere in Lebanon. Preorders show their expected window on the product page.' },
  { q: 'What payment methods do you accept?', a: 'Whish Pay, OMT, card, and cash on delivery across all of Lebanon.' },
  { q: 'How do returns and exchanges work?', a: 'You have 14 days from delivery. Open Account → Returns, pick the order, and choose return or exchange — we handle the rest.' },
  { q: 'Are the kits authentic?', a: 'Every product page states exactly what you are getting, and every item is quality-checked before it ships. If anything is not as described, we make it right.' },
  { q: 'Do you have a physical store?', a: 'Free pickup is available in Saida, with a full physical location on the way. Follow us on Instagram for the opening.' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h2 className="font-display text-3xl mb-8">Questions, answered</h2>
      <div className="divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
        {FAQS.map((f, i) => (
          <div key={f.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left font-medium gap-4"
              aria-expanded={open === i}
            >
              {f.q}
              <span className={`shrink-0 transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
              <p className="text-steel text-sm leading-relaxed">{f.a}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-steel mt-6">
        Didn't find your answer?{' '}
        <a href="https://wa.me/9610000000" className="underline underline-offset-2">Message us on WhatsApp</a> — we typically reply within the hour.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// NEWSLETTER — signup strip. TODO(backend): wire the submit to a Supabase
// `newsletter_subscribers` insert or your email provider's list API.
// ---------------------------------------------------------------------------
export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.includes('@')) { setErr('Enter a valid email.'); return; }
    const { subscribeNewsletter } = await import('@/app/account/actions');
    const res = await subscribeNewsletter(email, 'homepage');
    if (res.ok) setDone(true);
    else setErr(res.error);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 pb-16">
      <div className="rounded-3xl bg-ink text-chalk p-10 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl">Never miss a drop.</h2>
          <p className="text-chalk/60 mt-2 text-sm max-w-sm">
            New kits, restocks, and subscriber-only offers — straight to your inbox. No spam.
          </p>
        </div>
        {done ? (
          <p className="text-volt font-medium">You're on the list. Welcome to Atlas.</p>
        ) : (
          <form
            onSubmit={submit}
            className="flex w-full md:w-auto gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email"
              className="flex-1 md:w-72 bg-white/10 border border-white/15 rounded-full px-5 py-3 text-sm placeholder:text-chalk/40 outline-none focus:border-volt"
            />
            <button type="submit" className="bg-volt text-ink rounded-full px-6 py-3 text-sm font-medium shrink-0">
              Subscribe
            </button>
          </form>
        )}
        {err && <p className="text-crimson text-sm mt-2 md:absolute">{err}</p>}
      </div>
    </section>
  );
}
