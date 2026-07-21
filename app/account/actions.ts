'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { pointsToDiscount, isValidRedemption } from '@/lib/loyalty';
import { checkRateLimit } from '@/lib/rate-limit';

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
// LOYALTY REDEMPTION — preview a discount for a points amount
// 100 pts = $5 off (rate below). Redemption never lowers lifetime/tier.
//
// IMPORTANT: this only validates and previews — it never deducts points.
// Points are deducted atomically inside place_order() at checkout, once an
// order actually exists (same pattern as validatePromo() below). A previous
// version of this function deducted points immediately and told the
// customer to "use it at checkout," but place_order() had no way to accept
// or apply that discount — the points were simply lost. See
// 0011_loyalty_redemption_and_referral_fix.sql.
// ---------------------------------------------------------------------------
export async function previewLoyaltyRedemption(points: number): Promise<{ ok: true; discountUsd: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  if (!isValidRedemption(points)) return { ok: false, error: 'Redeem in multiples of 100 points.' };

  const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', user.id).single();
  if (!profile || profile.loyalty_points < points) return { ok: false, error: 'Not enough points.' };

  return { ok: true, discountUsd: pointsToDiscount(points) };
}

// ---------------------------------------------------------------------------
// LOYALTY BALANCE — how many points the signed-in user has to redeem
// ---------------------------------------------------------------------------
export async function getLoyaltyBalance(): Promise<{ points: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { points: 0 };
  const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', user.id).single();
  return { points: profile?.loyalty_points ?? 0 };
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

  const allowed = await checkRateLimit('validate_promo', 20, 60);
  if (!allowed) return { ok: false, error: 'Too many attempts — please wait a minute and try again.' };

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

// ---------------------------------------------------------------------------
// REFEREE WELCOME — how much off the current user's first order (referred users)
// ---------------------------------------------------------------------------
export async function getRefereeWelcome(): Promise<{ discountUsd: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { discountUsd: 0 };
  const { data } = await supabase.rpc('referee_welcome_discount', { p_user: user.id });
  return { discountUsd: Number(data ?? 0) };
}

// ---------------------------------------------------------------------------
// SIGNUP WELCOME — 10% off any signed-in customer's first order (not tied to
// referrals; stacks with the referee welcome above if both apply). Server
// re-validates and re-computes this again inside place_order() regardless —
// this is only for showing the number at checkout before submitting.
// ---------------------------------------------------------------------------
export async function getSignupWelcome(subtotalUsd: number): Promise<{ discountUsd: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { discountUsd: 0 };
  const { data } = await supabase.rpc('signup_welcome_discount', { p_user: user.id, p_subtotal: subtotalUsd });
  return { discountUsd: Number(data ?? 0) };
}
