import { searchProducts, getProducts, getLeagues } from '@/lib/data';
import SearchClient from './SearchClient';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? '').trim();
  // If there's a query, start from search results; otherwise the whole catalog,
  // so the filters are useful even with no search term.
  const base = q ? await searchProducts(q) : await getProducts();
  const leagues = await getLeagues();

  return <SearchClient query={q} products={base} leagues={leagues.map(l => ({ slug: l.slug, name: l.name }))} />;
}
