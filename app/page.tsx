import Hero from '@/components/Hero';
import CategorySlider from '@/components/CategorySlider';
import ProductRail from '@/components/ProductRail';
import RetroPromo from '@/components/RetroPromo';
import UnderConstructionBanner from '@/components/UnderConstructionBanner';
import { StatsBand, TrustBadges, Testimonials, FaqSection, NewsletterSignup } from '@/components/SocialProof';
import { getProducts, getTopReviews, getSiteSettings } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function HomePage() {
  const products = await getProducts();
  const topReviews = await getTopReviews();
  const settings = await getSiteSettings();
  const hot = products.filter(p => p.hot);
  const newest = [...products].slice(-4);
  const mostSearched = products.filter(p => p.reviewCount > 50);
  const retro = products.filter(p => p.tags.some(tag => tag.toLowerCase() === 'retro'));

  // Fetch hero slides saved by owner/manager — falls back to defaults in HeroSlideshow
  let heroSlides: any[] | undefined;
  if (HAS_SUPABASE) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'hero_slides').single();
      if (data?.value) heroSlides = JSON.parse(data.value);
    } catch { /* no slides saved yet, use defaults */ }
  }

  return (
    <main>
      <UnderConstructionBanner instagramHandle={settings.instagramHandle} />
      <Hero slides={heroSlides} />
      <StatsBand />
      <CategorySlider />
      <ProductRail titleKey="home.hotTitle" subtitleKey="home.hotSubtitle" products={hot} />
      <ProductRail titleKey="home.justDroppedTitle" subtitleKey="home.justDroppedSubtitle" products={newest} showNewBadge />

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
