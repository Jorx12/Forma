import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useActiveRoutine, useExercises, useMeta, useProfile, useSessions } from '../db/hooks';
import type { DayKey } from '../db/types';
import { Badge, Button, Card, Notice, Page, Segmented } from '../components/ui';
import { fmtDate } from '../lib/dates';
import { DAY_KEYS } from '../lib/generator';
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
  const [day, setDay] = useState<DayKey | null>(null);
  const [deload, setDeload] = useState<boolean | null>(null);
  if (!profile || routine === undefined || !exercises || !sessions || activeId === undefined) return null;

  const active = activeId ? sessions.find((s) => s.id === activeId && s.status === 'en_curs') : undefined;
  const next = nextDayKey(sessions);
  const chosen = day ?? next;
  const dl = deloadDue(profile, sessions);
  const deloadOn = deload ?? dl.due;
  const adaptation = isAdaptation(profile, sessions);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const lastDone = sessions.find((s) => s.status === 'feta');

  if (active) {
    return (
      <Page title="Entrenar">
        <Card title="Entrenament en curs">
          <p className="mb-3 text-sm text-muted">Dia {active.dayKey} · començat a les {new Date(active.startedAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}</p>
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

  const items = routine.days.find((d) => d.key === chosen)?.items ?? [];

  return (
    <Page title="Entrenar">
      {adaptation && (
        <Notice tone="info"><strong>Fase d'adaptació</strong> (primeres {profile.adaptationWeeks} setmanes): deixa unes 3 repeticions de marge a cada sèrie (RIR 3). Tornes després de gairebé un any: avui toca sumar, no apurar.</Notice>
      )}
      {dl.due && !dl.current && (
        <Notice tone="warn">Portes {dl.weeks} setmanes seguides entrenant. És un bon moment per fer una <strong>setmana de descàrrega</strong>.</Notice>
      )}
      <Card title="Dia que toca">
        <Segmented value={chosen} onChange={(v) => setDay(v)} options={DAY_KEYS.map((k) => ({ value: k, label: <span>{k}{k === next && ' ·'}</span> }))} />
        <p className="mt-2 text-xs text-muted">Proposat: dia {next}{lastDone && ` (l'últim va ser el ${lastDone.dayKey}, ${fmtDate(lastDone.startedAt.slice(0, 10))})`}</p>
        <ol className="mt-3 space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between gap-2 text-sm">
              <span>{i + 1}. {byId.get(it.exerciseId)?.name ?? '—'}</span>
              <span className="shrink-0 text-muted">{it.sets}×{it.repMin}–{it.repMax}</span>
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
      <Button variant="primary" size="lg" className="h-20 w-full text-xl" onClick={async () => {
        unlockAudio();
        await startSession(chosen, deloadOn);
        nav('/entrenar/sessio');
      }}><Play /> Començar entrenament</Button>
    </Page>
  );
}
