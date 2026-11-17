import type { Exercise, Profile, RoutineItem } from '../db/types';
import { isIsolationLike } from './generator';

/** Supòsits per estimar la durada */
export const WARMUP_MIN = 8;
const WORK_SEC = 40; // durada d'una sèrie
const TRANSITION_SEC = 90; // canviar de màquina i ajustar-la
export const MIN_EXERCISES = 5;
export const MAX_EXERCISES = 9;
export const MIN_MINUTES = 40;
export const MAX_MINUTES = 120;
const MIN_REST = { compound: 90, isolation: 60 };
const MAX_REST = { compound: 120, isolation: 90 };

export const sessionMinutes = (p: Profile) => p.sessionMinutes ?? 60;

const itemSec = (it: Pick<RoutineItem, 'sets' | 'restSec'>) => it.sets * (WORK_SEC + it.restSec) + TRANSITION_SEC;

export function estimateMinutes(items: Pick<RoutineItem, 'sets' | 'restSec'>[]) {
  return Math.round(WARMUP_MIN + items.reduce((t, it) => t + itemSec(it), 0) / 60);
}

export interface FitResult {
  items: RoutineItem[];
  /** índexs (de la llista original) dels exercicis inclosos */
  included: number[];
  minutes: number;
}

/**
 * Ajusta un dia de la rutina a una durada objectiu.
 * L'ordre de la llista és la prioritat: s'hi afegeixen exercicis mentre hi càpiguen (mínim 5, màxim 9).
 * Si no hi cap: es redueixen els descansos fins al mínim recomanat i després les sèries (mai per sota de 2).
 * Si sobra temps: s'afegeix una 4a sèrie als compostos principals.
 */
export function fitDay(all: RoutineItem[], minutes: number, byId: Map<string, Exercise>): FitResult {
  const budget = (minutes - WARMUP_MIN) * 60;
  const iso = (it: RoutineItem) => {
    const e = byId.get(it.exerciseId);
    return e ? isIsolationLike(e) : it.slot === 'isolation' || it.slot === 'core';
  };
  const total = (xs: RoutineItem[]) => xs.reduce((t, it) => t + itemSec(it), 0);

  const n0 = Math.min(MIN_EXERCISES, all.length);
  const included = Array.from({ length: n0 }, (_, i) => i);
  const sel = all.slice(0, n0).map((it) => ({ ...it }));
  for (let i = n0; i < all.length && sel.length < MAX_EXERCISES; i++) {
    if (total(sel) + itemSec(all[i]) > budget) break;
    sel.push({ ...all[i] });
    included.push(i);
  }

  if (total(sel) > budget) {
    // 1) descansos al mínim recomanat
    for (const it of sel) it.restSec = Math.min(it.restSec, iso(it) ? MIN_REST.isolation : MIN_REST.compound);
    // 2) menys sèries: primer aïllaments i després compostos, començant pel final
    const order = [...sel.map((it, i) => ({ it, i })).filter((x) => iso(x.it)).reverse(), ...sel.map((it, i) => ({ it, i })).filter((x) => !iso(x.it)).reverse()];
    let changed = true;
    while (total(sel) > budget && changed) {
      changed = false;
      for (const { it } of order) {
        if (total(sel) <= budget) break;
        if (it.sets > 2) { it.sets--; changed = true; }
      }
    }
  } else {
    // Temps de sobres, per ordre: 4a sèrie als compostos, descansos més llargs, 4a sèrie als aïllaments
    const grow = (pred: (it: RoutineItem) => boolean, change: (it: RoutineItem) => RoutineItem) => {
      for (const it of sel) {
        if (!pred(it)) continue;
        const next = change(it);
        if (total(sel) - itemSec(it) + itemSec(next) <= budget) Object.assign(it, next);
      }
    };
    grow((it) => !iso(it) && it.sets < 4, (it) => ({ ...it, sets: it.sets + 1 }));
    grow((it) => it.restSec < (iso(it) ? MAX_REST.isolation : MAX_REST.compound), (it) => ({ ...it, restSec: iso(it) ? MAX_REST.isolation : MAX_REST.compound }));
    grow((it) => iso(it) && it.sets < 4, (it) => ({ ...it, sets: it.sets + 1 }));
  }
  return { items: sel, included, minutes: estimateMinutes(sel) };
}

export function durationLabel(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

