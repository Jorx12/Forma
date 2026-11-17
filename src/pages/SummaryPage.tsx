import { Flame, Trophy } from 'lucide-react';
import { machineLabel, protocolById } from '../data/cardio';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '../db/db';
import { useExercises, useSessions } from '../db/hooks';
import { Badge, Button, Card, Empty, Page, Stat } from '../components/ui';
import { fmtClock, fmtDuration, fmtLong } from '../lib/dates';
import { completed, sessionPRs, sessionSetsDone, sessionVolume, summarizeEntry } from '../lib/stats';

export function SummaryPage({ fromHistory = false }: { fromHistory?: boolean }) {
  const { id } = useParams();
  const sessions = useSessions();
  const exercises = useExercises();
  const nav = useNavigate();
  if (!sessions || !exercises) return null;
  const s = sessions.find((x) => x.id === id);
  if (!s) return <Page title="Resum" back><Empty>No s'ha trobat l'entrenament.</Empty></Page>;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const previous = completed(sessions).filter((x) => x.startedAt < s.startedAt);
  const prs = sessionPRs(s, previous);
  const dur = s.finishedAt ? new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime() : 0;
  const KIND = { pes: 'Pes màxim', '1rm': '1RM estimat', reps: 'Repeticions' } as const;

  return (
    <Page title={fromHistory ? `Dia ${s.dayKey}` : 'Entrenament acabat 💪'} back={fromHistory ? true : undefined}>
      <p className="-mt-2 text-sm text-muted">{fmtLong(s.startedAt.slice(0, 10))} · Dia {s.dayKey}
        {s.flags.adaptation && ' · adaptació'}{s.flags.deload && ' · descàrrega'}{s.isDemo && ' · prova'}</p>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Durada" value={fmtDuration(dur)} sub={s.targetMinutes ? `objectiu ${s.targetMinutes} min` : undefined} />
        <Stat label="Volum" value={`${Math.round(sessionVolume(s)).toLocaleString('ca-ES')}`} sub="kg × reps" />
        <Stat label="Sèries" value={sessionSetsDone(s)} />
      </div>
      <Card title="Rècords personals">
        {prs.length === 0 ? <Empty>Cap rècord aquesta vegada. La constància és el que compta!</Empty> : (
          <ul className="space-y-2">
            {prs.map((p, i) => (
              <li key={i} className="flex items-center gap-3">
                <Trophy className="shrink-0 text-warn" size={22} />
                <div className="flex-1">
                  <div className="font-medium">{byId.get(p.exerciseId)?.name}</div>
                  <div className="text-sm text-muted">{KIND[p.kind]}: {p.value}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {s.cardio && (
        <Card title="Cardio HIIT">
          {s.cardio.skipped ? <p className="text-sm text-muted">Planificat però no fet.</p> : (
            <div className="flex items-center gap-3">
              <Flame className="shrink-0 text-warn" />
              <div className="text-sm">
                <div className="font-medium">{machineLabel(s.cardio.machine)} · {protocolById(s.cardio.protocolId).label}</div>
                <div className="text-muted">{s.cardio.roundsDone}/{s.cardio.rounds} rondes · {fmtClock(s.cardio.durationSec)}
                  {s.cardio.kcal ? ` · ${s.cardio.kcal} kcal` : ''}{s.cardio.distanceKm ? ` · ${s.cardio.distanceKm.toLocaleString('ca-ES')} km` : ''}
                  {s.cardio.effort ? ` · ${{ facil: 'fàcil', correcte: 'correcte', dur: 'dur' }[s.cardio.effort]}` : ''}</div>
              </div>
            </div>
          )}
        </Card>
      )}
      <Card title="Exercicis">
        <ul className="divide-y divide-line">
          {s.entries.map((e, i) => (
            <li key={i} className="py-2.5">
              <Link to={`/progres/exercici/${e.exerciseId}`} className="block">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{byId.get(e.exerciseId)?.name ?? 'Exercici'}</span>
                  {prs.some((p) => p.exerciseId === e.exerciseId) && <Badge tone="warn">PR</Badge>}
                </div>
                <div className="text-sm text-muted">{summarizeEntry(e)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      {fromHistory && (
        <Button variant="danger" className="w-full" onClick={async () => {
          if (!confirm('Esborrar aquest entrenament de l\'historial?')) return;
          await db.sessions.delete(s.id); nav(-1);
        }}>Esborrar entrenament</Button>
      )}
      {!fromHistory && <Link to="/"><Button variant="primary" size="lg" className="w-full">Tornar a l'inici</Button></Link>}
    </Page>
  );
}
