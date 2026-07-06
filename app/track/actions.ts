'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Public order lookups by order number — no login required, since customers
// (especially manual WhatsApp/IG buyers) may not have accounts. The order
// number acts as the access token, so we only ever return the minimum needed.

type TrackResult =
  | { ok: true; status: string; date: string; delivered: boolean; expired: boolean; items: { name: string; qty: number; size: string | null }[] }
  | { ok: false; error: string };

const STEPS = ['placed', 'confirmed', 'shipped', 'delivered'];

export async function trackOrder(orderNumber: string): Promise<TrackResult> {
  const number = orderNumber.trim().toUpperCase();
  if (!number) return { ok: false, error: 'Enter your order number.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('status, created_at, order_items(product_name, qty, size)')
    .eq('order_number', number)
    .single();

  if (error || !data) return { ok: false, error: 'No order found with that number. Check it and try again.' };

  const delivered = data.status === 'delivered';
  return {
    ok: true,
    status: data.status,
    date: (data.created_at ?? '').slice(0, 10),
    delivered,
    // "Expires at delivery": once delivered, live tracking is closed. The UI
    // shows a completed state rather than an active tracker.
    expired: delivered,
    items: (data.order_items ?? []).map((it: any) => ({ name: it.product_name, qty: it.qty, size: it.size })),
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

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, created_at, user_id')
    .eq('order_number', number)
    .single();

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
