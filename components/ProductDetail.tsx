'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product, Review, formatCurrency } from '@/lib/mockData';
import { useCart, useCurrency, useWishlist } from '@/components/Providers';
import { createClient } from '@/lib/supabase/client';
import { HeartIcon, CheckIcon } from '@/components/icons';
import ProductImage from '@/components/ProductImage';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Motion';

export default function ProductDetail({ product, initialReviews, related }: { product: Product; initialReviews: Review[]; related: Product[] }) {
  const { add } = useCart();
  const { currency } = useCurrency();
  const { ids, toggle } = useWishlist();
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('details');
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPhoto, setReviewPhoto] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const outOfStock = size ? product.outOfStockSizes?.includes(size) : false;
  const wished = ids.includes(product.id);
  const lowStock = product.stock > 0 && product.stock <= 6;

  const addToCart = () => {
    if (!size) return;
    for (let i = 0; i < qty; i++) add(product, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setPosting(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    let photoUrl: string | undefined;
    if (reviewPhoto && user) {
      const path = `${product.id}/${Date.now()}-${reviewPhoto.name}`;
      const { data: uploadData } = await supabase.storage.from('review-photos').upload(path, reviewPhoto);
      if (uploadData) photoUrl = supabase.storage.from('review-photos').getPublicUrl(uploadData.path).data.publicUrl;
    }

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const authorName = (profile as any)?.full_name || 'You';
      const { error } = await supabase.from('reviews').insert({
        product_id: product.id, user_id: user.id, author_name: authorName,
        rating: reviewRating, body: reviewText, photo_url: photoUrl,
      });
      if (!error) {
        setReviews(r => [{ id: `local-${Date.now()}`, productId: product.id, author: authorName, rating: reviewRating, text: reviewText, photo: photoUrl, date: new Date().toISOString().slice(0, 10) }, ...r]);
        setReviewText(''); setReviewPhoto(null);
      }
    } else {
      setReviews(r => [{ id: `local-${Date.now()}`, productId: product.id, author: 'You (sign in to save)', rating: reviewRating, text: reviewText, date: new Date().toISOString().slice(0, 10) }, ...r]);
      setReviewText('');
    }
    setPosting(false);
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-steel mb-6 flex items-center gap-2">
        <Link href="/" className="hover:opacity-70">Home</Link>
        <span>/</span>
        {product.leagueSlug
          ? <Link href={`/leagues/${product.leagueSlug}`} className="hover:opacity-70 capitalize">{product.leagueSlug.replace(/-/g, ' ')}</Link>
          : <Link href="/shop/sportswear" className="hover:opacity-70">Sportswear</Link>}
        <span>/</span>
        <span className="text-ink dark:text-chalk">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery — sticky on desktop, with thumbnail strip for multiple images */}
        <GalleryBlock product={product} />

        {/* Buy panel */}
        <div>
          <p className="text-xs uppercase tracking-widest2 text-steel">{product.team}</p>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-tight">{product.name}</h1>

          <div className="flex items-center gap-2 mt-3 text-sm">
            <Stars rating={product.rating} />
            <a href="#reviews" className="text-steel hover:underline underline-offset-2">{product.reviewCount} reviews</a>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular">{formatCurrency(product.price, currency)}</span>
            {product.compareAt && (
              <>
                <span className="text-steel line-through tabular">{formatCurrency(product.compareAt, currency)}</span>
                <span className="text-crimson text-sm font-medium">
                  −{Math.round((1 - product.price / product.compareAt) * 100)}%
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {product.tags.map(t => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                onClick={() => { import('@/app/account/actions').then(m => m.logTagClick(t)); }}
                className="text-xs border border-black/10 dark:border-white/20 rounded-full px-3 py-1 text-steel hover:border-ink dark:hover:border-chalk transition-colors"
              >{t}</Link>
            ))}
          </div>

          {/* Size */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Size</p>
              <span className="text-xs text-steel">True to size — order your usual</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map(s => {
                const disabled = product.outOfStockSizes?.includes(s);
                return (
                  <button
                    key={s}
                    disabled={disabled}
                    onClick={() => setSize(s)}
                    className={`min-w-[3rem] h-12 px-3 rounded-full border text-sm flex items-center justify-center btn-press
                      ${size === s ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}
                      ${disabled ? 'opacity-30 line-through cursor-not-allowed' : ''}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity + CTA */}
          <div className="mt-8 flex gap-3 items-stretch">
            <div className="flex items-center border border-black/15 dark:border-white/20 rounded-full shrink-0">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-full" aria-label="Decrease quantity">−</button>
              <span className="w-8 text-center text-sm tabular">{qty}</span>
              <button onClick={() => setQty(q => Math.min(9, q + 1))} className="w-11 h-full" aria-label="Increase quantity">+</button>
            </div>

            {product.comingSoon ? (
              <button className="flex-1 bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full py-4 font-medium btn-press">
                Preorder — ships soon
              </button>
            ) : (
              <button
                disabled={!!outOfStock}
                onClick={addToCart}
                className="flex-1 bg-volt text-ink rounded-full py-4 font-medium disabled:opacity-40 btn-press"
              >
                {outOfStock ? 'Out of stock in this size' : added ? (
                  <span className="inline-flex items-center gap-1.5">Added <CheckIcon className="w-4 h-4" /></span>
                ) : `Add to cart · ${formatCurrency(product.price * qty, currency)}`}
              </button>
            )}
            <button
              onClick={() => toggle(product.id)}
              className="w-14 rounded-full border border-black/15 dark:border-white/20 flex items-center justify-center shrink-0 btn-press"
              aria-label="Toggle wishlist"
            >
              <HeartIcon filled={wished} className={`w-5 h-5 ${wished ? 'text-crimson' : ''}`} />
            </button>
          </div>

          {lowStock && !product.comingSoon && (
            <p className="text-xs text-crimson mt-3">Only {product.stock} left — low stock</p>
          )}

          {/* Delivery reassurance strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-steel">
            <div className="border border-black/10 dark:border-white/10 rounded-xl py-3 px-2">2–4 day delivery</div>
            <div className="border border-black/10 dark:border-white/10 rounded-xl py-3 px-2">Cash on delivery</div>
            <div className="border border-black/10 dark:border-white/10 rounded-xl py-3 px-2">14-day returns</div>
          </div>

          {/* Accordions */}
          <div className="mt-8 divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
            <Accordion id="details" title="Product details" open={openSection} setOpen={setOpenSection}>
              {product.name} — official-style {product.category === 'shirts' ? 'kit' : product.category} for {product.team}.
              Breathable fabric, quality-checked before shipping. Sizes {product.sizes.join(', ')}.
            </Accordion>
            <Accordion id="shipping" title="Shipping & delivery" open={openSection} setOpen={setOpenSection}>
              Same or next-day dispatch. 2–4 days anywhere in Lebanon. Free pickup available in Saida, and free shipping on orders over $100.
            </Accordion>
            <Accordion id="returns" title="Returns & exchanges" open={openSection} setOpen={setOpenSection}>
              14 days from delivery, unworn with tags. Start it from Account → Returns and we handle the rest — exchange or refund, your call.
            </Accordion>
          </div>
        </div>
      </div>

      {/* Customer photo gallery — surfaces review photos prominently */}
      {reviews.some(r => r.photo) && (
        <section className="mt-20">
          <Reveal>
            <h2 className="font-display text-3xl mb-1">Styled by our customers</h2>
            <p className="text-steel text-sm mb-6">Real photos from real orders.</p>
          </Reveal>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {reviews.filter(r => r.photo).map(r => (
              <div key={r.id} className="aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                <img src={r.photo} alt={`Customer photo by ${r.author}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section id="reviews" className="max-w-3xl mt-20 scroll-mt-28">
        <Reveal>
          <h2 className="font-display text-3xl mb-6">Reviews</h2>
        </Reveal>
        <div className="space-y-4 mb-8">
          {reviews.length === 0 && <p className="text-sm text-steel">No reviews yet — be the first.</p>}
          {reviews.map(r => (
            <div key={r.id} className="text-sm border border-black/10 dark:border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <Stars rating={r.rating} />
                <span className="font-medium">{r.author}</span>
                <span className="text-steel text-xs">{r.date}</span>
              </div>
              <p className="mt-2 text-steel leading-relaxed">{r.text}</p>
              {r.photo && <img src={r.photo} alt="Review photo" className="mt-3 w-24 h-24 object-cover rounded-xl" />}
            </div>
          ))}
        </div>

        <form onSubmit={submitReview} className="border border-black/10 dark:border-white/10 rounded-2xl p-5 space-y-3">
          <p className="font-medium text-sm">Write a review</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} onClick={() => setReviewRating(n)} className={`text-lg ${n <= reviewRating ? 'text-volt' : 'text-steel'}`}>★</button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Share how the fit and quality held up..."
            className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl p-3 text-sm"
            rows={3}
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-steel border border-black/15 dark:border-white/20 rounded-full px-3 py-1.5 cursor-pointer">
              {reviewPhoto ? reviewPhoto.name.slice(0, 18) : '+ Add photo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => setReviewPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <button type="submit" disabled={posting} className="text-sm bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full px-5 py-2 disabled:opacity-50 btn-press">
              {posting ? 'Posting…' : 'Post review'}
            </button>
          </div>
        </form>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20">
          <Reveal>
            <h2 className="font-display text-3xl mb-6">You might also like</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            {related.slice(0, 4).map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function GalleryBlock({ product }: { product: Product }) {
  // Combine hero + additional images into one gallery
  const allImages = [product.image, ...product.images].filter(Boolean);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = allImages[activeIdx] || '';

  return (
    <div className="lg:sticky lg:top-28 self-start space-y-3">
      {/* Main image */}
      <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-black/5 dark:bg-white/5 grain">
        {active && <ProductImage key={active} src={active} alt={product.name} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 50vw" />}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
          {product.hot && <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-crimson text-white">Hot</span>}
          {product.comingSoon && <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-ink text-chalk">Coming Soon</span>}
        </div>
        {/* Nav arrows for mobile (touch users can also swipe the thumbnails) */}
        {allImages.length > 1 && (
          <>
            <button onClick={() => setActiveIdx(i => (i - 1 + allImages.length) % allImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/60 text-chalk flex items-center justify-center backdrop-blur" aria-label="Previous image">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button onClick={() => setActiveIdx(i => (i + 1) % allImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/60 text-chalk flex items-center justify-center backdrop-blur" aria-label="Next image">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {allImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-colors ${i === activeIdx ? 'border-volt' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <ProductImage src={src} alt={`View ${i + 1}`} width={64} height={80} className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Accordion({ id, title, open, setOpen, children }: { id: string; title: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <div>
      <button
        onClick={() => setOpen(isOpen ? null : id)}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-medium gap-4"
        aria-expanded={isOpen}
      >
        {title}
        <span className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48 pb-4' : 'max-h-0'}`}>
        <p className="text-steel text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-volt text-sm">
      {'★'.repeat(Math.round(rating))}
      <span className="text-steel">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}
