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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { userId: user.id, role: (data as any)?.role ?? 'customer' };
}

const isStaff = (r: string) => ['admin', 'manager', 'owner'].includes(r);
const canEditProducts = (r: string) => ['manager', 'owner'].includes(r);
const isOwner = (r: string) => r === 'owner';

// Fire-and-forget audit trail — never blocks or fails the action it's
// logging for. `supabase` should be the caller's session client so the
// insert goes through the "Staff write audit log" RLS policy honestly
// (the actor really is staff, since every action already checked that).
async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  target: string | null,
  detail?: Record<string, unknown>
) {
  try {
    await supabase.from('admin_audit_log').insert({ actor_id: actorId, action, target, detail: detail ?? null });
  } catch {
    // Never let audit logging break the actual admin action.
  }
}

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

  const supabase = await createClient();
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
  await logAudit(supabase, auth.userId, input.id ? 'product.update' : 'product.create', input.name, { price_usd: input.price_usd, status: input.status });
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can delete products.' };

  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, 'product.delete', id);
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
  payment_method: 'whish_pay' | 'card' | 'cod';
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

  const supabase = await createClient();
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
  await logAudit(supabase, auth.userId, 'order.manual_log', order.id, { channel: input.channel, subtotal });
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

  const supabase = await createClient();
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

  // Guard against locking the store out of the admin panel entirely: if this
  // change would demote the last remaining owner, block it.
  if ((profile as any).id === auth.userId && input.role !== 'owner') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner');
    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'You are the last Owner — promote another account to Owner first.' };
    }
  }

  const { error } = await supabase.from('profiles').update({ role: input.role }).eq('id', profile.id);
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, 'staff.role', input.email.trim().toLowerCase(), { new_role: input.role });
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

  const supabase = await createClient();
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
  await logAudit(supabase, auth.userId, 'promo.create', input.code.trim().toUpperCase(), { kind: input.kind, amount: input.amount });
  revalidatePath('/admin');
  return { ok: true };
}

export async function setPromoActive(id: string, active: boolean): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can change promo codes.' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('promo_codes').update({ active }).eq('id', id).select('code').single();
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, active ? 'promo.activate' : 'promo.deactivate', data?.code ?? id);
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

  const supabase = await createClient();
  const { error } = await supabase.from('site_settings').upsert({ key: 'usd_to_lbp', value: String(rate) });
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, 'settings.exchange_rate', String(rate));
  revalidatePath('/');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// STORE SETTINGS — WhatsApp number, free-shipping threshold, delivery text,
// business hours. Was hardcoded across 6+ files before; now a single
// key-value row per setting, editable here instead of a code change.
// ---------------------------------------------------------------------------
export async function setSiteSetting(dbKey: string, value: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can change store settings.' };
  if (!value.trim()) return { ok: false, error: 'Value cannot be empty.' };

  const supabase = await createClient();
  const { error } = await supabase.from('site_settings').upsert({ key: dbKey, value: value.trim() });
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, 'settings.store_setting', dbKey, { value: value.trim() });
  revalidatePath('/');
  revalidatePath('/contact');
  revalidatePath('/shipping');
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

    await logAudit(session, auth.userId, 'order.status', orderId, { from: existing.status, to: newStatus });
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
  payment_method: 'whish_pay' | 'card' | 'cod';
  address: string;
  city: string;
  items: { product_name: string; size: string; qty: number; unit_price_usd: number }[];
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!isStaff(auth.role)) return { ok: false, error: 'Staff only.' };
  if (input.items.length === 0) return { ok: false, error: 'Add at least one item.' };

  const supabase = await createClient();
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
  await logAudit(supabase, auth.userId, 'order.manual_log', order.id, { channel: input.channel, subtotal, item_count: input.items.length });
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

  const supabase = await createClient();
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
  await logAudit(supabase, auth.userId, input.id ? 'page.update' : 'page.create', row.slug);
  revalidatePath('/admin');
  revalidatePath(`/p/${row.slug}`);
  return { ok: true };
}

