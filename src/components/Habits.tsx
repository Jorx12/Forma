import clsx from 'clsx';
import { ClipboardPaste, Footprints } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { DailyLog } from '../db/types';
import { fmtDate, todayISO } from '../lib/dates';
import { applyShortcut, parseShortcut, setLog, STEPS_GOAL, type ShortcutData } from '../lib/habits';
import { Button, Card, Notice, Sheet, Stepper } from './ui';

/** Fila d'hàbits del dia: berenar, alcohol i passos (10 segons) */
export function HabitsCard({ date, log }: { date: string; log?: DailyLog }) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const [paste, setPaste] = useState(false);
  const isToday = date === todayISO();
  const steps = log?.steps;
  const stepsTone = steps == null ? 'text-muted' : steps >= STEPS_GOAL.min ? 'text-accent' : 'text-warn';
  return (
    <Card title={isToday ? 'Hàbits d\'avui' : `Hàbits · ${fmtDate(date, 'EEE d MMM')}`}
      right={<button className="flex items-center gap-1 text-xs text-info" onClick={() => setPaste(true)}><ClipboardPaste size={14} /> Dreceres</button>}>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setLog(date, { snack: !log?.snack })}
          className={clsx('flex h-20 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium', log?.snack ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>
          <span className="text-2xl leading-none">🍎</span>{log?.snack ? 'Berenar fet' : 'Berenar?'}
        </button>
        <button onClick={() => setLog(date, { alcohol: log?.alcohol === true ? false : log?.alcohol === false ? undefined : true })}
          className={clsx('flex h-20 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium',
            log?.alcohol === true ? 'bg-warn/25 text-warn' : log?.alcohol === false ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted')}>
          <span className="text-2xl leading-none">{log?.alcohol === false ? '💧' : '🍷'}</span>
          {log?.alcohol === true ? 'Alcohol: sí' : log?.alcohol === false ? 'Sense alcohol' : 'Alcohol?'}
        </button>
        <button onClick={() => setStepsOpen(true)} className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 text-xs font-medium">
          <Footprints size={24} className={stepsTone} />
          <span className={clsx('tabular', stepsTone)}>{steps != null ? `${steps.toLocaleString('ca-ES')}` : 'Passos?'}</span>
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted">Toca per marcar. L'alcohol té tres estats: sense marcar → sí → no. Omple la revisió setmanal sola.</p>
      <Sheet open={stepsOpen} onClose={() => setStepsOpen(false)} title="Passos">
        <StepsEditor date={date} value={steps ?? 8000} onDone={() => setStepsOpen(false)} />
      </Sheet>
      <Sheet open={paste} onClose={() => setPaste(false)} title="Dades de Dreceres">
        <PasteShortcut onDone={() => setPaste(false)} />
      </Sheet>
    </Card>
  );
}

function StepsEditor({ date, value, onDone }: { date: string; value: number; onDone: () => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="space-y-3">
      <Stepper value={v} onChange={setV} step={500} min={0} max={60000} />
      <p className="text-center text-xs text-muted">Objectiu: {STEPS_GOAL.min.toLocaleString('ca-ES')}–{STEPS_GOAL.max.toLocaleString('ca-ES')} passos</p>
      <Button variant="primary" size="lg" className="w-full" onClick={async () => { await setLog(date, { steps: v, stepsSource: 'manual' }); onDone(); }}>Desar</Button>
    </div>
  );
}

/** Llegeix el porta-retalls (o el text enganxat) i desa passos i pes */
export function PasteShortcut({ initial, onDone }: { initial?: ShortcutData | null; onDone: () => void }) {
  const [data, setData] = useState<ShortcutData | null>(initial ?? null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readClipboard() {
    setError(null);
    try {
      const t = await navigator.clipboard.readText();
      const d = parseShortcut(t);
      if (d) setData(d); else setError('El porta-retalls no té dades de Forma. Executa primer la drecera.');
    } catch {
      setError('No s\'ha pogut llegir el porta-retalls. Enganxa el text a sota.');
    }
  }

  if (msg) return <div className="space-y-3"><Notice tone="ok">{msg}</Notice><Button className="w-full" onClick={onDone}>D'acord</Button></div>;

  return (
    <div className="space-y-3">
      {!data && (
        <>
          <Button variant="primary" size="lg" className="w-full" onClick={readClipboard}><ClipboardPaste /> Enganxar de Dreceres</Button>
          {error && <Notice tone="warn">{error}</Notice>}
          <textarea className="h-20 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm" placeholder="o enganxa aquí: FORMA passos=8532 pes=83,4"
            value={text} onChange={(e) => { setText(e.target.value); setData(parseShortcut(e.target.value)); }} />
          <Link to="/mes/dreceres" className="block text-center text-xs text-info" onClick={onDone}>Com crear la drecera de l'iPhone</Link>
        </>
      )}
      {data && (
        <>
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <div className="mb-1 text-xs text-muted">{fmtDate(data.date ?? todayISO(), 'EEEE d MMMM')}</div>
            {data.steps != null && <div>👟 <strong>{data.steps.toLocaleString('ca-ES')}</strong> passos</div>}
            {data.weightKg != null && <div>⚖️ <strong>{data.weightKg.toLocaleString('ca-ES')} kg</strong></div>}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setData(null)}>Cancel·lar</Button>
            <Button variant="primary" className="flex-1" onClick={async () => {
              const r = await applyShortcut(data);
              setMsg(`Desat (${fmtDate(r.date, 'd MMM')}): ${r.result.join(' · ')}.`);
            }}>Desar</Button>
          </div>
        </>
      )}
    </div>
  );
}
