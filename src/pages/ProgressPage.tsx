import { BarChart3, ChevronRight, Luggage } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MUSCLE_LABEL } from '../data/catalog';
import { useExercises, useProfile, useSessions, useSwims } from '../db/hooks';
import { WeeksBar } from '../components/MiniChart';
import { Badge, Card, Empty, Page, Segmented, Stat } from '../components/ui';
import { fmtDate, fmtDuration } from '../lib/dates';
import { bestStreak, completed, entryBest, sessionVolume, streak, weeklyCounts } from '../lib/stats';

type Tab = 'historial' | 'exercicis' | 'constancia';

export function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('t') as Tab) ?? 'historial';
  return (
    <Page title="Progrés" action={<Link to="/resum" aria-label="Resum mensual" className="glass flex h-10 w-10 items-center justify-center rounded-full"><BarChart3 size={18} /></Link>}>
      <Segmented value={tab} onChange={(t) => setParams({ t }, { replace: true })}
        options={[{ value: 'historial', label: 'Sessions' }, { value: 'exercicis', label: 'Exercicis' }, { value: 'constancia', label: 'Constància' }]} />
      {tab === 'historial' && <History />}
      {tab === 'exercicis' && <ExerciseList />}
      {tab === 'constancia' && <Consistency />}
    </Page>
  );
}

function History() {
  const sessions = useSessions();
  if (!sessions) return null;
  const list = completed(sessions);
  return (
    <>
      {list.length === 0 ? <Card><Empty>Encara no hi ha entrenaments acabats.</Empty></Card> : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`/progres/sessio/${s.id}`} className="glass flex items-center gap-3 rounded-[22px] p-3 active:opacity-80">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2">
                  <span className="text-lg font-bold leading-none">{s.dayKey === 'H' ? <Luggage size={18} strokeWidth={1.6} /> : s.dayKey}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{fmtDate(s.startedAt.slice(0, 10), "EEEE d MMM")}
                    {s.flags.deload && <span className="ml-2"><Badge tone="warn">descàrrega</Badge></span>}
                    
                  </div>
                  <div className="truncate text-xs text-muted">
                    {s.finishedAt && fmtDuration(new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())} · {Math.round(sessionVolume(s)).toLocaleString('ca-ES')} kg
                  </div>
                  
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ExerciseList() {
  const sessions = useSessions();
  const exercises = useExercises();
  const rows = useMemo(() => {
    if (!sessions || !exercises) return [];
    const stats = new Map<string, { count: number; last: string; maxW: number }>();
    for (const s of completed(sessions)) for (const e of s.entries) {
      const b = entryBest(e);
      const cur = stats.get(e.exerciseId) ?? { count: 0, last: '', maxW: 0 };
      stats.set(e.exerciseId, { count: cur.count + 1, last: s.startedAt > cur.last ? s.startedAt : cur.last, maxW: Math.max(cur.maxW, b.maxWeight) });
    }
    return exercises.filter((e) => stats.has(e.id)).map((e) => ({ e, ...stats.get(e.id)! })).sort((a, b) => b.last.localeCompare(a.last));
  }, [sessions, exercises]);
  if (!sessions) return null;
  if (!rows.length) return <Card><Empty>Quan facis entrenaments, aquí veuràs l'evolució de cada exercici.</Empty></Card>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map(({ e, maxW }) => (
          <li key={e.id}>
            <Link to={`/progres/exercici/${e.id}`} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-muted">{MUSCLE_LABEL[e.muscleGroup]}</div>
              </div>
              {maxW > 0 && <span className="tabular text-sm">{maxW.toLocaleString('ca-ES')} kg</span>}
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Consistency() {
  const sessions = useSessions();
  const swims = useSwims();
  const profile = useProfile();
  if (!sessions || !profile || !swims) return null;
  const target = profile.sessionsPerWeek;
  const weeks = weeklyCounts(sessions, undefined, swims.map((s) => s.date));
  const now = weeks[weeks.length - 1]?.count ?? 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Aquesta setmana" value={`${now}/${target}`} tone={now >= target ? 'accent' : undefined} />
        <Stat label="Ratxa" value={`${streak(weeks, target)} setm.`} sub={`millor ${bestStreak(weeks, target)}`} />
      </div>
      <Card>
        <WeeksBar data={weeks.slice(-12)} target={target} />
      </Card>
    </>
  );
}
