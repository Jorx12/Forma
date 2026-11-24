import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Field, inputCls, Notice, Page, Stepper } from '../components/ui';
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
  const fromLogs = hab.loggedDays > 0;
  const f: WeeklyReview = form ?? existing ?? { week, sessionsDone: st.sessions, snacksPlanned: Math.min(5, hab.snacks), alcoholDays: hab.alcoholDays, savedAt: '' };
  const insight = alcoholInsight(weighIns, logs, reviews);
  const set = (patch: Partial<WeeklyReview>) => setForm({ ...f, ...patch });
  const alerts = reviewAlerts(week, profile, weighIns, measures, sessions, swims, todayISO());
  const waist = st.waistCm ?? waistIn ?? undefined;
  const canNext = addDaysISO(week, 7) <= addDaysISO(weekStartISO(todayISO()), -7);

  const items = [
    { ok: st.avgKg != null && waist != null, label: 'Mitjana de pes i cintura' },
    { ok: st.sessions >= 3, label: `Sessions fetes ${st.sessions}/3` },
    { ok: f.snacksPlanned >= 5, label: `Berenars ${f.snacksPlanned}/5` },
    { ok: f.alcoholDays <= 2, label: `Dies amb alcohol: ${f.alcoholDays} (màxim 2)` },
    { ok: !!f.nextGoal?.trim(), label: 'Un objectiu per a la setmana vinent' },
  ];

  async function save() {
    if (waistIn != null && st.waistCm == null) {
      await db.bodyMeasurements.put({ id: uid(), date: reviewDay <= todayISO() ? reviewDay : todayISO(), waistCm: waistIn });
    }
    await db.weeklyReviews.put({ ...f, week, avgKg: st.avgKg, waistCm: waist, sessionsDone: st.sessions, savedAt: new Date().toISOString() });
    setSaved(true);
  }

  return (
    <Page title="Revisió setmanal" back>
      <div className="-mt-2 flex items-center gap-2">
        <button aria-label="Setmana anterior" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2" onClick={() => setWeek(addDaysISO(week, -7))}><ChevronLeft /></button>
        <div className="flex-1 text-center text-sm"><strong>{fmtDate(week, 'd MMM')} – {fmtDate(addDaysISO(week, 6), 'd MMM')}</strong>{existing && <span className="ml-2 text-accent">✓ revisada</span>}</div>
        <button aria-label="Setmana següent" disabled={!canNext} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 disabled:opacity-30" onClick={() => setWeek(addDaysISO(week, 7))}><ChevronRight /></button>
      </div>

      {insight && f.alcoholDays >= 2 && (
        <Notice tone="info">🍷 A les teves setmanes amb 3 dies o més d'alcohol, la mitjana de pes {insight.high >= 0 ? 'puja' : 'baixa'} {fmtNum(Math.abs(insight.high), 2)} kg; amb 2 o menys, {insight.low >= 0 ? 'puja' : 'baixa'} {fmtNum(Math.abs(insight.low), 2)} kg ({insight.nHigh} i {insight.nLow} setmanes).</Notice>
      )}
      {alerts.map((x) => (
        <Notice key={x.id} tone={x.tone}>
          {x.text}
          {x.action === 'hotel' && <Button size="sm" className="mt-2 w-full" onClick={() => nav('/entrenar?dia=H')}>🧳 Rutina d'hotel</Button>}
        </Notice>
      ))}

      <Card title="Checklist">
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-3">
              <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', it.ok ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>{it.ok && <Check size={16} />}</span>
              <span className={clsx('text-sm', it.ok && 'text-muted')}>{it.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Pes i cintura">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">Mitjana de pes</div>
            <div className="tabular text-xl font-bold">{st.avgKg != null ? `${fmtNum(st.avgKg, 2)} kg` : '—'}</div>
            <div className="text-xs text-muted">{st.change != null ? `${st.change > 0 ? '+' : ''}${fmtNum(st.change, 2)} kg vs anterior` : 'sense comparació'}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">Cintura (dl {fmtDate(reviewDay, 'd/M')})</div>
            <div className="tabular text-xl font-bold">{waist != null ? `${fmtNum(waist)} cm` : '—'}</div>
            <div className="text-xs text-muted">{st.waistCm != null && st.prevWaistCm != null ? `${st.waistCm - st.prevWaistCm > 0 ? '+' : ''}${fmtNum(st.waistCm - st.prevWaistCm)} cm vs anterior` : ' '}</div>
          </div>
        </div>
        {st.avgKg == null && <p className="mt-2 text-xs text-muted">No hi ha pesades d'aquella setmana.</p>}
        {st.waistCm == null && (
          <div className="mt-3"><Stepper label="Cintura avui (cm)" value={waistIn ?? measures.filter((m) => m.waistCm).at(-1)?.waistCm ?? 95} step={0.5} digits={1} min={50} max={200} unit="cm" onChange={setWaistIn} /></div>
        )}
      </Card>

      <Card title="La setmana">
        <div className="space-y-3">
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">Sessions fetes: <strong>{st.sessions}/3</strong> <span className="text-muted">(força, natació i hotel)</span></div>
          {fromLogs && <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">Del registre diari ({hab.loggedDays} dies): <strong>{hab.snacks}</strong> berenars, <strong>{hab.alcoholDays}</strong> dies amb alcohol{hab.stepsAvg != null && <>, <strong>{hab.stepsAvg.toLocaleString('ca-ES')}</strong> passos/dia</>}.</div>}
          <Stepper label="Berenars fets o planificats (de 5)" value={f.snacksPlanned} step={1} min={0} max={5} onChange={(v) => set({ snacksPlanned: v })} />
          <Stepper label="Dies amb alcohol (màxim 2)" value={f.alcoholDays} step={1} min={0} max={7} onChange={(v) => set({ alcoholDays: v })} />
          {f.alcoholDays > 2 && <Notice tone="warn">Més de 2 dies amb alcohol. La setmana vinent, intenta deixar-ho en 2 com a màxim.</Notice>}
          <Field label="Objectiu per a la setmana vinent">
            <input className={inputCls} value={f.nextGoal ?? ''} placeholder="p. ex. planificar els 5 berenars el diumenge" onChange={(e) => set({ nextGoal: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Button variant="primary" size="lg" className="w-full" onClick={save}>{saved ? 'Revisió desada ✓' : existing ? 'Actualitzar revisió' : 'Desar revisió'}</Button>
    </Page>
  );
}
