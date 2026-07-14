// Site-wide operational settings the owner/manager can edit from
// Admin → Store Settings, instead of these being hardcoded across the
// codebase (the WhatsApp number alone was duplicated in 6 files before
// this existed — change it once here, not once per file + a redeploy).
export type SiteSettings = {
  whatsappNumber: string;      // digits only, no +, no spaces — used to build wa.me links
  freeShippingThreshold: number; // USD
  deliveryEstimateText: string;
  businessHours: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsappNumber: '96181752873',
  freeShippingThreshold: 110,
  deliveryEstimateText: '2–4 business days',
  businessHours: 'Sun–Fri, 9am–7pm Beirut time',
};

const KEY_MAP: Record<keyof SiteSettings, string> = {
  whatsappNumber: 'whatsapp_number',
  freeShippingThreshold: 'free_shipping_threshold',
  deliveryEstimateText: 'delivery_estimate_text',
  businessHours: 'business_hours',
};

// Takes the raw { key, value }[] rows straight from `site_settings` (same
// shape already fetched in app/admin/page.tsx) and merges them over the
// defaults — any key not yet set in the DB just falls back silently.
export function parseSiteSettings(rows: { key: string; value: string }[] | null | undefined): SiteSettings {
  const byKey = new Map((rows ?? []).map(r => [r.key, r.value]));
  return {
    whatsappNumber: byKey.get(KEY_MAP.whatsappNumber) || DEFAULT_SETTINGS.whatsappNumber,
    freeShippingThreshold: Number(byKey.get(KEY_MAP.freeShippingThreshold)) || DEFAULT_SETTINGS.freeShippingThreshold,
    deliveryEstimateText: byKey.get(KEY_MAP.deliveryEstimateText) || DEFAULT_SETTINGS.deliveryEstimateText,
    businessHours: byKey.get(KEY_MAP.businessHours) || DEFAULT_SETTINGS.businessHours,
  };
}

export function settingDbKey(key: keyof SiteSettings): string {
  return KEY_MAP[key];
}

export function whatsappLink(whatsappNumber: string, text?: string): string {
  return `https://wa.me/${whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
