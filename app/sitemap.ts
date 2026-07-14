import type { MetadataRoute } from 'next';
import { getLeagues, getProducts } from '@/lib/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-pi-jade.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/leagues`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/retro`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/sale`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/search`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/track`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/shipping`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  let leagueRoutes: MetadataRoute.Sitemap = [];
  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    const leagues = await getLeagues();
    leagueRoutes = leagues.map(l => ({
      url: `${siteUrl}/leagues/${l.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const products = await getProducts();
    productRoutes = products.map(p => ({
      url: `${siteUrl}/product/${p.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // Prototype mode (no Supabase configured) — fall back to static routes only.
  }

  return [...staticRoutes, ...leagueRoutes, ...productRoutes];
}
