import Link from 'next/link';

// Returns & exchanges are handled through the order tracker, which enforces the
// delivered + 14-day-window rule. This page routes customers there.
export default function ReturnsPage() {
  return (
    <main className="max-w-lg mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-3xl mb-3">Returns & exchanges</h1>
      <p className="text-steel mb-8">
        Start a return or exchange from your order's tracking page — just enter your order number.
        Returns open once your order is delivered and stay open for 14 days.
      </p>
      <Link href="/track" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press">
        Go to order tracking
      </Link>
    </main>
  );
}
