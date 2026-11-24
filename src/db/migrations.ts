import { buildCatalog, CATALOG_EXTRA } from '../data/catalog';
import { DEFAULT_MILESTONES, DEFAULT_MODES, DEFAULT_WEEK_PLAN, PLAN_EXERCISE_IDS, personalRoutine } from '../data/plan';
import { db, uid } from './db';
import type { CardioMachine, Goal } from './types';

/**
 * Migracions de dades de l'app (a banda de l'esquema de Dexie).
 * Cada migració només afegeix o completa informació: no esborra res del que ja hi ha.
 */
export const APP_MIGRATION = 1;

const OLD_DEFAULT_GOALS = ['2027-04-17', '2027-08-15'];
// (els objectius per defecte nous són a defaults.ts)

export const PLAN_GOALS: Goal[] = [
  { id: 'g75', label: 'Fita 1', targetKg: 75, dateFrom: '2027-05-01', dateTo: '2027-05-31' },
  { id: 'g70', label: 'Fita 2 (70–72 kg)', targetKg: 70, dateFrom: '2027-09-22', dateTo: '2027-12-21' },
];

const ALLOWED_CARDIO: CardioMachine[] = ['bici', 'eliptica', 'rem'];

export async function runMigrations() {
  const done = ((await db.meta.get('appMigration'))?.value as number | undefined) ?? 0;
  if (done < 1) await migratePersonalPlan();
  await db.meta.put({ key: 'appMigration', value: APP_MIGRATION });
}

/** Migració 1: pla personal (setmana tipus, rutines A/B/hotel, fites, modes) */
async function migratePersonalPlan() {
  await db.transaction('rw', [db.exercises, db.routines, db.profile, db.meta], async () => {
    // 1) Catàleg: afegeix exercicis nous i completa els predefinits (sense tocar preferències ni notes pròpies)
    const existing = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    for (const base of buildCatalog()) {
      const cur = existing.get(base.id);
      if (!cur) {
        await db.exercises.put({ ...base, available: base.available || PLAN_EXERCISE_IDS.includes(base.id) });
        continue;
      }
      if (cur.isCustom) continue;
      const extra = CATALOG_EXTRA[base.id] ?? {};
      await db.exercises.update(base.id, {
        ...(extra.measure && { measure: extra.measure }),
        ...(extra.bodyweight && { bodyweight: extra.bodyweight }),
        ...(extra.name && { name: extra.name }),
        ...(extra.note && !cur.note && { note: extra.note }),
        ...(PLAN_EXERCISE_IDS.includes(base.id) && { available: true }),
      });
    }

    // 2) Rutina del pla personal (les anteriors queden guardades, inactives, per a l'historial)
    const routines = await db.routines.toArray();
    if (!routines.some((r) => r.template === 'personal-v1')) {
      for (const r of routines) if (r.active) await db.routines.update(r.id, { active: false });
      await db.routines.put(personalRoutine(uid()));
    }

    // 3) Perfil: setmana tipus, fites, modes i cardio
    const p = await db.profile.get('me');
    if (p) {
      const machine = p.cardio?.machine && ALLOWED_CARDIO.includes(p.cardio.machine) ? p.cardio.machine : 'bici';
      const oldGoals = p.goals.every((g) => OLD_DEFAULT_GOALS.includes(g.dateFrom));
      await db.profile.update('me', {
        weekPlan: p.weekPlan ?? { ...DEFAULT_WEEK_PLAN },
        milestones: p.milestones ?? DEFAULT_MILESTONES.map((m) => ({ ...m })),
        modes: p.modes ?? structuredClone(DEFAULT_MODES),
        cardio: { enabled: true, machine, protocolId: 'continu' },
        sessionMinutes: !p.sessionMinutes || p.sessionMinutes === 60 ? 70 : p.sessionMinutes,
        ...(oldGoals && { goals: PLAN_GOALS.map((g) => ({ ...g })) }),
      });
    }
  });
}
