// supabase/functions/notify-telegram/index.ts
//
// Triggered by a Supabase Database Webhook on `orders` INSERT.
// Set up: Supabase Dashboard → Database → Webhooks → New webhook
//   Table: orders | Events: Insert | Type: HTTP Request
//   URL: https://<project-ref>.functions.supabase.co/notify-telegram
//   HTTP Headers: add  x-webhook-secret: <same value as the WEBHOOK_SECRET secret below>
//
// Secrets needed (set via `supabase secrets set KEY=value`):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// WEBHOOK_SECRET matters because Edge Functions accept any request bearing a
// valid Supabase JWT — and the public anon key (baked into every browser
// bundle) IS a valid JWT. Without this check, anyone could POST a forged
// `{ record: {...} }` body straight to this URL and use your Telegram bot as
// a free spam relay with attacker-chosen text.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Legacy Telegram Markdown treats _ * ` [ as formatting characters. Escaping
// them stops a customer_name/address value like "*URGENT* [click here](url)"
// from rendering as bold text or a clickable link in your Telegram chat.
function escapeMd(s: string): string {
  return (s ?? '').replace(/([_*`\[])/g, '\\$1');
}

Deno.serve(async (req) => {
  try {
    if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    const order = payload.record;

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, size, qty, unit_price_usd')
      .eq('order_id', order.id);

    const itemLines = (items ?? [])
      .map((i: any) => `• ${escapeMd(i.product_name)} × ${i.qty}${i.size ? ` (${escapeMd(i.size)})` : ''} — $${i.unit_price_usd}`)
      .join('\n');

    const paymentLabel: Record<string, string> = {
      whish_pay: 'Whish Pay',
      omt: 'OMT',
      card: 'Card',
      cod: 'Cash on Delivery',
    };

    const text =
      `🛒 *New order ${escapeMd(order.order_number)}*\n\n` +
      `*Customer:* ${escapeMd(order.customer_name)}\n` +
      `*Phone:* ${escapeMd(order.customer_phone ?? '—')}\n` +
      `*Address:* ${escapeMd(order.address)}${order.city ? ', ' + escapeMd(order.city) : ''}\n` +
      `*Payment:* ${paymentLabel[order.payment_method] ?? order.payment_method}\n` +
      `*Channel:* ${order.channel}\n\n` +
      `*Items:*\n${itemLines || '—'}\n\n` +
      `*Total: $${order.subtotal_usd}*`;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram API error: ${err}`);
    }

    await supabase.from('orders').update({ telegram_notified: true }).eq('id', order.id);

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
