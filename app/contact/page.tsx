import { getSiteSettings } from '@/lib/data';
import { whatsappLink } from '@/lib/settings';

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const wa = whatsappLink(settings.whatsappNumber, "Hi, I have a question about Atlas Sports.");

  return (
    <main>
      <section className="bg-ink text-chalk py-16 grain relative overflow-hidden">
        <div className="glow-orb w-[28rem] h-[28rem] bg-volt -top-24 -right-24 opacity-20" />
        <div className="max-w-2xl mx-auto px-6 relative z-10">
          <span className="text-volt text-xs uppercase tracking-widest2">Get in touch</span>
          <h1 className="font-display text-5xl mt-3 leading-tight">We&apos;re actually here.</h1>
          <p className="text-chalk/60 mt-4 max-w-md">
            No ticket system, no chatbot loop — a real person answers, usually fast.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-black/10 dark:border-white/10 p-6 card-hover block"
          >
            <div className="w-10 h-10 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C10.1 9 9.6 7.8 9.4 7.3c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.1-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.2L2 22l4.9-1.3C8.5 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.3.9.9-3.2-.2-.3C3.9 14.6 3.5 13.3 3.5 12c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5z"/></svg>
            </div>
            <p className="font-medium mb-1">WhatsApp</p>
            <p className="text-sm text-steel">Fastest way to reach us — order questions, sizing help, anything.</p>
          </a>

          <a href="/track" className="rounded-2xl border border-black/10 dark:border-white/10 p-6 card-hover block">
            <div className="w-10 h-10 rounded-full bg-volt/15 text-pitch dark:text-volt flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z" /></svg>
            </div>
            <p className="font-medium mb-1">Track an order</p>
            <p className="text-sm text-steel">Already ordered? Check your status or start a return without messaging us at all.</p>
          </a>
        </div>

        <div className="space-y-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-widest2 text-steel mb-1.5">Hours</p>
            <p>{settings.businessHours}</p>
            <p className="text-steel mt-1">Message us anytime — we reply as soon as we&apos;re back, even outside these hours.</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest2 text-steel mb-1.5">Before you message us about an order</p>
            <p className="text-steel">
              Have your order number ready (starts with <span className="font-mono">ATL-</span>) — it&apos;s on your
              confirmation and in <a href="/track" className="underline underline-offset-2">order tracking</a>. It&apos;s the fastest way for us to pull up your order and help.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest2 text-steel mb-1.5">Other questions</p>
            <p className="text-steel">
              Sizing, delivery estimates, and returns are all covered on our{' '}
              <a href="/shipping" className="underline underline-offset-2">Shipping &amp; Delivery</a> page —
              worth a look before you message, might save you the wait.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
