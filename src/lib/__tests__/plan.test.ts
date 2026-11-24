import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalog } from '../../data/catalog';
import { cardioMinutesFor } from '../../data/cardio';
import { DEFAULT_PROFILE } from '../../data/defaults';
import { personalPlanDays } from '../../data/plan';
import type { Profile, Session, SessionEntry, WeighIn } from '../../db/types';
import { planSession } from '../duration';
import { planFor as planItem } from '../progression';
import { reviewAlerts } from '../review';
import { planFor } from '../schedule';

/** Perfil i dades tal com eren abans del pla personal (esquema v2) */
const OLD_PROFILE = {
  ...DEFAULT_PROFILE,
  goals: [
    { id: 'g75', label: 'Fita 1', targetKg: 75, dateFrom: '2027-04-17', dateTo: '2027-05-17' },
    { id: 'g70', label: 'Fita 2', targetKg: 70, dateFrom: '2027-08-15', dateTo: '2027-11-15' },
  ],
  sessionMinutes: 60, cardio: { enabled: true, machine: 'skierg', protocolId: '30-60' },
  weekPlan: undefined, milestones: undefined, modes: undefined,
};

describe('migració a l\'esquema v3 i al pla personal', () => {
  beforeAll(async () => {
    const old = new Dexie('forma');
    old.version(1).stores({ profile: 'id', weighIns: 'id, date', exercises: 'id, muscleGroup, pattern', routines: 'id, active', sessions: 'id, startedAt, status, *exerciseIds', meta: 'key', bodyMeasurements: 'id, date', progressPhotos: 'id, date' });
    old.version(2).stores({ swims: 'id, date' });
    await old.open();
    await old.table('profile').put(OLD_PROFILE);
    await old.table('exercises').bulkPut(buildCatalog().filter((e) => !['maquina-gluti', 'flexions', 'esquat-cadira', 'rem-motxilla'].includes(e.id)).map((e) => ({ ...e, measure: undefined, bodyweight: undefined, preference: e.id === 'planxa' ? 'like' : e.preference })));
    await old.table('routines').put({ id: 'old', name: 'Full body', createdAt: '2026-11-17', active: true, days: [{ key: 'C', items: [] }] });
    await old.table('weighIns').put({ id: 'w1', date: '2026-11-17', weightKg: 84, source: 'manual' });
    await old.table('swims').put({ id: 's1', date: '2026-11-18', durationMin: 40, distanceM: 1000, poolM: 25, style: 'crol' });
    await old.table('sessions').put({ id: 'x1', routineId: 'old', dayKey: 'C', startedAt: '2026-11-19T18:00:00.000Z', status: 'feta', flags: { adaptation: true, deload: false }, exerciseIds: [], entries: [], checklist: { warmup: [], cooldown: [] } });
    old.close();
    const { ensureSeed } = await import('../../db/seed');
    await ensureSeed();
  });

  it('conserva totes les dades anteriors', async () => {
    const { db } = await import('../../db/db');
    expect(await db.weighIns.get('w1')).toMatchObject({ weightKg: 84 });
    expect(await db.swims.get('s1')).toMatchObject({ distanceM: 1000 });
    expect(await db.sessions.get('x1')).toMatchObject({ dayKey: 'C' });
    expect(await db.routines.get('old')).toMatchObject({ active: false });
    expect((await db.exercises.get('planxa'))?.preference).toBe('like');
  });

  it('afegeix el pla personal, exercicis nous i camps del perfil', async () => {
    const { db } = await import('../../db/db');
    const active = (await db.routines.toArray()).filter((r) => r.active);
    expect(active).toHaveLength(1);
    expect(active[0].days.map((d) => d.key)).toEqual(['A', 'B', 'H']);
    expect(await db.exercises.get('maquina-gluti')).toBeTruthy();
    expect((await db.exercises.get('planxa'))?.measure).toBe('seconds');
    const p = (await db.profile.get('me'))!;
    expect(p.weekPlan?.[1]).toBe('natacio');
    expect(p.weekPlan?.[3]).toBe('forca_A');
    expect(p.milestones?.length).toBe(7);
    expect(p.cardio).toEqual({ enabled: true, machine: 'bici', protocolId: 'continu' });
    expect(p.goals[0].dateFrom).toBe('2027-05-01');
    expect(p.sessionMinutes).toBe(70);
    expect(await db.schedule.count()).toBe(0);
  });

  it('és idempotent (no duplica la rutina en tornar a obrir)', async () => {
    const { ensureSeed } = await import('../../db/seed');
    const { db } = await import('../../db/db');
    await ensureSeed();
    expect((await db.routines.toArray()).filter((r) => r.template === 'personal-v1')).toHaveLength(1);
  });
});

describe('setmana tipus i modes', () => {
  const P: Profile = DEFAULT_PROFILE;
  const none = new Map();
  it('toca natació dl, força A dc, força B dv i extra el cap de setmana', () => {
    expect(planFor('2026-11-23', P, none).activity).toBe('natacio');
    expect(planFor('2026-11-25', P, none).activity).toBe('forca_A');
    expect(planFor('2026-11-27', P, none).activity).toBe('forca_B');
    expect(planFor('2026-11-28', P, none).activity).toBe('extra');
    expect(planFor('2026-11-24', P, none).activity).toBe('descans');
  });
  it('un canvi puntual mana sobre la setmana tipus', () => {
    const ov = new Map([['2026-11-26', { date: '2026-11-26', activity: 'forca_B' as const, movedFrom: '2026-11-27' }]]);
    expect(planFor('2026-11-26', P, ov).activity).toBe('forca_B');
  });
  it('mode viatge: les sessions passen a ser la rutina d\'hotel', () => {
    const p = { ...P, modes: { travel: { active: true, since: '2026-11-20' }, christmas: { active: false } } };
    expect(planFor('2026-11-23', p, none).activity).toBe('hotel');
    expect(planFor('2026-11-25', p, none).activity).toBe('hotel');
    expect(planFor('2026-11-24', p, none).activity).toBe('descans');
  });
});

