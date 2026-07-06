/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Restrict to the hosts we actually use rather than a wildcard — the
    // wildcard `**` also carries a known DoS advisory for the image optimizer.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Add your Supabase project's storage host here once you upload real
      // product photos, e.g.:
      // { protocol: 'https', hostname: 'YOUR-PROJECT.supabase.co' },
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
