import { db, deleteMeta, getMeta, setMeta, uid } from '../db/db';
import type { DayKey, Session, SessionEntry, WeighIn } from '../db/types';
import { addDaysISO, toISODate, weekStartISO } from './dates';
import { generateRoutine, incrementFor, newRoutine } from './generator';

const WEEKS = 10;
const START_KG: Record<string, number> = { push_h: 30, push_v: 20, pull_h: 35, pull_v: 40, knee: 90, hip: 50, isolation: 15, core: 20 };

export const hasDemo = () => getMeta<{ startDate: string }>('demoBackup').then(Boolean);

/**
 * Dades de prova: 10 setmanes de pesades i entrenaments que acaben avui.
 * La data d'inici del perfil es mou temporalment perquè els gràfics tinguin sentit; es restaura en esborrar-les.
 */
export async function loadDemo() {
  if (await hasDemo()) return;
  const profile = (await db.profile.get('me'))!;
  const exercises = await db.exercises.toArray();
  let routine = (await db.routines.toArray()).find((r) => r.active);
  if (!routine) {
    routine = newRoutine(generateRoutine(exercises, profile).days, uid());
    await db.routines.put(routine);
  }
  const today = toISODate();
  const start = addDaysISO(weekStartISO(today), -7 * WEEKS);
  await setMeta('demoBackup', { startDate: profile.startDate });
  await db.profile.update('me', { startDate: start });

  // Pesades setmanals: ~0,55 kg/setmana amb soroll
  let rnd = 7;
  const noise = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280 - 0.5; };
  const weighIns: WeighIn[] = [];
  for (let w = 0; w <= WEEKS; w++) {
    const date = addDaysISO(start, w * 7 + 1);
    if (date > today) break;
    const kg = profile.startWeightKg - 0.55 * w + noise() * 0.6;
    weighIns.push({ id: uid(), date, weightKg: Math.round(kg * 10) / 10, bodyFatPct: Math.round((26 - 0.18 * w + noise() * 0.4) * 10) / 10, source: 'manual', isDemo: true });
  }

  // Entrenaments dl / dc / dv, amb alguna setmana incompleta
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const state = new Map<string, { w: number; reps: number }>();
  const sessions: Session[] = [];
  const keys: DayKey[] = ['A', 'B', 'C'];
  let k = 0;
  for (let w = 0; w < WEEKS + 1; w++) {
    for (const off of [0, 2, 4]) {
      const date = addDaysISO(start, w * 7 + off);
      if (date >= today) continue;
      if ((w === 3 && off === 4) || (w === 6 && off === 2)) continue; // setmanes amb 2 entrenaments
      const day = keys[k++ % 3];
      const items = routine.days.find((d) => d.key === day)!.items;
      const deload = w === 7;
      const entries: SessionEntry[] = items.map((it) => {
        const ex = byId.get(it.exerciseId);
        const inc = incrementFor(ex, profile);
        const st = state.get(it.exerciseId) ?? { w: START_KG[it.slot] ?? 20, reps: it.repMin };
        const weight = deload ? Math.round((st.w * 0.9) / inc) * inc : st.w;
        const nSets = deload ? 2 : it.sets;
        const sets = Array.from({ length: nSets }, (_, i) => ({
          weightKg: weight, reps: Math.max(it.repMin - 1, Math.min(it.repMax, st.reps - (i === nSets - 1 && noise() > 0.2 ? 1 : 0))),
          done: true, effort: (i === nSets - 1 ? 'dur' : 'correcte') as 'dur' | 'correcte',
        }));
        if (!deload) {
          const top = sets.every((s) => s.reps >= it.repMax);
          state.set(it.exerciseId, top ? { w: st.w + inc, reps: it.repMin } : { w: st.w, reps: st.reps + 1 });
        }
        return { exerciseId: it.exerciseId, target: { sets: nSets, repMin: it.repMin, repMax: it.repMax, weightKg: weight, restSec: it.restSec }, sets };
      });
      const startedAt = new Date(`${date}T18:30:00`);
      sessions.push({
        id: uid(), routineId: routine.id, dayKey: day, startedAt: startedAt.toISOString(),
        finishedAt: new Date(startedAt.getTime() + (50 + Math.round(noise() * 16)) * 60000).toISOString(),
        status: 'feta', flags: { adaptation: w < profile.adaptationWeeks, deload },
        exerciseIds: entries.map((e) => e.exerciseId), entries,
        checklist: { warmup: ['bici', 'mobilitat'], cooldown: [] }, isDemo: true,
      });
    }
  }
  await db.transaction('rw', db.weighIns, db.sessions, async () => {
    await db.weighIns.bulkPut(weighIns);
    await db.sessions.bulkPut(sessions);
  });
}

export async function clearDemo() {
  const backup = await getMeta<{ startDate: string }>('demoBackup');
  await db.transaction('rw', db.weighIns, db.sessions, db.bodyMeasurements, db.profile, db.meta, async () => {
    await db.weighIns.filter((w) => !!w.isDemo).delete();
    await db.sessions.filter((s) => !!s.isDemo).delete();
    await db.bodyMeasurements.filter((m) => !!m.isDemo).delete();
    if (backup) await db.profile.update('me', { startDate: backup.startDate });
    await deleteMeta('demoBackup');
  });
}
