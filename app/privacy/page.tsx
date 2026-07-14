export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-14 prose-sm">
      <h1 className="font-display text-3xl mb-2">Privacy Policy</h1>
      <p className="text-xs text-steel mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <div className="space-y-6 text-sm text-steel leading-relaxed">

        <p>
          This explains what Atlas Sports collects when you use our site, why, and what you can do about it.
          If you have a question this page doesn&apos;t answer, message us on{' '}
          <a href="https://wa.me/96181752873" className="underline">WhatsApp</a>.
        </p>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">1. What we collect</h2>
          <p>Depending on how you use the site, we collect:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><b>Account details</b> — name, email, phone number, and birthday if you choose to add one (used only to send a birthday offer).</li>
            <li><b>Order details</b> — delivery address, items ordered, payment method chosen, and order history.</li>
            <li><b>Browsing activity on our site</b> — search terms, pages and products viewed, and items you save to your wishlist, used to run features like search and personalized suggestions.</li>
            <li><b>Communications</b> — messages you send us on WhatsApp or through the site, and anything you tell our support chat.</li>
            <li><b>Cookies</b> — see the section below.</li>
          </ul>
          <p className="mt-2">
            We don&apos;t collect or store your full card number, Whish Pay, or OMT account details — those
            payments are handled directly by the provider.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">2. How we use it</h2>
          <p>To process and deliver your orders, provide support, run your account (loyalty points, wishlist, order tracking), send order and shipping updates, and — only if you&apos;ve opted in under Account → Settings — send you emails about new arrivals, restocks, or offers. We also use aggregated, non-identifying data (like which searches turn up nothing) to decide what to stock next.</p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">3. Cookies and analytics</h2>
          <p>
            We use essential cookies to keep your cart, session, and language preference working — these can&apos;t
            be turned off without breaking the site, and don&apos;t require consent under most privacy frameworks
            since they&apos;re strictly necessary for the site to function.
          </p>
          <p className="mt-2">
            If you accept optional cookies through the banner on our site, we also use Google Analytics and Vercel
            Analytics to understand traffic and improve the store — for example, which pages people visit and
            roughly where visitors are located. Neither is used to build advertising profiles about you, and
            nothing loads until you accept. You can decline, or change your mind later by clearing your
            browser&apos;s local storage for this site.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">4. Who we share it with</h2>
          <p>We don&apos;t sell your data. We share the minimum needed with:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><b>Payment providers</b> (Whish Pay, OMT, our card processor) — to process your payment.</li>
            <li><b>Delivery couriers</b> — your name, phone, and address, to get your order to you.</li>
            <li><b>Supabase</b>, our database and hosting provider — stores the data described above on our behalf, under their own security and privacy commitments.</li>
            <li><b>Resend</b>, our email provider — sends order confirmations and receipts.</li>
            <li>Our own team, internally, to process and fulfil your order — for example, a new order&apos;s essentials (order number, items, city) are sent to our staff Telegram so we can act on it quickly. We don&apos;t send your full address, phone number, or email to Telegram beyond what&apos;s needed to fulfil that specific order.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">5. How long we keep it</h2>
          <p>
            We keep order records for as long as needed for accounting, warranty, and legal purposes. If you ask
            us to delete your account (see below), we remove what we can while keeping the minimum needed to
            comply with financial record-keeping requirements.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">6. Your choices</h2>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><b>Update your info</b> anytime under Account → Settings.</li>
            <li><b>Turn off marketing emails</b> under Account → Settings — order-related emails (confirmations, shipping updates) will still be sent since they&apos;re necessary to fulfil your order.</li>
            <li><b>Request a copy or deletion of your data</b> by messaging us on WhatsApp. We don&apos;t currently have a self-service delete-my-account button, so this is handled manually — we&apos;ll confirm with you and action it within a reasonable time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">7. Security</h2>
          <p>
            We use industry-standard measures to protect your data — encrypted connections, access controls
            limiting who on our team can see what, and rate limiting on sensitive actions. No system is
            completely risk-free, but we take this seriously and review it as the site grows.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">8. Children</h2>
          <p>
            Atlas Sports isn&apos;t directed at children, and accounts require the account holder to be 18 or
            older, or to be created with a parent or guardian&apos;s involvement.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">9. Changes to this policy</h2>
          <p>
            If this policy changes in a meaningful way, we&apos;ll update the date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-ink dark:text-chalk font-medium mb-1.5">10. Contact</h2>
          <p>
            Questions, requests, or concerns about your data: <a href="https://wa.me/96181752873" className="underline">WhatsApp us</a>.
          </p>
        </section>

      </div>
    </main>
  );
}
