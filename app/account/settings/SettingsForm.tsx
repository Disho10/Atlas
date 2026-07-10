'use client';

import { useState, useTransition } from 'react';
import { updateSettings } from '../actions';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Initial = {
  full_name: string; email: string; phone: string; birthday: string;
  notify_new_categories: boolean; notify_tag_matches: boolean;
  notify_order_updates: boolean; notify_rewards: boolean;
};

export default function SettingsForm({ initial, demoMode = false }: { initial: Initial; demoMode?: boolean }) {
  const [f, setF] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { t } = useLocale();
  const set = (k: keyof Initial, v: any) => setF(prev => ({ ...prev, [k]: v }));

  const save = () => {
    if (demoMode) { setMsg({ ok: false, text: 'Connect Supabase to save settings.' }); return; }
    setMsg(null);
    start(async () => {
      const res = await updateSettings({
        full_name: f.full_name, phone: f.phone, birthday: f.birthday || null,
        notify_new_categories: f.notify_new_categories,
        notify_tag_matches: f.notify_tag_matches,
        notify_order_updates: f.notify_order_updates,
        notify_rewards: f.notify_rewards,
      });
      setMsg(res.ok ? { ok: true, text: t('account.saved') } : { ok: false, text: res.error });
    });
  };

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">{t('account.settingsTitle')}</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">{t('account.profile')}</h2>
        <div className="space-y-3">
          <Field label={t('account.name')}><input value={f.full_name} onChange={e => set('full_name', e.target.value)} className={inputCls} /></Field>
          <Field label={t('account.email')}><input value={f.email} disabled className={`${inputCls} opacity-60`} /></Field>
          <Field label={t('account.phone')}><input value={f.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></Field>
          <Field label={t('account.birthdayOptional')}>
            <input type="date" value={f.birthday ?? ''} onChange={e => set('birthday', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">{t('account.emailNotifications')}</h2>
        <div className="space-y-3 text-sm">
          <Toggle label={t('account.notifyNewCategories')} checked={f.notify_new_categories} onChange={v => set('notify_new_categories', v)} />
          <Toggle label={t('account.notifyTagMatches')} checked={f.notify_tag_matches} onChange={v => set('notify_tag_matches', v)} />
          <Toggle label={t('account.notifyOrderUpdates')} checked={f.notify_order_updates} onChange={v => set('notify_order_updates', v)} />
          <Toggle label={t('account.notifyRewards')} checked={f.notify_rewards} onChange={v => set('notify_rewards', v)} />
        </div>
      </section>

      <div className="mt-8 flex items-center gap-4">
        <button onClick={save} disabled={pending} className="bg-volt text-ink rounded-full px-6 py-3 text-sm font-medium btn-press disabled:opacity-50">
          {pending ? t('account.saving') : t('account.saveChanges')}
        </button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-pitch dark:text-volt' : 'text-crimson'}`}>{msg.text}</span>}
      </div>
    </main>
  );
}

const inputCls = 'w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl px-4 py-3 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs text-steel mb-1.5">{label}</span>{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span>{label}</span>
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onChange(!checked))}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-volt' : 'bg-black/15 dark:bg-white/15'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
    </label>
  );
}
