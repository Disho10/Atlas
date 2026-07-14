import type { Metadata } from 'next';
import { FaqSection } from '@/components/SocialProof';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Delivery times, payment methods, returns, and authenticity — answered.',
};

export default function FaqPage() {
  return (
    <main className="pt-8">
      <FaqSection />
    </main>
  );
}
