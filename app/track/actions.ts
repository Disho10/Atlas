'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// Public order lookups by order number — no login required, since customers
// (especially manual WhatsApp/IG buyers) may not have accounts. The order
// number acts as the access token, so we only ever return the minimum needed.
//
// Order numbers are a plain sequential counter (ATL-10001, ATL-10002, ...),
// so track_order_public()/get_order_for_return() being open to anon is only
// safe if lookups are throttled — otherwise anyone can script through every
// order number and harvest status/items (and, for returns, user_id) for the
// whole store. See 0011... note: this is the fix for that gap.

type TrackResult =
  | { ok: true; status: string; date: string; delivered: boolean; expired: boolean; items: { name: string; qty: number; size: string | null }[] }
  | { ok: false; error: string };

const STEPS = ['placed', 'confirmed', 'shipped', 'delivered'];

export async function trackOrder(orderNumber: string): Promise<TrackResult> {
  const number = orderNumber.trim().toUpperCase();
  if (!number) return { ok: false, error: 'Enter your order number.' };

  if (!(await checkRateLimit('track_order', 20, 300))) {
    return { ok: false, error: 'Too many lookups — please wait a few minutes and try again.' };
  }

  const supabase = await createClient();
  // track_order_public() is a narrow SECURITY DEFINER function — it returns
  // only status/date/items for the one matching order number, never the
  // whole orders table (see 0005_security_hardening.sql for why that
  // distinction matters).
  const { data, error } = await supabase.rpc('track_order_public', { p_order_number: number });

  if (error || !data || data.length === 0) return { ok: false, error: 'No order found with that number. Check it and try again.' };

  const first = data[0];
  const delivered = first.status === 'delivered';
  return {
    ok: true,
    status: first.status,
    date: (first.created_at ?? '').slice(0, 10),
    delivered,
    // "Expires at delivery": once delivered, live tracking is closed. The UI
    // shows a completed state rather than an active tracker.
    expired: delivered,
    items: data.map((row: any) => ({ name: row.item_name, qty: row.item_qty, size: row.item_size })),
  };
}

type ReturnResult = { ok: true } | { ok: false; error: string };

const RETURN_WINDOW_DAYS = 14;

export async function fileReturn(input: {
  orderNumber: string;
  type: 'return' | 'exchange';
  reason: string;
}): Promise<ReturnResult> {
  const number = input.orderNumber.trim().toUpperCase();
  if (!number) return { ok: false, error: 'Enter your order number.' };
  if (!input.reason.trim()) return { ok: false, error: 'Tell us the reason so we can help.' };

  if (!(await checkRateLimit('track_order', 20, 300))) {
    return { ok: false, error: 'Too many lookups — please wait a few minutes and try again.' };
  }

  const supabase = await createClient();
  const { data: orders, error } = await supabase.rpc('get_order_for_return', { p_order_number: number });
  const order = orders?.[0];

  if (error || !order) return { ok: false, error: 'No order found with that number.' };

  // Returns open only once the item is delivered, and close 14 days after.
  if (order.status !== 'delivered') {
    return { ok: false, error: 'Returns open once your order is delivered. Track it to see where it is.' };
  }
  const deliveredAt = new Date(order.created_at);
  const daysSince = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > RETURN_WINDOW_DAYS) {
    return { ok: false, error: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed.` };
  }

  const { error: insErr } = await supabase.from('return_requests').insert({
    order_id: order.id,
    user_id: order.user_id,
    type: input.type,
    reason: input.reason.trim(),
  });

  if (insErr) return { ok: false, error: insErr.message };
  revalidatePath('/track');
  return { ok: true };
}
