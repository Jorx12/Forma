import { LOWER_GROUPS } from '../data/catalog';
import type { DayKey, Exercise, MuscleGroup, Pattern, Profile, Routine, RoutineDay, RoutineItem } from '../db/types';

/**
 * Plantilla setmanal en ordre de prioritat. Cada dia cobreix genoll + maluc i alterna empènyer/estirar
 * horitzontal i vertical. Els primers 5 sempre es fan; la resta s'hi afegeixen en dies amb més temps.
 */
type GenKey = 'A' | 'B' | 'C';

export const TEMPLATE: Record<GenKey, Pattern[]> = {
  A: ['push_h', 'pull_v', 'knee', 'hip', 'push_v', 'isolation', 'core', 'isolation', 'isolation'],
  B: ['push_v', 'pull_h', 'knee', 'hip', 'pull_v', 'isolation', 'core', 'isolation', 'isolation'],
  C: ['push_h', 'pull_h', 'knee', 'hip', 'isolation', 'core', 'push_v', 'isolation', 'isolation'],
};

/** Grups preferits per als aïllaments de cada dia (per repartir-los durant la setmana) */
const ISOLATION_FOCUS: Record<GenKey, MuscleGroup[]> = {
  A: ['espatlles', 'biceps'],
  B: ['isquios', 'triceps'],
  C: ['biceps', 'triceps', 'quadriceps', 'glutis', 'pit'],
};

/** Grups per als aïllaments extra dels dies llargs */
const ISOLATION_EXTRA: MuscleGroup[] = ['espatlles', 'biceps', 'triceps', 'isquios', 'quadriceps', 'glutis', 'pit', 'esquena'];

export const DAY_KEYS: GenKey[] = ['A', 'B', 'C'];
export type { DayKey };

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
    const isoGroups = new Set<MuscleGroup>();
    for (const slot of TEMPLATE[key]) {
      let pool = exercises.filter((e) => usable(e) && e.pattern === slot);
      if (slot === 'isolation') {
        // Primer els grups d'aquest dia, després altres grups encara no treballats amb aïllament
        const fresh = (groups: MuscleGroup[]) => pool.filter((e) => groups.includes(e.muscleGroup) && !isoGroups.has(e.muscleGroup) && !used.has(e.id));
        const focused = fresh(ISOLATION_FOCUS[key]);
        const extra = fresh(ISOLATION_EXTRA);
        if (focused.length) pool = focused;
        else if (extra.length) pool = extra;
      }
      const e = pick(pool, used);
      if (!e) {
        if (items.length < 5) warnings.push(`Dia ${key}: no hi ha cap màquina disponible per a «${slot}».`);
        continue;
      }
      if (slot === 'isolation') isoGroups.add(e.muscleGroup);
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
