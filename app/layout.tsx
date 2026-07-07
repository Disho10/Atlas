import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConsentBanner from '@/components/ConsentBanner';
import ChatWidget from '@/components/ChatWidget';

export const metadata: Metadata = {
  title: 'Atlas — Football Culture, Carried',
  description: 'Authentic kits and match-day gear from every major league, shipped across Lebanon.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <Providers>
          <Header />
          {children}
          <Footer />
          <ConsentBanner />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
