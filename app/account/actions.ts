'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// SETTINGS — update own profile (name, phone, birthday, notification prefs)
// ---------------------------------------------------------------------------
export async function updateSettings(input: {
  full_name: string;
  phone: string;
  birthday: string | null;
  notify_new_categories: boolean;
  notify_tag_matches: boolean;
  notify_order_updates: boolean;
  notify_rewards: boolean;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase.from('profiles').update({
    full_name: input.full_name.trim() || null,
    phone: input.phone.trim() || null,
    birthday: input.birthday || null,
    notify_new_categories: input.notify_new_categories,
    notify_tag_matches: input.notify_tag_matches,
    notify_order_updates: input.notify_order_updates,
    notify_rewards: input.notify_rewards,
  }).eq('id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/account/settings');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// NEWSLETTER — subscribe (works for guests and signed-in users)
// ---------------------------------------------------------------------------
export async function subscribeNewsletter(email: string, source = 'footer'): Promise<Result> {
  const clean = email.trim().toLowerCase();
  if (!clean.includes('@')) return { ok: false, error: 'Enter a valid email.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('newsletter_subscribers').insert({
    email: clean, user_id: user?.id ?? null, source,
  });
  // Unique-violation just means they're already subscribed — treat as success.
  if (error && !error.message.toLowerCase().includes('duplicate')) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// TAG CLICKS — record a tag the user showed interest in (for related emails)
// ---------------------------------------------------------------------------
export async function logTagClick(tag: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // only tracked for signed-in users
  await supabase.from('tag_clicks').insert({ user_id: user.id, tag });
}

// ---------------------------------------------------------------------------
// LOYALTY REDEMPTION — spend points for a discount
// 100 pts = $5 off (rate below). Redemption never lowers lifetime/tier.
// ---------------------------------------------------------------------------
const POINTS_PER_DOLLAR = 20; // 100 pts -> $5

export async function redeemPoints(points: number): Promise<{ ok: true; discountUsd: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  if (points < 100 || points % 100 !== 0) return { ok: false, error: 'Redeem in multiples of 100 points.' };

  const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', user.id).single();
  if (!profile || profile.loyalty_points < points) return { ok: false, error: 'Not enough points.' };

  const { error } = await supabase.rpc('apply_loyalty', {
    p_user: user.id, p_delta: -points, p_reason: 'redemption', p_order: null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/account/loyalty');
  return { ok: true, discountUsd: points / POINTS_PER_DOLLAR };
}

// ---------------------------------------------------------------------------
// PROMO CODE — validate a code at checkout (match-day promos etc.)
// ---------------------------------------------------------------------------
export async function validatePromo(code: string, subtotalUsd: number): Promise<
  { ok: true; discountUsd: number; description: string } | { ok: false; error: string }
> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: 'Enter a code.' };

  const supabase = await createClient();
  const { data: promo } = await supabase.from('promo_codes').select('*').eq('code', clean).eq('active', true).single();
  if (!promo) return { ok: false, error: 'That code isn\'t valid.' };

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) return { ok: false, error: 'This code isn\'t active yet.' };
  if (promo.ends_at && new Date(promo.ends_at) < now) return { ok: false, error: 'This code has expired.' };
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) return { ok: false, error: 'This code has reached its limit.' };
  if (subtotalUsd < Number(promo.min_subtotal_usd)) {
    return { ok: false, error: `Spend at least $${promo.min_subtotal_usd} to use this code.` };
  }

  const discount = promo.kind === 'percent'
    ? (subtotalUsd * Number(promo.amount)) / 100
    : Number(promo.amount);

  return { ok: true, discountUsd: Math.min(discount, subtotalUsd), description: promo.description ?? clean };
}
