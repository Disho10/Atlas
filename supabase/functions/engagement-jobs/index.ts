// Scheduled engagement jobs — run this on a daily cron (Supabase Dashboard →
// Edge Functions → Schedules, or pg_cron). It handles three time-based emails:
//   1. Cart recovery — items left ~24h ago, one reminder only
//   2. Loyalty expiry warning — 6-month inactivity approaching, one warning
//   3. Birthday treat — a small discount on the customer's birthday
//
// Deploy:  supabase functions deploy engagement-jobs
// Schedule: daily (e.g. "0 9 * * *")
// Secrets:  RESEND_API_KEY, RECEIPT_FROM_EMAIL, plus SUPABASE_URL and
//           SUPABASE_SERVICE_ROLE_KEY (injected automatically for edge fns).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendEmail, shell } from '../_shared/email.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EXPIRY_MONTHS = 6;       // points expire after 6 months of inactivity
const WARN_DAYS_BEFORE = 14;   // warn 14 days before expiry

Deno.serve(async () => {
  const results = { cartRecovery: 0, expiryWarnings: 0, birthdays: 0 };

  // --- 1. Cart recovery: carts ~24h old, not yet reminded, not recovered ----
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: carts } = await supabase
    .from('abandoned_carts')
    .select('id, email, items')
    .is('reminded_at', null)
    .is('recovered_at', null)
    .lte('updated_at', dayAgo)
    .gte('updated_at', twoDaysAgo);

  for (const c of carts ?? []) {
    if (!c.email) continue;
    const count = Array.isArray(c.items) ? c.items.length : 0;
    await sendEmail({
      to: c.email,
      subject: 'You left something behind at Atlas',
      html: shell('Still thinking it over?', `You have ${count} item${count === 1 ? '' : 's'} waiting in your cart. They tend to sell fast — come finish up whenever you're ready.<br><br><a href="https://your-domain.com/cart" style="background:#D6FF3F;color:#0B0D10;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Return to cart</a>`),
    });
    await supabase.from('abandoned_carts').update({ reminded_at: new Date().toISOString() }).eq('id', c.id);
    results.cartRecovery++;
  }

  // --- 2. Loyalty expiry warnings -------------------------------------------
  const warnThreshold = new Date();
  warnThreshold.setMonth(warnThreshold.getMonth() - EXPIRY_MONTHS);
  warnThreshold.setDate(warnThreshold.getDate() + WARN_DAYS_BEFORE);
  const { data: lapsing } = await supabase
    .from('profiles')
    .select('id, email, loyalty_points, last_activity_at')
    .gt('loyalty_points', 0)
    .is('expiry_warning_sent_at', null)
    .lte('last_activity_at', warnThreshold.toISOString());

  for (const p of lapsing ?? []) {
    if (!p.email) continue;
    await sendEmail({
      to: p.email,
      subject: `Your ${p.loyalty_points} Atlas points are about to expire`,
      html: shell('Use them before they go', `You have <b>${p.loyalty_points} points</b> that will expire soon after ${EXPIRY_MONTHS} months of inactivity. Place any order to keep them alive — or redeem them for a discount now.<br><br><a href="https://your-domain.com/account/loyalty" style="background:#D6FF3F;color:#0B0D10;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">View my points</a>`),
    });
    await supabase.from('profiles').update({ expiry_warning_sent_at: new Date().toISOString() }).eq('id', p.id);
    results.expiryWarnings++;
  }

  // --- 3. Birthday treat -----------------------------------------------------
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { data: bdays } = await supabase.rpc('birthdays_today', { p_mmdd: mmdd }).select?.() ?? { data: null };
  // If the RPC isn't present, fall back to a client-side filter.
  let birthdayPeople = bdays as { id: string; email: string }[] | null;
  if (!birthdayPeople) {
    const { data: all } = await supabase.from('profiles').select('id, email, birthday').not('birthday', 'is', null);
    birthdayPeople = (all ?? []).filter(p => (p.birthday ?? '').slice(5) === mmdd).map(p => ({ id: p.id, email: p.email }));
  }
  for (const p of birthdayPeople ?? []) {
    if (!p.email) continue;
    await sendEmail({
      to: p.email,
      subject: 'A little something for your birthday 🎉',
      html: shell('Happy birthday from Atlas!', `Here's <b>BIRTHDAY10</b> — 10% off anything, our gift to you this week. Treat yourself.<br><br><a href="https://your-domain.com" style="background:#D6FF3F;color:#0B0D10;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Shop now</a>`),
    });
    results.birthdays++;
  }

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
});
