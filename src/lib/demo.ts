import { planCardio } from '../data/cardio';
import { db, deleteMeta, getMeta, setMeta, uid } from '../db/db';
import type { BodyMeasurement, DayKey, ExtraActivity, Feeling, RoutineDay, Session, SessionEntry, Swim, WeeklyReview, WeighIn } from '../db/types';
import { addDaysISO, toISODate, weekStartISO } from './dates';
import { generateRoutine, incrementFor, newRoutine } from './generator';

const WEEKS = 10;
const START_KG: Record<string, number> = { push_h: 30, push_v: 20, pull_h: 35, pull_v: 40, knee: 90, hip: 50, isolation: 15, core: 20 };
const GOALS = ['Planificar els berenars el diumenge', 'Màxim 2 dies amb alcohol', 'No saltar-me la natació', 'Caminar 30 min el dissabte', 'Sopar abans de les 21 h'];

export const hasDemo = () => getMeta<{ startDate: string }>('demoBackup').then(Boolean);

/**
 * Dades de prova: 10 setmanes seguint el pla (natació dl, força A dc, força B dv, extres el cap de setmana),
 * pesades dl/dc/dv, cintura els dilluns i revisions setmanals. Una setmana és de viatge (rutina d'hotel).
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

  let rnd = 7;
  const noise = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280 - 0.5; };
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const day = (k: DayKey): RoutineDay | undefined => routine!.days.find((d) => d.key === k);
  const strengthKeys = routine.days.map((d) => d.key).filter((k) => k !== 'H');
  const state = new Map<string, { w: number; reps: number }>();

  const weighIns: WeighIn[] = [], waist: BodyMeasurement[] = [], swims: Swim[] = [], extras: ExtraActivity[] = [];
  const sessions: Session[] = [], reviews: WeeklyReview[] = [];

  function session(date: string, rd: RoutineDay, w: number): Session {
    const entries: SessionEntry[] = rd.items.map((it) => {
      const ex = byId.get(it.exerciseId);
      const inc = incrementFor(ex, profile);
      const secs = ex?.measure === 'seconds';
      const st = state.get(it.exerciseId) ?? { w: ex?.bodyweight ? 0 : START_KG[it.slot] ?? 20, reps: it.repMin };
      const sets = Array.from({ length: it.sets }, (_, i) => ({
        weightKg: st.w, done: true,
        reps: Math.max(it.repMin - 1, Math.min(it.repMax, st.reps - (i === it.sets - 1 && noise() > 0.2 ? (secs ? 5 : 1) : 0))),
        effort: (i === it.sets - 1 ? 'dur' : 'correcte') as 'dur' | 'correcte',
      }));
      if (!rd.circuit) {
        const top = sets.every((s) => s.reps >= it.repMax);
        state.set(it.exerciseId, top && !ex?.bodyweight ? { w: st.w + inc, reps: it.repMin } : { w: st.w, reps: Math.min(it.repMax, st.reps + (secs ? 5 : 1)) });
      }
      return { exerciseId: it.exerciseId, target: { sets: it.sets, repMin: it.repMin, repMax: it.repMax, weightKg: st.w, restSec: it.restSec }, sets };
    });
    const startedAt = new Date(`${date}T18:30:00`);
    const cardio = rd.circuit ? undefined : (() => {
      const c = planCardio(w < 4 ? 10 : 15, w % 2 ? 'eliptica' : 'bici', 'continu');
      return { ...c, done: true, durationSec: c.continuousSec!, effort: 'correcte' as const };
    })();
    return {
      id: uid(), routineId: routine!.id, dayKey: rd.key, startedAt: startedAt.toISOString(),
      finishedAt: new Date(startedAt.getTime() + (rd.circuit ? 22 : 62 + Math.round(noise() * 10)) * 60000).toISOString(),
      status: 'feta', flags: { adaptation: w < profile.adaptationWeeks, deload: false },
      exerciseIds: entries.map((e) => e.exerciseId), entries, cardio, warmupMin: rd.circuit ? 3 : 6, targetMinutes: rd.circuit ? 25 : 70,
      checklist: { warmup: ['bici', 'mobilitat'], cooldown: [] }, isDemo: true,
    };
  }

  // Pes: ~0,45 kg/setmana, amb dues setmanes d'estancament (setmanes 6 i 7)
  const kgAt = (w: number, d: number) => {
    const weeks = w + d / 7;
    const eff = w >= 6 && w <= 7 ? 6 * 0.45 : w > 7 ? weeks * 0.45 - 2 * 0.45 : weeks * 0.45;
    return Math.round((profile.startWeightKg - eff + noise() * 0.5) * 10) / 10;
  };

  for (let w = 0; w <= WEEKS; w++) {
    const mon = addDaysISO(start, w * 7);
    const travel = w === 4;
    const at = (d: number) => addDaysISO(mon, d);
    const past = (d: number) => at(d) < today;

    for (const d of [0, 2, 4]) if (at(d) <= today) weighIns.push({ id: uid(), date: at(d), weightKg: kgAt(w, d), source: 'manual', isDemo: true });
    if (at(0) <= today) waist.push({ id: uid(), date: at(0), waistCm: Math.round((99 - 0.35 * Math.min(w, 6) - (w > 7 ? 0.35 * (w - 7) : 0) + noise() * 0.4) * 10) / 10, isDemo: true });

    if (travel) {
      const h = day('H');
      if (h) for (const d of [0, 2, 4]) if (past(d)) sessions.push(session(at(d), h, w));
    } else {
      if (past(0) && w !== 3) swims.push({ id: uid(), date: at(0), durationMin: 40 + Math.round(noise() * 6 + 3), distanceM: w % 3 === 0 ? 1200 + w * 50 : 0, poolM: 25, style: 'crol', feeling: (3 + (w % 2)) as Feeling, isDemo: true });
      const a = day(strengthKeys[0]), b = day(strengthKeys[1] ?? strengthKeys[0]);
      if (a && past(2)) sessions.push(session(at(2), a, w));
      const bDay = w === 2 ? 3 : 4; // una setmana la Força B es va moure a dijous
      if (b && past(bDay)) sessions.push(session(at(bDay), b, w));
    }
    if (past(5) && w % 2 === 0) extras.push({ id: uid(), date: at(5), kind: 'padel', minutes: 75, feeling: 4, isDemo: true });
    if (past(6) && w % 3 === 1) extras.push({ id: uid(), date: at(6), kind: 'pitch', minutes: 120, feeling: 3, isDemo: true });
    if (past(6) && w % 3 === 2) extras.push({ id: uid(), date: at(6), kind: 'caminar', minutes: 60, feeling: 3, isDemo: true });

    // Revisió de la setmana (feta el dilluns següent)
    if (addDaysISO(mon, 7) <= today) {
      reviews.push({
        week: mon, sessionsDone: 3, snacksPlanned: 3 + (w % 3), alcoholDays: w % 4 === 3 ? 3 : 1 + (w % 2),
        nextGoal: GOALS[w % GOALS.length], savedAt: new Date(`${addDaysISO(mon, 7)}T09:00:00`).toISOString(), isDemo: true,
      });
    }
  }

  await db.transaction('rw', [db.weighIns, db.sessions, db.swims, db.bodyMeasurements, db.activities, db.weeklyReviews], async () => {
    await db.weighIns.bulkPut(weighIns);
    await db.sessions.bulkPut(sessions);
    await db.swims.bulkPut(swims);
    await db.bodyMeasurements.bulkPut(waist);
    await db.activities.bulkPut(extras);
    // No sobreescriu revisions reals
    for (const r of reviews) if (!(await db.weeklyReviews.get(r.week))) await db.weeklyReviews.put(r);
  });
}

export async function clearDemo() {
  const backup = await getMeta<{ startDate: string }>('demoBackup');
  await db.transaction('rw', [db.weighIns, db.sessions, db.swims, db.bodyMeasurements, db.activities, db.weeklyReviews, db.profile, db.meta], async () => {
    await db.swims.filter((s) => !!s.isDemo).delete();
    await db.weighIns.filter((w) => !!w.isDemo).delete();
    await db.sessions.filter((s) => !!s.isDemo).delete();
    await db.bodyMeasurements.filter((m) => !!m.isDemo).delete();
    await db.activities.filter((a) => !!a.isDemo).delete();
    await db.weeklyReviews.filter((r) => !!r.isDemo).delete();
    if (backup) await db.profile.update('me', { startDate: backup.startDate });
    await deleteMeta('demoBackup');
  });
}
