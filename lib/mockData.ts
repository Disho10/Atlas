// ---------------------------------------------------------------------------
// MOCK DATA LAYER
// This file simulates what will eventually come from Supabase tables.
// See /BACKEND_INTEGRATION.md for the real schema + swap-in instructions.
// ---------------------------------------------------------------------------

export type League = {
  slug: string;
  name: string;
  country: string;
  primary: string;   // hex - league brand color used for the category header
  secondary: string;
  logoInitials: string;
  logoUrl?: string;         // licensed real logo, if you have one for this league — see public/logos/
  logoHasWordmark?: boolean; // true if the logo image already spells out the league name
};

export const leagues: League[] = [
  { slug: 'la-liga', name: 'LaLiga', country: 'Spain', primary: '#EE2737', secondary: '#0B0D10', logoInitials: 'LL', logoUrl: '/logos/la-liga.png', logoHasWordmark: true },
  { slug: 'premier-league', name: 'Premier League', country: 'England', primary: '#3D195B', secondary: '#00FF87', logoInitials: 'PL', logoUrl: '/logos/premier-league.png' },
  { slug: 'serie-a', name: 'Serie A', country: 'Italy', primary: '#004B8D', secondary: '#FFFFFF', logoInitials: 'SA', logoUrl: '/logos/serie-a.png', logoHasWordmark: true },
  { slug: 'bundesliga', name: 'Bundesliga', country: 'Germany', primary: '#D3010C', secondary: '#0B0D10', logoInitials: 'BL', logoUrl: '/logos/bundesliga.png', logoHasWordmark: true },
  { slug: 'ligue-1', name: 'Ligue 1', country: 'France', primary: '#0D1240', secondary: '#DAE41A', logoInitials: 'L1', logoUrl: '/logos/ligue-1.png', logoHasWordmark: true },
  { slug: 'lebanese-league', name: 'Lebanese Premier League', country: 'Lebanon', primary: '#C8102E', secondary: '#00693E', logoInitials: 'LPL', logoUrl: '/logos/lebanese-league.png' },
];

export type ProductCategory = 'shirts' | 'socks' | 'balls' | 'shinpads' | 'sportswear';

export type Product = {
  id: string;
  code: string; // internal product code - owner/manager/admin only
  name: string;
  category: ProductCategory;
  leagueSlug: string | null;
  team: string;
  price: number; // USD
  compareAt?: number;
  gender: 'male' | 'female' | 'unisex';
  tags: string[];
  sizes: string[];
  outOfStockSizes?: string[];
  stock: number;
  comingSoon?: boolean;
  hot?: boolean;
  rating: number;
  reviewCount: number;
  image: string;
  color: string;
  status?: 'draft' | 'published'; // admin only
  cost?: number;                  // admin only — for margin math
};

