import type { Profile, WeighIn } from '../db/types';
import { dayNum, fromDayNum, midDate, todayISO } from './dates';

export interface GoalPoint { day: number; kg: number; label: string }

/** Punts de la línia objectiu: inici → centre finestra fita 1 → centre finestra fita 2 */
export function goalLinePoints(profile: Profile): GoalPoint[] {
  const pts: GoalPoint[] = [{ day: dayNum(profile.startDate), kg: profile.startWeightKg, label: 'Inici' }];
  const goals = [...profile.goals].sort((a, b) => b.targetKg - a.targetKg);
  for (const g of goals) pts.push({ day: dayNum(midDate(g.dateFrom, g.dateTo)), kg: g.targetKg, label: g.label });
  return pts;
}

export function goalLineAt(profile: Profile, day: number): number {
  const pts = goalLinePoints(profile);
  if (day <= pts[0].day) return pts[0].kg;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (day <= b.day) return a.kg + ((day - a.day) / (b.day - a.day)) * (b.kg - a.kg);
  }
  return pts[pts.length - 1].kg;
}

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
  current: number;
  currentDate: string | null;
  lostKg: number;
  bmi: number;
  bodyFat?: number;
  /** kg/setmana (negatiu = perdent pes). undefined si no hi ha prou dades */
  rateKgWeek?: number;
  rateWindowWeeks?: number;
  /** ritme necessari per arribar a la propera fita no assolida (kg/setmana, negatiu) */
  requiredKgWeek?: number;
  /** ritme planificat de la línia objectiu en aquest tram */
  plannedKgWeek: number;
  expectedNow: number;
  diffVsPlan: number;
  status: WeightStatus;
  goals: GoalProgress[];
  tooFast: boolean;
  weeklyLossPct: number[];
}

export function analyzeWeight(profile: Profile, weighIns: WeighIn[], todayDay = dayNum(todayISO())): WeightAnalysis {
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const current = last?.weightKg ?? profile.startWeightKg;
  const currentDate = last?.date ?? null;
  const refDay = last ? dayNum(last.date) : todayDay;
  const h = profile.heightCm / 100;
  const bmi = current / (h * h);
  const bodyFat = [...sorted].reverse().find((w) => w.bodyFatPct != null)?.bodyFatPct;

  // Ritme real: regressió de les últimes 6 setmanes (mínim 3 pesades que cobreixin ≥ 14 dies)
  let rateKgWeek: number | undefined;
  let rateWindowWeeks: number | undefined;
  let fitted = current;
  const window = sorted.filter((w) => dayNum(w.date) >= refDay - 42);
  if (window.length >= 3 && refDay - dayNum(window[0].date) >= 14) {
    const xs = window.map((w) => dayNum(w.date));
    const { slope, intercept } = linReg(xs, window.map((w) => w.weightKg));
    rateKgWeek = slope * 7;
    rateWindowWeeks = Math.round((refDay - xs[0]) / 7);
    fitted = intercept + slope * refDay;
  }

  const expectedNow = goalLineAt(profile, refDay);
  const diffVsPlan = current - expectedNow;
  let status: WeightStatus = 'sense_dades';
  if (last) status = diffVsPlan < -0.5 ? 'per_davant' : diffVsPlan > 0.5 ? 'per_darrere' : 'en_cami';

  const pts = goalLinePoints(profile);
  let plannedKgWeek = 0;
  for (let i = 1; i < pts.length; i++) {
    if (refDay < pts[i].day || i === pts.length - 1) {
      plannedKgWeek = ((pts[i].kg - pts[i - 1].kg) / (pts[i].day - pts[i - 1].day)) * 7;
      break;
    }
  }

  const goalsSorted = [...profile.goals].sort((a, b) => b.targetKg - a.targetKg);
  const goals: GoalProgress[] = goalsSorted.map((g) => {
    const total = profile.startWeightKg - g.targetKg;
    const done = profile.startWeightKg - current;
    const reached = current <= g.targetKg;
    let forecast: string | undefined;
    if (!reached && rateKgWeek !== undefined && rateKgWeek < -0.02) {
      const days = (fitted - g.targetKg) / (-rateKgWeek / 7);
      if (days > 0 && days < 365 * 3) forecast = fromDayNum(Math.round(refDay + days));
    }
    return {
      id: g.id, label: g.label, targetKg: g.targetKg,
      remainingKg: Math.max(0, current - g.targetKg),
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

  // Avís: > 1% del pes corporal per setmana durant 3 setmanes seguides
  const weeklyLossPct: number[] = [];
  if (last) {
    for (let k = 0; k < 3; k++) {
      const a = weightAt(sorted, refDay - 7 * (k + 1));
      const b = weightAt(sorted, refDay - 7 * k);
      if (a === undefined || b === undefined) break;
      weeklyLossPct.push(((a - b) / a) * 100);
    }
  }
  const tooFast = weeklyLossPct.length === 3 && weeklyLossPct.every((p) => p > 1);

  return {
    sorted, current, currentDate, lostKg: profile.startWeightKg - current, bmi, bodyFat,
    rateKgWeek, rateWindowWeeks, requiredKgWeek, plannedKgWeek, expectedNow, diffVsPlan,
    status, goals, tooFast, weeklyLossPct,
  };
}

export const STATUS_LABEL: Record<WeightStatus, string> = {
  en_cami: 'En camí',
  per_davant: 'Per davant',
  per_darrere: 'Per darrere',
  sense_dades: 'Sense dades',
};

export function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'baix pes';
  if (bmi < 25) return 'normopès';
  if (bmi < 30) return 'sobrepès';
  return 'obesitat';
}
