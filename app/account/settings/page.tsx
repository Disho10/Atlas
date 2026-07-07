import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';

const HAS_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function SettingsPage() {
  if (!HAS_SUPABASE) {
    // Prototype preview
    return <SettingsForm initial={{ full_name: 'Ali', email: '', phone: '', birthday: '', notify_new_categories: true, notify_tag_matches: true, notify_order_updates: true, notify_rewards: false }} demoMode />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/settings');

  const { data: p } = await supabase
    .from('profiles')
    .select('full_name, email, phone, birthday, notify_new_categories, notify_tag_matches, notify_order_updates, notify_rewards')
    .eq('id', user.id)
    .single();

  return (
    <SettingsForm
      initial={{
        full_name: p?.full_name ?? '',
        email: p?.email ?? user.email ?? '',
        phone: p?.phone ?? '',
        birthday: p?.birthday ?? '',
        notify_new_categories: p?.notify_new_categories ?? true,
        notify_tag_matches: p?.notify_tag_matches ?? true,
        notify_order_updates: p?.notify_order_updates ?? true,
        notify_rewards: p?.notify_rewards ?? false,
      }}
    />
  );
}
