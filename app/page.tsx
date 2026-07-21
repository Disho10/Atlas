import Hero from '@/components/Hero';
import CategorySlider from '@/components/CategorySlider';
import ProductRail from '@/components/ProductRail';
import LeagueSpotlight from '@/components/LeagueSpotlight';
import BrandStory from '@/components/BrandStory';
import ApexShowcase from '@/components/ApexShowcase';
import { DEFAULT_APEX, parseApexConfig } from '@/lib/apexConfig';
import RetroPromo from '@/components/RetroPromo';
import UnderConstructionBanner from '@/components/UnderConstructionBanner';
import { StatsBand, TrustBadges, Testimonials, FaqSection, NewsletterSignup } from '@/components/SocialProof';
import { getProducts, getTopReviews, getSiteSettings, getLeagues } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// Leagues to feature with their own product spotlight on the homepage.
// Matches the design handoff's request; easy to extend to more leagues
// later since LeagueSpotlight just takes a League + its products.
const SPOTLIGHT_LEAGUE_SLUGS = ['la-liga', 'premier-league'];

export default async function HomePage() {
  const products = await getProducts();
  const topReviews = await getTopReviews();
  const settings = await getSiteSettings();
  const allLeagues = await getLeagues();
  const hot = products.filter(p => p.hot);
  // 8 newest instead of 4 — this rail is now a horizontal scroller, and with
  // only 4 items it would never overflow enough for the arrows to appear.
  const newest = [...products].slice(-8).reverse();
  const mostSearched = products.filter(p => p.reviewCount > 50);
  const retro = products.filter(p => p.tags.some(tag => tag.toLowerCase() === 'retro'));

  const spotlightLeagues = SPOTLIGHT_LEAGUE_SLUGS
    .map(slug => allLeagues.find(l => l.slug === slug))
    .filter((l): l is NonNullable<typeof l> => l != null);
  const spotlightProducts = await Promise.all(
    spotlightLeagues.map(l => getProducts({ leagueSlug: l.slug }))
  );

  // Fetch hero slides saved by owner/manager — falls back to defaults in HeroSlideshow
  let heroSlides: any[] | undefined;
  let apexConfig = DEFAULT_APEX;
  if (HAS_SUPABASE) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from('site_settings').select('key, value').in('key', ['hero_slides', 'apex_showcase']);
      const heroRow = data?.find(r => r.key === 'hero_slides');
      if (heroRow?.value) heroSlides = JSON.parse(heroRow.value);
      apexConfig = parseApexConfig(data?.find(r => r.key === 'apex_showcase')?.value);
    } catch { /* nothing saved yet, use defaults */ }
  }

  return (
    <main>
      <UnderConstructionBanner instagramHandle={settings.instagramHandle} />
      <Hero slides={heroSlides} />
      <StatsBand />
      <CategorySlider />
      <ProductRail titleKey="home.hotTitle" subtitleKey="home.hotSubtitle" products={hot} />
      <ProductRail titleKey="home.justDroppedTitle" subtitleKey="home.justDroppedSubtitle" products={newest} showNewBadge layout="scroll" />

      {spotlightLeagues.map((league, i) => (
        <LeagueSpotlight key={league.slug} league={league} products={spotlightProducts[i]} />
      ))}

      <BrandStory image={settings.brandStoryImage} />

      {apexConfig.enabled && (
        <ApexShowcase config={apexConfig} product={hot[0] ?? newest[0]} instagramHandle={settings.instagramHandle} whatsappNumber={settings.whatsappNumber} />
      )}

      <RetroPromo products={retro} />

      {mostSearched.length > 0 && (
        <ProductRail titleKey="home.mostSearchedTitle" subtitleKey="home.mostSearchedSubtitle" products={mostSearched} />
      )}

      <Testimonials reviews={topReviews} />
      <TrustBadges />
      <FaqSection />
      <NewsletterSignup />
    </main>
  );
}
