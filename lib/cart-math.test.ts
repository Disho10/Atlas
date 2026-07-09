import { describe, it, expect } from 'vitest';
import { calcSubtotal } from './cart-math';
import type { CartLine } from '@/components/Providers';
import type { Product } from './mockData';

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1', code: 'ATL-SHT-0001', name: 'Test Shirt', category: 'shirts',
    leagueSlug: null, team: 'Test FC', price: 50, gender: 'unisex', tags: [],
    sizes: ['M'], stock: 10, rating: 0, reviewCount: 0, image: '', images: [],
    color: '#fff', variants: [], ...overrides,
  };
}

describe('calcSubtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(calcSubtotal([])).toBe(0);
  });

  it('sums qty * price across lines', () => {
    const lines: CartLine[] = [
      { product: fakeProduct({ price: 50 }), size: 'M', qty: 2 },
      { product: fakeProduct({ id: 'p2', price: 30 }), size: 'L', qty: 1 },
    ];
    expect(calcSubtotal(lines)).toBe(130); // 50*2 + 30*1
  });

  it('uses variantPrice over the base product price when set', () => {
    const lines: CartLine[] = [
      { product: fakeProduct({ price: 50 }), size: 'M', qty: 1, variant: 'Jersey + Shorts', variantPrice: 89 },
    ];
    expect(calcSubtotal(lines)).toBe(89);
  });

  it('handles multiple quantities of a variant-priced item', () => {
    const lines: CartLine[] = [
      { product: fakeProduct({ price: 50 }), size: 'M', qty: 3, variantPrice: 20 },
    ];
    expect(calcSubtotal(lines)).toBe(60);
  });
});
