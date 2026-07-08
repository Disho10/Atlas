'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';

// Service role client for writes — bypasses RLS. Falls back to null if the
// service role key isn't configured (the action will use the session client).
function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false } }
  );
}

// Every action re-checks the caller's role server-side. The RLS policies in the
// database are the real enforcement, but checking here too lets us return clean
// error messages instead of opaque permission failures, and blocks the action
// before it ever touches the DB.

type ActionResult = { ok: true } | { ok: false; error: string };

async function getRole(): Promise<{ userId: string; role: string } | null> {
  const supabase = await createClient(); // must use session client to identify the caller
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { userId: user.id, role: (data as any)?.role ?? 'customer' };
}

const isStaff = (r: string) => ['admin', 'manager', 'owner'].includes(r);
const canEditProducts = (r: string) => ['manager', 'owner'].includes(r);

// ---------------------------------------------------------------------------
// PRODUCTS — create / update / delete. Owner + Manager only.
// ---------------------------------------------------------------------------
export async function saveProduct(input: {
  id?: string;
  name: string;
  category: string;
  league_slug: string | null;
  team: string;
  price_usd: number;
  compare_at_usd: number | null;
  cost_usd: number | null;
  gender: string;
  sizes: string[];
  stock: number;
  hot: boolean;
  coming_soon: boolean;
  status: 'draft' | 'published';
  image_url: string | null;
  images: string[];
  variants: { label: string; price: number }[];
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can edit products.' };

  const supabase = serviceClient() ?? await createClient();
  const row = {
    name: input.name,
    category: input.category,
    league_slug: input.league_slug || null,
    team: input.team || null,
    price_usd: input.price_usd,
    compare_at_usd: input.compare_at_usd,
    cost_usd: input.cost_usd,
    gender: input.gender,
    sizes: input.sizes,
    stock: input.stock,
    hot: input.hot,
    coming_soon: input.coming_soon,
    status: input.status,
    image_url: input.image_url,
    images: input.images.filter(Boolean),
    variants: input.variants,
  };

  const { error } = input.id
    ? await supabase.from('products').update(row).eq('id', input.id)
    : await supabase.from('products').insert(row);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can delete products.' };

  const supabase = serviceClient() ?? await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MANUAL ORDERS — log an Instagram / WhatsApp sale. All staff.
// ---------------------------------------------------------------------------
export async function logManualOrder(input: {
  customer_name: string;
  customer_phone: string;
  channel: 'instagram' | 'whatsapp';
  payment_method: 'whish_pay' | 'omt' | 'card' | 'cod';
  address: string;
  city: string;
  product_name: string;
  size: string;
  qty: number;
  unit_price_usd: number;
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!isStaff(auth.role)) return { ok: false, error: 'Staff only.' };

  const supabase = serviceClient() ?? await createClient();
  const subtotal = input.unit_price_usd * input.qty;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      status: 'confirmed',
      channel: input.channel,
      payment_method: input.payment_method,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone || null,
      address: input.address,
      city: input.city || null,
      subtotal_usd: subtotal,
      logged_by: auth.userId,
    })
    .select('id')
    .single();

  if (orderErr || !order) return { ok: false, error: orderErr?.message ?? 'Could not create order.' };

  const { error: itemErr } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_name: input.product_name,
    size: input.size || null,
    qty: input.qty,
    unit_price_usd: input.unit_price_usd,
  });

  if (itemErr) return { ok: false, error: itemErr.message };
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// TEAM — owner promotes / demotes staff by email. Owner only.
// ---------------------------------------------------------------------------
export async function setStaffRole(input: {
  email: string;
  role: 'customer' | 'admin' | 'manager' | 'owner';
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (auth.role !== 'owner') return { ok: false, error: 'Only the Owner can manage the team.' };

  const supabase = serviceClient() ?? await createClient();
  // The person must already have an account (signed up on the site). We match
  // their profile by the email stored on it.
  const { data: profile, error: findErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', input.email.trim().toLowerCase())
    .single();

  if (findErr || !profile) {
    return { ok: false, error: 'No account found with that email. Ask them to sign up on the site first.' };
  }

  const { error } = await supabase.from('profiles').update({ role: input.role }).eq('id', profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// PROMO CODES — create a match-day / seasonal discount code. Manager + Owner.
// ---------------------------------------------------------------------------
export async function createPromo(input: {
  code: string;
  description: string;
  kind: 'percent' | 'fixed';
  amount: number;
  min_subtotal_usd: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can create promo codes.' };

  const supabase = serviceClient() ?? await createClient();
  const { error } = await supabase.from('promo_codes').insert({
    code: input.code.trim().toUpperCase(),
    description: input.description.trim() || null,
    kind: input.kind,
    amount: input.amount,
    min_subtotal_usd: input.min_subtotal_usd,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    max_uses: input.max_uses,
    active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// EXCHANGE RATE — owner/manager sets the USD/LBP display rate
// ---------------------------------------------------------------------------
export async function setExchangeRate(rate: number): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can set the rate.' };
  if (rate <= 0) return { ok: false, error: 'Rate must be positive.' };

  const supabase = serviceClient() ?? await createClient();
  const { error } = await supabase.from('site_settings').upsert({ key: 'usd_to_lbp', value: String(rate) });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ORDER STATUS — advance or cancel an order. All staff can advance; cancel
// is owner/manager only.
// ---------------------------------------------------------------------------
export async function updateOrderStatus(orderId: string, newStatus: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!isStaff(auth.role)) return { ok: false, error: `Staff only. Your role: ${auth.role}` };
  if (newStatus === 'cancelled' && !canEditProducts(auth.role)) {
    return { ok: false, error: 'Only Owner and Manager can cancel orders.' };
  }

  const valid = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(newStatus)) return { ok: false, error: `Invalid status: ${newStatus}` };
  if (!orderId) return { ok: false, error: 'No order ID provided.' };

  // Try service role client first (bypasses RLS), fall back to session client
  const svc = serviceClient();
  const session = await createClient();
  const supabase = svc ?? session;
  const method = svc ? 'service-role' : 'session';

  try {
    // Verify the order exists
    const { data: existing, error: findErr } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (findErr) return { ok: false, error: `Find error (${method}): ${findErr.message}` };
    if (!existing) return { ok: false, error: `Order not found. ID: ${orderId.slice(0, 12)}…` };
    if (existing.status === newStatus) return { ok: true }; // already at target status

    // Perform the update
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (updateErr) return { ok: false, error: `Update error (${method}): ${updateErr.message}` };

    // Verify it actually changed
    const { data: check } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (check?.status !== newStatus) {
      return { ok: false, error: `Update didn't persist. Still "${check?.status ?? 'unknown'}". ${!svc ? 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local to fix RLS issues.' : ''}` };
    }

    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Exception: ${String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// MANUAL ORDERS — multi-item version. One order, many products.
// ---------------------------------------------------------------------------
export async function logManualOrderMulti(input: {
  customer_name: string;
  customer_phone: string;
  channel: 'instagram' | 'whatsapp';
  payment_method: 'whish_pay' | 'omt' | 'card' | 'cod';
  address: string;
  city: string;
  items: { product_name: string; size: string; qty: number; unit_price_usd: number }[];
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!isStaff(auth.role)) return { ok: false, error: 'Staff only.' };
  if (input.items.length === 0) return { ok: false, error: 'Add at least one item.' };

  const supabase = serviceClient() ?? await createClient();
  const subtotal = input.items.reduce((s, i) => s + i.unit_price_usd * i.qty, 0);

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      status: 'confirmed',
      channel: input.channel,
      payment_method: input.payment_method,
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone.trim() || null,
      address: input.address.trim(),
      city: input.city.trim() || null,
      subtotal_usd: subtotal,
      logged_by: auth.userId,
    })
    .select('id')
    .single();

  if (orderErr || !order) return { ok: false, error: orderErr?.message ?? 'Could not create order.' };

  const itemRows = input.items.map(i => ({
    order_id: order.id,
    product_name: i.product_name.trim(),
    size: i.size.trim() || null,
    qty: i.qty,
    unit_price_usd: i.unit_price_usd,
  }));

  const { error: itemErr } = await supabase.from('order_items').insert(itemRows);
  if (itemErr) return { ok: false, error: itemErr.message };
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CUSTOM PAGES — create, update, delete pages. Manager + Owner only.
// ---------------------------------------------------------------------------
export async function savePage(input: {
  id?: string;
  slug: string;
  title: string;
  blocks: any[];
  published: boolean;
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can manage pages.' };

  const supabase = serviceClient() ?? await createClient();
  const row = {
    slug: input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    title: input.title.trim(),
    blocks: input.blocks,
    published: input.published,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await supabase.from('custom_pages').update(row).eq('id', input.id)
    : await supabase.from('custom_pages').insert({ ...row, created_by: auth.userId });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  revalidatePath(`/p/${row.slug}`);
  return { ok: true };
}

export async function deletePage(id: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can delete pages.' };

  const supabase = serviceClient() ?? await createClient();
  const { error } = await supabase.from('custom_pages').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}
