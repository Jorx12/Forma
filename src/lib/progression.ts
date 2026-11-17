import type { DayKey, Exercise, Profile, RoutineItem, Session, SessionEntry, SetLog, SuggestionKind } from '../db/types';
import { dayNum, toISODate, weekStartISO } from './dates';
import { incrementFor } from './generator';
import { doneSets, summarizeEntry } from './stats';

const roundTo = (v: number, step: number) => Math.max(0, Math.round(v / step) * step);

/** Entrades anteriors (sessions acabades) d'un exercici, de la més recent a la més antiga */
export function historyFor(exerciseId: string, sessions: Session[]): { session: Session; entry: SessionEntry }[] {
  return sessions
    .filter((s) => s.status === 'feta')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((s) => s.entries.filter((e) => e.exerciseId === exerciseId && doneSets(e).length).map((entry) => ({ session: s, entry })));
}

const workingWeight = (e: SessionEntry) => Math.max(0, ...doneSets(e).map((s) => s.weightKg));

function hitTop(e: SessionEntry) {
  const sets = doneSets(e);
  const w = workingWeight(e);
  return sets.length >= e.target.sets && sets.every((s) => s.weightKg >= w && s.reps >= e.target.repMax);
}

function missedMin(e: SessionEntry) {
  const sets = doneSets(e);
  return sets.length < e.target.sets || sets.some((s) => s.reps < e.target.repMin);
}

export interface Plan {
  kind: SuggestionKind;
  reason: string;
  weightKg: number;
  reps: number[];
  lastSummary?: string;
  /** pes alternatiu suggerit (p. ex. mantenir quan es proposa baixar) */
  altWeightKg?: number;
}

/** Doble progressió */
export function planFor(item: RoutineItem, exercise: Exercise | undefined, profile: Profile, sessions: Session[], deload: boolean): Plan {
  const hist = historyFor(item.exerciseId, sessions);
  const inc = incrementFor(exercise, profile);
  const sets = deload ? Math.max(1, Math.min(2, item.sets)) : item.sets;
  const fill = (n: number) => Array.from({ length: sets }, () => n);

  if (!hist.length) {
    return {
      kind: 'primera', weightKg: 0, reps: fill(item.repMax),
      reason: `Primera vegada: tria un pes amb què puguis fer ${item.repMax} repeticions deixant-ne 2–3 de marge.`,
    };
  }
  const last = hist[0].entry;
  const lastW = workingWeight(last);
  const lastSummary = summarizeEntry(last);
  // Rang de repeticions actual de la rutina; el nombre de sèries és el que es va planificar aquell dia
  const lastAdj: SessionEntry = { ...last, target: { ...last.target, repMin: item.repMin, repMax: item.repMax } };

  if (deload) {
    return {
      kind: 'descarrega', weightKg: roundTo(lastW * 0.9, inc), reps: fill(item.repMin), lastSummary,
      reason: `Setmana de descàrrega: ${sets} sèries amb un ~10 % menys de pes i sense apurar.`,
    };
  }
  if (hitTop(lastAdj)) {
    return {
      kind: 'pujar', weightKg: lastW + inc, reps: fill(item.repMin), lastSummary,
      reason: `Vas fer totes les sèries a ${item.repMax} reps. Puja ${inc.toLocaleString('ca-ES')} kg i torna a ${item.repMin} reps.`,
    };
  }
  if (missedMin(lastAdj)) {
    const prev = hist[1]?.entry;
    const prevAdj = prev && { ...prev, target: { ...prev.target, repMin: item.repMin, repMax: item.repMax } };
    if (prevAdj && missedMin(prevAdj) && workingWeight(prevAdj) >= lastW) {
      const lower = roundTo(lastW * 0.92, inc);
      return {
        kind: 'baixar', weightKg: lower < lastW ? lower : Math.max(0, lastW - inc), altWeightKg: lastW, reps: fill(item.repMin), lastSummary,
        reason: `Dues sessions seguides sense arribar a ${item.repMin} reps. Baixa lleugerament el pes (o mantén ${lastW.toLocaleString('ca-ES')} kg si et trobes bé).`,
      };
    }
    return {
      kind: 'repetir', weightKg: lastW, reps: fill(item.repMin), lastSummary,
      reason: `L'últim dia no vas arribar a ${item.repMin} reps en totes les sèries. Mantén el pes i torna-ho a provar.`,
    };
  }
  // Dins del rang: mateix pes, intenta sumar una repetició a cada sèrie
  const lastReps = doneSets(last).map((s) => s.reps);
  const reps = Array.from({ length: sets }, (_, i) => Math.min(item.repMax, (lastReps[i] ?? lastReps[lastReps.length - 1] ?? item.repMin) + 1));
  return {
    kind: 'mantenir', weightKg: lastW, reps, lastSummary,
    reason: `Mateix pes. Intenta sumar una repetició per sèrie fins arribar a ${item.repMax}.`,
  };
}

export function nextDayKey(sessions: Session[]): DayKey {
  const last = sessions.filter((s) => s.status === 'feta').sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!last) return 'A';
  return ({ A: 'B', B: 'C', C: 'A' } as const)[last.dayKey];
}

/** Data de referència per a l'adaptació: el primer entrenament fet (o avui) */
export function trainingStart(sessions: Session[]) {
  const done = sessions.filter((s) => s.status === 'feta').map((s) => s.startedAt.slice(0, 10)).sort();
  return done[0] ?? toISODate();
}

export function isAdaptation(profile: Profile, sessions: Session[], date = toISODate()) {
  return dayNum(date) - dayNum(trainingStart(sessions)) < profile.adaptationWeeks * 7;
}

/** Suggereix descàrrega si han passat N setmanes des de l'inici o de l'última descàrrega */
export function deloadDue(profile: Profile, sessions: Session[], date = toISODate()) {
  const n = profile.deloadEveryWeeks;
  if (!n) return { due: false, weeks: 0 };
  const done = sessions.filter((s) => s.status === 'feta');
  if (!done.length) return { due: false, weeks: 0 };
  const lastDeload = done.filter((s) => s.flags.deload).map((s) => s.startedAt.slice(0, 10)).sort().pop();
  const thisWeek = weekStartISO(date);
  if (lastDeload && weekStartISO(lastDeload) === thisWeek) return { due: true, weeks: 0, current: true };
  const from = weekStartISO(lastDeload ?? trainingStart(sessions));
  const weeks = Math.floor((dayNum(thisWeek) - dayNum(from)) / 7);
  return { due: weeks >= n, weeks };
}

export function buildEntries(items: RoutineItem[], exercises: Exercise[], profile: Profile, sessions: Session[], deload: boolean): SessionEntry[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return items.map((it) => buildEntry(it, byId.get(it.exerciseId), profile, sessions, deload));
}

export function buildEntry(it: RoutineItem, e: Exercise | undefined, profile: Profile, sessions: Session[], deload: boolean): SessionEntry {
  const plan = planFor(it, e, profile, sessions, deload);
  const sets: SetLog[] = plan.reps.map((r) => ({ weightKg: plan.weightKg, reps: r, done: false }));
  return {
    exerciseId: it.exerciseId,
    target: { sets: sets.length, repMin: it.repMin, repMax: it.repMax, weightKg: plan.weightKg, restSec: it.restSec },
    suggestion: { kind: plan.kind, reason: plan.reason },
    sets,
  };
}
