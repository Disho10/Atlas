'use client';

import Link from 'next/link';
import Logo from './Logo';
import { leagues } from '@/lib/mockData';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Logo withSlogan />
          <p className="text-sm text-steel mt-3 max-w-xs">
            {t('footer.tagline')}
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-steel mb-3">{t('footer.leagues')}</h4>
          <ul className="space-y-2 text-sm">
            {leagues.slice(0, 5).map(l => (
              <li key={l.slug}><Link href={`/leagues/${l.slug}`} className="hover:opacity-70" style={{ fontFamily: l.font }}>{l.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-steel mb-3">{t('footer.support')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/track" className="hover:opacity-70">{t('footer.trackOrder')}</Link></li>
            <li><Link href="/track" className="hover:opacity-70">{t('footer.returns')}</Link></li>
            <li><a href="https://wa.me/96181752873" className="hover:opacity-70">{t('footer.whatsapp')}</a></li>
            <li><Link href="/scores" className="hover:opacity-70">{t('footer.matchResults')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-steel mb-3">{t('footer.atlas')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:opacity-70">{t('footer.ourStory')}</Link></li>
            <li><Link href="/sign-in" className="hover:opacity-70">{t('nav.signIn')}</Link></li>
            <li><Link href="/admin" className="hover:opacity-70">{t('footer.staffPanel')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/10 dark:border-white/10 px-6 py-4 text-xs text-steel flex flex-col sm:flex-row justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} Atlas Sports. {t('footer.rights')}</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:opacity-70">{t('footer.terms')}</Link>
          <Link href="/privacy" className="hover:opacity-70">{t('footer.privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}
