/** @type {import('next').NextConfig} */

// Derive the Supabase storage hostname from the public URL so product/review
// images uploaded to Supabase storage are allowed by the image optimizer
// automatically — no manual host edit needed.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig = {
  images: {
    // Restrict to the hosts we actually use rather than a wildcard — the
    // wildcard `**` also carries a known DoS advisory for the image optimizer.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
    ],
    // Cache optimized images for 24h so repeat visits don't re-fetch/re-encode
    // every external photo (a big part of the slow first loads).
    minimumCacheTTL: 60 * 60 * 24,
    // Next 16 requires explicitly declaring any non-default quality values
    // used by <Image quality={...}> (ProductImage uses 70).
    qualities: [70, 75],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
