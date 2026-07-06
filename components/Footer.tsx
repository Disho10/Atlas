import Link from 'next/link';
import Logo from './Logo';
import { leagues } from '@/lib/mockData';

export default function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Logo withSlogan />
          <p className="text-sm text-steel mt-3 max-w-xs">
            Football culture, carried. Authentic kits and match-day gear for every league, shipped across Lebanon.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-steel mb-3">Leagues</h4>
          <ul className="space-y-2 text-sm">
            {leagues.slice(0, 5).map(l => (
              <li key={l.slug}><Link href={`/leagues/${l.slug}`} className="hover:opacity-70">{l.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-steel mb-3">Support</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/track" className="hover:opacity-70">Track an order</Link></li>
            <li><Link href="/track" className="hover:opacity-70">Returns &amp; exchanges</Link></li>
            <li><a href="https://wa.me/9610000000" className="hover:opacity-70">WhatsApp us</a></li>
            <li><Link href="/scores" className="hover:opacity-70">Match results</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-steel mb-3">Atlas</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:opacity-70">Our story</Link></li>
            <li><Link href="/sign-in" className="hover:opacity-70">Sign in</Link></li>
            <li><Link href="/admin" className="hover:opacity-70">Staff panel</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/10 dark:border-white/10 px-6 py-4 text-xs text-steel flex flex-col sm:flex-row justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} Atlas Sports. All rights reserved.</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:opacity-70">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="hover:opacity-70">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
