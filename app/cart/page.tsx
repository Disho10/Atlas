'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart, useCurrency } from '@/components/Providers';
import { formatCurrency } from '@/lib/mockData';

export default function CartPage() {
  const { lines, remove, setQty, subtotal } = useCart();
  const { currency } = useCurrency();

  if (lines.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-3">Your cart is empty</h1>
        <p className="text-steel mb-6">Nothing here yet — go find your next kit.</p>
        <Link href="/" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium">Continue shopping</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2 space-y-6">
        <h1 className="font-display text-3xl mb-2">Your Cart</h1>
        {lines.map(l => (
          <div key={l.product.id + l.size} className="flex gap-4 border-b border-black/10 dark:border-white/10 pb-6">
            <div className="relative w-24 h-28 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
              <Image src={l.product.image} alt={l.product.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{l.product.name}</p>
                  <p className="text-sm text-steel">Size {l.size}</p>
                </div>
                <p className="font-semibold tabular">{formatCurrency(l.product.price * l.qty, currency)}</p>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center border border-black/15 dark:border-white/20 rounded-full">
                  <button onClick={() => setQty(l.product.id, l.size, l.qty - 1)} className="w-8 h-8">−</button>
                  <span className="w-8 text-center text-sm tabular">{l.qty}</span>
                  <button onClick={() => setQty(l.product.id, l.size, l.qty + 1)} className="w-8 h-8">+</button>
                </div>
                <button onClick={() => remove(l.product.id, l.size)} className="text-xs text-steel underline">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 h-fit">
        <div className="flex justify-between text-sm mb-2">
          <span>Subtotal</span>
          <span className="tabular">{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-steel mb-4">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
        <Link href="/checkout" className="block text-center bg-volt text-ink rounded-full py-3.5 font-medium">
          Checkout
        </Link>
      </div>
    </main>
  );
}
