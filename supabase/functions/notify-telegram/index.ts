// supabase/functions/notify-telegram/index.ts
//
// Triggered by a Supabase Database Webhook on `orders` INSERT.
// Set up: Supabase Dashboard → Database → Webhooks → New webhook
//   Table: orders | Events: Insert | Type: HTTP Request
//   URL: https://<project-ref>.functions.supabase.co/notify-telegram
//
// Secrets needed (set via `supabase secrets set KEY=value`):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const order = payload.record;

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, size, qty, unit_price_usd')
      .eq('order_id', order.id);

    const itemLines = (items ?? [])
      .map((i: any) => `• ${i.product_name} × ${i.qty}${i.size ? ` (${i.size})` : ''} — $${i.unit_price_usd}`)
      .join('\n');

    const paymentLabel: Record<string, string> = {
      whish_pay: 'Whish Pay',
      omt: 'OMT',
      card: 'Card',
      cod: 'Cash on Delivery',
    };

    const text =
      `🛒 *New order ${order.order_number}*\n\n` +
      `*Customer:* ${order.customer_name}\n` +
      `*Phone:* ${order.customer_phone ?? '—'}\n` +
      `*Address:* ${order.address}${order.city ? ', ' + order.city : ''}\n` +
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
