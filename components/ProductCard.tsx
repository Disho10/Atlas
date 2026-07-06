'use client';

import Link from 'next/link';
import ProductImage from './ProductImage';
import { Product } from '@/lib/mockData';
import { useCurrency, useWishlist } from './Providers';
import { formatCurrency } from '@/lib/mockData';
import { HeartIcon } from './icons';

export default function ProductCard({ product }: { product: Product }) {
  const { currency } = useCurrency();
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(product.id);
  const lowStock = product.stock > 0 && product.stock <= 6;

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
          {product.hot && <Badge tone="crimson">Hot</Badge>}
          {product.comingSoon && <Badge tone="ink">Coming Soon</Badge>}
          {lowStock && !product.comingSoon && <Badge tone="steel">Low stock</Badge>}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); toggle(product.id); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-ink/80 flex items-center justify-center text-ink dark:text-chalk"
          aria-label="Toggle wishlist"
        >
          <HeartIcon filled={wished} className={`w-4 h-4 ${wished ? 'text-crimson' : ''}`} />
        </button>
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

function Badge({ children, tone }: { children: React.ReactNode; tone: 'crimson' | 'ink' | 'steel' }) {
  const toneMap = {
    crimson: 'bg-crimson text-white',
    ink: 'bg-ink text-chalk',
    steel: 'bg-steel text-white',
  } as const;
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
