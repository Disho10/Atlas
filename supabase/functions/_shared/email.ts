// Shared email helper for all Atlas engagement emails.
// Uses Resend (https://resend.com) — set these secrets on your Supabase project:
//   supabase secrets set RESEND_API_KEY=re_xxx RECEIPT_FROM_EMAIL=orders@yourdomain.com
// If RESEND_API_KEY is unset, sendEmail no-ops and logs, so the jobs run safely
// without email configured (nothing breaks; nothing sends).

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RECEIPT_FROM_EMAIL') ?? 'Atlas <onboarding@resend.dev>';
  if (!key) {
    console.log('[email skipped — no RESEND_API_KEY]', opts.subject, '->', opts.to);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  });
  if (!res.ok) console.error('[email failed]', await res.text());
  return { ok: res.ok };
}

export function shell(title: string, body: string) {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#333">${body}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#999">Atlas — Follow Through. · You can manage email preferences in your account settings.</p>
  </div>`;
}
