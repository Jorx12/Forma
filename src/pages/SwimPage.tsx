import clsx from 'clsx';
import { Pencil, Trash2, Waves } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FeelingPicker, feelingEmoji } from '../components/Feeling';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db, uid } from '../db/db';
import { useSwims } from '../db/hooks';
import type { Effort, Swim, SwimStyle } from '../db/types';
import { Button, Card, Empty, Field, inputCls, Page, Segmented, Sheet, Stat, Stepper } from '../components/ui';
import { fmtDate, todayISO, weekStartISO } from '../lib/dates';
import { fmtMeters, fmtPace, pace100, SWIM_STYLE_LABEL, swimWeeks } from '../lib/swim';

const EFFORTS: { value: Effort; label: string }[] = [{ value: 'facil', label: 'Fàcil' }, { value: 'correcte', label: 'Correcte' }, { value: 'dur', label: 'Dur' }];
const STYLES = Object.keys(SWIM_STYLE_LABEL) as SwimStyle[];

export function SwimPage() {
  const swims = useSwims();
  const [edit, setEdit] = useState<Swim | null>(null);
  if (!swims) return null;
  const thisWeek = weekStartISO(todayISO());
  const week = swims.filter((s) => weekStartISO(s.date) === thisWeek);
  const weeks = swimWeeks(swims);
  const last4 = weeks.slice(-4).reduce((t, w) => t + w.minutes, 0);
  const recent = swims.filter((s) => s.distanceM > 0).slice(0, 5);
  const avgPace = recent.length ? recent.reduce((t, s) => t + pace100(s), 0) / recent.length : 0;
  const best = swims.filter((s) => s.distanceM >= 400).reduce((b, s) => (!b || pace100(s) < pace100(b) ? s : b), null as Swim | null);

  return (
    <Page title="Natació">
      <p className="-mt-2 text-sm text-muted">Dilluns: 40–45 min. Apunta els minuts i com t'has sentit (la distància és opcional).</p>
      <SwimForm last={swims[0]} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Aquesta setmana" value={`${week.reduce((t, s) => t + s.durationMin, 0)} min`} sub={`${week.length} sessions`} />
        <Stat label="Últimes 4 setmanes" value={`${last4} min`} sub={`${weeks.slice(-4).reduce((t, w) => t + w.count, 0)} sessions`} />
        <Stat label="Ritme mitjà" value={avgPace ? fmtPace(avgPace).replace(' /100 m', '') : '—'} sub="/100 m · últimes 5" />
        <Stat label="Millor ritme" value={best ? fmtPace(pace100(best)).replace(' /100 m', '') : '—'} sub={best ? `${fmtMeters(best.distanceM)} · ${fmtDate(best.date, 'd MMM')}` : 'sessions de 400 m o més'} />
      </div>
      {swims.length > 0 && (
        <Card title="Minuts per setmana">
          <div style={{ height: 170 }} className="-ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickFormatter={(v) => fmtDate(v, 'd/M')} stroke="var(--muted)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="var(--muted)" fontSize={11} width={40} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }}
                  labelFormatter={(v) => `Setmana del ${fmtDate(String(v), 'd MMM')}`} formatter={(v) => [`${v} min`, '']} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="minutes" fill="var(--info)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <Card title="Historial">
        {swims.length === 0 ? <Empty>Encara no has registrat cap sessió de natació.</Empty> : (
          <ul className="divide-y divide-line">
            {swims.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <Waves size={20} className="shrink-0 text-info" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.durationMin} min {feelingEmoji(s.feeling)} <span className="text-sm font-normal text-muted">{s.distanceM > 0 && `· ${fmtMeters(s.distanceM)} · ${fmtPace(pace100(s))}`}</span></div>
                  <div className="truncate text-xs text-muted">{fmtDate(s.date, 'EEE d MMM')} · {SWIM_STYLE_LABEL[s.style]} · piscina {s.poolM} m{s.effort && ` · ${EFFORTS.find((e) => e.value === s.effort)?.label.toLowerCase()}`}{s.note && ` · ${s.note}`}{s.isDemo && ' · prova'}</div>
                </div>
                <button aria-label="Editar" onClick={() => setEdit(s)} className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-surface-2"><Pencil size={18} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Editar sessió">
        {edit && <SwimFields initial={edit} onSave={async (s) => { await db.swims.put(s); setEdit(null); }}
          onDelete={async () => { if (confirm('Esborrar aquesta sessió?')) { await db.swims.delete(edit.id); setEdit(null); } }} />}
      </Sheet>
    </Page>
  );
}

function SwimForm({ last }: { last?: Swim }) {
  const [params] = useSearchParams();
  const [key, setKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const initial: Swim = {
    id: uid(), date: params.get('data') ?? todayISO(), durationMin: last?.durationMin ?? 45, distanceM: 0,
    poolM: last?.poolM ?? 25, style: last?.style ?? 'crol',
  };
  return (
    <Card title="Nova sessió">
      <SwimFields key={key} initial={initial} saveLabel={saved ? 'Desat ✓' : 'Desar sessió'} onSave={async (s) => {
        await db.swims.put({ ...s, id: uid() });
        setSaved(true); setKey(key + 1);
        setTimeout(() => setSaved(false), 2000);
      }} />
    </Card>
  );
}

function SwimFields({ initial, onSave, onDelete, saveLabel = 'Desar' }: {
  initial: Swim; onSave: (s: Swim) => void; onDelete?: () => void; saveLabel?: string;
}) {
  const [s, setS] = useState<Swim>(initial);
  const set = <K extends keyof Swim>(k: K, v: Swim[K]) => setS({ ...s, [k]: v });
  return (
    <div className="space-y-3">
      <Stepper label="Minuts" value={s.durationMin} step={5} min={5} max={240} unit="min" onChange={(v) => set('durationMin', v)} />
      <Field label="Sensació"><FeelingPicker value={s.feeling} onChange={(f) => set('feeling', f)} /></Field>
      <Stepper label="Distància (opcional)" value={s.distanceM} step={s.poolM * 2} min={0} max={20000} unit="m" onChange={(v) => set('distanceM', v)} />
      {s.distanceM > 0 && <p className="-mt-2 text-center text-xs text-muted">{Math.round(s.distanceM / s.poolM)} llargs de {s.poolM} m · {fmtPace(pace100(s))}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data"><input type="date" className={inputCls} value={s.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Piscina">
          <Segmented value={String(s.poolM) as '25' | '50'} onChange={(v) => set('poolM', Number(v) as 25 | 50)} options={[{ value: '25', label: '25 m' }, { value: '50', label: '50 m' }]} />
        </Field>
      </div>
      <Field label="Estil">
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((st) => (
            <button key={st} type="button" onClick={() => set('style', st)}
              className={clsx('h-10 rounded-xl px-3 text-sm font-medium', s.style === st ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>{SWIM_STYLE_LABEL[st]}</button>
          ))}
        </div>
      </Field>
      <Field label="Esforç (opcional)">
        <div className="flex gap-1.5">
          {EFFORTS.map((e) => (
            <button key={e.value} type="button" onClick={() => set('effort', s.effort === e.value ? undefined : e.value)}
              className={clsx('h-10 flex-1 rounded-xl text-sm font-medium', s.effort === e.value ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>{e.label}</button>
          ))}
        </div>
      </Field>
      <Field label="Nota (opcional)"><input className={inputCls} value={s.note ?? ''} placeholder="p. ex. 10×100 amb 20 s de descans" onChange={(e) => set('note', e.target.value || undefined)} /></Field>
      <div className="flex gap-2">
        {onDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={18} /></Button>}
        <Button variant="primary" size="lg" className="flex-1" disabled={s.durationMin <= 0} onClick={() => onSave(s)}>{saveLabel}</Button>
      </div>
    </div>
  );
}
