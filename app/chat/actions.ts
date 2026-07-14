'use server';

import { createClient } from '@/lib/supabase/server';

// The chatbot answers FAQs from a static set, and can look up a live order
// status by order number (works for guests and account holders). Anything it
// can't handle falls back to WhatsApp on the client.

const FAQS: { keywords: string[]; a: string }[] = [
  { keywords: ['ship', 'delivery', 'deliver', 'how long', 'arrive'], a: 'In-stock items ship same or next day and arrive within 2–4 days anywhere in Lebanon. Free shipping on orders over $110, and cash on delivery is available everywhere.' },
  { keywords: ['size', 'sizing', 'fit', 'measurement'], a: 'Our kits run true to size — order your usual. Each product page lists the available sizes, and marks any that are out of stock.' },
  { keywords: ['return', 'exchange', 'refund'], a: 'You have 14 days from delivery to return or exchange, unworn with tags. Start it from the order tracking page using your order number.' },
  { keywords: ['pay', 'payment', 'cash', 'cod', 'whish', 'omt', 'card'], a: 'We accept Whish Pay, card, and cash on delivery across all of Lebanon. We no longer accept OMT.' },
  { keywords: ['track', 'where', 'status', 'order'], a: 'You can track any order by its number on the Track page — just enter your ATL- number. Want me to look one up now? Type your order number (e.g. ATL-10234).' },
  { keywords: ['store', 'shop', 'location', 'physical', 'pickup'], a: 'We are an online store delivering across all of Lebanon. Follow us on Instagram for updates.' },
  { keywords: ['authentic', 'real', 'genuine', 'fake'], a: 'Every product page states exactly what you\'re getting, and every item is quality-checked before it ships.' },
];

const ORDER_RE = /\b(ATL-\d{4,})\b/i;

export async function chatbotReply(message: string): Promise<{ text: string; fallback?: boolean }> {
  const text = message.trim();

  // 1. Order-number lookup takes priority
  const match = text.toUpperCase().match(ORDER_RE);
  if (match) {
    const status = await lookupOrder(match[1]);
    if (status) return { text: status };
    return { text: `I couldn't find an order with number ${match[1]}. Double-check it, or tap below to reach our team on WhatsApp.`, fallback: true };
  }

  // 2. FAQ keyword match
  const lower = text.toLowerCase();
  const faq = FAQS.find(f => f.keywords.some(k => lower.includes(k)));
  if (faq) return { text: faq.a };

  // 3. Fallback
  return { text: "That's beyond my quick answers — our team can help directly on WhatsApp. Tap below to continue there.", fallback: true };
}

async function lookupOrder(orderNumber: string): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc('track_order_public', { p_order_number: orderNumber });
  if (!data || data.length === 0) return null;

  const labels: Record<string, string> = {
    placed: 'received and being prepared',
    confirmed: 'confirmed and being packed',
    shipped: 'on its way to you',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  const status = data[0].status as string;
  const items = data.map((row: any) => `${row.item_name} ×${row.item_qty}`).join(', ');
  const statusText = labels[status] ?? status;

  if (status === 'delivered') {
    return `Order ${orderNumber} has been delivered. If something isn't right, you can start a return or exchange within 14 days from the tracking page. (${items})`;
  }
  return `Order ${orderNumber} is ${statusText}. ${items ? `Items: ${items}.` : ''} You can see the full tracker on the Track page.`;
}
