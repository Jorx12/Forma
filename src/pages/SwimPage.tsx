import clsx from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FeelingPicker } from '../components/Feeling';
import { FeelingIcon } from '../components/Icons';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db, uid } from '../db/db';
import { useSwims } from '../db/hooks';
import type { Swim, SwimStyle } from '../db/types';
import { Button, Card, Disclosure, Empty, inputCls, Page, Sheet, Stat, Stepper } from '../components/ui';
import { fmtDate, todayISO, weekStartISO } from '../lib/dates';
import { fmtMeters, fmtPace, pace100, SWIM_STYLE_LABEL, swimWeeks } from '../lib/swim';

const STYLES = Object.keys(SWIM_STYLE_LABEL) as SwimStyle[];

export function SwimPage() {
  const swims = useSwims();
  const [edit, setEdit] = useState<Swim | null>(null);
  if (!swims) return null;
  const thisWeek = weekStartISO(todayISO());
  const week = swims.filter((s) => weekStartISO(s.date) === thisWeek);
  const weeks = swimWeeks(swims);
  const last4 = weeks.slice(-4).reduce((t, w) => t + w.minutes, 0);

  return (
    <Page title="Natació">
      <SwimForm last={swims[0]} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Setmana" value={`${week.reduce((t, s) => t + s.durationMin, 0)} min`} />
        <Stat label="4 setmanes" value={`${last4} min`} />
      </div>
      {swims.length > 0 && (
        <Card>
          <div style={{ height: 170 }} className="-ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickFormatter={(v) => fmtDate(v, 'd/M')} stroke="var(--muted)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="var(--muted)" fontSize={11} width={40} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }}
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
                
                <div className="min-w-0 flex-1">
                  <div className="text-[15px]">{s.durationMin} min <FeelingIcon value={s.feeling} /><span className="ml-2 text-sm text-muted">{fmtDate(s.date, 'EEE d MMM')}</span></div>
                  {(s.distanceM > 0 || s.note) && <div className="truncate text-xs text-muted">{s.distanceM > 0 && `${fmtMeters(s.distanceM)} · ${fmtPace(pace100(s))}`}{s.note && ` ${s.note}`}</div>}
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
    <Card>
      <SwimFields key={key} initial={initial} saveLabel={saved ? 'Desat' : 'Desar'} onSave={async (s) => {
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
  const chip = (on: boolean) => clsx('h-9 rounded-xl px-3 text-sm font-medium', on ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted');
  return (
    <div className="space-y-4">
      <Stepper value={s.durationMin} step={5} min={5} max={240} unit="min" onChange={(v) => set('durationMin', v)} />
      <FeelingPicker value={s.feeling} onChange={(f) => set('feeling', f)} />
      <input type="date" aria-label="Data" className={inputCls} value={s.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} />
      <Disclosure label="Distància i nota">
        <div className="space-y-4">
          <Stepper label="Distància" value={s.distanceM} step={s.poolM * 2} min={0} max={20000} unit="m" onChange={(v) => set('distanceM', v)} />
          {s.distanceM > 0 && <p className="-mt-2 text-center text-xs text-muted">{Math.round(s.distanceM / s.poolM)} llargs · {fmtPace(pace100(s))}</p>}
          <div className="flex flex-wrap gap-1.5">
            {([25, 50] as const).map((m) => <button key={m} type="button" className={chip(s.poolM === m)} onClick={() => set('poolM', m)}>Piscina {m} m</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((st) => <button key={st} type="button" onClick={() => set('style', st)} className={chip(s.style === st)}>{SWIM_STYLE_LABEL[st]}</button>)}
          </div>
          <input className={inputCls} value={s.note ?? ''} placeholder="Nota" onChange={(e) => set('note', e.target.value || undefined)} />
        </div>
      </Disclosure>
      <div className="flex gap-2">
        {onDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={18} /></Button>}
        <Button variant="primary" size="lg" className="flex-1" disabled={s.durationMin <= 0} onClick={() => onSave(s)}>{saveLabel}</Button>
      </div>
    </div>
  );
}
