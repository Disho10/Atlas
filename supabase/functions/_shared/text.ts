// Pure string-escaping helpers used before interpolating customer-entered
// text into Telegram Markdown or HTML email. No Deno-specific APIs here on
// purpose, so this file can also be imported directly by Vitest under Node —
// see supabase/functions/_shared/text.test.ts.

// Legacy Telegram Markdown treats _ * ` [ as formatting characters. Escaping
// them stops a customer_name/address value like "*URGENT* [click here](url)"
// from rendering as bold text or a clickable link in a Telegram chat.
export function escapeMd(s: string): string {
  return (s ?? '').replace(/([_*`[])/g, '\\$1');
}

// Customer-entered text (name/address/etc.) goes into an HTML email body —
// escape it so a name like `<img src=x onerror=...>` can't inject markup.
export function escapeHtml(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]!);
}
