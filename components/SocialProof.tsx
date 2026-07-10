'use client';

import { useState } from 'react';
import { Reveal, CountUp } from './Motion';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { TranslationKey } from '@/lib/i18n/dictionary';

// ---------------------------------------------------------------------------
// STATS BAND — scoreboard-style numbers. Replace with real figures as the
// store grows; these live here as a single source of truth.
// ---------------------------------------------------------------------------
const STATS: { n: string; labelKey: TranslationKey }[] = [
  { n: '6', labelKey: 'home.statLeagues' },
  { n: '500+', labelKey: 'home.statKits' },
  { n: '4.7★', labelKey: 'home.statRating' },
  { n: '48h', labelKey: 'home.statDelivery' },
];

export function StatsBand() {
  const { t } = useLocale();
  return (
    <section className="bg-ink text-chalk">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {STATS.map((s, i) => (
          <Reveal key={s.labelKey} delay={i * 120}>
            <p className="font-display text-4xl md:text-5xl text-volt tabular">
              <CountUp value={s.n} />
            </p>
            <p className="text-chalk/60 text-sm mt-2">{t(s.labelKey)}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TRUST BADGES — delivery / support / quality / secure checkout
// ---------------------------------------------------------------------------
const BADGES: { titleKey: TranslationKey; bodyKey: TranslationKey; icon: React.ReactNode }[] = [
  {
    titleKey: 'home.badge1Title',
    bodyKey: 'home.badge1Body',
    icon: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z" />,
  },
  {
    titleKey: 'home.badge2Title',
    bodyKey: 'home.badge2Body',
    icon: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
  },
  {
    titleKey: 'home.badge3Title',
    bodyKey: 'home.badge3Body',
    icon: <path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-1.2z" />,
  },
  {
    titleKey: 'home.badge4Title',
    bodyKey: 'home.badge4Body',
    icon: <path d="M2 7h20v10H2zM2 10h20M6 14h4" />,
  },
];

export function TrustBadges() {
  const { t } = useLocale();
  return (
    <section className="max-w-7xl mx-auto px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {BADGES.map((b, i) => (
        <Reveal key={b.titleKey} delay={i * 100}>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 card-premium h-full">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-crimson mb-4">
              {b.icon}
            </svg>
            <p className="font-medium">{t(b.titleKey)}</p>
            <p className="text-sm text-steel mt-2 leading-relaxed">{t(b.bodyKey)}</p>
          </div>
        </Reveal>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TESTIMONIALS — shows REAL customer reviews (highest-rated, with text) pulled
// from the database and passed in by the homepage. No fabricated quotes: if
// there are no qualifying reviews yet, the section simply doesn't render.
// Review text itself comes from customers and isn't translated — only the
// surrounding chrome ("What customers say" / "Verified buyer") is.
// ---------------------------------------------------------------------------
type Testimonial = { quote: string; name: string };

export function Testimonials({ reviews = [] }: { reviews?: Testimonial[] }) {
  const [i, setI] = useState(0);
  const { t } = useLocale();
  if (reviews.length === 0) return null;
  const tItem = reviews[Math.min(i, reviews.length - 1)];

  return (
    <section className="bg-pitch text-chalk">
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-volt text-xs uppercase tracking-widest2 mb-6">{t('home.whatCustomersSay')}</p>
        <blockquote key={i} className="font-display text-2xl md:text-3xl leading-snug animate-rise">
          “{tItem.quote}”
        </blockquote>
        <p className="mt-5 text-chalk/60 text-sm">{tItem.name} · {t('home.verifiedBuyer')}</p>
        {reviews.length > 1 && (
          <div className="flex gap-2 justify-center mt-8">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Testimonial ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? 'w-8 bg-volt' : 'w-3 bg-chalk/25'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ — accordion
// ---------------------------------------------------------------------------
const FAQS: { qKey: TranslationKey; aKey: TranslationKey }[] = [
  { qKey: 'home.faq1Q', aKey: 'home.faq1A' },
  { qKey: 'home.faq2Q', aKey: 'home.faq2A' },
  { qKey: 'home.faq3Q', aKey: 'home.faq3A' },
  { qKey: 'home.faq4Q', aKey: 'home.faq4A' },
  { qKey: 'home.faq5Q', aKey: 'home.faq5A' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const { t } = useLocale();

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h2 className="font-display text-3xl mb-8">{t('home.questionsAnswered')}</h2>
      <div className="divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
        {FAQS.map((f, i) => (
          <div key={f.qKey}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left font-medium gap-4"
              aria-expanded={open === i}
            >
              {t(f.qKey)}
              <span className={`shrink-0 transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
              <p className="text-steel text-sm leading-relaxed">{t(f.aKey)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-steel mt-6">
        {t('home.didntFindAnswer')}{' '}
        <a href="https://wa.me/96181752873" className="underline underline-offset-2">{t('home.messageWhatsapp')}</a> — {t('home.replyWithinHour')}
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
  const { t } = useLocale();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.includes('@')) { setErr(t('home.enterValidEmail')); return; }
    const { subscribeNewsletter } = await import('@/app/account/actions');
    const res = await subscribeNewsletter(email, 'homepage');
    if (res.ok) setDone(true);
    else setErr(res.error);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 pb-16">
      <div className="rounded-3xl bg-ink text-chalk p-10 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl">{t('home.neverMissDrop')}</h2>
          <p className="text-chalk/60 mt-2 text-sm max-w-sm">
            {t('home.newsletterBody')}
          </p>
        </div>
        {done ? (
          <p className="text-volt font-medium">{t('home.onTheList')}</p>
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
              placeholder={t('home.yourEmail')}
              className="flex-1 md:w-72 bg-white/10 border border-white/15 rounded-full px-5 py-3 text-sm placeholder:text-chalk/40 outline-none focus:border-volt"
            />
            <button type="submit" className="bg-volt text-ink rounded-full px-6 py-3 text-sm font-medium shrink-0">
              {t('home.subscribe')}
            </button>
          </form>
        )}
        {err && <p className="text-crimson text-sm mt-2 md:absolute">{err}</p>}
      </div>
    </section>
  );
}
