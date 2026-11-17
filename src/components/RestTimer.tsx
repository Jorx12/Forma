import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { deleteMeta, setMeta } from '../db/db';
import { useMeta } from '../db/hooks';
import { beep, vibrate } from '../lib/alerts';
import { fmtClock } from '../lib/dates';

export interface RestTimerState { endsAt: number; total: number; label?: string }

export const startRest = (sec: number, label?: string) =>
  setMeta('restTimer', { endsAt: Date.now() + sec * 1000, total: sec, label } satisfies RestTimerState);

export function RestTimer() {
  const t = useMeta<RestTimerState>('restTimer');
  const [now, setNow] = useState(Date.now());
  const fired = useRef<number | null>(null);

  useEffect(() => {
    if (!t) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [t]);

  const left = t ? (t.endsAt - now) / 1000 : 0;
  const finished = !!t && left <= 0;

  useEffect(() => {
    if (t && finished && fired.current !== t.endsAt) {
      fired.current = t.endsAt;
      // Només avisem si acaba de passar (no si tornem a obrir l'app molt després)
      if (now - t.endsAt < 5000) { vibrate(); beep(); }
    }
  }, [finished, t, now]);

  // Tanca sol l'avís de "descans acabat" al cap d'un minut
  useEffect(() => {
    if (t && finished && now - t.endsAt > 60_000) void deleteMeta('restTimer');
  }, [finished, now, t]);

  if (!t) return null;
  const pct = Math.max(0, Math.min(100, (left / t.total) * 100));
  const adjust = (d: number) => setMeta('restTimer', { ...t, endsAt: Math.max(Date.now(), t.endsAt) + d * 1000, total: Math.max(t.total + d, 1) });

  return (
    <div className={clsx('pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line backdrop-blur', finished ? 'animate-pulse bg-accent text-accent-ink' : 'bg-surface/95')}>
      {!finished && <div className="h-1 bg-accent transition-all" style={{ width: `${pct}%` }} />}
      <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-2.5">
        <div className="flex-1">
          <div className={clsx('text-xs', finished ? 'font-semibold' : 'text-muted')}>{finished ? 'Descans acabat! Següent sèrie 💪' : `Descans${t.label ? ` · ${t.label}` : ''}`}</div>
          <div className="tabular text-3xl font-bold">{finished ? '0:00' : fmtClock(left)}</div>
        </div>
        {!finished && (
          <>
            <button onClick={() => adjust(-15)} className="h-12 w-14 rounded-xl bg-surface-2 font-semibold">−15</button>
            <button onClick={() => adjust(15)} className="h-12 w-14 rounded-xl bg-surface-2 font-semibold">+15</button>
          </>
        )}
        <button onClick={() => deleteMeta('restTimer')} className={clsx('h-12 rounded-xl px-4 font-semibold', finished ? 'bg-accent-ink/15' : 'bg-surface-2')}>
          {finished ? "D'acord" : 'Saltar'}
        </button>
      </div>
    </div>
  );
}
