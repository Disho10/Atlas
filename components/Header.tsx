'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useCurrency, useTheme, useWishlist } from './Providers';
import { leagues } from '@/lib/mockData';

export default function Header() {
  const { count } = useCart();
  const { ids } = useWishlist();
  const { theme, toggle } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 dark:border-white/10 bg-chalk/90 dark:bg-ink/90 backdrop-blur">
      {/* Top utility bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-1.5 text-[11px] tracking-widest2 uppercase border-b border-black/5 dark:border-white/5 text-steel">
        <span>Free pickup in Saida &middot; Cash on delivery available across Lebanon</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrency(currency === 'USD' ? 'LBP' : 'USD')}
            className="chip-underline"
          >
            {currency}
          </button>
          <button onClick={toggle} className="chip-underline" aria-label="Toggle dark mode">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
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

          <Link href="/" className="font-display text-3xl tracking-wide leading-none">
            ATLAS
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm uppercase tracking-wide">
            {leagues.slice(0, 4).map(l => (
              <Link key={l.slug} href={`/leagues/${l.slug}`} className="chip-underline pb-1">
                {l.name}
              </Link>
            ))}
            <Link href="/leagues" className="chip-underline pb-1 text-steel">
              All Leagues
            </Link>
            <Link href="/shop/sportswear" className="chip-underline pb-1">
              Sportswear
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
          <Link href="/account" className="hidden sm:block p-1" aria-label="Account">
            <UserIcon />
          </Link>
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
              placeholder="Search by name, team, player, or nationality"
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
            <Link key={l.slug} href={`/leagues/${l.slug}`} onClick={() => setMenuOpen(false)}>
              {l.name}
            </Link>
          ))}
          <Link href="/shop/sportswear" onClick={() => setMenuOpen(false)}>Sportswear</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)}>About Us</Link>
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
