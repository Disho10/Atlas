import { createClient } from '@/lib/supabase/server';
import { mapProductRow, mapLeagueRow, PUBLIC_PRODUCT_COLUMNS } from '@/lib/supabase/queries';
import {
  products as mockProducts,
  leagues as mockLeagues,
  reviews as mockReviews,
  type Product,
  type League,
  type Review,
} from '@/lib/mockData';

// This file is the single place that decides "real Supabase or mock data".
// Once NEXT_PUBLIC_SUPABASE_URL is set in .env.local, every page automatically
// switches to live data with no further changes needed.
const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// IMPORTANT: when Supabase IS configured, we must NOT silently fall back to the
// full mock catalog on error — that's what made every league show all 12
// products. A failed/filtered query should return an empty list (and log the
// real error to the server console) so problems are visible instead of masked
// by wrong data. Mock data is used ONLY in true prototype mode (no env vars).

export async function getLeagues(): Promise<League[]> {
  if (!HAS_SUPABASE) return mockLeagues;
  const supabase = await createClient();
  const { data, error } = await supabase.from('leagues').select('*').order('sort_order');
  if (error) {
    console.error('[getLeagues] Supabase error:', error.message);
    return [];
  }
  return (data ?? []).map(mapLeagueRow);
}

export async function getProducts(filters?: {
  leagueSlug?: string;
  category?: string;
  gender?: string;
}): Promise<Product[]> {
  if (!HAS_SUPABASE) {
    let items = mockProducts;
    if (filters?.leagueSlug) items = items.filter(p => p.leagueSlug === filters.leagueSlug);
    if (filters?.category && filters.category !== 'all') items = items.filter(p => p.category === filters.category);
    if (filters?.gender && filters.gender !== 'all') items = items.filter(p => p.gender === filters.gender || p.gender === 'unisex');
    return items;
  }

  const supabase = await createClient();
  let query = supabase.from('products').select(`${PUBLIC_PRODUCT_COLUMNS}, product_tags(tags(label))`).eq('status', 'published');
  if (filters?.leagueSlug) query = query.eq('league_slug', filters.leagueSlug);
  if (filters?.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters?.gender && filters.gender !== 'all') query = query.eq('gender', filters.gender);

  const { data, error } = await query;
  if (error) {
    console.error('[getProducts] Supabase error:', error.message, '| filters:', JSON.stringify(filters));
    return [];
  }
  return (data ?? []).map((row: any) => mapProductRow(row));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  if (!HAS_SUPABASE) return mockProducts.find(p => p.id === id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(`${PUBLIC_PRODUCT_COLUMNS}, product_tags(tags(label))`)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getProductById] Supabase error:', error.message, '| id:', id);
    return undefined;
  }
  return data ? mapProductRow(data as any) : undefined;
}

export async function searchProducts(term: string): Promise<Product[]> {
  if (!term.trim()) return [];

  if (!HAS_SUPABASE) {
    const q = term.toLowerCase();
    return mockProducts.filter(
      p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(`${PUBLIC_PRODUCT_COLUMNS}, product_tags(tags(label))`)
    .eq('status', 'published')
    .or(`name.ilike.%${term}%,team.ilike.%${term}%`);

  if (error) {
    console.error('[searchProducts] Supabase error:', error.message, '| term:', term);
    return [];
  }
  const results = (data ?? []).map((row: any) => mapProductRow(row));

  // Log the search for the admin "zero-result searches" analytics view —
  // fire and forget, don't block the response on it.
  supabase.from('search_logs').insert({ term, result_count: results.length }).then(() => {});

  return results;
}

export async function getReviews(productId: string): Promise<Review[]> {
  if (!HAS_SUPABASE) return mockReviews.filter(r => r.productId === productId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, author_name, rating, body, photo_url, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getReviews] Supabase error:', error.message, '| productId:', productId);
    return [];
  }

  return (data ?? []).map(r => ({
    id: r.id,
    productId: r.product_id,
    author: r.author_name,
    rating: r.rating,
    text: r.body,
    photo: r.photo_url ?? undefined,
    date: r.created_at.slice(0, 10),
  }));
}

// Top customer reviews for the homepage testimonials — real words only,
// highest-rated with substantive text. Empty in prototype mode.
export async function getTopReviews(limit = 5): Promise<{ quote: string; name: string }[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('author_name, rating, body')
    .gte('rating', 4)
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? [])
    .filter(r => (r.body ?? '').trim().length >= 20) // substantive only
    .slice(0, limit)
    .map(r => ({ quote: r.body, name: r.author_name || 'Customer' }));
}
