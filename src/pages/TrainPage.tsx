import { Clock, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useActiveRoutine, useExercises, useMeta, useProfile, useSchedule, useSessions } from '../db/hooks';
import type { DayKey } from '../db/types';
import { Badge, Button, Card, Notice, Page, Segmented, Stepper } from '../components/ui';
import { durationLabel, MAX_MINUTES, MIN_MINUTES, planSession, sessionMinutes } from '../lib/duration';
import { CARDIO_WARNING, isContinuous, machineLabel, protocolById } from '../data/cardio';
import { dayLabel } from '../data/plan';
import { planFor } from '../lib/schedule';
import { fmtDate, todayISO } from '../lib/dates';
import { deloadDue, isAdaptation, nextDayKey } from '../lib/progression';
import { startSession } from '../lib/session';
import { unlockAudio } from '../lib/alerts';
import { createRoutine } from './RoutinePage';

export function TrainPage() {
  const profile = useProfile();
  const routine = useActiveRoutine();
  const exercises = useExercises();
  const sessions = useSessions();
  const activeId = useMeta<string>('activeSessionId');
  const nav = useNavigate();
  const [params] = useSearchParams();
  const schedule = useSchedule();
  const [day, setDay] = useState<DayKey | null>(null);
  const [deload, setDeload] = useState<boolean | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [cardioOn, setCardioOn] = useState<boolean | null>(null);
  if (!profile || routine === undefined || !exercises || !sessions || activeId === undefined || !schedule) return null;

  const active = activeId ? sessions.find((s) => s.id === activeId && s.status === 'en_curs') : undefined;
  const keys = routine?.days.map((d) => d.key) ?? ['A', 'B', 'C'];
  const today = planFor(todayISO(), profile, schedule);
  const todayKey: DayKey | undefined = today.activity === 'forca_A' ? 'A' : today.activity === 'forca_B' ? 'B' : today.activity === 'hotel' ? 'H' : undefined;
  const paramKey = params.get('dia') as DayKey | null;
  const comeback = params.get('tornada') === '1' || today.comeback;
  const next = nextDayKey(sessions, keys);
  const proposed = (paramKey && keys.includes(paramKey) ? paramKey : undefined) ?? (todayKey && keys.includes(todayKey) ? todayKey : undefined) ?? next;
  const chosen = day ?? proposed;
  const dl = deloadDue(profile, sessions);
  const deloadOn = deload ?? (dl.due && !routine?.fixed);
  const adaptation = isAdaptation(profile, sessions);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const lastDone = sessions.find((s) => s.status === 'feta');

  if (active) {
    return (
      <Page title="Entrenar">
        <Card title="Entrenament en curs">
          <p className="mb-3 text-sm text-muted">{dayLabel(active.dayKey, routine?.days)} · començat a les {new Date(active.startedAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          <Button variant="primary" size="lg" className="w-full" onClick={() => { unlockAudio(); nav('/entrenar/sessio'); }}><RotateCcw /> Continuar entrenament</Button>
        </Card>
      </Page>
    );
  }

  if (!routine) {
    return (
      <Page title="Entrenar">
        <Card>
          <p className="mb-3">Encara no tens cap rutina. Revisa el catàleg de màquines i genera'n una.</p>
          <div className="flex flex-col gap-2">
            <Link to="/mes/maquines"><Button className="w-full">Revisar màquines</Button></Link>
            <Button variant="primary" onClick={() => createRoutine(exercises, profile)}>Generar rutina ara</Button>
          </div>
        </Card>
      </Page>
    );
  }

  const rd = routine.days.find((d) => d.key === chosen);
  const all = rd?.items ?? [];
  const circuit = !!rd?.circuit;
  const mins = minutes ?? (comeback ? 30 : sessionMinutes(profile));
  const withCardio = cardioOn ?? (comeback ? false : (profile.cardio?.enabled ?? true));
  const plan = planSession(all, mins, byId, profile, { cardioOn: withCardio, fixed: routine.fixed, day: rd, minMinutes: comeback ? 30 : undefined });
  const fit = plan.strength;
  const skipped = all.length - fit.items.length;

  return (
    <Page title="Entrenar">
      {adaptation && (
        <Notice tone="info"><strong>Fase d'adaptació</strong> (primeres {profile.adaptationWeeks} setmanes): deixa unes 3 repeticions de marge a cada sèrie (RIR 3). Tornes després de gairebé un any: avui toca sumar, no apurar.</Notice>
      )}
      {dl.due && !dl.current && (
        <Notice tone="warn">Portes {dl.weeks} setmanes seguides entrenant. És un bon moment per fer una <strong>setmana de descàrrega</strong>.</Notice>
      )}
      {comeback && <Notice tone="info"><strong>Tornada:</strong> encara que siguin 30 min. L'important és tornar a començar.</Notice>}
      <Card title="Sessió">
        <Segmented value={chosen} onChange={(v) => setDay(v)} options={keys.map((k) => ({ value: k, label: <span>{k === 'H' ? 'Hotel' : `Força ${k}`}{k === proposed && ' ·'}</span> }))} />
        <p className="mt-2 text-xs text-muted">Proposada: {dayLabel(proposed, routine.days)}{todayKey ? ' (és la que toca avui)' : ''}{lastDone && ` · l'última va ser ${dayLabel(lastDone.dayKey, routine.days)}, ${fmtDate(lastDone.startedAt.slice(0, 10))}`}</p>
      </Card>
      {circuit ? (
        <Card title={`${dayLabel(chosen, routine.days)} · ≈${plan.totalMin} min`}>
          <p className="mb-2 text-sm text-muted">{Math.max(...all.map((i) => i.sets))} voltes seguides, amb poc descans entre exercicis. Sense material: una cadira, el terra i una motxilla.</p>
          <ol className="space-y-1.5">
            {all.map((it, i) => (
              <li key={i} className="flex justify-between gap-2 text-sm">
                <span>{i + 1}. {byId.get(it.exerciseId)?.name ?? '—'}</span>
                <span className="shrink-0 text-muted">{it.repMin}{byId.get(it.exerciseId)?.measure === 'seconds' ? ' s' : ''}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
      <Card title="Temps disponible avui">
        <Stepper value={mins} onChange={setMinutes} step={5} min={comeback ? 30 : MIN_MINUTES} max={MAX_MINUTES} unit="min" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(comeback ? [30, 45, 60, 75] : [40, 60, 70, 75, 90]).map((m) => (
            <button key={m} onClick={() => setMinutes(m)}
              className={`h-9 flex-1 rounded-lg text-sm font-medium ${mins === m ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{m < 60 ? `${m}'` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 py-2"><div className="tabular text-lg font-bold">{plan.warmupMin}'</div><div className="text-[11px] text-muted">Escalfament</div></div>
          <div className="rounded-xl bg-surface-2 py-2"><div className="tabular text-lg font-bold">{fit.minutes}'</div><div className="text-[11px] text-muted">Força · {fit.items.length} ex.</div></div>
          <button onClick={() => setCardioOn(!withCardio)} className={`rounded-xl py-2 ${withCardio ? 'bg-surface-2' : 'border border-dashed border-line'}`}>
            <div className="tabular text-lg font-bold">{plan.cardio ? `${plan.cardio.plannedMin}'` : '—'}</div>
            <div className="text-[11px] text-muted">{withCardio ? 'Cardio' : 'Sense cardio'}</div>
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm"><Clock size={16} className="text-muted" />
          <span>Total <strong>≈{durationLabel(plan.totalMin)}</strong>{skipped > 0 && <span className="text-muted"> · {skipped} ex. es queden fora</span>}</span>
        </p>
        {plan.cardio && <p className="mt-1 text-xs text-muted">Cardio: {plan.cardio.plannedMin}' de {machineLabel(plan.cardio.machine).toLowerCase()} · {protocolById(plan.cardio.protocolId).label}{isContinuous(plan.cardio) ? '' : ` × ${plan.cardio.rounds}`}{plan.cardio.plannedMin === 10 ? ' (10 min les 4 primeres setmanes)' : ''}. Toca el requadre per treure'l avui.</p>}
        {plan.cardio && <p className="mt-1 text-xs text-warn">⚠️ {CARDIO_WARNING}</p>}
        <ol className="mt-3 space-y-1.5">
          {fit.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-2 text-sm">
              <span>{i + 1}. {byId.get(it.exerciseId)?.name ?? '—'}</span>
              <span className="shrink-0 text-muted">{it.sets}×{it.repMin}–{it.repMax}{byId.get(it.exerciseId)?.measure === 'seconds' ? ' s' : ''} · {it.restSec}s</span>
            </li>
          ))}
        </ol>
        {profile.deloadEveryWeeks && (
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={deloadOn} onChange={(e) => setDeload(e.target.checked)} />
            Sessió de descàrrega (menys sèries i ~10 % menys de pes) {dl.due && <Badge tone="warn">suggerida</Badge>}
          </label>
        )}
      </Card>
      )}
      <Button variant="primary" size="lg" className="h-20 w-full text-xl" onClick={async () => {
        unlockAudio();
        await startSession({ day: chosen, deload: deloadOn && !circuit, minutes: mins, cardioOn: withCardio && !circuit, comeback });
        nav('/entrenar/sessio');
      }}><Play /> Començar entrenament</Button>
    </Page>
  );
}
