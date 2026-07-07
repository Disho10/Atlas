import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoyaltyClient from './LoyaltyClient';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function LoyaltyPage() {
  if (!HAS_SUPABASE) {
    return <LoyaltyClient balance={240} lifetime={640} ledger={[]} demoMode />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/loyalty');

  const [{ data: p }, { data: ledger }] = await Promise.all([
    supabase.from('profiles').select('loyalty_points, lifetime_points').eq('id', user.id).single(),
    supabase.from('loyalty_ledger').select('delta, reason, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <LoyaltyClient
      balance={p?.loyalty_points ?? 0}
      lifetime={p?.lifetime_points ?? 0}
      ledger={(ledger ?? []).map(l => ({ delta: l.delta, reason: l.reason, date: (l.created_at ?? '').slice(0, 10) }))}
    />
  );
}
