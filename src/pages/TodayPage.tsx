import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRightLeft, Check, ChevronRight, ClipboardCheck, Play, RotateCcw, Salad, Scale, Target, Waves } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FeelingPicker, feelingEmoji } from '../components/Feeling';
import { Badge, Button, Card, Field, inputCls, Notice, Page, ProgressBar, Segmented, Sheet, Stepper } from '../components/ui';
import { ACTIVITY_INFO, isMainActivity, WEEKDAY_SHORT } from '../data/plan';
import { db, uid } from '../db/db';
import { useActivities, useMeasurements, useMeta, useProfile, useReviews, useSchedule, useSessions, useSwims, useWeighIns } from '../db/hooks';
import type { ExtraKind, Feeling, Profile, ScheduleOverride } from '../db/types';
import { daysSinceExport } from '../lib/backup';
import { addDaysISO, fmtDate, fmtLong, fmtNum, todayISO, weekStartISO } from '../lib/dates';
import { reviewAlerts } from '../lib/review';
import { anyDone, daysSinceTraining, doneOn, isChristmasSeason, isPlanDone, mainSessionsInWeek, moveActivity, planFor, resetDay, setChristmas, setTravel, weekDates, weekdayOf, type DayPlan } from '../lib/schedule';
import { fmtMeters } from '../lib/swim';
import { analyzeWeight, statusLabel, WEIGH_DAYS } from '../lib/weight';
import { statusTone, TooFastNotice } from './WeightPage';

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
  const activeId = useMeta<string>('activeSessionId');
  const lastExport = useMeta<string>('lastExportAt');
  const sinceExport = useLiveQuery(daysSinceExport, [lastExport]);
  const [selected, setSelected] = useState(todayISO());
  const [sheet, setSheet] = useState<'move' | 'extra' | null>(null);
  const nav = useNavigate();
  if (!profile || !weighIns || !sessions || !swims || !extras || !schedule || !reviews || !measures) return null;

  const today = todayISO();
  const monday = weekStartISO(today);
  const wd = weekdayOf(today);
  const a = analyzeWeight(profile, weighIns);
  const active = activeId ? sessions.find((s) => s.id === activeId && s.status === 'en_curs') : undefined;
  const days = weekDates(today).map((d) => ({ plan: planFor(d, profile, schedule), done: doneOn(d, sessions, swims, extras) }));
  const sel = days.find((d) => d.plan.date === selected) ?? { plan: planFor(selected, profile, schedule), done: doneOn(selected, sessions, swims, extras) };
  const weekCount = mainSessionsInWeek(monday, sessions, swims);
  const idle = daysSinceTraining(sessions, swims, today);
  const weighedToday = weighIns.some((w) => w.date === today);
  const waistToday = measures.some((m) => m.date === today && m.waistCm != null);
  const prevWeek = addDaysISO(monday, -7);
  const reviewDone = reviews.some((r) => r.week === prevWeek);
  const goal = reviews.find((r) => r.week === prevWeek)?.nextGoal;
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const xmas = profile.modes?.christmas.active;
  const travel = profile.modes?.travel.active;
  const alerts = reviewAlerts(prevWeek, profile, weighIns, measures, sessions, swims, today).filter((x) => x.id === 'inactiu');

  return (
    <Page title="Avui">
      <p className="-mt-3 text-sm text-muted">{fmtLong(today)}</p>

      {active && (
        <Link to="/entrenar/sessio"><Notice tone="ok"><span className="flex items-center gap-2"><RotateCcw size={16} /> Tens un entrenament a mig fer. Toca per continuar.</span></Notice></Link>
      )}
      {travel && (
        <Notice tone="info">
          🧳 <strong>Mode viatge actiu:</strong> les sessions són la rutina d'hotel (3 cops per setmana).{' '}
          <button className="font-semibold underline" onClick={async () => {
            const d = await setTravel(false, profile, sessions);
            if (d) alert(`Benvingut! ${fmtDate(d, 'EEEE d')} queda marcat com a «Tornada: encara que siguin 30 min».`);
          }}>Ja he tornat</button>
        </Notice>
      )}
      {xmas && <Notice tone="info">🎄 <strong>Mode Nadal:</strong> l'objectiu és mantenir el pes. <button className="font-semibold underline" onClick={() => setChristmas(false, profile, a.current)}>Desactivar</button></Notice>}
      {!xmas && isChristmasSeason(today) && (
        <Notice tone="info">🎄 És temporada de Nadal. <button className="font-semibold underline" onClick={() => setChristmas(true, profile, a.current)}>Activar el mode Nadal</button> (objectiu: mantenir el pes).</Notice>
      )}
      {alerts.map((x) => (
        <Notice key={x.id} tone="danger">
          <strong>Fa {idle} dies que no entrenes.</strong> {x.text}
          <Button size="sm" className="mt-2 w-full" onClick={() => nav('/entrenar?dia=H')}>🧳 Fer la rutina d'hotel ara</Button>
        </Notice>
      ))}
      {a.tooFast && !xmas && <TooFastNotice a={a} />}

      <DayCard plan={sel.plan} done={sel.done} isToday={selected === today} activeSession={!!active}
        onMove={() => setSheet('move')} onExtra={() => setSheet('extra')} />

      <Card title={`Setmana · ${weekCount}/3 sessions`}>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ plan, done }) => {
            const ok = isPlanDone(plan, done) || (!isMainActivity(plan.activity) && anyDone(done));
            const past = plan.date < today;
            return (
              <button key={plan.date} onClick={() => setSelected(plan.date)}
                className={clsx('flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px]',
                  plan.date === selected ? 'bg-accent/15 ring-1 ring-accent' : 'bg-surface-2',
                  past && !ok && isMainActivity(plan.activity) && 'opacity-60')}>
                <span className={clsx('font-semibold', plan.date === today && 'text-accent')}>{WEEKDAY_SHORT[weekdayOf(plan.date)]}</span>
                <span className="text-lg leading-none">{ACTIVITY_INFO[plan.activity].emoji}</span>
                <span className="h-4">{ok ? <Check size={14} className="text-accent" /> : plan.override ? <ArrowRightLeft size={12} className="text-info" /> : null}</span>
              </button>
            );
          })}
        </div>
        <ProgressBar pct={(weekCount / 3) * 100} />
      </Card>

      {goal && <Card><div className="flex items-start gap-3"><Target className="shrink-0 text-accent" /><div><div className="text-xs text-muted">Objectiu de la setmana</div><div className="font-semibold">{goal}</div></div></div></Card>}

      {WEIGH_DAYS.includes(wd) && !weighedToday && (
        <Link to="/pes" className="block"><Notice tone="info"><span className="flex items-center gap-2"><Scale size={16} /> Avui toca pesar-se (al matí, en dejú).</span></Notice></Link>
      )}
      {wd === 1 && !waistToday && (
        <Link to="/pes#cintura" className="block"><Notice tone="info">📏 Dilluns: mesura't la cintura.</Notice></Link>
      )}
      {(wd === 1 || !reviewDone) && !reviewDone && (
        <Link to="/revisio" className="block">
          <Card><div className="flex items-center gap-3"><ClipboardCheck className="text-accent" /><div className="flex-1"><div className="font-semibold">Revisió setmanal</div><div className="text-xs text-muted">Setmana del {fmtDate(prevWeek, 'd MMM')} · 2 minuts</div></div><ChevronRight size={18} className="text-muted" /></div></Card>
        </Link>
      )}
      {hour >= 16.5 && hour < 18 && (
        <Link to="/mes/alimentacio" className="block"><Notice tone="ok">🍎 Hora del berenar (17–17.30 h). Mira les opcions.</Notice></Link>
      )}
      {(wd === 6 || wd === 0) && <Link to="/mes/alimentacio" className="block"><Notice tone="info">Cap de setmana: regla 80/20. Gaudeix, però amb el pla de fons.</Notice></Link>}
      {sinceExport !== undefined && sinceExport > 14 && (
        <Link to="/mes/dades" className="block text-center text-xs text-warn">Fa {sinceExport} dies que no fas cap còpia de seguretat · Exportar ara</Link>
      )}

      <Link to="/pes" className="block">
        <Card title="Pes · mitjana setmanal" right={<Badge tone={statusTone(a.status)}>{statusLabel(a)}</Badge>}>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-4xl font-bold">{fmtNum(a.current)}</span><span className="text-muted">kg</span>
            {a.weeklyChange !== undefined && (
              <span className={clsx('ml-auto text-sm', a.weeklyChange <= 0 ? 'text-accent' : 'text-warn')}>{a.weeklyChange > 0 ? '+' : '−'}{fmtNum(Math.abs(a.weeklyChange), 2)} kg vs setm. anterior</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted">{a.currentWeek ? `Setmana del ${fmtDate(a.currentWeek, 'd MMM')} · ${a.currentN} pesades` : 'Encara sense pesades'}</div>
          <div className="mt-3 space-y-3">
            {a.goals.map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex justify-between text-sm"><span>Cap a <strong>{g.targetKg} kg</strong></span><span className="tabular text-muted">{g.reached ? 'Assolit ✓' : `${Math.round(g.pct)} % · falten ${fmtNum(g.remainingKg)} kg`}</span></div>
                <ProgressBar pct={g.pct} />
              </div>
            ))}
          </div>
        </Card>
      </Link>

      <Link to="/mes/alimentacio" className="block">
        <Card><div className="flex items-center gap-3"><Salad className="text-accent" /><div className="flex-1"><div className="font-semibold">Alimentació</div><div className="text-xs text-muted">Plat ½ verdura · ¼ proteïna · ¼ hidrats · berenar 17 h</div></div><ChevronRight size={18} className="text-muted" /></div></Card>
      </Link>

      <ModesCard profile={profile} current={a.current} onTravel={(on) => setTravel(on, profile, sessions)} />

      <Sheet open={sheet === 'move'} onClose={() => setSheet(null)} title={`Moure: ${ACTIVITY_INFO[sel.plan.activity].label}`}>
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

