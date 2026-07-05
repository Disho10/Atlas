export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-14 prose-sm">
      <h1 className="font-display text-3xl mb-6">Terms &amp; Conditions</h1>
      <div className="space-y-5 text-sm text-steel leading-relaxed">
        <p>
          These placeholder terms cover orders, payments, shipping, and returns for Atlas Sports. Replace this
          copy with terms reviewed for Lebanese consumer-protection requirements before launch — particularly
          around cash-on-delivery, refund windows, and payment-provider (Whish Pay / OMT) dispute handling.
        </p>
        <h2 className="text-ink dark:text-chalk font-medium">1. Orders &amp; payment</h2>
        <p>Orders are confirmed once payment is captured or, for cash on delivery, once the order is accepted by our team.</p>
        <h2 className="text-ink dark:text-chalk font-medium">2. Shipping</h2>
        <p>We ship across Lebanon. Delivery windows are estimates and may vary by area.</p>
        <h2 className="text-ink dark:text-chalk font-medium">3. Returns &amp; exchanges</h2>
        <p>Items may be returned or exchanged within 14 days of delivery in original condition.</p>
        <h2 className="text-ink dark:text-chalk font-medium">4. Cookies</h2>
        <p>We use essential cookies to keep your cart and session working, and optional cookies for analytics if you accept them.</p>
      </div>
    </main>
  );
}
