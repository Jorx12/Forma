import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRightLeft, BarChart3, ChevronRight, ClipboardCheck, Database, Play, Ruler, Scale, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FeelingPicker, feelingEmoji } from '../components/Feeling';
import { HabitsCard } from '../components/Habits';
import { Button, Card, Field, inputCls, Notice, Page, ProgressBar, Row, Segmented, Sheet, Stepper } from '../components/ui';
import { ACTIVITY_INFO, isMainActivity, WEEKDAY_SHORT } from '../data/plan';
import { db, uid } from '../db/db';
import { useActivities, useDailyLogs, useMeasurements, useMeta, useProfile, useReviews, useSchedule, useSessions, useSwims, useWeighIns } from '../db/hooks';
import type { ExtraKind, Feeling, Profile, ScheduleOverride } from '../db/types';
import { daysSinceExport } from '../lib/backup';
import { addDaysISO, fmtDate, fmtLong, fmtNum, todayISO, weekStartISO } from '../lib/dates';
import { prevMonth } from '../lib/monthly';
import { reviewAlerts } from '../lib/review';
import { anyDone, daysSinceTraining, doneOn, isChristmasSeason, isPlanDone, mainSessionsInWeek, moveActivity, planFor, resetDay, setChristmas, setTravel, weekDates, weekdayOf, type DayPlan } from '../lib/schedule';
import { fmtMeters } from '../lib/swim';
import { analyzeWeight, WEIGH_DAYS } from '../lib/weight';
import { Badge } from '../components/ui';

export const EXTRA_LABEL: Record<ExtraKind, string> = { padel: 'Pàdel', pitch: 'Pitch and putt', caminar: 'Caminar', altre: 'Altre' };

