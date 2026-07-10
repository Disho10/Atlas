'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';
import { Product } from '@/lib/mockData';
import { useCart, useCurrency, useWishlist } from './Providers';
import { formatCurrency } from '@/lib/mockData';
import { HeartIcon, CheckIcon } from './icons';

export default function ProductCard({ product, isNew = false }: { product: Product; isNew?: boolean }) {
  const { currency } = useCurrency();
  const { ids, toggle } = useWishlist();
  const { add } = useCart();
  const wished = ids.includes(product.id);
  const lowStock = product.stock > 0 && product.stock <= 6;
  const outOfStock = product.stock <= 0;
  const canQuickAdd = !product.comingSoon && !outOfStock && product.sizes.length > 0;
  const [added, setAdded] = useState(false);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add(product, product.sizes[0]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="group card-premium rounded-xl">
      <Link href={`/product/${product.id}`} className="block relative aspect-[4/5] overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover card-img"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && !product.comingSoon && <Badge tone="volt">New</Badge>}
          {product.hot && <Badge tone="crimson">Hot</Badge>}
          {product.comingSoon && <Badge tone="ink">Coming Soon</Badge>}
          {lowStock && !product.comingSoon && <Badge tone="steel">Low stock</Badge>}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); toggle(product.id); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-ink/80 flex items-center justify-center text-ink dark:text-chalk btn-press"
          aria-label="Toggle wishlist"
        >
          <HeartIcon filled={wished} className={`w-4 h-4 ${wished ? 'text-crimson' : ''}`} />
        </button>
        {/* Quick add — slides up from the bottom of the image on hover. Desktop-only
            progressive enhancement (no hover state to trigger it on touch); mobile
            shoppers tap through to the product page, which has full add-to-cart. */}
        {canQuickAdd && (
          <button
            onClick={quickAdd}
            className="absolute left-2 right-2 bottom-2 translate-y-[calc(100%+0.5rem)] group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-ink/90 dark:bg-chalk/90 text-chalk dark:text-ink text-xs font-medium rounded-full py-2.5 btn-press backdrop-blur-sm"
          >
            {added ? (
              <span className="inline-flex items-center justify-center gap-1.5"><CheckIcon className="w-3.5 h-3.5" /> Added</span>
            ) : 'Quick add'}
          </button>
        )}
      </Link>
      <div className="mt-3 flex justify-between items-start gap-2">
        <div>
          <Link href={`/product/${product.id}`} className="text-sm font-medium leading-snug hover:opacity-70">
            {product.name}
          </Link>
          <div className="text-xs text-steel mt-0.5">{product.team}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold tabular">{formatCurrency(product.price, currency)}</div>
          {product.compareAt && (
            <div className="text-xs text-steel line-through tabular">{formatCurrency(product.compareAt, currency)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'crimson' | 'ink' | 'steel' | 'volt' }) {
  const toneMap = {
    crimson: 'bg-crimson text-white',
    ink: 'bg-ink text-chalk',
    steel: 'bg-steel text-white',
    volt: 'bg-volt text-ink',
  } as const;
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
