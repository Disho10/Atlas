import Link from 'next/link';
import { cookies } from 'next/headers';
import { translate, type Locale } from '@/lib/i18n/dictionary';
import { COOKIE_NAME } from '@/lib/i18n/LocaleProvider';

// Returns & exchanges are handled through the order tracker, which enforces the
// delivered + 14-day-window rule. This page routes customers there.
export default async function ReturnsPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(COOKIE_NAME)?.value === 'ar' ? 'ar' : 'en') as Locale;
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main className="max-w-lg mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-3xl mb-3">{t('account.returnsTitle')}</h1>
      <p className="text-steel mb-8">
        {t('account.returnsBody')}
      </p>
      <Link href="/track" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press">
        {t('account.goToTracking')}
      </Link>
    </main>
  );
}
