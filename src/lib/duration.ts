import { planCardio } from '../data/cardio';
import type { CardioLog, Exercise, Profile, RoutineItem } from '../db/types';
import { isIsolationLike } from './generator';

/** Supòsits per estimar la durada */
const WORK_SEC = 40; // durada d'una sèrie
const TRANSITION_SEC = 90; // canviar de màquina i ajustar-la
export const MIN_EXERCISES = 5;
/** en dies molt curts es pot baixar a 4 (genoll, maluc, empènyer, estirar) */
export const HARD_MIN_EXERCISES = 4;
export const MAX_EXERCISES = 9;
export const MIN_MINUTES = 40;
export const MAX_MINUTES = 120;
const MIN_REST = { compound: 90, isolation: 60 };
const MAX_REST = { compound: 120, isolation: 90 };

export const sessionMinutes = (p: Profile) => p.sessionMinutes ?? 60;

const itemSec = (it: Pick<RoutineItem, 'sets' | 'restSec'>) => it.sets * (WORK_SEC + it.restSec) + TRANSITION_SEC;

/** Minuts estimats del bloc de força */
export function estimateMinutes(items: Pick<RoutineItem, 'sets' | 'restSec'>[]) {
  return Math.round(items.reduce((t, it) => t + itemSec(it), 0) / 60);
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
  const budget = minutes * 60;
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
    // 3) dies molt curts: treu el darrer exercici (mai per sota de 4)
    while (total(sel) > budget && sel.length > HARD_MIN_EXERCISES) { sel.pop(); included.pop(); }
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


export interface SessionPlan {
  minutes: number;
  warmupMin: number;
  strength: FitResult;
  cardio: CardioLog | null;
  totalMin: number;
}

/**
 * Reparteix el temps: escalfament 5–8 min, força i cardio HIIT 10–20 min (proporcionals a la durada).
 */
export function planSession(all: RoutineItem[], minutes: number, byId: Map<string, Exercise>, profile: Profile, cardioOn = profile.cardio?.enabled ?? true): SessionPlan {
  const m = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes));
  const t = (m - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES);
  const warmupMin = Math.round(5 + 3 * t);
  const cardioMin = cardioOn ? Math.round(10 + 10 * t) : 0;
  const cardio = cardioOn ? planCardio(cardioMin, profile.cardio?.machine ?? 'bici', profile.cardio?.protocolId ?? '30-60') : null;
  const strength = fitDay(all, m - warmupMin - cardioMin, byId);
  const cardioReal = cardio ? Math.round((cardio.easyStartSec + cardio.rounds * (cardio.workSec + cardio.restSec) + cardio.easyEndSec) / 60) : 0;
  return { minutes: m, warmupMin, strength, cardio, totalMin: warmupMin + strength.minutes + cardioReal };
}
