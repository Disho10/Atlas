import { instagramLink } from '@/lib/settings';

// Temporary notice while the site's still being finished — orders/questions
// route to Instagram instead of checkout for now. To remove once the site's
// ready: delete the <UnderConstructionBanner /> line in app/page.tsx, that's
// the only place this is used.
export default function UnderConstructionBanner({ instagramHandle }: { instagramHandle: string }) {
  return (
    <div className="bg-crimson text-white text-center px-4 py-3 text-sm font-medium">
      Still under construction — to order or ask a question, please contact us on{' '}
      <a
        href={instagramLink(instagramHandle)}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        Instagram (@{instagramHandle})
      </a>
      .
    </div>
  );
}
