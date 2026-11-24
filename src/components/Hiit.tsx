import clsx from 'clsx';
import { Flame, Pause, Play, SkipForward, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CARDIO_ALLOWED, CARDIO_MACHINES, CARDIO_WARNING, cardioTotalSec, hiitPhases, HIIT_PROTOCOLS, isContinuous, machineLabel, planCardio, protocolById } from '../data/cardio';
import { deleteMeta, setMeta } from '../db/db';
import { useMeta } from '../db/hooks';
import type { CardioLog, Effort } from '../db/types';
import { beep, keepAwake, unlockAudio, vibrate } from '../lib/alerts';
import { fmtClock } from '../lib/dates';
import { Badge, Button, Card, Field, inputCls, Notice, Stepper } from './ui';

interface HiitState { sessionId: string; startedAt: number; pausedAt: number | null; pausedMs: number }

const PHASE_LABEL = { escalfar: 'Suau per començar', fort: 'FORT!', suau: 'Suau', calma: 'Tornada a la calma', continu: 'Ritme constant' } as const;
const EFFORTS: { value: Effort; label: string }[] = [{ value: 'facil', label: 'Fàcil' }, { value: 'correcte', label: 'Correcte' }, { value: 'dur', label: 'Dur' }];

const elapsedSec = (h: HiitState, now: number) => ((h.pausedAt ?? now) - h.startedAt - h.pausedMs) / 1000;

