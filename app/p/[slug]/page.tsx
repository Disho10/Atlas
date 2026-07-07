import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

type Block = { type: string; content?: string; src?: string; align?: string; bg?: string };

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!HAS_SUPABASE) return notFound();

  const supabase = await createClient();
  const { data: page } = await supabase
    .from('custom_pages')
    .select('title, blocks, published')
    .eq('slug', slug)
    .single();

  if (!page || !page.published) return notFound();

  const blocks: Block[] = page.blocks ?? [];

  return (
    <main>
      {blocks.map((b, i) => (
        <BlockRenderer key={i} block={b} />
      ))}
    </main>
  );
}

function BlockRenderer({ block: b }: { block: Block }) {
  switch (b.type) {
    case 'heading':
      return (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h2 className="font-display text-4xl md:text-5xl leading-tight">{b.content}</h2>
        </div>
      );

    case 'text':
      return (
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-lg leading-relaxed whitespace-pre-line">{b.content}</p>
        </div>
      );

    case 'image':
      return b.src ? (
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* eslint-disable @next/next/no-img-element */}
          <img src={b.src} alt="" className="w-full rounded-2xl" />
        </div>
      ) : null;

    case 'logo':
      return b.src ? (
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-center">
          <img src={b.src} alt="" className="max-h-32 object-contain" />
        </div>
      ) : null;

    case 'banner':
      return (
        <div
          className="relative overflow-hidden py-20 px-6 text-center text-white"
          style={{
            background: b.src ? `url(${b.src}) center/cover no-repeat` : (b.bg ?? '#0B0D10'),
          }}
        >
          {b.src && <div className="absolute inset-0 bg-black/50" />}
          <h2 className="relative z-10 font-display text-4xl md:text-5xl max-w-3xl mx-auto leading-tight">{b.content}</h2>
        </div>
      );

    case 'spacer':
      return <div className="h-12" />;

    default:
      return null;
  }
}
