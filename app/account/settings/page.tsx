export default function SettingsPage() {
  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">Profile</h2>
        <div className="space-y-3">
          <input defaultValue="Ali" placeholder="Name" className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm" />
          <input defaultValue="" placeholder="Email" className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Email notifications</h2>
        <div className="space-y-3 text-sm">
          <Toggle label="New categories go live" defaultChecked />
          <Toggle label="Products related to tags I've viewed" defaultChecked />
          <Toggle label="Order status updates" defaultChecked />
          <Toggle label="Loyalty & referral rewards" />
        </div>
      </section>
    </main>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="w-5 h-5 accent-[#D6FF3F]" />
    </label>
  );
}