export const products: Product[] = [
  {
    id: 'p1', code: 'ATL-SHT-0001', name: 'Real Madrid Home Shirt 25/26', category: 'shirts',
    leagueSlug: 'la-liga', team: 'Real Madrid', price: 89, compareAt: 110, gender: 'male',
    tags: ['Real Madrid', 'Spain', 'Home Kit', 'La Liga'], sizes: ['S', 'M', 'L', 'XL'],
    stock: 42, hot: true, rating: 4.8, reviewCount: 132,
    image: 'https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=800&auto=format&fit=crop', color: '#FFFFFF'
  },
  {
    id: 'p2', code: 'ATL-SHT-0002', name: 'Barcelona Away Shirt 25/26', category: 'shirts',
    leagueSlug: 'la-liga', team: 'Barcelona', price: 89, gender: 'male',
    tags: ['Barcelona', 'Spain', 'Away Kit', 'La Liga'], sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 30, rating: 4.6, reviewCount: 74,
    image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop', color: '#04124A'
  },
  {
    id: 'p3', code: 'ATL-SHT-0003', name: 'Man City Home Shirt 25/26', category: 'shirts',
    leagueSlug: 'premier-league', team: 'Manchester City', price: 92, gender: 'unisex',
    tags: ['Manchester City', 'England', 'Home Kit', 'Premier League'], sizes: ['S', 'M', 'L'],
    outOfStockSizes: ['L'], stock: 12, hot: true, rating: 4.9, reviewCount: 201,
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop', color: '#6CABDD'
  },
  {
    id: 'p4', code: 'ATL-SHT-0004', name: 'Inter Milan Home Shirt 25/26', category: 'shirts',
    leagueSlug: 'serie-a', team: 'Inter Milan', price: 87, gender: 'male',
    tags: ['Inter Milan', 'Italy', 'Home Kit', 'Serie A'], sizes: ['S', 'M', 'L', 'XL'],
    stock: 18, comingSoon: true, rating: 0, reviewCount: 0,
    image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop', color: '#0B0D10'
  },
  {
    id: 'p5', code: 'ATL-BAL-0001', name: 'Atlas Match Ball Pro', category: 'balls',
    leagueSlug: null, team: 'Atlas', price: 34, gender: 'unisex',
    tags: ['Match Ball', 'Training'], sizes: ['Size 5'], stock: 60, rating: 4.7, reviewCount: 48,
    image: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?q=80&w=800&auto=format&fit=crop', color: '#FFFFFF'
  },
  {
    id: 'p6', code: 'ATL-SOC-0001', name: 'Pro Grip Socks - Crimson', category: 'socks',
    leagueSlug: null, team: 'Atlas', price: 14, gender: 'unisex',
    tags: ['Training', 'Grip Socks'], sizes: ['S', 'M', 'L'], stock: 5, rating: 4.4, reviewCount: 21,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?q=80&w=800&auto=format&fit=crop', color: '#E63946'
  },
  {
    id: 'p7', code: 'ATL-SHN-0001', name: 'Carbon Shield Shin Pads', category: 'shinpads',
    leagueSlug: null, team: 'Atlas', price: 22, gender: 'unisex',
    tags: ['Protection', 'Training'], sizes: ['S', 'M', 'L'], stock: 25, rating: 4.5, reviewCount: 33,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop', color: '#12161B'
  },
  {
    id: 'p8', code: 'ATL-SPW-0001', name: "Women's Tech Training Hoodie", category: 'sportswear',
    leagueSlug: null, team: 'Atlas', price: 58, gender: 'female',
    tags: ['Training', 'Hoodie'], sizes: ['XS', 'S', 'M', 'L'], stock: 20, hot: true, rating: 4.9, reviewCount: 61,
    image: 'https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=800&auto=format&fit=crop', color: '#F5F3EE'
  },
  {
    id: 'p9', code: 'ATL-SHT-0005', name: 'PSG Home Shirt 25/26', category: 'shirts',
    leagueSlug: 'ligue-1', team: 'PSG', price: 90, gender: 'male',
    tags: ['PSG', 'France', 'Home Kit', 'Ligue 1'], sizes: ['S', 'M', 'L', 'XL'],
    stock: 27, rating: 4.7, reviewCount: 88,
    image: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=800&auto=format&fit=crop', color: '#04164A'
  },
  {
    id: 'p10', code: 'ATL-SHT-0006', name: 'Bayern Munich Home Shirt 25/26', category: 'shirts',
    leagueSlug: 'bundesliga', team: 'Bayern Munich', price: 88, gender: 'male',
    tags: ['Bayern Munich', 'Germany', 'Home Kit', 'Bundesliga'], sizes: ['M', 'L', 'XL'],
    stock: 33, rating: 4.6, reviewCount: 54,
    image: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=800&auto=format&fit=crop', color: '#DC052D'
  },
  {
    id: 'p11', code: 'ATL-SHT-0007', name: 'Nejmeh SC Home Shirt', category: 'shirts',
    leagueSlug: 'lebanese-league', team: 'Nejmeh SC', price: 55, gender: 'male',
    tags: ['Nejmeh', 'Lebanon', 'Home Kit', 'Lebanese League'], sizes: ['S', 'M', 'L', 'XL'],
    stock: 15, rating: 4.8, reviewCount: 19,
    image: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=800&auto=format&fit=crop', color: '#00693E'
  },
  {
    id: 'p12', code: 'ATL-SPW-0002', name: "Men's Performance Track Jacket", category: 'sportswear',
    leagueSlug: null, team: 'Atlas', price: 64, gender: 'male',
    tags: ['Training', 'Track Jacket'], sizes: ['S', 'M', 'L', 'XL'], stock: 3, rating: 4.5, reviewCount: 27,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=800&auto=format&fit=crop', color: '#0B0D10'
  },
];

