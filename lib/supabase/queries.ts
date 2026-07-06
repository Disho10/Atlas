import type { Database } from './types';
import type { Product, League } from '@/lib/mockData';

type ProductRow = Database['public']['Tables']['products']['Row'] & {
  product_tags?: { tags: { label: string } }[];
};
type LeagueRow = Database['public']['Tables']['leagues']['Row'];

// Columns safe to expose publicly — deliberately excludes `code` and `cost_usd`,
// which stay owner/manager/admin-only per the spec even though RLS can't hide
// individual columns (only whole rows). Always select through this, not '*'.
export const PUBLIC_PRODUCT_COLUMNS =
  'id, name, category, league_slug, team, description, price_usd, compare_at_usd, gender, sizes, out_of_stock_sizes, stock, coming_soon, hot, status, image_url, rating, review_count, created_at';

// Full columns, for /admin only — call this exclusively from code gated by
// a staff role check (see app/admin/page.tsx once wired to real auth).
export const STAFF_PRODUCT_COLUMNS = PUBLIC_PRODUCT_COLUMNS + ', code, cost_usd, low_stock_threshold';

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    code: (row as any).code ?? '',
    name: row.name,
    category: row.category,
    leagueSlug: row.league_slug,
    team: row.team ?? 'Atlas',
    price: Number(row.price_usd),
    compareAt: row.compare_at_usd ? Number(row.compare_at_usd) : undefined,
    gender: row.gender,
    // The nested join `product_tags(tags(label))` can return `tags` as either
    // an object or a single-element array depending on the relationship shape,
    // so handle both rather than assuming one and crashing on the other.
    tags: (row.product_tags ?? [])
      .map((pt: any) => Array.isArray(pt.tags) ? pt.tags[0]?.label : pt.tags?.label)
      .filter(Boolean),
    sizes: row.sizes ?? [],
    outOfStockSizes: row.out_of_stock_sizes ?? [],
    stock: row.stock,
    comingSoon: row.coming_soon,
    hot: row.hot,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    image: row.image_url ?? '',
    color: '#FFFFFF',
    status: (row as any).status ?? 'published',
    cost: (row as any).cost_usd != null ? Number((row as any).cost_usd) : undefined,
  };
}

export function mapLeagueRow(row: LeagueRow): League {
  return {
    slug: row.slug,
    name: row.name,
    country: row.country,
    primary: row.primary_color,
    secondary: row.secondary_color,
    logoUrl: row.logo_url ?? undefined,
    logoHasWordmark: (row as any).logo_has_wordmark ?? false,
    logoInitials: row.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase(),
  };
}
