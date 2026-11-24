import { db, uid } from '../db/db';
import type { DailyLog, WeeklyReview, WeighIn } from '../db/types';
import { addDaysISO, todayISO } from './dates';
import { weeklyAverages } from './weight';

export const STEPS_GOAL = { min: 7000, max: 10000 };

export async function setLog(date: string, patch: Partial<DailyLog>) {
  const cur = await db.dailyLogs.get(date);
  // Un registre tocat a mà deixa de ser «de prova»
  await db.dailyLogs.put({ ...(cur ?? {}), ...patch, date, isDemo: undefined });
}

export interface WeekHabits {
  snacks: number;
  alcoholDays: number;
  stepsAvg?: number;
  stepsDays: number;
  /** dies de la setmana amb algun registre d'hàbits */
  loggedDays: number;
}

export function weekHabits(monday: string, logs: DailyLog[]): WeekHabits {
  const end = addDaysISO(monday, 7);
  const inWeek = logs.filter((l) => l.date >= monday && l.date < end);
  const steps = inWeek.filter((l) => l.steps != null).map((l) => l.steps!);
  return {
    snacks: inWeek.filter((l) => l.snack).length,
    alcoholDays: inWeek.filter((l) => l.alcohol).length,
    stepsAvg: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : undefined,
    stepsDays: steps.length,
    loggedDays: inWeek.filter((l) => l.snack != null || l.alcohol != null || l.steps != null).length,
  };
}

/**
 * Compara el canvi de pes de les setmanes amb 3+ dies d'alcohol amb les de 2 o menys.
 * Fa servir el registre diari i, si una setmana no en té, la revisió setmanal.
 */
export function alcoholInsight(weighIns: WeighIn[], logs: DailyLog[], reviews: WeeklyReview[]) {
  const weekly = weeklyAverages(weighIns);
  const high: number[] = [], low: number[] = [];
  for (let i = 1; i < weekly.length; i++) {
    const w = weekly[i], prev = weekly[i - 1];
    if (addDaysISO(prev.week, 7) !== w.week) continue;
    const h = weekHabits(w.week, logs);
    const days = h.loggedDays >= 4 ? h.alcoholDays : reviews.find((r) => r.week === w.week)?.alcoholDays;
    if (days == null) continue;
    (days >= 3 ? high : low).push(w.avg - prev.avg);
  }
  if (high.length < 2 || low.length < 2) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const hi = avg(high), lo = avg(low);
  if (hi - lo < 0.15) return null;
  return { high: hi, low: lo, nHigh: high.length, nLow: low.length };
}

// ── Dreceres (Shortcuts) de l'iPhone ──

export interface ShortcutData { steps?: number; weightKg?: number; date?: string; /** passos de diversos dies */ days?: { date: string; steps: number }[] }

/** Llegeix un nombre de passos: «8500», «8.500», «8 500», «8500,0» */
function parseSteps(raw: string): number | undefined {
  const s = raw.replace(/[\s\u00a0\u202f]/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** Text que genera la drecera, p. ex. «FORMA passos=8532 pes=83,4 kg data=2026-11-24» */
export function parseShortcut(text: string): ShortcutData | null {
  const out: ShortcutData = {};
  // Diversos dies: «2026-11-23 8532 · 2026-11-24 10.200» (també amb «:» o «=»)
  const days = new Map<string, number>();
  for (const m of text.matchAll(/(\d{4}-\d{2}-\d{2})\s*[:=]?\s*(\d[\d.,\u00a0\u202f]*\d|\d)(?!\d*-)/g)) {
    const n = parseSteps(m[2]);
    if (n != null && n >= 0 && n <= 100000) days.set(m[1], n);
  }
  if (days.size > 1 || (days.size === 1 && !/(?:data|date)\s*[=:]/i.test(text))) {
    out.days = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, steps]) => ({ date, steps }));
  }
  if (!out.days && !/passos|pes|steps|weight/i.test(text)) return null;
  const st = text.match(/(?:passos|steps)\s*[=:]\s*(\d[\d.,\s\u00a0\u202f]*)/i);
  if (st) out.steps = parseSteps(st[1].trim());
  const kg = text.match(/(?:pes|weight)\s*[=:]\s*(\d{2,3}(?:[.,]\d+)?)/i);
  if (kg) out.weightKg = Math.round(Number(kg[1].replace(',', '.')) * 10) / 10;
  const d = text.match(/(?:data|date)\s*[=:]\s*(\d{4}-\d{2}-\d{2})/i);
  if (d) out.date = d[1];
  if (out.steps != null && (out.steps < 0 || out.steps > 100000)) delete out.steps;
  if (out.weightKg != null && (out.weightKg < 30 || out.weightKg > 250)) delete out.weightKg;
  if (out.days) delete out.steps;
  return out.steps != null || out.weightKg != null || out.days?.length ? out : null;
}

/** Desa les dades: passos al registre diari i pes com a pesada (si aquell dia no n'hi ha cap de manual) */
export async function applyShortcut(d: ShortcutData) {
  const date = d.date ?? todayISO();
  const result: string[] = [];
  if (d.days?.length) {
    for (const x of d.days) await setLog(x.date, { steps: x.steps, stepsSource: 'salut' });
    result.push(`passos de ${d.days.length} dies`);
  }
  if (d.steps != null) {
    await setLog(date, { steps: d.steps, stepsSource: 'salut' });
    result.push(`${d.steps.toLocaleString('ca-ES')} passos`);
  }
  if (d.weightKg != null) {
    const existing = await db.weighIns.where('date').equals(date).first();
    if (existing && existing.source === 'manual') result.push(`pes no desat (ja tens una pesada manual de ${existing.weightKg.toLocaleString('ca-ES')} kg)`);
    else {
      await db.weighIns.put({ id: existing?.id ?? uid(), date, weightKg: d.weightKg, source: 'salut' });
      result.push(`${d.weightKg.toLocaleString('ca-ES')} kg`);
    }
  }
  return { date, result };
}
