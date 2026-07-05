// supabase/functions/send-receipt/index.ts
//
// Triggered by the same Database Webhook pattern as notify-telegram, or call
// it directly from the checkout Route Handler right after inserting the order.
//   URL: https://<project-ref>.functions.supabase.co/send-receipt
//
// Secrets needed: RESEND_API_KEY, RECEIPT_FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (Swap the Resend call for Postmark/SendGrid if you prefer a different provider —
// only the fetch block below needs to change.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('RECEIPT_FROM_EMAIL')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const order = payload.record;

    if (!order.customer_email) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email on order' }));
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, size, qty, unit_price_usd')
      .eq('order_id', order.id);

    const rows = (items ?? [])
      .map(
        (i: any) =>
          `<tr><td style="padding:6px 0">${i.product_name}${i.size ? ` (${i.size})` : ''} × ${i.qty}</td><td style="text-align:right">$${(i.unit_price_usd * i.qty).toFixed(2)}</td></tr>`
      )
      .join('');

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Thanks for your order, ${order.customer_name.split(' ')[0]}!</h2>
        <p>Order <strong>${order.order_number}</strong> is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
        <p style="text-align:right;font-weight:bold">Total: $${order.subtotal_usd}</p>
        <p>Delivering to: ${order.address}${order.city ? ', ' + order.city : ''}</p>
        <p>Payment method: ${order.payment_method}</p>
        <p style="margin-top:24px">
          <a href="${Deno.env.get('SITE_URL') ?? ''}/account/orders">Track your order</a>
        </p>
      </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: order.customer_email,
        subject: `Your Atlas order ${order.order_number}`,
        html,
      }),
    });

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);

    await supabase.from('orders').update({ receipt_sent: true }).eq('id', order.id);

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
