import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getProductById, getReviews, getProducts } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import ProductDetail from '@/components/ProductDetail';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// Staff-only preview of a product (including unpublished drafts) rendered
// exactly as the live product page will look. Gated to staff so drafts never
// leak publicly. Reuses the real ProductDetail component so the preview is
// truly what customers will see — no separate mock layout to drift out of sync.
export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (HAS_SUPABASE) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/sign-in?next=/admin/preview/${id}`);
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = (profile as any)?.role;
    if (!role || !['admin', 'manager', 'owner'].includes(role)) {
      redirect('/'); // not staff — no draft peeking
    }
  }

  const product = await getProductById(id, { includeUnpublished: true });
  if (!product) return notFound();

  const reviews = await getReviews(product.id);
  const pool = product.leagueSlug
    ? await getProducts({ leagueSlug: product.leagueSlug })
    : await getProducts({ category: product.category });
  let related = pool.filter(p => p.id !== product.id);
  if (related.length < 4) {
    const all = await getProducts();
    const extra = all.filter(p => p.id !== product.id && !related.some(r => r.id === p.id));
    related = [...related, ...extra].slice(0, 4);
  }

  const isDraft = product.status === 'draft';

  return (
    <>
      {/* Preview banner — makes it unmistakable this is a staff preview */}
      <div className="sticky top-0 z-40 bg-crimson text-white text-sm">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <span className="font-medium">
            Preview{isDraft ? ' · this product is a DRAFT (hidden from the store)' : ' · this product is live'}
          </span>
          <Link href="/admin" className="underline underline-offset-2 shrink-0">Back to Staff Panel</Link>
        </div>
      </div>
      <ProductDetail product={product} initialReviews={reviews} related={related} />
    </>
  );
}
