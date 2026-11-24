import type { BodyMeasurement, DailyLog, ExtraActivity, Session, Swim, WeighIn } from '../db/types';
import { completed, sessionPRs, sessionVolume, type PR } from './stats';

export interface MonthSummary {
  month: string;
  /** mitjana de les pesades del mes i del mes anterior */
  avgKg?: number;
  prevAvgKg?: number;
  kgChange?: number;
  waistFirst?: number;
  waistLast?: number;
  waistChange?: number;
  strength: number;
  hotel: number;
  swims: number;
  swimMin: number;
  extras: number;
  extraMin: number;
  cardioMin: number;
  volumeKg: number;
  prs: (PR & { date: string })[];
  snacks: number;
  alcoholDays: number;
  stepsAvg?: number;
  loggedDays: number;
  totalSessions: number;
}

export const inMonth = (iso: string, month: string) => iso.slice(0, 7) === month;

export function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
export function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const r1 = (n?: number) => (n == null ? undefined : Math.round(n * 10) / 10);

export function monthSummary(month: string, d: {
  weighIns: WeighIn[]; measures: BodyMeasurement[]; sessions: Session[]; swims: Swim[]; extras: ExtraActivity[]; logs: DailyLog[];
}): MonthSummary {
  const avgKg = mean(d.weighIns.filter((w) => inMonth(w.date, month)).map((w) => w.weightKg));
  const prevAvgKg = mean(d.weighIns.filter((w) => inMonth(w.date, prevMonth(month))).map((w) => w.weightKg));
  const waist = d.measures.filter((m) => m.waistCm != null && inMonth(m.date, month)).sort((a, b) => a.date.localeCompare(b.date));
  const done = completed(d.sessions).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const ms = done.filter((s) => inMonth(s.startedAt.slice(0, 10), month));
  const prs = ms.flatMap((s) => sessionPRs(s, done.filter((x) => x.startedAt < s.startedAt)).map((p) => ({ ...p, date: s.startedAt.slice(0, 10) })));
  const swims = d.swims.filter((s) => inMonth(s.date, month));
  const extras = d.extras.filter((e) => inMonth(e.date, month));
  const logs = d.logs.filter((l) => inMonth(l.date, month));
  const steps = logs.filter((l) => l.steps != null).map((l) => l.steps!);
  const strength = ms.filter((s) => s.dayKey !== 'H').length, hotel = ms.filter((s) => s.dayKey === 'H').length;
  return {
    month, avgKg: r1(avgKg), prevAvgKg: r1(prevAvgKg),
    kgChange: avgKg != null && prevAvgKg != null ? Math.round((avgKg - prevAvgKg) * 10) / 10 : undefined,
    waistFirst: waist[0]?.waistCm, waistLast: waist[waist.length - 1]?.waistCm,
    waistChange: waist.length > 1 ? Math.round((waist[waist.length - 1].waistCm! - waist[0].waistCm!) * 10) / 10 : undefined,
    strength, hotel, swims: swims.length, swimMin: swims.reduce((t, s) => t + s.durationMin, 0),
    extras: extras.length, extraMin: extras.reduce((t, e) => t + e.minutes, 0),
    cardioMin: Math.round(ms.reduce((t, s) => t + (s.cardio?.done ? s.cardio.durationSec : 0), 0) / 60),
    volumeKg: Math.round(ms.reduce((t, s) => t + sessionVolume(s), 0)),
    prs, snacks: logs.filter((l) => l.snack).length, alcoholDays: logs.filter((l) => l.alcohol).length,
    stepsAvg: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : undefined,
    loggedDays: logs.length, totalSessions: strength + hotel + swims.length,
  };
}
