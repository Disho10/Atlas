import Link from 'next/link';
import Logo from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <Logo className="justify-center mb-8" />
        <p className="font-display text-6xl mb-2">404</p>
        <h1 className="text-lg font-medium mb-2">That page doesn&apos;t exist</h1>
        <p className="text-steel text-sm mb-8">
          The link might be old, or the page may have moved. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="bg-volt text-ink px-6 py-3 rounded-full font-medium btn-press">
            Back to the store
          </Link>
          <Link href="/track" className="border border-black/15 dark:border-white/20 px-6 py-3 rounded-full font-medium btn-press">
            Track an order
          </Link>
        </div>
      </div>
    </main>
  );
}
