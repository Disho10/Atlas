'use client';

import { useState } from 'react';
import ProductImage from '@/components/ProductImage';
import { Product, Review, formatCurrency } from '@/lib/mockData';
import { useCart, useCurrency, useWishlist } from '@/components/Providers';
import { createClient } from '@/lib/supabase/client';
import { HeartIcon, CheckIcon } from '@/components/icons';

export default function ProductDetail({ product, initialReviews }: { product: Product; initialReviews: Review[] }) {
  const { add } = useCart();
  const { currency } = useCurrency();
  const { ids, toggle } = useWishlist();
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPhoto, setReviewPhoto] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const outOfStock = size ? product.outOfStockSizes?.includes(size) : false;
  const wished = ids.includes(product.id);

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
      if (uploadData) {
        photoUrl = supabase.storage.from('review-photos').getPublicUrl(uploadData.path).data.publicUrl;
      }
    }

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const authorName = profile?.full_name || 'You';
      const { error } = await supabase.from('reviews').insert({
        product_id: product.id,
        user_id: user.id,
        author_name: authorName,
        rating: reviewRating,
        body: reviewText,
        photo_url: photoUrl,
      });
      if (!error) {
        setReviews(r => [
          { id: `local-${Date.now()}`, productId: product.id, author: authorName, rating: reviewRating, text: reviewText, photo: photoUrl, date: new Date().toISOString().slice(0, 10) },
          ...r,
        ]);
        setReviewText('');
        setReviewPhoto(null);
      }
    } else {
      // Not signed in — Supabase RLS requires an owning user, so this stays local-only.
      // The UI still shows it was received; encourage sign-in for it to persist.
      setReviews(r => [
        { id: `local-${Date.now()}`, productId: product.id, author: 'You (sign in to save)', rating: reviewRating, text: reviewText, date: new Date().toISOString().slice(0, 10) },
        ...r,
      ]);
      setReviewText('');
    }
    setPosting(false);
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5">
        {product.image && <ProductImage src={product.image} alt={product.name} fill className="object-cover" />}
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest2 text-steel">{product.team}</p>
        <h1 className="font-display text-4xl mt-2">{product.name}</h1>

        <div className="flex items-center gap-2 mt-3 text-sm">
          <Stars rating={product.rating} />
          <span className="text-steel">{product.reviewCount} reviews</span>
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-2xl font-semibold tabular">{formatCurrency(product.price, currency)}</span>
          {product.compareAt && <span className="text-steel line-through tabular">{formatCurrency(product.compareAt, currency)}</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {product.tags.map(t => (
            <span key={t} className="text-xs border border-black/10 dark:border-white/20 rounded-full px-3 py-1 text-steel">{t}</span>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(s => {
              const disabled = product.outOfStockSizes?.includes(s);
              return (
                <button
                  key={s}
                  disabled={disabled}
                  onClick={() => setSize(s)}
                  className={`w-12 h-12 rounded-full border text-sm flex items-center justify-center
                    ${size === s ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}
                    ${disabled ? 'opacity-30 line-through cursor-not-allowed' : ''}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          {product.comingSoon ? (
            <button className="flex-1 bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full py-3.5 font-medium">
              Preorder — ships soon
            </button>
          ) : (
            <button
              disabled={!!outOfStock}
              onClick={() => { if (size) { add(product, size); setAdded(true); setTimeout(() => setAdded(false), 1600); } }}
              className="flex-1 bg-volt text-ink rounded-full py-3.5 font-medium disabled:opacity-40"
            >
              {outOfStock ? 'Out of stock in this size' : added ? (
                <span className="inline-flex items-center gap-1.5">Added to cart <CheckIcon className="w-4 h-4" /></span>
              ) : 'Add to cart'}
            </button>
          )}
          <button
            onClick={() => toggle(product.id)}
            className="w-14 h-14 rounded-full border border-black/15 dark:border-white/20 flex items-center justify-center shrink-0"
            aria-label="Toggle wishlist"
          >
            <HeartIcon filled={wished} className={`w-5 h-5 ${wished ? 'text-crimson' : ''}`} />
          </button>
        </div>

        {product.stock > 0 && product.stock <= 6 && !product.comingSoon && (
          <p className="text-xs text-crimson mt-3">Only {product.stock} left — low stock</p>
        )}

        <div className="mt-14 border-t border-black/10 dark:border-white/10 pt-8">
          <h2 className="font-display text-xl mb-4">Reviews</h2>
          <div className="space-y-4 mb-6">
            {reviews.length === 0 && <p className="text-sm text-steel">No reviews yet — be the first.</p>}
            {reviews.map(r => (
              <div key={r.id} className="text-sm border-b border-black/5 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="font-medium">{r.author}</span>
                  <span className="text-steel text-xs">{r.date}</span>
                </div>
                <p className="mt-1 text-steel">{r.text}</p>
                {r.photo && <img src={r.photo} alt="Review photo" className="mt-2 w-24 h-24 object-cover rounded-lg" />}
              </div>
            ))}
          </div>

          <form onSubmit={submitReview} className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n} onClick={() => setReviewRating(n)} className={n <= reviewRating ? 'text-volt' : 'text-steel'}>★</button>
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
              <button type="submit" disabled={posting} className="text-sm bg-ink text-chalk dark:bg-chalk dark:text-ink rounded-full px-5 py-2 disabled:opacity-50">
                {posting ? 'Posting…' : 'Post review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
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
