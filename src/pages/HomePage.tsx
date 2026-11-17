import { ChevronRight, Dumbbell, Flame, Play, Scale } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { daysSinceExport } from '../lib/backup';
import { useActiveRoutine, useMeta, useProfile, useSessions, useWeighIns } from '../db/hooks';
import { Badge, Button, Card, Notice, Page, ProgressBar } from '../components/ui';
import { nextDayKey } from '../lib/progression';
import { weeklyCounts, streak } from '../lib/stats';
import { daysAgo, fmtDate, fmtLong, fmtNum, todayISO } from '../lib/dates';
import { nutritionRef } from '../lib/nutrition';
import { analyzeWeight, STATUS_LABEL } from '../lib/weight';
import { statusTone, TooFastNotice } from './WeightPage';

export function HomePage() {
  const profile = useProfile();
  const weighIns = useWeighIns();
  const sessions = useSessions();
  const routine = useActiveRoutine();
  const activeId = useMeta<string>('activeSessionId');
  const lastExport = useMeta<string>('lastExportAt');
  const sinceExport = useLiveQuery(daysSinceExport, [lastExport]);
  if (!profile || !weighIns || !sessions || routine === undefined) return null;
  const active = activeId ? sessions.find((s) => s.id === activeId && s.status === 'en_curs') : undefined;
  const weeks = weeklyCounts(sessions);
  const thisWeek = weeks[weeks.length - 1]?.count ?? 0;
  const st = streak(weeks, profile.sessionsPerWeek);
  const next = nextDayKey(sessions);
  const a = analyzeWeight(profile, weighIns);
  const n = nutritionRef(profile, a.current);
  const sinceWeigh = a.currentDate ? daysAgo(a.currentDate) : null;

  return (
    <Page title="Forma">
      <p className="-mt-3 text-sm text-muted">{fmtLong(todayISO())}</p>

      {(sinceWeigh === null || sinceWeigh > 7) && (
        <Link to="/pes" className="block">
          <Notice tone="info">
            <span className="flex items-center gap-2"><Scale size={16} />
              {sinceWeigh === null ? 'Registra la teva primera pesada.' : `Fa ${sinceWeigh} dies que no et peses. Toca pesar-te!`}
            </span>
          </Notice>
        </Link>
      )}
      {a.tooFast && <TooFastNotice a={a} />}
      {sinceExport !== undefined && sinceExport > 14 && (
        <Link to="/mes/dades" className="block text-center text-xs text-warn underline-offset-2 hover:underline">
          Fa {sinceExport} dies que no fas cap còpia de seguretat · Exportar ara
        </Link>
      )}

      <Card title="Entrenament" right={<Link to="/progres" className="text-xs text-muted">Constància →</Link>}>
        <div className="mb-3 flex items-center gap-3">
          <Dumbbell className="text-accent" />
          <div className="flex-1">
            <div className="text-lg font-bold">{active ? `Dia ${active.dayKey} en curs` : routine ? `Proper: dia ${next}` : 'Sense rutina'}</div>
            <div className="text-xs text-muted">Aquesta setmana: {thisWeek}/{profile.sessionsPerWeek}{st > 0 && ` · ratxa ${st} setm. 🔥`}</div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: profile.sessionsPerWeek }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-full ${i < thisWeek ? 'bg-accent' : 'bg-surface-2'}`} />
            ))}
          </div>
        </div>
        <Link to={active ? '/entrenar/sessio' : routine ? '/entrenar' : '/mes/rutina'}>
          <Button variant="primary" size="lg" className="w-full"><Play size={20} /> {active ? 'Continuar entrenament' : routine ? 'Començar entrenament' : 'Crear la rutina'}</Button>
        </Link>
      </Card>

      <Link to="/pes" className="block">
        <Card title="Pes" right={<Badge tone={statusTone(a.status)}>{STATUS_LABEL[a.status]}</Badge>}>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-4xl font-bold">{fmtNum(a.current)}</span>
            <span className="text-muted">kg</span>
            {a.lostKg !== 0 && <span className={a.lostKg > 0 ? 'ml-auto text-accent' : 'ml-auto text-warn'}>{a.lostKg > 0 ? '−' : '+'}{fmtNum(Math.abs(a.lostKg))} kg</span>}
          </div>
          <div className="mt-1 text-xs text-muted">{a.currentDate ? `Última pesada: ${fmtDate(a.currentDate)}` : `Pes inicial (${fmtDate(profile.startDate)})`}</div>
          <div className="mt-4 space-y-3">
            {a.goals.map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Cap a <strong>{g.targetKg} kg</strong></span>
                  <span className="tabular text-muted">{g.reached ? 'Assolit ✓' : `${Math.round(g.pct)} % · falten ${fmtNum(g.remainingKg)} kg`}</span>
                </div>
                <ProgressBar pct={g.pct} />
              </div>
            ))}
          </div>
        </Card>
      </Link>

      <Link to="/mes/calories" className="block">
        <Card title="Referència diària" right={<ChevronRight size={18} className="text-muted" />}>
          <div className="flex items-center gap-4">
            <Flame className="text-warn" />
            <div className="flex-1">
              <div className="tabular text-2xl font-bold">{n.target.toLocaleString('ca-ES')} <span className="text-base font-normal text-muted">kcal</span></div>
              <div className="text-xs text-muted">{n.targetLow.toLocaleString('ca-ES')}–{n.targetHigh.toLocaleString('ca-ES')} kcal</div>
            </div>
            <div className="text-right">
              <div className="tabular text-2xl font-bold">{n.protein} <span className="text-base font-normal text-muted">g</span></div>
              <div className="text-xs text-muted">proteïna</div>
            </div>
          </div>
        </Card>
      </Link>
    </Page>
  );
}
