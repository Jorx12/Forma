import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, inputCls, Notice, Page, Stepper } from '../components/ui';
import { db, uid } from '../db/db';
import { useDailyLogs, useMeasurements, useProfile, useReviews, useSessions, useSwims, useWeighIns } from '../db/hooks';
import { alcoholInsight, weekHabits } from '../lib/habits';
import type { WeeklyReview } from '../db/types';
import { addDaysISO, fmtDate, fmtNum, todayISO, weekStartISO } from '../lib/dates';
import { reviewAlerts, weekStats } from '../lib/review';

/** Revisió setmanal: cada dilluns es revisa la setmana anterior */
export function ReviewPage() {
  const profile = useProfile();
  const weighIns = useWeighIns();
  const measures = useMeasurements();
  const sessions = useSessions();
  const swims = useSwims();
  const reviews = useReviews();
  const logs = useDailyLogs();
  const nav = useNavigate();
  const [week, setWeek] = useState(addDaysISO(weekStartISO(todayISO()), -7));
  const [form, setForm] = useState<WeeklyReview | null>(null);
  const [waistIn, setWaistIn] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const existing = reviews?.find((r) => r.week === week);
  useEffect(() => { setForm(null); setWaistIn(null); setSaved(false); }, [week]);
  if (!profile || !weighIns || !measures || !sessions || !swims || !reviews || !logs) return null;

  const st = weekStats(week, weighIns, measures, sessions, swims);
  const reviewDay = addDaysISO(week, 7);
  const hab = weekHabits(week, logs);
  const f: WeeklyReview = form ?? existing ?? { week, sessionsDone: st.sessions, snacksPlanned: Math.min(5, hab.snacks), alcoholDays: hab.alcoholDays, savedAt: '' };
  const insight = alcoholInsight(weighIns, logs, reviews);
  const set = (patch: Partial<WeeklyReview>) => setForm({ ...f, ...patch });
  const alerts = reviewAlerts(week, profile, weighIns, measures, sessions, swims, todayISO());
  const waist = st.waistCm ?? waistIn ?? undefined;
  const canNext = addDaysISO(week, 7) <= addDaysISO(weekStartISO(todayISO()), -7);


  async function save() {
    if (waistIn != null && st.waistCm == null) {
      await db.bodyMeasurements.put({ id: uid(), date: reviewDay <= todayISO() ? reviewDay : todayISO(), waistCm: waistIn });
    }
    await db.weeklyReviews.put({ ...f, week, avgKg: st.avgKg, waistCm: waist, sessionsDone: st.sessions, savedAt: new Date().toISOString() });
    setSaved(true);
  }

  return (
    <Page title="Revisió" back>
      <div className="-mt-2 flex items-center gap-2">
        <button aria-label="Setmana anterior" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2" onClick={() => setWeek(addDaysISO(week, -7))}><ChevronLeft /></button>
        <div className="flex-1 text-center text-sm"><strong>{fmtDate(week, 'd MMM')} – {fmtDate(addDaysISO(week, 6), 'd MMM')}</strong>{existing && <span className="ml-2 text-accent">✓</span>}</div>
        <button aria-label="Setmana següent" disabled={!canNext} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 disabled:opacity-30" onClick={() => setWeek(addDaysISO(week, 7))}><ChevronRight /></button>
      </div>

      {insight && f.alcoholDays >= 2 && (
        <Notice tone="info">🍷 3+ dies d'alcohol: {insight.high >= 0 ? '+' : '−'}{fmtNum(Math.abs(insight.high), 2)} kg/setm. · 2 o menys: {insight.low >= 0 ? '+' : '−'}{fmtNum(Math.abs(insight.low), 2)} kg/setm.</Notice>
      )}
      {alerts.map((x) => (
        <Notice key={x.id} tone={x.tone}>
          {x.text}
          {x.action === 'hotel' && <Button size="sm" className="mt-2 w-full" onClick={() => nav('/entrenar?dia=H')}>🧳 Rutina d'hotel</Button>}
        </Notice>
      ))}

      <Card className="py-2">
        <ul className="divide-y divide-line">
          <CheckRow ok={st.avgKg != null && waist != null} label="Pes i cintura"
            value={<span className="tabular text-right text-sm">{st.avgKg != null ? `${fmtNum(st.avgKg, 2)} kg` : '—'}{st.change != null && <span className={st.change <= 0 ? 'text-accent' : 'text-warn'}> {st.change > 0 ? '+' : '−'}{fmtNum(Math.abs(st.change), 2)}</span>}<br /><span className="text-muted">{waist != null ? `${fmtNum(waist)} cm` : 'cintura —'}</span></span>} />
          {st.waistCm == null && (
            <li className="py-3"><Stepper compact label="Cintura (cm)" value={waistIn ?? measures.filter((m) => m.waistCm).at(-1)?.waistCm ?? 95} step={0.5} digits={1} min={50} max={200} unit="cm" onChange={setWaistIn} /></li>
          )}
          <CheckRow ok={st.sessions >= 3} label="Sessions" value={<span className="tabular">{st.sessions}/3</span>} />
          <CheckRow ok={f.snacksPlanned >= 5} label="Berenars"
            value={<Mini value={f.snacksPlanned} max={5} onChange={(v) => set({ snacksPlanned: v })} suffix="/5" />} />
          <CheckRow ok={f.alcoholDays <= 2} label="Alcohol (màx. 2)"
            value={<Mini value={f.alcoholDays} max={7} onChange={(v) => set({ alcoholDays: v })} />} />
          <CheckRow ok={!!f.nextGoal?.trim()} label="Objectiu" />
          <li className="pb-3">
            <input className={inputCls} value={f.nextGoal ?? ''} placeholder="Per a la setmana vinent" onChange={(e) => set({ nextGoal: e.target.value })} />
          </li>
        </ul>
      </Card>

      <Button variant="primary" size="lg" className="w-full" onClick={save}>{saved ? 'Desat ✓' : existing ? 'Actualitzar' : 'Desar'}</Button>
    </Page>
  );
}

function CheckRow({ ok, label, sub, value }: { ok: boolean; label: string; sub?: string; value?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', ok ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>{ok && <Check size={14} />}</span>
      <span className="min-w-0 flex-1"><span className="block text-[15px]">{label}</span>{sub && <span className="block text-xs text-muted">{sub}</span>}</span>
      {value}
    </li>
  );
}

function Mini({ value, max, onChange, suffix }: { value: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  const b = 'flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 text-lg leading-none';
  return (
    <span className="flex items-center gap-2">
      <button className={b} aria-label="Menys" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span className="tabular w-8 text-center">{value}{suffix}</span>
      <button className={b} aria-label="Més" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </span>
  );
}
