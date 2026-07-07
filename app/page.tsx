import Hero from '@/components/Hero';
import CategorySlider from '@/components/CategorySlider';
import ProductRail from '@/components/ProductRail';
import { StatsBand, TrustBadges, Testimonials, FaqSection, NewsletterSignup } from '@/components/SocialProof';
import { getProducts, getTopReviews } from '@/lib/data';

export default async function HomePage() {
  const products = await getProducts();
  const topReviews = await getTopReviews();
  const hot = products.filter(p => p.hot);
  const newest = [...products].slice(-4);
  const mostSearched = products.filter(p => p.reviewCount > 50);

  return (
    <main>
      <Hero />
      <StatsBand />
      <CategorySlider />
      <ProductRail title="Hot Right Now" subtitle="What's flying off the shelf this week" products={hot} />
      <ProductRail title="Just Dropped" subtitle="The newest arrivals across every league" products={newest} />

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-pitch text-chalk p-10 md:p-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-volt text-xs uppercase tracking-widest2">General Sportswear</span>
            <h2 className="font-display text-4xl mt-3 leading-tight">Off the pitch,<br />still on brand.</h2>
            <p className="text-chalk/70 mt-4 max-w-sm">
              Training hoodies, track jackets, and everyday sportswear for men and women — built for Lebanon's weather, styled for the terrace.
            </p>
            <a href="/shop/sportswear" className="inline-block mt-6 bg-volt text-ink px-6 py-3 rounded-full text-sm font-medium">
              Shop sportswear
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square rounded-2xl bg-white/10" />
            <div className="aspect-square rounded-2xl bg-white/10 mt-6" />
          </div>
        </div>
      </section>

      {mostSearched.length > 0 && (
        <ProductRail title="Most Searched" subtitle="What everyone's looking for right now" products={mostSearched} />
      )}

      <Testimonials reviews={topReviews} />
      <TrustBadges />
      <FaqSection />
      <NewsletterSignup />
    </main>
  );
}
