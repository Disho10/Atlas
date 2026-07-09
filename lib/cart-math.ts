import type { CartLine } from '@/components/Providers';

// Pure so it's testable without mounting the cart provider/DOM — see
// lib/cart-math.test.ts. This is display-only math: the source of truth for
// what a customer actually pays is recomputed server-side in the
// place_order() Postgres function, which never trusts this value.
export function calcSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty * (l.variantPrice ?? l.product.price), 0);
}
