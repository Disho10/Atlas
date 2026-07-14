export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-14 prose-sm">
      <h1 className="font-display text-3xl mb-2">Terms &amp; Conditions</h1>
      <p className="text-xs text-steel mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <div className="space-y-6 text-sm text-steel leading-relaxed">

        <p>
          These terms govern your use of the Atlas Sports website and any order you place with us.
          By placing an order or creating an account, you agree to them. If anything here is unclear,
          message us on WhatsApp before you order and we&apos;ll walk you through it.
        </p>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">1. Who we are</h2>
          <p>
            Atlas Sports is an online retailer of football kits and match-day gear, operating in Lebanon.
            You can reach us at <a href="https://wa.me/96181752873" className="underline">wa.me/96181752873</a>{' '}
            for any question about an order, a product, or these terms.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">2. Orders and acceptance</h2>
          <p>
            Placing an order is an offer to buy, not a guaranteed sale. We confirm an order once payment is
            captured, or — for Cash on Delivery — once our team accepts it. We may decline or cancel an order
            before confirmation (for example, if an item goes out of stock between when you added it to your
            cart and when you checked out); if that happens and you&apos;ve already paid, we refund you in full.
          </p>
          <p className="mt-2">
            Product listings, prices, and availability can change without notice. The price and details shown
            at checkout are what apply to your order, not any price shown before or after.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">3. Pricing and payment</h2>
          <p>
            Prices are listed in US Dollars; a Lebanese Lira estimate may be shown for convenience using an
            exchange rate we update periodically, but USD is the reference currency for your order.
          </p>
          <p className="mt-2">We accept:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Cash on Delivery, paid to the courier when your order arrives</li>
            <li>Whish Pay</li>
            <li>OMT</li>
            <li>Card payment</li>
          </ul>
          <p className="mt-2">
            For Whish Pay, OMT, and card payments, the transaction itself is handled by that provider, not us —
            we never see or store your full card or account details. If a payment provider has a dispute with a
            charge, that dispute is handled under that provider&apos;s own terms as well as ours.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">4. Shipping and delivery</h2>
          <p>
            We currently ship across Lebanon only. In-stock items are typically dispatched the same or next
            day; delivery generally takes 2–4 days depending on your area, though this is an estimate, not a
            guarantee, and can be affected by things outside our control. Orders over $110 ship free; below
            that, a delivery fee applies and is shown at checkout before you pay.
          </p>
          <p className="mt-2">
            Preorder items show their own expected shipping window on the product page — that window applies
            instead of the general estimate above.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">5. Returns, exchanges, and refunds</h2>
          <p>
            You can request a return or exchange within 14 days of delivery, provided the item is unworn, unwashed,
            and has its original tags attached. Start a request from Account → Returns, or via our order-tracking
            page using your order number.
          </p>
          <p className="mt-2">
            Once we approve a return, we refund the amount agreed for that order. Refunds for card, Whish Pay, or
            OMT payments are returned to the original payment method where the provider allows it; refunds on
            Cash on Delivery orders are arranged directly with you (for example, bank transfer or Whish Pay) since
            there is no card or account to refund to automatically. We aim to resolve approved refunds promptly,
            but exact timing can depend on your payment provider.
          </p>
          <p className="mt-2">
            Items that arrive damaged, defective, or not as described are covered regardless of the 14-day window
            — contact us and we&apos;ll make it right.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">6. Product accuracy</h2>
          <p>
            We do our best to describe and photograph every product accurately, including sizing, and to check
            each item before it ships. Colors may vary slightly from what you see on screen due to display
            differences. If something you receive genuinely doesn&apos;t match its listing, that falls under
            returns above, not a sizing or preference change.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">7. Loyalty points and referrals</h2>
          <p>
            Signed-in customers earn loyalty points on confirmed purchases and can redeem them for a discount at
            checkout. Points may be earned through other activity too (for example, referring a friend or leaving
            a photo review), and unused points expire after 6 months of account inactivity — we&apos;ll email you
            before that happens so you have a chance to use them. Points have no cash value outside of redemption
            on our site and cannot be transferred, sold, or exchanged for cash. We may adjust the loyalty program
            — including earn rates, tiers, or expiry — at any time; changes apply going forward, not to points
            already earned.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">8. Promo codes</h2>
          <p>
            Promo codes are subject to the conditions shown when the code is advertised (minimum spend, validity
            window, or usage limits) and can be changed, restricted, or discontinued at any time. Only one promo
            code can be applied per order unless stated otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">9. Accounts</h2>
          <p>
            You don&apos;t need an account to order, but creating one lets you track orders, save a wishlist, and
            earn loyalty points. You&apos;re responsible for keeping your login details secure and for activity
            on your account. You must be at least 18, or ordering with the involvement of a parent or guardian,
            to place an order.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">10. Acceptable use</h2>
          <p>
            Don&apos;t use the site to do anything illegal, to attempt to interfere with how it runs, or to abuse
            promo codes, the referral program, or the loyalty system (for example, creating multiple accounts to
            claim a one-time offer repeatedly). We can suspend or close an account that does this.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">11. Our content</h2>
          <p>
            Product photography, descriptions, and site design belong to Atlas Sports or our suppliers and
            shouldn&apos;t be copied or reused without permission. Team names, crests, and kit designs shown on
            the site belong to their respective clubs and leagues — we sell licensed or supplier-sourced
            merchandise, not our own branded goods.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">12. Liability</h2>
          <p>
            We&apos;re not liable for delays or issues caused by things outside our reasonable control — courier
            delays, payment provider outages, and similar. Beyond that, our responsibility for any order is
            limited to the value of that order; we&apos;re not liable for indirect losses.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">13. Changes to these terms</h2>
          <p>
            We may update these terms from time to time; the version live on the site at the time you place an
            order is the one that applies to it. Meaningful changes will update the date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">14. Governing law</h2>
          <p>
            These terms are governed by the laws of Lebanon. Any dispute that can&apos;t be resolved directly
            with us is subject to the jurisdiction of the Lebanese courts.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">15. Contact</h2>
          <p>
            Questions about an order or these terms: <a href="https://wa.me/96181752873" className="underline">WhatsApp us</a>.
            For anything else, use the contact details on our <a href="/about" className="underline">About</a> page.
          </p>
        </section>

      </div>
    </main>
  );
}