export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  text: string;
  photo?: string;
  date: string;
};

export const reviews: Review[] = [
  { id: 'r1', productId: 'p1', author: 'Karim H.', rating: 5, text: 'Fabric quality is way better than I expected for the price. Fit true to size.', date: '2026-06-02' },
  { id: 'r2', productId: 'p1', author: 'Tarek S.', rating: 4, text: 'Great shirt, badge could be stitched a bit tighter but overall very happy.', date: '2026-05-18' },
  { id: 'r3', productId: 'p3', author: 'Yara M.', rating: 5, text: 'Delivery was fast and the shirt looks exactly like the photos.', date: '2026-06-10' },
];

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'delivered';

export type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: { productId: string; name: string; qty: number; size: string; price: number }[];
  channel: 'website' | 'instagram' | 'whatsapp';
  paymentMethod: 'Whish Pay' | 'OMT' | 'Card' | 'Cash on Delivery';
  customer: string;
  address: string;
};

export const orders: Order[] = [
  {
    id: 'ATL-10234', date: '2026-07-01', status: 'shipped', total: 178, channel: 'website',
    paymentMethod: 'Whish Pay', customer: 'Ali D.', address: 'Saida, Lebanon',
    items: [{ productId: 'p1', name: 'Real Madrid Home Shirt 25/26', qty: 2, size: 'L', price: 89 }],
  },
  {
    id: 'ATL-10233', date: '2026-06-28', status: 'delivered', total: 55, channel: 'instagram',
    paymentMethod: 'Cash on Delivery', customer: 'Hassan Z.', address: 'Beirut, Lebanon',
    items: [{ productId: 'p11', name: 'Nejmeh SC Home Shirt', qty: 1, size: 'M', price: 55 }],
  },
  {
    id: 'ATL-10232', date: '2026-06-25', status: 'confirmed', total: 92, channel: 'website',
    paymentMethod: 'OMT', customer: 'Lea F.', address: 'Jounieh, Lebanon',
    items: [{ productId: 'p3', name: 'Man City Home Shirt 25/26', qty: 1, size: 'M', price: 92 }],
  },
  {
    id: 'ATL-10231', date: '2026-06-20', status: 'placed', total: 64, channel: 'whatsapp',
    paymentMethod: 'Cash on Delivery', customer: 'Omar K.', address: 'Tripoli, Lebanon',
    items: [{ productId: 'p12', name: "Men's Performance Track Jacket", qty: 1, size: 'L', price: 64 }],
  },
];

export const zeroResultSearches = [
  { term: 'Marseille shirt', count: 14 },
  { term: 'kids size shin pads', count: 9 },
  { term: 'Al Ahed jersey', count: 7 },
];

export const usdToLbp = 89500; // placeholder FX rate, wire to a live rate source in production

export function formatCurrency(usd: number, currency: 'USD' | 'LBP') {
  if (currency === 'USD') return `$${usd.toFixed(2)}`;
  return `${Math.round(usd * usdToLbp).toLocaleString()} LBP`;
}
