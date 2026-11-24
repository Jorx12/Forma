import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MUSCLE_LABEL } from '../data/catalog';
import { useExercises, useProfile, useSessions } from '../db/hooks';
import type { DayKey } from '../db/types';
import { WeeksBar } from '../components/MiniChart';
import { Badge, Card, Empty, Page, Segmented, Stat } from '../components/ui';
import { fmtDate, fmtDuration, fmtShort } from '../lib/dates';
import { bestStreak, completed, entryBest, sessionSetsDone, sessionVolume, streak, weeklyCounts } from '../lib/stats';

type Tab = 'historial' | 'exercicis' | 'constancia';

export function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('t') as Tab) ?? 'historial';
  return (
    <Page title="Progrés" action={<Link to="/resum" className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold">📊 Resum mensual</Link>}>
      <Segmented value={tab} onChange={(t) => setParams({ t }, { replace: true })}
        options={[{ value: 'historial', label: 'Historial' }, { value: 'exercicis', label: 'Exercicis' }, { value: 'constancia', label: 'Constància' }]} />
      {tab === 'historial' && <History />}
      {tab === 'exercicis' && <ExerciseList />}
      {tab === 'constancia' && <Consistency />}
    </Page>
  );
}

function History() {
  const sessions = useSessions();
  const exercises = useExercises();
  const [day, setDay] = useState<DayKey | 'tots'>('tots');
  if (!sessions || !exercises) return null;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const list = completed(sessions).filter((s) => day === 'tots' || s.dayKey === day);
  return (
    <>
      <Segmented size="sm" value={day} onChange={setDay} options={[{ value: 'tots', label: 'Tots' }, ...[...new Set(completed(sessions).map((s) => s.dayKey))].sort().map((k) => ({ value: k, label: k === 'H' ? 'Hotel' : k }))]} />
      {list.length === 0 ? <Card><Empty>Encara no hi ha entrenaments acabats.</Empty></Card> : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`/progres/sessio/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:bg-surface-2">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2">
                  <span className="text-lg font-bold leading-none">{s.dayKey === 'H' ? '🧳' : s.dayKey}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{fmtDate(s.startedAt.slice(0, 10), "EEE d MMM yyyy")}
                    {s.flags.deload && <span className="ml-2"><Badge tone="warn">descàrrega</Badge></span>}
                    {s.isDemo && <span className="ml-2"><Badge>prova</Badge></span>}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {s.finishedAt && fmtDuration(new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())} · {sessionSetsDone(s)} sèries · {Math.round(sessionVolume(s)).toLocaleString('ca-ES')} kg{s.cardio?.done ? ` · HIIT ${Math.round(s.cardio.durationSec / 60)}'` : ''}
                  </div>
                  <div className="truncate text-xs text-muted">{s.entries.map((e) => byId.get(e.exerciseId)?.name).filter(Boolean).join(', ')}</div>
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
        {rows.map(({ e, count, last, maxW }) => (
          <li key={e.id}>
            <Link to={`/progres/exercici/${e.id}`} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-muted">{MUSCLE_LABEL[e.muscleGroup]} · {count} sessions · últim {fmtShort(last.slice(0, 10))}</div>
              </div>
              <span className="tabular text-sm font-semibold">{maxW.toLocaleString('ca-ES')} kg</span>
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
  const profile = useProfile();
  if (!sessions || !profile) return null;
  const target = profile.sessionsPerWeek;
  const weeks = weeklyCounts(sessions);
  const full = weeks.filter((w) => w.count >= target).length;
  const past = weeks.slice(0, -1);
  const avg = past.length ? past.reduce((t, w) => t + w.count, 0) / past.length : weeks[0]?.count ?? 0;
  const last12 = weeks.slice(-12);
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Aquesta setmana" value={`${weeks[weeks.length - 1]?.count ?? 0}/${target}`} tone={(weeks[weeks.length - 1]?.count ?? 0) >= target ? 'accent' : undefined} />
        <Stat label="Ratxa actual" value={`${streak(weeks, target)} setm.`} sub={`millor: ${bestStreak(weeks, target)}`} />
        <Stat label="Setmanes completes" value={`${full}/${weeks.length}`} />
        <Stat label="Mitjana setmanal" value={avg.toLocaleString('ca-ES', { maximumFractionDigits: 1 })} sub="setmanes acabades" />
      </div>
      <Card title="Entrenaments per setmana (últimes 12)">
        <WeeksBar data={last12} target={target} />
      </Card>
      <Card title="Setmanes">
        <div className="grid grid-cols-6 gap-1.5">
          {weeks.slice(-36).map((w) => (
            <div key={w.week} title={w.week}
              className={`flex h-10 flex-col items-center justify-center rounded-lg text-[10px] ${w.count >= target ? 'bg-accent text-accent-ink' : w.count > 0 ? 'bg-accent/30' : 'bg-surface-2 text-muted'}`}>
              <span className="font-bold">{w.count}</span>
              <span>{fmtDate(w.week, 'd/M')}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
