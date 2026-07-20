import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Best-effort client identifier for rate limiting — not perfect (shared
// NAT/proxies, spoofable header), but enough to stop naive scripted
// enumeration without adding a new infra dependency. Shared by every server
// action that needs to throttle anon/public access (promo codes, order
// tracking, chat order lookups, etc).
export async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

// Thin wrapper around the check_rate_limit() Postgres function (see
// 0006_stock_ratelimit_audit_notify.sql). Returns true if the call is
// allowed, false if the caller has hit the limit. Fails OPEN (allows the
// call) if the RPC itself errors — a rate limiter outage shouldn't take
// down order tracking, and the underlying reads here are narrow
// SECURITY DEFINER functions, not full-table reads.
export async function checkRateLimit(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_key: await clientKey(),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return true;
  return data !== false;
}