export function TodayPage() {
  const profile = useProfile();
  const weighIns = useWeighIns();
  const sessions = useSessions();
  const swims = useSwims();
  const extras = useActivities();
  const schedule = useSchedule();
  const reviews = useReviews();
  const measures = useMeasurements();
  const logs = useDailyLogs();
  const activeId = useMeta<string>('activeSessionId');
  const lastExport = useMeta<string>('lastExportAt');
  const sinceExport = useLiveQuery(daysSinceExport, [lastExport]);
  const [selected, setSelected] = useState(todayISO());
  const [sheet, setSheet] = useState<'move' | 'extra' | null>(null);
  const nav = useNavigate();
  if (!profile || !weighIns || !sessions || !swims || !extras || !schedule || !reviews || !measures || !logs) return null;

  const today = todayISO();
  const monday = weekStartISO(today);
  const wd = weekdayOf(today);
  const a = analyzeWeight(profile, weighIns);
  const active = activeId ? sessions.find((s) => s.id === activeId && s.status === 'en_curs') : undefined;
  const days = weekDates(today).map((d) => ({ plan: planFor(d, profile, schedule), done: doneOn(d, sessions, swims, extras) }));
  const sel = days.find((d) => d.plan.date === selected) ?? { plan: planFor(selected, profile, schedule), done: doneOn(selected, sessions, swims, extras) };
  const weekCount = mainSessionsInWeek(monday, sessions, swims);
  const idle = daysSinceTraining(sessions, swims, today);
  const prevWeek = addDaysISO(monday, -7);
  const goal = reviews.find((r) => r.week === prevWeek)?.nextGoal;
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const xmas = !!profile.modes?.christmas.active;
  const travel = !!profile.modes?.travel.active;
  const idleAlert = reviewAlerts(prevWeek, profile, weighIns, measures, sessions, swims, today).some((x) => x.id === 'inactiu');
  const nextGoal = a.goals.find((g) => !g.reached) ?? a.goals[a.goals.length - 1];

  // Pendents del dia, en una sola llista
  const pending: { key: string; to?: string; onClick?: () => void; icon: React.ReactNode; label: string; sub?: string }[] = [];
  if (WEIGH_DAYS.includes(wd) && !weighIns.some((w) => w.date === today)) pending.push({ key: 'pes', to: '/pes', icon: <Scale size={18} />, label: 'Pesar-se' });
  if (wd === 1 && !measures.some((m) => m.date === today && m.waistCm != null)) pending.push({ key: 'cintura', to: '/pes#cintura', icon: <Ruler size={18} />, label: 'Mesurar la cintura' });
  if (!reviews.some((r) => r.week === prevWeek)) pending.push({ key: 'revisio', to: '/revisio', icon: <ClipboardCheck size={18} />, label: 'Revisió setmanal' });
  if (hour >= 16.5 && hour < 18 && !logs.find((l) => l.date === today)?.snack) pending.push({ key: 'berenar', to: '/mes/alimentacio', icon: <span>🍎</span>, label: 'Berenar' });
  if (Number(today.slice(8, 10)) <= 7) pending.push({ key: 'resum', to: `/resum?mes=${prevMonth(today.slice(0, 7))}`, icon: <BarChart3 size={18} />, label: `Resum de ${fmtDate(`${prevMonth(today.slice(0, 7))}-01`, 'MMMM')}` });
  if (!xmas && isChristmasSeason(today)) pending.push({ key: 'nadal', onClick: () => setChristmas(true, profile, a.current), icon: <Snowflake size={18} />, label: 'Mode Nadal' });
  if (sinceExport !== undefined && sinceExport > 14) pending.push({ key: 'copia', to: '/mes/dades', icon: <Database size={18} />, label: 'Còpia de seguretat' });

  return (
    <Page title="Avui" subtitle={<span className="flex flex-wrap items-center gap-2">{fmtLong(today)}{travel && <Badge tone="info">🧳 Viatge</Badge>}{xmas && <Badge tone="info">🎄 Nadal</Badge>}</span>}>
      {active ? (
        <Link to="/entrenar/sessio"><Notice tone="ok">Tens un entrenament a mig fer. <strong>Continuar</strong></Notice></Link>
      ) : idleAlert ? (
        <Notice tone="danger">
          Fa {idle} dies que no entrenes. Mai dues setmanes seguides.
          <button className="mt-1 block font-semibold text-accent" onClick={() => nav('/entrenar?dia=H')}>Fer la rutina d'hotel →</button>
        </Notice>
      ) : a.tooFast && !xmas ? (
        <Notice tone="warn">Baixes més d'1 kg per setmana: menja una mica més.</Notice>
      ) : null}

      <DayCard plan={sel.plan} done={sel.done} isToday={selected === today} activeSession={!!active} travel={travel}
        onMove={() => setSheet('move')} onExtra={() => setSheet('extra')}
        onBack={async () => { const d = await setTravel(false, profile, sessions); if (d) setSelected(d); }}>
        <div className="mt-5 border-t border-line pt-4">
          <div className="grid grid-cols-[repeat(7,1fr)_auto] items-center gap-1">
            {days.map(({ plan, done }) => {
              const ok = isPlanDone(plan, done) || (!isMainActivity(plan.activity) && anyDone(done));
              const main = isMainActivity(plan.activity);
              return (
                <button key={plan.date} onClick={() => setSelected(plan.date)}
                  className={clsx('flex flex-col items-center gap-1.5 rounded-2xl py-2 transition', plan.date === selected && 'bg-text/10')}>
                  <span className={clsx('text-[11px] font-medium', plan.date === today ? 'text-accent' : 'text-muted')}>{WEEKDAY_SHORT[weekdayOf(plan.date)]}</span>
                  <span className={clsx('h-2.5 w-2.5 rounded-full', ok ? 'bg-accent' : main ? 'border-[1.5px] border-text/40' : 'bg-text/10', plan.override && !ok && 'border-info')} />
                </button>
              );
            })}
            <span className="tabular pl-2 text-xs text-muted">{weekCount}/3</span>
          </div>
          {goal && <p className="mt-3 text-sm text-muted">🎯 {goal}</p>}
        </div>
      </DayCard>

      {selected <= today && <HabitsCard date={selected} log={logs.find((l) => l.date === selected)} />}

      {pending.length > 0 && (
        <Card className="py-1">
          <div className="divide-y divide-line">
            {pending.map(({ key, ...p }) => <Row key={key} {...p} />)}
          </div>
        </Card>
      )}

      <Link to="/pes" className="block">
        <Card>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-[40px] leading-none font-semibold tracking-tight">{fmtNum(a.current)}</span>
            <span className="text-muted">kg</span>
            {a.weeklyChange !== undefined && (
              <span className={clsx('tabular ml-auto text-sm', a.weeklyChange <= 0 ? 'text-accent' : 'text-warn')}>{a.weeklyChange > 0 ? '+' : '−'}{fmtNum(Math.abs(a.weeklyChange), 2)} kg</span>
            )}
          </div>
          {nextGoal && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted"><span>{nextGoal.targetKg} kg</span><span className="tabular">{nextGoal.reached ? '✓' : `−${fmtNum(nextGoal.remainingKg)}`}</span></div>
              <ProgressBar pct={nextGoal.pct} />
            </div>
          )}
        </Card>
      </Link>

      <Sheet open={sheet === 'move'} onClose={() => setSheet(null)} title={`Moure · ${ACTIVITY_INFO[sel.plan.activity].label}`}>
        <MoveList from={sel.plan.date} profile={profile} schedule={schedule} onPick={async (to) => {
          await moveActivity(sel.plan.date, to, profile); setSheet(null); setSelected(to);
        }} onReset={sel.plan.override ? async () => { await resetDay(sel.plan.date); setSheet(null); } : undefined} />
      </Sheet>
      <Sheet open={sheet === 'extra'} onClose={() => setSheet(null)} title="Activitat extra">
        <ExtraForm date={sel.plan.date} onDone={() => setSheet(null)} />
      </Sheet>
    </Page>
  );
}

