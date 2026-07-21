// Same color convention already used for order status in the admin panel
// (components/AdminPanel.tsx STATUS_COLORS) — kept here too so customer-
// facing pages (Account, Orders, Track) can reuse it without importing the
// admin component. Update both places together if this ever changes.
export const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: 'bg-black/5 dark:bg-white/10',
  confirmed: 'bg-volt/20 text-ink dark:text-chalk',
  shipped: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  cancelled: 'bg-crimson/15 text-crimson',
};
