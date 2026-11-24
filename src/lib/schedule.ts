import { parseISO } from 'date-fns';
import { DEFAULT_WEEK_PLAN, isMainActivity } from '../data/plan';
import { db } from '../db/db';
import type { ExtraActivity, PlanActivity, Profile, ScheduleOverride, Session, Swim } from '../db/types';
import { addDaysISO, todayISO, weekStartISO } from './dates';
import { nextDayKey } from './progression';

export const weekdayOf = (iso: string) => parseISO(iso).getDay();
export const weekDates = (iso: string) => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStartISO(iso), i));

export interface DayPlan {
  date: string;
  activity: PlanActivity;
  /** activitat de la setmana tipus (sense canvis) */
  base: PlanActivity;
  override?: ScheduleOverride;
  travel: boolean;
  comeback: boolean;
}

/** Què toca un dia: canvi puntual > mode viatge > setmana tipus */
export function planFor(date: string, profile: Profile, overrides: Map<string, ScheduleOverride>): DayPlan {
  const base = (profile.weekPlan ?? DEFAULT_WEEK_PLAN)[weekdayOf(date)] ?? 'descans';
  const ov = overrides.get(date);
  const tr = profile.modes?.travel;
  const travelOn = !!tr?.active && date >= (tr.since ?? '0000');
  let activity: PlanActivity = ov?.activity ?? base;
  let travel = false;
  if (!ov && travelOn && isMainActivity(base)) { activity = 'hotel'; travel = true; }
  return { date, activity, base, override: ov, travel, comeback: !!ov?.comeback };
}

export interface DayDone {
  sessions: Session[];
  swims: Swim[];
  extras: ExtraActivity[];
}

export function doneOn(date: string, sessions: Session[], swims: Swim[], extras: ExtraActivity[]): DayDone {
  return {
    sessions: sessions.filter((s) => s.status === 'feta' && s.startedAt.slice(0, 10) === date),
    swims: swims.filter((s) => s.date === date),
    extras: extras.filter((e) => e.date === date),
  };
}

/** S'ha fet l'activitat planificada? */
export function isPlanDone(plan: DayPlan, d: DayDone) {
  switch (plan.activity) {
    case 'natacio': return d.swims.length > 0;
    case 'forca_A': case 'forca_B': case 'hotel': return d.sessions.length > 0;
    case 'extra': return d.extras.length > 0;
    default: return false;
  }
}

export const anyDone = (d: DayDone) => d.sessions.length + d.swims.length + d.extras.length > 0;

/** Sessions principals fetes en una setmana (força, hotel i natació) */
export function mainSessionsInWeek(monday: string, sessions: Session[], swims: Swim[]) {
  const end = addDaysISO(monday, 7);
  const inWeek = (d: string) => d >= monday && d < end;
  return sessions.filter((s) => s.status === 'feta' && inWeek(s.startedAt.slice(0, 10))).length + swims.filter((s) => inWeek(s.date)).length;
}

/** Dies des de l'últim entrenament (força, hotel o natació) */
export function daysSinceTraining(sessions: Session[], swims: Swim[], today = todayISO()): number | null {
  const dates = [...sessions.filter((s) => s.status === 'feta').map((s) => s.startedAt.slice(0, 10)), ...swims.map((s) => s.date)].sort();
  const last = dates[dates.length - 1];
  if (!last) return null;
  return Math.round((parseISO(today).getTime() - parseISO(last).getTime()) / 86_400_000);
}

/** Mou l'activitat d'un dia a un altre. Si el dia de destí ja tenia una sessió, s'intercanvien. */
export async function moveActivity(from: string, to: string, profile: Profile) {
  if (from === to) return;
  const overrides = new Map((await db.schedule.toArray()).map((o) => [o.date, o]));
  const a = planFor(from, profile, overrides), b = planFor(to, profile, overrides);
  const swap = isMainActivity(b.activity);
  await db.schedule.bulkPut([
    { date: to, activity: a.activity, movedFrom: from, comeback: a.comeback || undefined },
    { date: from, activity: swap ? b.activity : 'descans', movedTo: to, ...(swap ? { movedFrom: to } : {}) },
  ]);
}

export const resetDay = (date: string) => db.schedule.delete(date);

/** Activa o desactiva el mode viatge. En desactivar-lo, el primer dia laborable queda marcat com a «Tornada». */
export async function setTravel(active: boolean, profile: Profile, sessions: Session[], today = todayISO()) {
  const modes = profile.modes ?? { travel: { active: false }, christmas: { active: false } };
  await db.profile.update('me', { modes: { ...modes, travel: active ? { active: true, since: today } : { active: false } } });
  if (active) return;
  let d = today;
  while ([0, 6].includes(weekdayOf(d))) d = addDaysISO(d, 1);
  const overrides = new Map((await db.schedule.toArray()).map((o) => [o.date, o]));
  const p = planFor(d, { ...profile, modes: { ...modes, travel: { active: false } } }, overrides);
  const activity: PlanActivity = p.activity === 'forca_A' || p.activity === 'forca_B' || p.activity === 'natacio'
    ? p.activity
    : (`forca_${nextDayKey(sessions, ['A', 'B'])}` as PlanActivity);
  await db.schedule.put({ date: d, activity, comeback: true });
  return d;
}

export async function setChristmas(active: boolean, profile: Profile, refKg: number, today = todayISO()) {
  const modes = profile.modes ?? { travel: { active: false }, christmas: { active: false } };
  await db.profile.update('me', { modes: { ...modes, christmas: active ? { active: true, since: today, refKg: Math.round(refKg * 10) / 10 } : { active: false } } });
}

/** Desembre (i primera setmana de gener): moment de proposar el mode Nadal */
export const isChristmasSeason = (iso = todayISO()) => iso.slice(5, 7) === '12' || (iso.slice(5, 7) === '01' && Number(iso.slice(8, 10)) <= 7);
