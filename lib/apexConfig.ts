// ---------------------------------------------------------------------------
// APEX SHOWCASE CONFIG — the full-screen mid-scroll section on the homepage.
// Stored as one JSON row in site_settings under 'apex_showcase' (same
// pattern as 'hero_slides'), editable by Owner/Manager in the admin panel.
// Every visual aspect of the section is controlled from here.
// ---------------------------------------------------------------------------

export type ApexConfig = {
  enabled: boolean;
  word: string;          // giant background word
  headline: string;      // left-column header (use \n for a line break)
  body: string;          // left-column copy
  imageUrl: string;      // '' = use the featured hot product's photo
  imageCutout: boolean;  // true = transparent PNG: frameless, 3D-tilt, floating shadow
  productId: string;     // '' = link the image to /search; else /product/<id>
  ctaLabel: string;
  priceLine: string;     // caption under the image; '' = auto from the product
};

export const DEFAULT_APEX: ApexConfig = {
  enabled: true,
  word: 'APEX',
  headline: 'Find your\napex.',
  body: 'Match-grade kits built for pace. Breathable, featherweight fabric that moves when you do — checked piece by piece before it ships.',
  imageUrl: '',
  imageCutout: false,
  productId: '',
  ctaLabel: 'See all products →',
  priceLine: '',
};

// Merge a stored (possibly partial / older-shaped) JSON value over the
// defaults so newly-added fields never come back undefined.
export function parseApexConfig(raw: string | null | undefined): ApexConfig {
  if (!raw) return DEFAULT_APEX;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_APEX, ...parsed };
  } catch {
    return DEFAULT_APEX;
  }
}
