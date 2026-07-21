// ---------------------------------------------------------------------------
// APEX SHOWCASE CONFIG — the full-screen mid-scroll section on the homepage.
// Stored as one JSON row in site_settings under 'apex_showcase' (same
// pattern as 'hero_slides'), editable by Owner/Manager in the admin panel.
// Every visual aspect of the section is controlled from here.
// ---------------------------------------------------------------------------

export type ApexColorSwatch = {
  hex: string;          // swatch color AND the section background when selected
  label: string;        // e.g. "Volt" or "Home Red" — accessible name only
  productId?: string;   // set only in 'products' color mode — see colorMode below
  imageUrl?: string;    // this color's own picture; '' = fall back to productId's photo, then the section's default image
  imageCutout?: boolean; // true = render imageUrl as a frameless transparent-PNG cutout, like the section-level toggle
};

export type ApexConfig = {
  enabled: boolean;
  eyebrow: string;       // tiny label above the headline, e.g. "New drop"; '' = hidden
  word: string;          // giant background word
  headline: string;      // left-column header (use \n for a line break)
  body: string;          // left-column copy
  imageUrl: string;      // '' = use the featured hot product's photo
  imageCutout: boolean;  // true = transparent PNG: frameless, 3D-tilt, floating shadow
  productId: string;     // '' = link the image to /search; else /product/<id>
  ctaLabel: string;
  priceLine: string;     // caption under the image; '' = auto from the product

  // --- Color swatches -------------------------------------------------
  // 'brand'    — the 3 curated Atlas presets (Volt / Crimson / Night), zero config
  // 'custom'   — colors set below, e.g. to match a campaign or a league
  // 'products' — colors ARE this season's real jersey colors: each swatch
  //              is a chosen product's actual `color`, and clicking one
  //              swaps the whole showcase (image, name, price, link) to
  //              that product. This is the literal "color variants of the
  //              products" mode.
  colorMode: 'brand' | 'custom' | 'products';
  customColors: ApexColorSwatch[];   // used when colorMode === 'custom'
  colorProductIds: string[];         // used when colorMode === 'products', ordered, max 5
  colorOverrides: Record<string, string>;
  // ^ optional — keyed by product id, only for colorMode === 'products'.
  // Without an entry, a product swatch's dot + section background use
  // that product's own catalog `color` field (the sensible default). Set
  // one to show a different color for that swatch instead — e.g. the
  // catalog color is the literal fabric hex but you want the swatch/
  // background to read as a punchier brand tone. The photo, name, price,
  // and link still come from the real product either way.
  productImageOverrides: Record<string, { imageUrl: string; imageCutout: boolean }>;
  // ^ optional — keyed by product id, only for colorMode === 'products'.
  // Without an entry here, a product swatch just uses that product's own
  // catalog photo (the sensible default). Set one to show a different
  // picture (e.g. a nicer cutout PNG) for that color instead.

  // --- Layout / motion --------------------------------------------------
  sizeLabels: string[];   // default S/M/L — edit freely, e.g. shoe sizes if that's ever sold
  showNav: boolean;       // mini nav bar (logo, links, Place Order pill)
  showSocial: boolean;    // bottom-left Instagram/WhatsApp icons
  showVariantPicker: boolean; // "Choose your set" — Jersey vs Jersey + Shorts etc, from the active product's own variants
  tiltDeg: number;        // base product rotation before pointer tilt is added, degrees
};

export const DEFAULT_APEX: ApexConfig = {
  enabled: true,
  eyebrow: '',
  word: 'APEX',
  headline: 'Find your\napex.',
  body: 'Match-grade kits built for pace. Breathable, featherweight fabric that moves when you do — checked piece by piece before it ships.',
  imageUrl: '',
  imageCutout: false,
  productId: '',
  ctaLabel: 'See all products →',
  priceLine: '',
  colorMode: 'brand',
  customColors: [],
  colorProductIds: [],
  colorOverrides: {},
  productImageOverrides: {},
  sizeLabels: ['S', 'M', 'L'],
  showNav: true,
  showSocial: true,
  showVariantPicker: true,
  tiltDeg: -8,
};

// The 3 curated presets used when colorMode === 'brand'. Each carries the
// full contrast-safe palette (fg/pill/mark) that was hand-picked for it —
// custom/product colors instead get their contrast computed automatically
// at render time (see contrastFor() in ApexShowcase.tsx), since there's no
// way to hand-curate an admin's arbitrary hex choice in advance.
export const BRAND_PRESETS: { hex: string; label: string }[] = [
  { hex: '#D6FF3F', label: 'Volt' },
  { hex: '#E63946', label: 'Crimson' },
  { hex: '#12224E', label: 'Night' },
];

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
