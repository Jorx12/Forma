import type { Profile, WeighIn } from '../db/types';
import { addDaysISO, dayNum, fromDayNum, midDate, todayISO, weekStartISO } from './dates';

export interface GoalPoint { day: number; kg: number; kgMin: number; kgMax: number; label: string }

/** Punts de la línia objectiu: inici → fites mensuals (o, si no n'hi ha, les fites de 75 i 70 kg) */
export function goalLinePoints(profile: Profile): GoalPoint[] {
  const start = { day: dayNum(profile.startDate), kg: profile.startWeightKg, kgMin: profile.startWeightKg, kgMax: profile.startWeightKg, label: 'Inici' };
  const ms = (profile.milestones ?? []).filter((m) => m.date > profile.startDate).sort((a, b) => a.date.localeCompare(b.date));
  if (ms.length) return [start, ...ms.map((m) => ({ day: dayNum(m.date), kg: (m.kgMin + m.kgMax) / 2, kgMin: m.kgMin, kgMax: m.kgMax, label: m.label }))];
  const goals = [...profile.goals].sort((a, b) => b.targetKg - a.targetKg);
  return [start, ...goals.map((g) => ({ day: dayNum(midDate(g.dateFrom, g.dateTo)), kg: g.targetKg, kgMin: g.targetKg, kgMax: g.targetKg, label: g.label }))];
}

function interp(pts: GoalPoint[], day: number, key: 'kg' | 'kgMin' | 'kgMax') {
  if (day <= pts[0].day) return pts[0][key];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (day <= b.day) return a[key] + ((day - a.day) / (b.day - a.day)) * (b[key] - a[key]);
  }
  return pts[pts.length - 1][key];
}

export const goalLineAt = (profile: Profile, day: number) => interp(goalLinePoints(profile), day, 'kg');
export const goalRangeAt = (profile: Profile, day: number): [number, number] => {
  const pts = goalLinePoints(profile);
  return [interp(pts, day, 'kgMin'), interp(pts, day, 'kgMax')];
};

/** Regressió lineal per mínims quadrats */
export function linReg(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/** Pes interpolat linealment en un dia (undefined fora del rang registrat) */
export function weightAt(sorted: WeighIn[], day: number): number | undefined {
  if (!sorted.length) return undefined;
  for (let i = 0; i < sorted.length; i++) {
    const d = dayNum(sorted[i].date);
    if (d === day) return sorted[i].weightKg;
    if (d > day) {
      if (i === 0) return undefined;
      const p = sorted[i - 1], pd = dayNum(p.date);
      return p.weightKg + ((day - pd) / (d - pd)) * (sorted[i].weightKg - p.weightKg);
    }
  }
  return undefined;
}

export interface WeekAvg { week: string; avg: number; n: number; /** dia central de la setmana (dijous) per als gràfics */ day: number }

/** Mitjana de les pesades de cada setmana (dilluns–diumenge) */
export function weeklyAverages(weighIns: WeighIn[]): WeekAvg[] {
  const map = new Map<string, number[]>();
  for (const w of weighIns) {
    const k = weekStartISO(w.date);
    map.set(k, [...(map.get(k) ?? []), w.weightKg]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, xs]) => ({
    week, n: xs.length, avg: Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100, day: dayNum(week) + 3,
  }));
}

export const weekAvgOf = (weighIns: WeighIn[], week: string) => weeklyAverages(weighIns).find((w) => w.week === week)?.avg;

export type WeightStatus = 'en_cami' | 'per_davant' | 'per_darrere' | 'sense_dades';

export interface GoalProgress {
  id: string;
  label: string;
  targetKg: number;
  remainingKg: number;
  pct: number;
  reached: boolean;
  targetDate: string;
  forecast?: string;
}

export interface WeightAnalysis {
  sorted: WeighIn[];
  weekly: WeekAvg[];
  /** dada principal: mitjana de la setmana més recent amb pesades */
  current: number;
  currentWeek: string | null;
  currentN: number;
  /** última pesada individual */
  lastWeighIn?: WeighIn;
  currentDate: string | null;
  /** canvi de la mitjana respecte a la setmana anterior (kg) */
  weeklyChange?: number;
  lostKg: number;
  bmi: number;
  bodyFat?: number;
  /** kg/setmana (negatiu = perdent pes), regressió de les mitjanes setmanals */
  rateKgWeek?: number;
  rateWindowWeeks?: number;
  requiredKgWeek?: number;
  plannedKgWeek: number;
  expectedNow: number;
  diffVsPlan: number;
  status: WeightStatus;
  /** mode Nadal: l'objectiu és mantenir */
  maintain: boolean;
  goals: GoalProgress[];
  /** baixa de més d'1 kg a la setmana */
  tooFast: boolean;
  weeklyLossPct: number[];
}

