import type { Metadata } from 'next';
import { Bebas_Neue, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConsentBanner from '@/components/ConsentBanner';
import ChatWidget from '@/components/ChatWidget';
import RouteProgress from '@/components/RouteProgress';
import BackToTop from '@/components/BackToTop';

// Display: Bebas Neue — tall, condensed, stadium-signage energy for headlines.
// Body: Inter — quiet, highly legible workhorse so the display face can be loud
// without the whole page feeling loud. Self-hosted via next/font: no runtime
// request, no flash of fallback text, works offline at build time.
const display = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-pi-jade.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Atlas — Football Culture, Carried',
    template: '%s | Atlas',
  },
  description: 'Authentic kits and match-day gear from every major league, shipped across Lebanon.',
  openGraph: {
    siteName: 'Atlas',
    type: 'website',
    title: 'Atlas — Football Culture, Carried',
    description: 'Authentic kits and match-day gear from every major league, shipped across Lebanon.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas — Football Culture, Carried',
    description: 'Authentic kits and match-day gear from every major league, shipped across Lebanon.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Deliberately NOT reading the locale cookie here with next/headers'
  // cookies() — doing so forces every route in the app to render dynamically
  // per-request instead of being statically prerendered at build time (this
  // was tried and measured: it flipped every route from ○ Static to
  // ƒ Dynamic in `next build` output). Since Atlas is a small storefront
  // where static generation matters for cost/speed, we accept a brief
  // flash-to-English on first paint for returning Arabic-preference visitors
  // instead — LocaleProvider picks up the stored cookie client-side on
  // mount and flips lang/dir immediately after.
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body>
        <LocaleProvider initialLocale="en">
          <Providers>
            <RouteProgress />
            <Header />
            {children}
            <Footer />
            <ConsentBanner />
            <ChatWidget />
            <BackToTop />
          </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