function DayCard({ plan, done, isToday, activeSession, onMove, onExtra }: {
  plan: DayPlan; done: ReturnType<typeof doneOn>; isToday: boolean; activeSession: boolean; onMove: () => void; onExtra: () => void;
}) {
  const nav = useNavigate();
  const info = ACTIVITY_INFO[plan.activity];
  const ok = isPlanDone(plan, done);
  const future = plan.date > todayISO();
  const key = plan.activity === 'forca_A' ? 'A' : plan.activity === 'forca_B' ? 'B' : plan.activity === 'hotel' ? 'H' : null;

  return (
    <Card title={isToday ? 'Toca avui' : fmtDate(plan.date, 'EEEE d MMM')}
      right={plan.comeback ? <Badge tone="info">Tornada</Badge> : plan.travel ? <Badge tone="info">Viatge</Badge> : plan.override ? <Badge tone="info">Canviat</Badge> : undefined}>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{info.emoji}</span>
        <div className="flex-1">
          <div className="text-xl font-bold">{info.label}</div>
          <div className="text-sm text-muted">{plan.comeback ? 'Tornada: encara que siguin 30 min' : info.sub}</div>
          {plan.override?.movedFrom && <div className="text-xs text-info">Mogut des del {fmtDate(plan.override.movedFrom, 'EEEE d')}</div>}
          {plan.override?.movedTo && plan.activity === 'descans' && <div className="text-xs text-info">Sessió moguda al {fmtDate(plan.override.movedTo, 'EEEE d')}</div>}
        </div>
        {ok && <Check className="text-accent" size={28} />}
      </div>

      {(done.sessions.length > 0 || done.swims.length > 0 || done.extras.length > 0) && (
        <ul className="mt-3 space-y-1 text-sm">
          {done.sessions.map((s) => <li key={s.id}><Link className="text-accent" to={`/progres/sessio/${s.id}`}>✓ {s.dayKey === 'H' ? "Rutina d'hotel" : `Força ${s.dayKey}`}{s.cardio?.done ? ` + cardio ${Math.round(s.cardio.durationSec / 60)}'` : ''}</Link></li>)}
          {done.swims.map((s) => <li key={s.id} className="text-accent">✓ Natació {s.durationMin} min {feelingEmoji(s.feeling)}{s.distanceM ? ` · ${fmtMeters(s.distanceM)}` : ''}</li>)}
          {done.extras.map((e) => <li key={e.id} className="text-accent">✓ {EXTRA_LABEL[e.kind]} {e.minutes} min {feelingEmoji(e.feeling)}</li>)}
        </ul>
      )}

      {!future && !ok && (
        <div className="mt-3">
          {key && !activeSession && <Button variant="primary" size="lg" className="w-full" onClick={() => nav(`/entrenar?dia=${key}${plan.comeback ? '&tornada=1' : ''}`)}><Play /> Començar {info.label.split(' +')[0]}</Button>}
          {plan.activity === 'natacio' && <Button variant="primary" size="lg" className="w-full" onClick={() => nav(`/natacio?data=${plan.date}`)}><Waves /> Registrar natació</Button>}
          {plan.activity === 'extra' && <Button variant="primary" size="lg" className="w-full" onClick={onExtra}>Registrar activitat</Button>}
          {plan.activity === 'descans' && <p className="text-sm text-muted">Avui descans. Si et ve de gust, pots fer una activitat extra.</p>}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {plan.activity !== 'descans' && !ok && <Button size="sm" className="flex-1" onClick={onMove}><ArrowRightLeft size={16} /> Moure a un altre dia</Button>}
        {plan.activity === 'descans' && plan.override && <Button size="sm" className="flex-1" onClick={onMove}>Desfer canvis</Button>}
        {plan.activity !== 'extra' && !future && <Button size="sm" variant="ghost" onClick={onExtra}>+ Extra</Button>}
      </div>
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

function ModesCard({ profile, current, onTravel }: { profile: Profile; current: number; onTravel: (on: boolean) => void }) {
  const m = profile.modes;
  return (
    <Card title="Modes">
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-[var(--accent)]" checked={!!m?.travel.active} onChange={(e) => onTravel(e.target.checked)} />
          <span className="flex-1"><span className="font-medium">🧳 Viatge</span><span className="block text-xs text-muted">Les sessions passen a ser la rutina d'hotel. En tornar, el primer dia laborable serà «Tornada: encara que siguin 30 min».</span></span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-[var(--accent)]" checked={!!m?.christmas.active} onChange={(e) => setChristmas(e.target.checked, profile, current)} />
          <span className="flex-1"><span className="font-medium">🎄 Nadal</span><span className="block text-xs text-muted">L'objectiu passa a mantenir el pes ({fmtNum(m?.christmas.refKg ?? current)} kg) i no surten avisos per no baixar.</span></span>
        </label>
      </div>
    </Card>
  );
}