function DayCard({ plan, done, isToday, activeSession, travel, onMove, onExtra, onBack, children }: {
  plan: DayPlan; done: ReturnType<typeof doneOn>; isToday: boolean; activeSession: boolean; travel: boolean;
  onMove: () => void; onExtra: () => void; onBack: () => void; children: React.ReactNode;
}) {
  const nav = useNavigate();
  const info = ACTIVITY_INFO[plan.activity];
  const ok = isPlanDone(plan, done);
  const future = plan.date > todayISO();
  const key = plan.activity === 'forca_A' ? 'A' : plan.activity === 'forca_B' ? 'B' : plan.activity === 'hotel' ? 'H' : null;
  const tag = plan.comeback ? 'Tornada' : plan.travel ? 'Viatge' : plan.override ? 'Canviat' : null;
  const doneItems = [
    ...done.sessions.map((s) => ({ id: s.id, to: `/progres/sessio/${s.id}`, text: `${s.dayKey === 'H' ? "Rutina d'hotel" : `Força ${s.dayKey}`}${s.cardio?.done ? ` + cardio ${Math.round(s.cardio.durationSec / 60)}'` : ''}` })),
    ...done.swims.map((s) => ({ id: s.id, to: '/natacio', text: `Natació ${s.durationMin}' ${feelingEmoji(s.feeling)}${s.distanceM ? ` · ${fmtMeters(s.distanceM)}` : ''}` })),
    ...done.extras.map((e) => ({ id: e.id, to: undefined, text: `${EXTRA_LABEL[e.kind]} ${e.minutes}' ${feelingEmoji(e.feeling)}` })),
  ];

  return (
    <Card>
      {(!isToday || tag) && (
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>{isToday ? '' : fmtDate(plan.date, 'EEEE d MMM')}</span>
          {tag && <Badge tone="info">{tag}</Badge>}
        </div>
      )}
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-surface-2 text-[34px]">{info.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[22px] leading-tight font-semibold tracking-tight">{info.label}</div>
          {(plan.comeback || ok || isMainActivity(plan.activity)) && <div className="mt-0.5 text-sm text-muted">{plan.comeback ? 'Encara que siguin 30 min' : ok ? 'Fet ✓' : info.sub}</div>}
        </div>
      </div>

      {doneItems.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {doneItems.map((d) => <li key={d.id}>{d.to ? <Link to={d.to} className="text-accent">✓ {d.text}</Link> : <span className="text-accent">✓ {d.text}</span>}</li>)}
        </ul>
      )}

      {!future && !ok && !activeSession && (key || plan.activity === 'natacio' || plan.activity === 'extra') && (
        <div className="mt-5">
          {key && <Button variant="primary" size="lg" className="w-full" onClick={() => nav(`/entrenar?dia=${key}${plan.comeback ? '&tornada=1' : ''}`)}><Play size={18} /> Començar</Button>}
          {plan.activity === 'natacio' && <Button variant="primary" size="lg" className="w-full" onClick={() => nav(`/natacio?data=${plan.date}`)}>Registrar natació</Button>}
          {plan.activity === 'extra' && <Button variant="primary" size="lg" className="w-full" onClick={onExtra}>Registrar activitat</Button>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
        {(plan.activity !== 'descans' || plan.override) && !ok && <button className="flex items-center gap-1.5" onClick={onMove}><ArrowRightLeft size={15} /> {plan.activity === 'descans' ? 'Desfer canvi' : 'Moure'}</button>}
        {plan.activity !== 'extra' && !future && <button onClick={onExtra}>+ Extra</button>}
        {travel && isToday && <button className="text-info" onClick={onBack}>He tornat</button>}
      </div>
      {children}
    </Card>
  );
}

function MoveList({ from, profile, schedule, onPick, onReset }: {
  from: string; profile: Profile; schedule: Map<string, ScheduleOverride>; onPick: (to: string) => void; onReset?: () => void;
}) {
  const today = todayISO();
  const start = from < today ? today : weekStartISO(from) < today ? today : weekStartISO(from);
  const dates = Array.from({ length: 10 }, (_, i) => addDaysISO(start, i)).filter((d) => d !== from);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Tria el dia nou. Si aquell dia ja hi havia una sessió, s'intercanvien.</p>
      <ul className="divide-y divide-line">
        {dates.map((d) => {
          const p = planFor(d, profile, schedule);
          return (
            <li key={d}>
              <button className="flex w-full items-center gap-3 py-3 text-left active:opacity-70" onClick={() => onPick(d)}>
                <span className="w-24 font-medium">{fmtDate(d, 'EEE d MMM')}</span>
                <span className="flex-1 text-sm text-muted">{ACTIVITY_INFO[p.activity].emoji} {ACTIVITY_INFO[p.activity].label}</span>
                <ChevronRight size={18} className="text-muted" />
              </button>
            </li>
          );
        })}
      </ul>
      {onReset && <Button variant="ghost" className="w-full" onClick={onReset}>Tornar a la setmana tipus per aquest dia</Button>}
    </div>
  );
}

function ExtraForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [kind, setKind] = useState<ExtraKind>('caminar');
  const [minutes, setMinutes] = useState(60);
  const [feeling, setFeeling] = useState<Feeling | undefined>();
  const [note, setNote] = useState('');
  return (
    <div className="space-y-3">
      <Segmented value={kind} onChange={setKind} options={(Object.keys(EXTRA_LABEL) as ExtraKind[]).map((k) => ({ value: k, label: EXTRA_LABEL[k] }))} />
      <Stepper label="Minuts" value={minutes} step={5} min={5} max={480} unit="min" onChange={setMinutes} />
      <Field label="Sensació"><FeelingPicker value={feeling} onChange={setFeeling} /></Field>
      <Field label="Nota (opcional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button variant="primary" size="lg" className="w-full" onClick={async () => {
        await db.activities.put({ id: uid(), date, kind, minutes, feeling, note: note.trim() || undefined });
        onDone();
      }}>Desar</Button>
    </div>
  );
}
