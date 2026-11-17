import { useParams } from 'react-router';
import { MUSCLE_LABEL } from '../data/catalog';
import { useExercises, useSessions } from '../db/hooks';
import { MetricLine } from '../components/MiniChart';
import { Card, Empty, Page, Segmented, Stat } from '../components/ui';
import { dayNum, fmtDate } from '../lib/dates';
import { historyFor } from '../lib/progression';
import { entryBest, summarizeEntry } from '../lib/stats';
import { useState } from 'react';

type Metric = 'pes' | '1rm' | 'volum';

export function ExerciseProgressPage() {
  const { id } = useParams();
  const sessions = useSessions();
  const exercises = useExercises();
  const [metric, setMetric] = useState<Metric>('pes');
  if (!sessions || !exercises) return null;
  const e = exercises.find((x) => x.id === id);
  const hist = historyFor(id!, sessions);
  const asc = [...hist].reverse();
  const pts = asc.map(({ session, entry }) => ({ x: dayNum(session.startedAt.slice(0, 10)), ...entryBest(entry) }));
  const data = pts.map((p) => ({ x: p.x, y: metric === 'pes' ? p.maxWeight : metric === '1rm' ? Math.round(p.best1RM * 10) / 10 : p.volume }));
  const best = (k: 'maxWeight' | 'best1RM') => Math.max(0, ...pts.map((p) => p[k]));
  const first1 = pts[0]?.best1RM ?? 0, last1 = pts[pts.length - 1]?.best1RM ?? 0;

  return (
    <Page title={e?.name ?? 'Exercici'} back>
      {e && <p className="-mt-2 text-sm text-muted">{MUSCLE_LABEL[e.muscleGroup]}{e.note && ` · ${e.note}`}</p>}
      {!hist.length ? <Card><Empty>Encara no hi ha registres d'aquest exercici.</Empty></Card> : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Pes màxim" value={`${best('maxWeight').toLocaleString('ca-ES')} kg`} />
            <Stat label="1RM est." value={`${best('best1RM').toFixed(1).replace('.', ',')} kg`} />
            <Stat label="Progrés 1RM" value={`${last1 >= first1 ? '+' : ''}${(last1 - first1).toFixed(1).replace('.', ',')}`} sub="kg des de l'inici" tone={last1 > first1 ? 'accent' : undefined} />
          </div>
          <Card>
            <Segmented size="sm" value={metric} onChange={setMetric} options={[{ value: 'pes', label: 'Pes màxim' }, { value: '1rm', label: '1RM (Epley)' }, { value: 'volum', label: 'Volum' }]} />
            <div className="mt-3">
              <MetricLine data={data} unit={metric === 'volum' ? 'kg·reps' : 'kg'} color={metric === 'volum' ? 'var(--info)' : 'var(--accent)'} />
            </div>
            <p className="mt-2 text-xs text-muted">1RM estimat amb la fórmula d'Epley: pes × (1 + reps / 30), amb la millor sèrie de cada dia.</p>
          </Card>
          <Card title="Sessions">
            <ul className="divide-y divide-line">
              {hist.map(({ session, entry }) => (
                <li key={session.id} className="flex justify-between gap-2 py-2 text-sm">
                  <span className="text-muted">{fmtDate(session.startedAt.slice(0, 10), 'd MMM yy')}</span>
                  <span className="text-right font-medium">{summarizeEntry(entry)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </Page>
  );
}