export function analyzeWeight(profile: Profile, weighIns: WeighIn[], todayDay = dayNum(todayISO())): WeightAnalysis {
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const weekly = weeklyAverages(sorted);
  const lastW = weekly[weekly.length - 1];
  const prevW = weekly[weekly.length - 2];
  const current = lastW?.avg ?? profile.startWeightKg;
  const last = sorted[sorted.length - 1];
  const refDay = lastW ? Math.min(lastW.day, todayDay) : todayDay;
  const h = profile.heightCm / 100;
  const bodyFat = [...sorted].reverse().find((w) => w.bodyFatPct != null)?.bodyFatPct;

  // Ritme: regressió de les mitjanes setmanals de les últimes 6 setmanes
  let rateKgWeek: number | undefined, rateWindowWeeks: number | undefined;
  let fitted = current;
  const win = weekly.filter((w) => w.day >= (lastW?.day ?? 0) - 42);
  if (win.length >= 2) {
    const { slope, intercept } = linReg(win.map((w) => w.day), win.map((w) => w.avg));
    rateKgWeek = slope * 7;
    rateWindowWeeks = win.length;
    fitted = intercept + slope * (lastW?.day ?? refDay);
  }
  const weeklyChange = lastW && prevW && dayNum(lastW.week) - dayNum(prevW.week) === 7 ? lastW.avg - prevW.avg : undefined;

  const expectedNow = goalLineAt(profile, refDay);
  const diffVsPlan = current - expectedNow;
  const xmas = profile.modes?.christmas;
  const maintain = !!xmas?.active;
  let status: WeightStatus = 'sense_dades';
  if (lastW) {
    const ref = maintain ? (xmas?.refKg ?? current) : expectedNow;
    const d = current - ref;
    status = d < -0.5 ? 'per_davant' : d > 0.5 ? 'per_darrere' : 'en_cami';
  }

  const pts = goalLinePoints(profile);
  let plannedKgWeek = 0;
  for (let i = 1; i < pts.length; i++) {
    if (refDay < pts[i].day || i === pts.length - 1) {
      plannedKgWeek = ((pts[i].kg - pts[i - 1].kg) / (pts[i].day - pts[i - 1].day)) * 7;
      break;
    }
  }

  const goals: GoalProgress[] = [...profile.goals].sort((a, b) => b.targetKg - a.targetKg).map((g) => {
    const total = profile.startWeightKg - g.targetKg;
    const done = profile.startWeightKg - current;
    const reached = current <= g.targetKg;
    let forecast: string | undefined;
    if (!reached && rateKgWeek !== undefined && rateKgWeek < -0.02) {
      const days = (fitted - g.targetKg) / (-rateKgWeek / 7);
      if (days > 0 && days < 365 * 3) forecast = fromDayNum(Math.round((lastW?.day ?? refDay) + days));
    }
    return {
      id: g.id, label: g.label, targetKg: g.targetKg, remainingKg: Math.max(0, current - g.targetKg),
      pct: total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : 0,
      reached, targetDate: midDate(g.dateFrom, g.dateTo), forecast,
    };
  });

  let requiredKgWeek: number | undefined;
  const next = goals.find((g) => !g.reached);
  if (next) {
    const weeks = (dayNum(next.targetDate) - Math.max(refDay, todayDay)) / 7;
    if (weeks > 0) requiredKgWeek = -(current - next.targetKg) / weeks;
  }

  const weeklyLossPct = weekly.slice(-4).map((w, i, arr) => (i ? ((arr[i - 1].avg - w.avg) / arr[i - 1].avg) * 100 : NaN)).slice(1);
  const tooFast = weeklyChange !== undefined && weeklyChange < -1;

  return {
    sorted, weekly, current, currentWeek: lastW?.week ?? null, currentN: lastW?.n ?? 0, lastWeighIn: last,
    currentDate: last?.date ?? null, weeklyChange, lostKg: profile.startWeightKg - current, bmi: current / (h * h), bodyFat,
    rateKgWeek, rateWindowWeeks, requiredKgWeek, plannedKgWeek, expectedNow, diffVsPlan, status, maintain, goals, tooFast, weeklyLossPct,
  };
}

export const STATUS_LABEL: Record<WeightStatus, string> = {
  en_cami: 'En camí',
  per_davant: 'Per davant',
  per_darrere: 'Per darrere',
  sense_dades: 'Sense dades',
};

export const statusLabel = (a: Pick<WeightAnalysis, 'status' | 'maintain'>) =>
  a.maintain ? (a.status === 'per_darrere' ? 'Pujant (Nadal)' : a.status === 'sense_dades' ? 'Sense dades' : 'Mantenint (Nadal)') : STATUS_LABEL[a.status];

export function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'baix pes';
  if (bmi < 25) return 'normopès';
  if (bmi < 30) return 'sobrepès';
  return 'obesitat';
}

/** Dies de pesada recomanats: dilluns, dimecres i divendres */
export const WEIGH_DAYS = [1, 3, 5];
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