/** Bloc HIIT dins de la sessió: configuració, temporitzador i registre */
export function HiitBlock({ sessionId, cardio, onChange, onAdd }: {
  sessionId: string; cardio?: CardioLog; onChange: (c: CardioLog | undefined) => void; onAdd: () => void;
}) {
  const hiit = useMeta<HiitState>('hiit');
  const running = !!hiit && hiit.sessionId === sessionId;

  if (!cardio) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Avui sense cardio.</span>
          <Button size="sm" onClick={onAdd}><Flame size={16} /> Afegir cardio</Button>
        </div>
      </Card>
    );
  }

  const total = cardioTotalSec(cardio);
  const replan = (patch: Partial<Pick<CardioLog, 'machine' | 'protocolId' | 'plannedMin'>>) => {
    const next = { ...cardio, ...patch };
    onChange({ ...planCardio(next.plannedMin, next.machine, next.protocolId) });
  };

  if (cardio.done) {
    return (
      <Card title="Cardio" right={<Badge tone="accent">Fet</Badge>}>
        <p className="text-sm">{machineLabel(cardio.machine)} · {protocolById(cardio.protocolId).label} · {!isContinuous(cardio) && <strong>{cardio.roundsDone}/{cardio.rounds} rondes · </strong>}{fmtClock(cardio.durationSec)}</p>
        <div className="mt-3 flex gap-1.5">
          {EFFORTS.map((e) => (
            <button key={e.value} onClick={() => onChange({ ...cardio, effort: cardio.effort === e.value ? undefined : e.value })}
              className={clsx('h-10 flex-1 rounded-xl text-sm font-medium', cardio.effort === e.value ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>{e.label}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="kcal (opcional)"><input inputMode="numeric" className={inputCls} defaultValue={cardio.kcal ?? ''}
            onBlur={(ev) => { const n = parseFloat(ev.target.value); onChange({ ...cardio, kcal: Number.isFinite(n) ? n : undefined }); }} /></Field>
          <Field label="Distància km (opc.)"><input inputMode="decimal" className={inputCls} defaultValue={cardio.distanceKm ?? ''}
            onBlur={(ev) => { const n = parseFloat(ev.target.value.replace(',', '.')); onChange({ ...cardio, distanceKm: Number.isFinite(n) ? n : undefined }); }} /></Field>
        </div>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => onChange({ ...cardio, done: false, roundsDone: 0, durationSec: 0 })}>Tornar a fer</Button>
      </Card>
    );
  }

  return (
    <>
      <Card title={`Cardio · ${Math.round(total / 60)} min`}>
        <Notice tone="warn">⚠️ {CARDIO_WARNING}</Notice>
        <div className="mt-3" />
        <Field label="Màquina">
          <div className="grid grid-cols-3 gap-1.5">
            {CARDIO_MACHINES.filter((m) => CARDIO_ALLOWED.includes(m.id) || m.id === cardio.machine).map((m) => (
              <button key={m.id} onClick={() => replan({ machine: m.id })}
                className={clsx('min-h-11 rounded-xl px-2 text-sm font-medium', cardio.machine === m.id ? 'bg-accent text-accent-ink' : 'bg-surface-2')}>
                {m.label}{m.foot !== 'baix' && ' ⚠️'}
              </button>
            ))}
          </div>
        </Field>
        <div className="mt-3">
          <Field label="Intervals">
            <select className={inputCls} value={cardio.protocolId} onChange={(e) => replan({ protocolId: e.target.value })}>
              {HIIT_PROTOCOLS.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.level}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Stepper label="Minuts del bloc" value={cardio.plannedMin} step={1} min={6} max={30} unit="min" onChange={(v) => replan({ plannedMin: v })} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {isContinuous(cardio) ? `${cardio.plannedMin}' a ritme moderat (pots parlar però et costa una mica).` : `2' suaus + ${cardio.rounds} × (${cardio.workSec}" fort / ${cardio.restSec}" suau) + 1' de calma.`} {CARDIO_MACHINES.find((m) => m.id === cardio.machine)?.tip}
        </p>
        <Button variant="primary" size="lg" className="mt-3 w-full" onClick={() => {
          unlockAudio();
          void deleteMeta('restTimer');
          void setMeta('hiit', { sessionId, startedAt: Date.now(), pausedAt: null, pausedMs: 0 } satisfies HiitState);
        }}><Play /> {running ? 'Reprendre' : 'Començar cardio'}</Button>
        <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => onChange(undefined)}>Avui no faig cardio</Button>
      </Card>
      {running && hiit && <HiitTimer state={hiit} cardio={cardio} onDone={(roundsDone, durationSec) => {
        void deleteMeta('hiit');
        onChange({ ...cardio, done: true, roundsDone, durationSec: Math.round(durationSec) });
      }} />}
    </>
  );
}

function HiitTimer({ state, cardio, onDone }: { state: HiitState; cardio: CardioLog; onDone: (rounds: number, sec: number) => void }) {
  const [now, setNow] = useState(Date.now());
  const phases = hiitPhases(cardio);
  const total = phases[phases.length - 1].end;
  const t = elapsedSec(state, now);
  const idx = Math.max(0, phases.findIndex((p) => t < p.end));
  const phase = t >= total ? phases[phases.length - 1] : phases[idx];
  const left = phase.end - t;
  const lastIdx = useRef<number | null>(null);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    void keepAwake(true);
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  // Avisos: 3 pips curts abans de cada canvi i un de llarg en canviar
  useEffect(() => {
    if (state.pausedAt) return;
    if (lastIdx.current !== null && idx !== lastIdx.current) {
      if (phase.kind === 'fort') { beep(2); vibrate([400]); } else { beep(1); vibrate(200); }
    }
    lastIdx.current = idx;
    const secLeft = Math.ceil(left);
    if (secLeft <= 3 && secLeft >= 1 && lastTick.current !== secLeft && t < total) { beep(1); lastTick.current = secLeft; }
    if (secLeft > 3) lastTick.current = null;
  }, [idx, left, phase.kind, state.pausedAt, t, total]);

  const roundsDone = () => phases.filter((p) => p.kind === 'fort' && p.end <= t).length;

  const finished = useRef(false);
  const finish = (rounds: number, sec: number) => {
    if (finished.current) return;
    finished.current = true;
    onDone(rounds, sec);
  };
  useEffect(() => {
    if (t >= total && !finished.current) { beep(3); vibrate([300, 150, 300]); finish(cardio.rounds, total); }
  });

  const paused = state.pausedAt !== null;
  const togglePause = () => setMeta('hiit', paused
    ? { ...state, pausedAt: null, pausedMs: state.pausedMs + (Date.now() - state.pausedAt!) }
    : { ...state, pausedAt: Date.now() });
  const skip = () => setMeta('hiit', { ...state, startedAt: state.startedAt - Math.max(0, left) * 1000 });

  const bg = phase.kind === 'fort' ? 'bg-[#dc2626] text-white' : phase.kind === 'suau' || phase.kind === 'continu' ? 'bg-[#123a5c] text-white' : 'bg-surface text-text';
  const next = phases[idx + 1];

  return (
    <div className={clsx('pt-safe pb-safe fixed inset-0 z-50 flex flex-col transition-colors', bg)}>
      <div className="flex items-center justify-between px-5 pt-4 text-sm font-medium opacity-80">
        <span>{machineLabel(cardio.machine)}</span>
        <span className="tabular">{fmtClock(Math.max(0, total - t))} restant</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
        <div className="text-3xl font-extrabold uppercase tracking-wide">{PHASE_LABEL[phase.kind]}</div>
        <div className="tabular text-[7rem] leading-none font-black">{paused ? '❚❚' : fmtClock(left)}</div>
        {phase.round > 0 && phase.kind !== 'calma' && <div className="text-xl font-semibold">Ronda {phase.round} / {cardio.rounds}</div>}
        {next && <div className="mt-2 text-sm opacity-75">Després: {PHASE_LABEL[next.kind].toLowerCase()} {next.end - next.start}"</div>}
      </div>
      <div className="mx-5 mb-3 h-2 overflow-hidden rounded-full bg-black/20">
        <div className="h-full bg-current opacity-60" style={{ width: `${Math.min(100, (t / total) * 100)}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 px-5 pb-5">
        <button onClick={togglePause} className="flex h-16 flex-col items-center justify-center rounded-2xl bg-black/25 text-sm font-semibold">
          {paused ? <Play /> : <Pause />}{paused ? 'Continuar' : 'Pausa'}
        </button>
        <button onClick={skip} className="flex h-16 flex-col items-center justify-center rounded-2xl bg-black/25 text-sm font-semibold"><SkipForward />Saltar</button>
        <button onClick={() => { if (confirm('Acabar el cardio ara?')) finish(roundsDone(), t); }} className="flex h-16 flex-col items-center justify-center rounded-2xl bg-black/25 text-sm font-semibold"><Square />Acabar</button>
      </div>
    </div>
  );
}
