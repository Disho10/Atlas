import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReferralsClient from './ReferralsClient';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function ReferralsPage() {
  if (!HAS_SUPABASE) {
    return <ReferralsClient code="ATLAS-DEMO" referrals={[]} rewardPoints={150} demoMode />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/referrals');

  const [{ data: p }, { data: reds }] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', user.id).single(),
    supabase.from('referral_redemptions').select('rewarded, created_at').eq('code', (await supabase.from('profiles').select('referral_code').eq('id', user.id).single()).data?.referral_code ?? ''),
  ]);

  return (
    <ReferralsClient
      code={p?.referral_code ?? ''}
      referrals={(reds ?? []).map(r => ({ rewarded: r.rewarded, date: (r.created_at ?? '').slice(0, 10) }))}
      rewardPoints={150}
    />
  );
}
