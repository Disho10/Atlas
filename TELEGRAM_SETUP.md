# Telegram Order Notifications — Setup Guide

Every new order (website + manually logged) will ping your Telegram chat instantly.
Takes about 5 minutes.

---

## Step 1: Get a fresh bot token (your old one was exposed in chat)

1. Open Telegram, search for **@BotFather**
2. Send `/newbot` (or `/token` if you want to reuse your existing bot)
3. Follow the prompts — give it a name like "Atlas Orders"
4. Copy the token it gives you (looks like `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`)

## Step 2: Get your chat ID

You need the chat ID where notifications will land (your personal chat or a group).

**For a group chat:**
1. Add the bot to your group
2. Send any message in the group
3. Open this URL in a browser (replace YOUR_TOKEN):
   `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
4. Look for `"chat":{"id":-XXXXXXXXXX}` — that negative number is your chat ID

**For your personal chat:**
1. Send any message to your bot
2. Open the same getUpdates URL
3. Look for `"chat":{"id":XXXXXXXXXX}` — that's your chat ID

## Step 3: Set the secrets on Supabase

Run these in your terminal (with the Supabase CLI installed):

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_new_token_here
supabase secrets set TELEGRAM_CHAT_ID=your_chat_id_here
```

Or set them in the Supabase Dashboard:
**Dashboard → Edge Functions → notify-telegram → Secrets**

## Step 4: Deploy the function

```bash
cd atlas
supabase functions deploy notify-telegram
```

## Step 5: Create the database webhook

1. Go to **Supabase Dashboard → Database → Webhooks**
2. Click **New Webhook**
3. Set:
   - **Name:** `notify-telegram-on-order`
   - **Table:** `orders`
   - **Events:** ✅ Insert
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** `https://ejtljfgaoevthbpbzmus.functions.supabase.co/notify-telegram`
   - **Headers:** Add `Authorization: Bearer YOUR_ANON_KEY`
     (find your anon key in Dashboard → Settings → API)
4. Click **Create**

## Step 6: Test it

Place a test order on the website (or log one from the admin panel).
You should get a Telegram message within seconds with the full order details.

---

## What the message looks like

```
🛒 New order ATL-10235

Customer: Ahmad
Phone: +961 XX XXX XXX
Address: Saida, Lebanon
Payment: Cash on Delivery
Channel: website

Items:
• Real Madrid Home Shirt 25/26 (Jersey + Shorts) × 1 (L) — $119
• Pro Grip Socks - Crimson × 2 (M) — $14

Total: $147
```

## Troubleshooting

- **No message arrives:** Check the function logs in Dashboard → Edge Functions → notify-telegram → Logs
- **"Unauthorized" error:** The webhook Authorization header needs your anon key
- **"Chat not found" error:** Double-check the TELEGRAM_CHAT_ID secret
- **Messages arrive for website orders but not admin-logged ones:** Both go through the same `orders` INSERT — if one works, both should. Check the function logs.
