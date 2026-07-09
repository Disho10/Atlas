import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';


export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — safe to ignore because
            // proxy.ts (Next 16's renamed middleware.ts) already refreshes
            // the session on each request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

// Service-role client — server-only, bypasses RLS. Never import this from a
// Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// Use only for trusted server-side jobs like the Telegram/receipt triggers.
import { createClient as createRawClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
