// Processes the notification_queue: emails subscribers about new categories
// and products matching tags they've clicked. Respects each user's notify_*
// preferences. Run on a cron (e.g. hourly) or trigger via webhook.
//
// Deploy:  supabase functions deploy notify-subscribers
// Schedule: hourly ("0 * * * *")

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendEmail, shell } from '../_shared/email.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async () => {
  const { data: queued } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('sent', false)
    .limit(50);

  let sent = 0;

  for (const item of queued ?? []) {
    if (item.kind === 'new_category') {
      // Everyone who opted into new-category emails.
      const { data: people } = await supabase
        .from('profiles')
        .select('email')
        .eq('notify_new_categories', true)
        .not('email', 'is', null);

      for (const p of people ?? []) {
        await sendEmail({
          to: p.email,
          subject: `New in store: ${item.category}`,
          html: shell('Something new just landed', `We've just added <b>${item.category}</b> to the store. Be among the first to check it out.<br><br><a href="https://your-domain.com" style="background:#D6FF3F;color:#0B0D10;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Shop new arrivals</a>`),
        });
        sent++;
      }
    }

    if (item.kind === 'tag_match' && item.tag) {
      // Users who clicked this tag and opted into tag-match emails.
      const { data: clickers } = await supabase
        .from('tag_clicks')
        .select('user_id')
        .eq('tag', item.tag);
      const userIds = [...new Set((clickers ?? []).map(c => c.user_id))];
      if (userIds.length) {
        const { data: people } = await supabase
          .from('profiles')
          .select('email')
          .in('id', userIds)
          .eq('notify_tag_matches', true)
          .not('email', 'is', null);
        for (const p of people ?? []) {
          await sendEmail({
            to: p.email,
            subject: `New "${item.tag}" gear you might like`,
            html: shell('Back in your area of interest', `You've shown interest in <b>${item.tag}</b> — and we just added something new that fits.<br><br><a href="https://your-domain.com/search?q=${encodeURIComponent(item.tag)}" style="background:#D6FF3F;color:#0B0D10;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">See it</a>`),
          });
          sent++;
        }
      }
    }

    if (item.kind === 'back_in_stock' && item.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', item.product_id)
        .single();
      const { data: waiting } = await supabase
        .from('stock_notify_requests')
        .select('id, email')
        .eq('product_id', item.product_id)
        .is('notified_at', null);

      for (const w of waiting ?? []) {
        await sendEmail({
          to: w.email,
          subject: `${product?.name ?? 'An item you wanted'} is back in stock`,
          html: shell('Back in stock', `Good news — <b>${product?.name ?? 'the item you asked about'}</b> is back in stock. It tends to sell out fast.<br><br><a href="https://your-domain.com/product/${item.product_id}" style="background:#D6FF3F;color:#0B0D10;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Shop it now</a>`),
        });
        await supabase.from('stock_notify_requests').update({ notified_at: new Date().toISOString() }).eq('id', w.id);
        sent++;
      }
    }

    await supabase.from('notification_queue').update({ sent: true }).eq('id', item.id);
  }

  return new Response(JSON.stringify({ processed: queued?.length ?? 0, emailsSent: sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
