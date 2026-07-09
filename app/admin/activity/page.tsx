import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

const ACTION_LABELS: Record<string, string> = {
  'product.create': 'Created product',
  'product.update': 'Updated product',
  'product.delete': 'Deleted product',
  'order.status': 'Changed order status',
  'order.manual_log': 'Logged manual order',
  'staff.role': 'Changed staff role',
  'promo.create': 'Created promo code',
  'settings.exchange_rate': 'Updated exchange rate',
  'settings.hero_slides': 'Updated hero slides',
  'page.create': 'Created page',
  'page.update': 'Updated page',
  'page.delete': 'Deleted page',
};

export default async function ActivityPage() {
  if (!HAS_SUPABASE) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-2xl mb-2">Activity log</h1>
        <p className="text-steel text-sm">Not available in prototype mode — connect Supabase to see this.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/activity');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = (profile as any)?.role as string | undefined;
  if (!role || !['admin', 'manager', 'owner'].includes(role)) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-3">Staff only</h1>
        <Link href="/" className="inline-block bg-volt text-ink px-6 py-3 rounded-full font-medium mt-4">Back to the store</Link>
      </main>
    );
  }

  const { data: rows } = await supabase
    .from('admin_audit_log')
    .select('id, action, target, detail, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Activity log</h1>
        <Link href="/admin" className="text-sm underline underline-offset-2 text-steel">Back to admin</Link>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-steel py-16 text-center">Nothing logged yet — actions taken in the admin panel will show up here.</p>
      ) : (
        <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/5 text-left text-steel">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-black/5 dark:border-white/5">
                  <td className="px-4 py-3 text-steel whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.profiles?.full_name ?? r.profiles?.email ?? '—'}</td>
                  <td className="px-4 py-3">{ACTION_LABELS[r.action] ?? r.action}</td>
                  <td className="px-4 py-3 text-steel truncate max-w-[280px]">{r.target ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
