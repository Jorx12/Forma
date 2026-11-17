import type { Session, SessionEntry, SetLog } from '../db/types';
import { addDaysISO, toISODate, weekStartISO } from './dates';

export const epley = (w: number, r: number) => (r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));

export const doneSets = (e: SessionEntry) => e.sets.filter((s) => s.done && s.reps > 0);

export const setVolume = (s: SetLog) => s.weightKg * s.reps;
export const entryVolume = (e: SessionEntry) => doneSets(e).reduce((t, s) => t + setVolume(s), 0);
export const sessionVolume = (s: Session) => s.entries.reduce((t, e) => t + entryVolume(e), 0);
export const sessionSetsDone = (s: Session) => s.entries.reduce((t, e) => t + doneSets(e).length, 0);

export function entryBest(e: SessionEntry) {
  const sets = doneSets(e);
  return {
    maxWeight: Math.max(0, ...sets.map((s) => s.weightKg)),
    best1RM: Math.max(0, ...sets.map((s) => epley(s.weightKg, s.reps))),
    volume: entryVolume(e),
    maxReps: Math.max(0, ...sets.map((s) => s.reps)),
  };
}

/** Resum curt d'una entrada: «3×10 a 40 kg» o «40 kg: 12, 10, 9» */
export function summarizeEntry(e: SessionEntry): string {
  const sets = doneSets(e);
  if (!sets.length) return 'cap sèrie feta';
  const w = sets.map((s) => s.weightKg), r = sets.map((s) => s.reps);
  const fmtW = (x: number) => `${x.toLocaleString('ca-ES')} kg`;
  const sameW = w.every((x) => x === w[0]);
  const sameR = r.every((x) => x === r[0]);
  if (sameW && sameR) return `${sets.length}×${r[0]} a ${fmtW(w[0])}`;
  if (sameW) return `${fmtW(w[0])}: ${r.join(', ')} reps`;
  return sets.map((s) => `${s.reps}×${s.weightKg.toLocaleString('ca-ES')}`).join(' · ') + ' kg';
}

export const completed = (sessions: Session[]) => sessions.filter((s) => s.status === 'feta');

export interface PR { exerciseId: string; kind: 'pes' | '1rm' | 'reps'; value: string }

/** Rècords personals d'una sessió respecte a totes les anteriors */
export function sessionPRs(session: Session, previous: Session[]): PR[] {
  const prs: PR[] = [];
  for (const e of session.entries) {
    const cur = entryBest(e);
    if (!cur.maxWeight && !cur.maxReps) continue;
    const prev = previous.flatMap((s) => s.entries.filter((x) => x.exerciseId === e.exerciseId));
    if (!prev.length) continue; // primera vegada: no és rècord
    const pb = prev.map(entryBest);
    const maxW = Math.max(...pb.map((b) => b.maxWeight));
    const max1 = Math.max(...pb.map((b) => b.best1RM));
    if (cur.maxWeight > maxW) prs.push({ exerciseId: e.exerciseId, kind: 'pes', value: `${cur.maxWeight.toLocaleString('ca-ES')} kg` });
    else if (cur.best1RM > max1 + 0.01) prs.push({ exerciseId: e.exerciseId, kind: '1rm', value: `1RM est. ${cur.best1RM.toFixed(1).replace('.', ',')} kg` });
    else {
      // Més repeticions amb el mateix pes màxim
      const repsAtW = (en: SessionEntry, w: number) => Math.max(0, ...doneSets(en).filter((s) => s.weightKg === w).map((s) => s.reps));
      const prevReps = Math.max(0, ...prev.map((p) => repsAtW(p, cur.maxWeight)));
      const nowReps = repsAtW(e, cur.maxWeight);
      if (cur.maxWeight > 0 && nowReps > prevReps && prevReps > 0) prs.push({ exerciseId: e.exerciseId, kind: 'reps', value: `${nowReps} reps a ${cur.maxWeight.toLocaleString('ca-ES')} kg` });
    }
  }
  return prs;
}

export interface WeekCount { week: string; count: number }

/** Entrenaments per setmana (dilluns) des de la primera fins a l'actual */
export function weeklyCounts(sessions: Session[], from?: string): WeekCount[] {
  const done = completed(sessions);
  const thisWeek = weekStartISO(toISODate());
  const first = from ? weekStartISO(from) : done.length ? weekStartISO(done.map((s) => s.startedAt).sort()[0].slice(0, 10)) : thisWeek;
  const map = new Map<string, number>();
  for (const s of done) {
    const w = weekStartISO(s.startedAt.slice(0, 10));
    map.set(w, (map.get(w) ?? 0) + 1);
  }
  const out: WeekCount[] = [];
  for (let w = first; w <= thisWeek; w = addDaysISO(w, 7)) out.push({ week: w, count: map.get(w) ?? 0 });
  return out;
}

/** Ratxa de setmanes completes (objectiu assolit). La setmana en curs compta si ja està completa; si no, no trenca la ratxa. */
export function streak(weeks: WeekCount[], target: number) {
  let n = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const isCurrent = i === weeks.length - 1;
    if (weeks[i].count >= target) n++;
    else if (!isCurrent) break;
  }
  return n;
}

export function bestStreak(weeks: WeekCount[], target: number) {
  let best = 0, cur = 0;
  for (const w of weeks) { cur = w.count >= target ? cur + 1 : 0; best = Math.max(best, cur); }
  return best;
}
