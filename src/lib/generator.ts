import { LOWER_GROUPS } from '../data/catalog';
import type { DayKey, Exercise, MuscleGroup, Pattern, Profile, Routine, RoutineDay, RoutineItem } from '../db/types';

/** Plantilla setmanal: cada dia cobreix genoll + maluc i alterna empènyer/estirar horitzontal i vertical */
export const TEMPLATE: Record<DayKey, Pattern[]> = {
  A: ['push_h', 'pull_v', 'knee', 'hip', 'push_v', 'isolation', 'core'],
  B: ['push_v', 'pull_h', 'knee', 'hip', 'pull_v', 'isolation'],
  C: ['push_h', 'pull_h', 'knee', 'hip', 'isolation', 'core'],
};

/** Grups preferits per als aïllaments de cada dia (per repartir-los durant la setmana) */
const ISOLATION_FOCUS: Record<DayKey, MuscleGroup[]> = {
  A: ['espatlles', 'biceps'],
  B: ['isquios', 'triceps'],
  C: ['biceps', 'triceps', 'quadriceps', 'glutis', 'pit'],
};

export const DAY_KEYS: DayKey[] = ['A', 'B', 'C'];

export const isIsolationLike = (e: Pick<Exercise, 'pattern' | 'isCompound'>) =>
  !e.isCompound || e.pattern === 'isolation' || e.pattern === 'core';

/** Puntuació d'un exercici: més alta = millor candidat */
export function scoreExercise(e: Exercise, fasciitis: boolean): number {
  let s = 0;
  if (e.preference === 'like') s += 3;
  if (e.preference === 'dislike') s -= 10;
  if (e.position !== 'dempeus') s += 1.5;
  if (e.footImpact === 'baix') s += 1;
  if (fasciitis && e.footImpact === 'alt') s -= 6;
  if (fasciitis && e.footImpact === 'mitja') s -= 0.5;
  if (fasciitis && e.position === 'dempeus') s -= 2;
  return s;
}

export function usable(e: Exercise) {
  return e.available && e.preference !== 'dislike';
}

export function candidatesFor(pattern: Pattern, exercises: Exercise[], fasciitis: boolean) {
  return exercises
    .filter((e) => usable(e) && e.pattern === pattern)
    .sort((a, b) => scoreExercise(b, fasciitis) - scoreExercise(a, fasciitis));
}

export function defaultItem(e: Exercise, slot: Pattern, profile: Profile): RoutineItem {
  const iso = isIsolationLike(e);
  return {
    exerciseId: e.id,
    slot,
    sets: 3,
    repMin: iso ? 10 : 8,
    repMax: iso ? 15 : 12,
    restSec: iso ? profile.restSec.isolation : profile.restSec.compound,
  };
}

export function incrementFor(e: Exercise | undefined, profile: Profile) {
  if (e?.incrementKg) return e.incrementKg;
  return e && LOWER_GROUPS.includes(e.muscleGroup) && e.isCompound ? profile.defaultIncrementKg.lower : profile.defaultIncrementKg.upper;
}

/**
 * Genera una rutina full body A/B/C.
 * `jitter` (0–1) afegeix variació aleatòria per poder regenerar i obtenir combinacions diferents.
 */
export function generateRoutine(exercises: Exercise[], profile: Profile, jitter = 0): { days: RoutineDay[]; warnings: string[] } {
  const fasciitis = profile.conditions.plantarFasciitis;
  const useCount = new Map<string, number>();
  const warnings: string[] = [];
  const rand = () => (jitter ? Math.random() * jitter * 2.5 : 0);

  const pick = (pool: Exercise[], exclude: Set<string>) => {
    let best: Exercise | undefined, bestScore = -Infinity;
    for (const e of pool) {
      if (exclude.has(e.id)) continue;
      // Penalitza repetir la mateixa màquina en diversos dies si hi ha alternatives
      const sc = scoreExercise(e, fasciitis) - 1.5 * (useCount.get(e.id) ?? 0) + rand();
      if (sc > bestScore) { best = e; bestScore = sc; }
    }
    return best;
  };

  const days: RoutineDay[] = DAY_KEYS.map((key) => {
    const items: RoutineItem[] = [];
    const used = new Set<string>();
    for (const slot of TEMPLATE[key]) {
      let pool = exercises.filter((e) => usable(e) && e.pattern === slot);
      if (slot === 'isolation') {
        const focused = pool.filter((e) => ISOLATION_FOCUS[key].includes(e.muscleGroup) && e.muscleGroup !== 'bessons');
        if (focused.some((e) => !used.has(e.id))) pool = focused;
      }
      const e = pick(pool, used);
      if (!e) {
        warnings.push(`Dia ${key}: no hi ha cap màquina disponible per a «${slot}».`);
        continue;
      }
      if (fasciitis && e.footImpact === 'alt') warnings.push(`Dia ${key}: «${e.name}» té impacte alt al peu (no hi havia alternativa).`);
      used.add(e.id);
      useCount.set(e.id, (useCount.get(e.id) ?? 0) + 1);
      items.push(defaultItem(e, slot, profile));
    }
    // Mínim 5 exercicis: omple amb aïllaments o core
    while (items.length < 5) {
      const e = pick(exercises.filter((x) => usable(x) && (x.pattern === 'isolation' || x.pattern === 'core')), used);
      if (!e) break;
      used.add(e.id);
      useCount.set(e.id, (useCount.get(e.id) ?? 0) + 1);
      items.push(defaultItem(e, e.pattern, profile));
    }
    return { key, items };
  });
  return { days, warnings };
}

export function newRoutine(days: RoutineDay[], id: string): Routine {
  return { id, name: 'Full body A/B/C', createdAt: new Date().toISOString(), active: true, days };
}