export async function deletePage(id: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can delete pages.' };

  const supabase = await createClient();
  const { error } = await supabase.from('custom_pages').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, 'page.delete', id);
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// HERO SLIDES — owner/manager edits the homepage slideshow content + images
// ---------------------------------------------------------------------------
export async function saveHeroSlides(slides: {
  tag: string; titleTop: string; titleAccent: string; body: string;
  image?: string; ctaLabel: string; ctaHref: string; secondaryLabel: string; secondaryHref: string;
}[]): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can edit hero slides.' };

  const session = await createClient();
  const supabase = serviceClient() ?? session;
  const { error } = await supabase.from('site_settings').upsert({ key: 'hero_slides', value: JSON.stringify(slides) });
  if (error) return { ok: false, error: error.message };
  await logAudit(session, auth.userId, 'settings.hero_slides', null, { slide_count: slides.length });
  revalidatePath('/');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// APEX SHOWCASE — owner/manager edits the full-screen mid-scroll section
// (giant word, headline, copy, image/cutout mode, link target). Same
// storage + permission pattern as hero slides above.
// ---------------------------------------------------------------------------
export async function saveApexConfig(config: {
  enabled: boolean; word: string; headline: string; body: string;
  imageUrl: string; imageCutout: boolean; productId: string;
  ctaLabel: string; priceLine: string;
}): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can edit the Apex section.' };

  const session = await createClient();
  const supabase = serviceClient() ?? session;
  const { error } = await supabase.from('site_settings').upsert({ key: 'apex_showcase', value: JSON.stringify(config) });
  if (error) return { ok: false, error: error.message };
  await logAudit(session, auth.userId, 'settings.apex_showcase', null, { enabled: config.enabled });
  revalidatePath('/');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// REVIEW MODERATION — hide/show instead of only hard-delete. Available to any
// staff tier (same bar as logging orders), not just owner/manager.
// ---------------------------------------------------------------------------
export async function setReviewHidden(id: string, hidden: boolean, reason?: string): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!isStaff(auth.role)) return { ok: false, error: 'Staff only.' };

  const supabase = await createClient();
  const { error } = await supabase.from('reviews')
    .update({ hidden, hidden_reason: hidden ? (reason ?? null) : null })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, hidden ? 'review.hide' : 'review.show', id, reason ? { reason } : undefined);
  revalidatePath('/admin');
  revalidatePath('/product/[id]', 'page');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// RETURNS — owner/manager approves/rejects a filed return and records what it
// actually cost, so the Finance tab reflects real refund activity instead of
// return_requests rows just sitting there unresolved.
// ---------------------------------------------------------------------------
export async function resolveReturn(
  id: string,
  decision: 'approved' | 'rejected' | 'completed',
  refundAmountUsd?: number
): Promise<ActionResult> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!canEditProducts(auth.role)) return { ok: false, error: 'Only Owner and Manager can resolve returns.' };
  if (decision !== 'rejected' && (refundAmountUsd == null || refundAmountUsd < 0)) {
    return { ok: false, error: 'Enter a valid refund amount.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('return_requests').update({
    status: decision,
    refund_amount_usd: decision === 'rejected' ? null : refundAmountUsd,
    resolved_at: new Date().toISOString(),
    resolved_by: auth.userId,
  }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, auth.userId, `return.${decision}`, id, refundAmountUsd != null ? { refund_amount_usd: refundAmountUsd } : undefined);
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// GIFT CARDS — issuing one directly (no purchase behind it) is owner-only,
// checked here AND inside issue_gift_card() itself (0010) — the same
// defense-in-depth reasoning as everywhere else: the UI check is real, but
// the DB function refuses on its own regardless of what called it.
// ---------------------------------------------------------------------------
export async function issueGiftCard(input: {
  recipient_email: string;
  recipient_name?: string;
  amount_usd: number;
  message?: string;
}): Promise<ActionResult & { code?: string }> {
  const auth = await getRole();
  if (!auth) return { ok: false, error: 'Not signed in.' };
  if (!isOwner(auth.role)) return { ok: false, error: 'Only the Owner can issue gift cards.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('issue_gift_card', {
    p_recipient_email: input.recipient_email.trim(),
    p_recipient_name: input.recipient_name?.trim() || null,
    p_amount_usd: input.amount_usd,
    p_message: input.message?.trim() || null,
  });
  if (error || !data) return { ok: false, error: error?.message || 'Something went wrong.' };

  await logAudit(supabase, auth.userId, 'gift_card.issue', data.code, { amount_usd: input.amount_usd, recipient: input.recipient_email });
  revalidatePath('/admin');
  return { ok: true, code: data.code };
}
