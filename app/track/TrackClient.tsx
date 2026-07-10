'use client';

import { useState, useTransition } from 'react';
import { trackOrder, fileReturn } from './actions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { TranslationKey } from '@/lib/i18n/dictionary';

const STEPS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'placed', labelKey: 'track.stepPlaced' },
  { id: 'confirmed', labelKey: 'track.stepConfirmed' },
  { id: 'shipped', labelKey: 'track.stepShipped' },
  { id: 'delivered', labelKey: 'track.stepDelivered' },
];

type Tracked = Awaited<ReturnType<typeof trackOrder>>;

export default function TrackClient() {
  const { t } = useLocale();
  const [orderNumber, setOrderNumber] = useState('');
  const [result, setResult] = useState<Tracked | null>(null);
  const [pending, start] = useTransition();

  const [returnMode, setReturnMode] = useState(false);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('');
  const [returnMsg, setReturnMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [returnPending, startReturn] = useTransition();

  const track = () => {
    setReturnMode(false);
    setReturnMsg(null);
    start(async () => setResult(await trackOrder(orderNumber)));
  };

  const submitReturn = () => {
    setReturnMsg(null);
    startReturn(async () => {
      const res = await fileReturn({ orderNumber, type: returnType, reason });
      if (res.ok) { setReturnMsg({ ok: true, text: "Request received — we'll be in touch to arrange it." }); setReason(''); }
      else setReturnMsg({ ok: false, text: res.error });
    });
  };

  const currentStep = result?.ok ? STEPS.findIndex(s => s.id === result.status) : -1;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">{t('track.title')}</h1>
      <p className="text-steel mb-8">{t('track.subtitle')}</p>

      <div className="flex gap-2 mb-10">
        <input
          value={orderNumber}
          onChange={e => setOrderNumber(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && track()}
          placeholder="ATL-10234"
          className="flex-1 border border-black/15 dark:border-white/20 bg-transparent rounded-full px-5 py-3.5 text-sm font-mono"
        />
        <button onClick={track} disabled={pending} className="bg-volt text-ink rounded-full px-7 font-medium btn-press disabled:opacity-50">
          {pending ? t('track.checking') : t('track.trackButton')}
        </button>
      </div>

      {result && !result.ok && (
        <div className="rounded-2xl border border-crimson/40 bg-crimson/5 px-5 py-4 text-sm text-crimson">{result.error}</div>
      )}

      {result && result.ok && (
        <div className="border border-black/10 dark:border-white/10 rounded-3xl p-8">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest2 text-steel">{t('track.order')}</p>
              <p className="font-mono text-lg">{orderNumber.toUpperCase()}</p>
            </div>
            <span className={`text-xs uppercase px-3 py-1.5 rounded-full ${result.delivered ? 'bg-pitch text-chalk' : 'bg-volt text-ink'}`}>
              {result.status}
            </span>
          </div>

          {/* Progress tracker */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={s.id} className="flex-1 flex items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                      ${done ? 'bg-volt text-ink' : 'bg-black/10 dark:bg-white/10 text-steel'} ${active ? 'ring-4 ring-volt/25' : ''}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[11px] mt-2 ${done ? '' : 'text-steel'}`}>{t(s.labelKey)}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-5 ${i < currentStep ? 'bg-volt' : 'bg-black/10 dark:bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Items */}
          <div className="border-t border-black/10 dark:border-white/10 pt-5 space-y-2">
            {result.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{it.name}{it.size ? ` · ${it.size}` : ''}</span>
                <span className="text-steel">×{it.qty}</span>
              </div>
            ))}
          </div>

          {/* Delivered = tracking closed; returns available for 14 days */}
          {result.expired ? (
            <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10">
              <p className="text-sm text-steel mb-4">
                {t('track.deliveredClosed')}
              </p>
              {!returnMode ? (
                <button onClick={() => setReturnMode(true)} className="text-sm border border-black/15 dark:border-white/20 rounded-full px-5 py-2.5 btn-press">
                  {t('track.startReturn')}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['return', 'exchange'] as const).map(rt => (
                      <button key={rt} onClick={() => setReturnType(rt)}
                        className={`text-sm capitalize px-4 py-2 rounded-full border ${returnType === rt ? 'bg-ink text-chalk dark:bg-chalk dark:text-ink border-transparent' : 'border-black/15 dark:border-white/20'}`}>
                        {rt === 'return' ? t('track.return') : t('track.exchange')}
                      </button>
                    ))}
                  </div>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder={t('track.reasonPlaceholder')}
                    className="w-full border border-black/15 dark:border-white/20 bg-transparent rounded-xl p-3 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={submitReturn} disabled={returnPending} className="text-sm bg-volt text-ink rounded-full px-5 py-2.5 font-medium btn-press disabled:opacity-50">
                      {returnPending ? t('track.submitting') : `${t('track.submit')} — ${returnType === 'return' ? t('track.return') : t('track.exchange')}`}
                    </button>
                    <button onClick={() => setReturnMode(false)} className="text-sm px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20">{t('track.cancel')}</button>
                  </div>
                </div>
              )}
              {returnMsg && (
                <p className={`text-sm mt-3 ${returnMsg.ok ? 'text-pitch dark:text-volt' : 'text-crimson'}`}>{returnMsg.text}</p>
              )}
            </div>
          ) : (
            <p className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 text-sm text-steel">
              {t('track.willKeepUpdated')}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