describe('rutines del pla', () => {
  const cat = buildCatalog();
  const byId = new Map(cat.map((e) => [e.id, e]));
  const [A, B, H] = personalPlanDays();
  it('Força A i B tenen 6 exercicis amb els rangs del pla', () => {
    expect(A.items.map((i) => `${i.exerciseId} ${i.sets}x${i.repMin}-${i.repMax}`)).toContain('press-espatlles-maquina 2x10-12');
    expect(A.items.find((i) => i.exerciseId === 'planxa')).toMatchObject({ sets: 3, repMin: 30, repMax: 45 });
    expect(B.items.find((i) => i.exerciseId === 'elevacions-laterals-maquina')?.altIds).toEqual(['face-pull']);
    expect(H.circuit).toBe(true);
  });
  it('pla fix: no s\'afegeixen sèries amb més temps', () => {
    const p = planSession(A.items, 75, byId, DEFAULT_PROFILE, { fixed: true, today: '2027-02-01' });
    expect(p.strength.items.map((i) => i.sets)).toEqual(A.items.map((i) => i.sets));
    expect(p.totalMin).toBeGreaterThanOrEqual(60);
    expect(p.totalMin).toBeLessThanOrEqual(80);
  });
  it('cardio: 10 min les 4 primeres setmanes i 15–20 després', () => {
    expect(cardioMinutesFor(70, 0)).toBe(10);
    expect(cardioMinutesFor(70, 3)).toBe(10);
    expect(cardioMinutesFor(60, 4)).toBe(15);
    expect(cardioMinutesFor(75, 8)).toBe(20);
  });
  it('circuit d\'hotel sense cardio', () => {
    const p = planSession(H.items, 70, byId, DEFAULT_PROFILE, { day: H });
    expect(p.cardio).toBeNull();
    expect(p.totalMin).toBeLessThan(35);
  });
  it('planxa (segons, pes corporal): en arribar al màxim suggereix més dificultat, no pes', () => {
    const it = A.items.find((i) => i.exerciseId === 'planxa')!;
    const entry: SessionEntry = { exerciseId: 'planxa', target: { sets: 3, repMin: 30, repMax: 45, weightKg: 0, restSec: 60 }, sets: [45, 45, 45].map((r) => ({ weightKg: 0, reps: r, done: true })) };
    const s: Session = { id: 's', routineId: 'r', dayKey: 'A', startedAt: '2026-11-25T18:00:00Z', status: 'feta', flags: { adaptation: false, deload: false }, exerciseIds: ['planxa'], entries: [entry], checklist: { warmup: [], cooldown: [] } };
    const plan = planItem(it, byId.get('planxa'), DEFAULT_PROFILE, [s], false);
    expect(plan.kind).toBe('pujar');
    expect(plan.weightKg).toBe(0);
  });
});

describe('revisió setmanal', () => {
  const w = (date: string, kg: number): WeighIn => ({ id: date, date, weightKg: kg, source: 'manual' });
  const P = DEFAULT_PROFILE;
  const train: Session = { id: 't', routineId: 'r', dayKey: 'A', startedAt: '2026-11-25T18:00:00Z', status: 'feta', flags: { adaptation: false, deload: false }, exerciseIds: [], entries: [], checklist: { warmup: [], cooldown: [] } };
  it('baixar 0,3–0,5 kg: «Vas bé, no canviïs res»', () => {
    const a = reviewAlerts('2026-11-23', P, [w('2026-11-16', 84), w('2026-11-23', 83.6)], [], [train], [], '2026-11-30');
    expect(a.map((x) => x.id)).toContain('be');
  });
  it('més d\'1 kg: suggereix menjar més', () => {
    const a = reviewAlerts('2026-11-23', P, [w('2026-11-16', 84), w('2026-11-23', 82.8)], [], [train], [], '2026-11-30');
    expect(a.map((x) => x.id)).toContain('massa');
  });
  it('2 setmanes sense baixar pes ni cintura: estancament (però no en mode Nadal)', () => {
    const data = [w('2026-11-09', 83.5), w('2026-11-16', 83.5), w('2026-11-23', 83.6)];
    const waist = [{ id: 'a', date: '2026-11-16', waistCm: 97 }, { id: 'b', date: '2026-11-30', waistCm: 97 }];
    expect(reviewAlerts('2026-11-23', P, data, waist, [train], [], '2026-11-30').map((x) => x.id)).toContain('estancat');
    const xmas = { ...P, modes: { travel: { active: false }, christmas: { active: true, refKg: 83.5 } } };
    expect(reviewAlerts('2026-11-23', xmas, data, waist, [train], [], '2026-11-30').map((x) => x.id)).not.toContain('estancat');
  });
  it('7 dies sense entrenar: avís amb accés a la rutina d\'hotel', () => {
    const a = reviewAlerts('2026-11-23', P, [], [], [train], [], '2026-12-03');
    expect(a.find((x) => x.id === 'inactiu')?.action).toBe('hotel');
  });
});
