'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState, useEffect } from 'react';
import { useCart, useCurrency, useTheme, useWishlist, useAuth } from './Providers';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { leagues } from '@/lib/mockData';
import LeagueCrest from './LeagueCrest';
import DiagonalSplitBg from './DiagonalSplitBg';

export default function Header() {
  const { count } = useCart();
  const { ids } = useWishlist();
  const { theme, toggle } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { signedIn, loading, isStaff } = useAuth();
  const { locale, t, setLocale } = useLocale();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b border-black/10 dark:border-white/10 bg-chalk/90 dark:bg-ink/90 backdrop-blur-xl transition-[box-shadow,padding] duration-300 ${scrolled ? 'header-scrolled py-0' : ''}`}>
      {/* Top utility bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-1.5 text-[11px] tracking-widest2 uppercase border-b border-black/5 dark:border-white/5 text-steel">
        <span>{t('nav.freeShipping')}</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} className="chip-underline">
            {t('nav.language')}
          </button>
          <button
            onClick={() => setCurrency(currency === 'USD' ? 'LBP' : 'USD')}
            className="chip-underline"
          >
            {currency}
          </button>
          <button onClick={toggle} className="chip-underline" aria-label="Toggle dark mode">
            {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 md:px-6 py-4">
        <div className="flex items-center gap-6">
          <button
            className="md:hidden flex flex-col gap-1.5"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Open menu"
          >
            <span className="w-6 h-0.5 bg-ink dark:bg-chalk" />
            <span className="w-6 h-0.5 bg-ink dark:bg-chalk" />
            <span className="w-4 h-0.5 bg-ink dark:bg-chalk" />
          </button>

          <Logo />

          <nav className="hidden lg:flex items-center gap-5 text-sm uppercase tracking-wide">
            {leagues.slice(0, 4).map(l => (
              <div key={l.slug} className="relative group/nav">
                <Link href={`/leagues/${l.slug}`} className="nav-sweep pb-1 inline-block" style={{ fontFamily: l.font }}>
                  {l.name}
                </Link>
                {/* Mega-menu preview — appears on hover/focus, one league at a time */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 invisible -translate-y-1 group-hover/nav:opacity-100 group-hover/nav:visible group-hover/nav:translate-y-0 group-focus-within/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] z-40">
                  <div className="w-64 rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 bg-chalk dark:bg-ink normal-case">
                    <div className="relative h-24">
                      <DiagonalSplitBg color={l.primary} />
                      <div className="relative z-10 h-full flex items-center justify-center">
                        <LeagueCrest league={l} size={52} />
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-steel uppercase tracking-widest2">{l.country}</p>
                      <p className="font-display text-xl mt-0.5" style={{ fontFamily: l.font }}>{l.name}</p>
                      <Link href={`/leagues/${l.slug}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ink dark:text-chalk chip-underline">
                        Shop {l.name} →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Link href="/leagues" className="nav-sweep pb-1 text-steel">
              {t('nav.allLeagues')}
            </Link>
            <Link href="/shop/sportswear" className="nav-sweep pb-1">
              {t('nav.sportswear')}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setSearchOpen(o => !o)} aria-label="Search" className="p-1">
            <SearchIcon />
          </button>
          <Link href="/account/wishlist" className="relative p-1" aria-label="Wishlist">
            <HeartIcon />
            {ids.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-crimson text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {ids.length}
              </span>
            )}
          </Link>
          {!loading && isStaff && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center border border-crimson text-crimson text-xs uppercase tracking-wide font-medium rounded-full px-3 py-1.5 hover:bg-crimson hover:text-white transition-colors"
            >
              Staff Panel
            </Link>
          )}
          {!loading && (
            signedIn ? (
              <Link href="/account" className="hidden sm:block p-1" aria-label="Account">
                <UserIcon />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex items-center bg-volt text-ink text-sm font-medium rounded-full px-4 py-1.5 btn-press"
              >
                {t('nav.signIn')}
              </Link>
            )
          )}
          <Link href="/cart" className="relative p-1" aria-label="Cart">
            <BagIcon />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-volt text-ink text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="px-5 md:px-6 pb-4 animate-rise">
          <form action="/search" className="flex items-center gap-2 border-b-2 border-ink dark:border-chalk py-2">
            <SearchIcon />
            <input
              name="q"
              autoFocus
              placeholder={t('nav.searchPlaceholder')}
              className="flex-1 bg-transparent outline-none text-lg placeholder:text-steel"
            />
          </form>
          <div className="flex gap-2 mt-3 flex-wrap">
            {['Real Madrid', 'Man City', 'Grip Socks', 'Lebanese League', "Women's"].map(t => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                onClick={() => setSearchOpen(false)}
                className="text-xs uppercase tracking-wide border border-black/10 dark:border-white/20 rounded-full px-3 py-1 text-steel hover:border-ink dark:hover:border-chalk hover:text-ink dark:hover:text-chalk transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {menuOpen && (
        <nav className="md:hidden flex flex-col gap-3 px-5 pb-5 text-sm uppercase tracking-wide animate-rise">
          {leagues.map(l => (
            <Link key={l.slug} href={`/leagues/${l.slug}`} onClick={() => setMenuOpen(false)} style={{ fontFamily: l.font }}>
              {l.name}
            </Link>
          ))}
          <Link href="/shop/sportswear" onClick={() => setMenuOpen(false)}>{t('nav.sportswear')}</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)}>{t('nav.aboutUs')}</Link>
          {!loading && (
            signedIn
              ? <Link href="/account" onClick={() => setMenuOpen(false)}>{t('nav.myAccount')}</Link>
              : <Link href="/sign-in" onClick={() => setMenuOpen(false)}>{t('nav.signIn')}</Link>
          )}
          {!loading && isStaff && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-crimson">Staff Panel</Link>
          )}
        </nav>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7-4.6-9.5-9C.6 8.1 2.6 4 6.5 4c2 0 3.6 1.2 4.5 2.4C11.9 5.2 13.5 4 15.5 4 19.4 4 21.4 8.1 19.5 12 17 16.4 12 21 12 21z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 016 0v2" />
    </svg>
  );
}
