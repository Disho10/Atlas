'use server';

import { createClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

export async function requestStockNotification(productId: string, email: string): Promise<Result> {
  const clean = email.trim().toLowerCase();
  if (!clean.includes('@')) return { ok: false, error: 'Enter a valid email.' };
  if (!productId) return { ok: false, error: 'Missing product.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('stock_notify_requests').insert({
    product_id: productId,
    email: clean,
    user_id: user?.id ?? null,
  });

  // Unique-violation just means they already asked — treat as success.
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    return { ok: false, error: 'Something went wrong — please try again.' };
  }
  return { ok: true };
}
