import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../../data/catalog';
import { DEFAULT_PROFILE } from '../../data/defaults';
import type { Exercise, RoutineItem, Session, SessionEntry } from '../../db/types';
import { dayNum } from '../dates';
import { generateRoutine } from '../generator';
import { nutritionRef } from '../nutrition';
import { deloadDue, nextDayKey, planFor } from '../progression';
import { analyzeWeight } from '../weight';

const P = DEFAULT_PROFILE;
const item: RoutineItem = { exerciseId: 'press-pit-maquina', slot: 'push_h', sets: 3, repMin: 8, repMax: 12, restSec: 105 };
const ex = buildCatalog().find((e) => e.id === 'press-pit-maquina') as Exercise;

function session(date: string, reps: number[], w: number, id = date): Session {
  const entry: SessionEntry = {
    exerciseId: item.exerciseId,
    target: { sets: 3, repMin: 8, repMax: 12, weightKg: w, restSec: 105 },
    sets: reps.map((r) => ({ weightKg: w, reps: r, done: true })),
  };
  return { id, routineId: 'r', dayKey: 'A', startedAt: `${date}T18:00:00.000Z`, status: 'feta', flags: { adaptation: false, deload: false }, exerciseIds: [item.exerciseId], entries: [entry], checklist: { warmup: [], cooldown: [] } };
}

describe('nutrició', () => {
  it('Mifflin-St Jeor amb el perfil per defecte', () => {
    const n = nutritionRef(P, 84);
    expect(n.bmr).toBe(1780);
    expect(n.tdee).toBe(2670);
    expect(n.target).toBe(2220);
    expect(n.protein).toBe(160);
  });
});

describe('doble progressió', () => {
  it('primera vegada', () => expect(planFor(item, ex, P, [], false).kind).toBe('primera'));
  it('puja el pes quan totes les sèries arriben a 12', () => {
    const p = planFor(item, ex, P, [session('2026-11-20', [12, 12, 12], 40)], false);
    expect(p.kind).toBe('pujar');
    expect(p.weightKg).toBe(42.5);
    expect(p.reps).toEqual([8, 8, 8]);
  });
  it('mantén i suma una rep dins del rang', () => {
    const p = planFor(item, ex, P, [session('2026-11-20', [10, 9, 8], 40)], false);
    expect(p.kind).toBe('mantenir');
    expect(p.reps).toEqual([11, 10, 9]);
  });
  it('repeteix si falla el mínim una vegada', () => {
    expect(planFor(item, ex, P, [session('2026-11-20', [9, 8, 6], 40)], false).kind).toBe('repetir');
  });
  it('baixa si falla el mínim dues sessions seguides', () => {
    const p = planFor(item, ex, P, [session('2026-11-18', [8, 7, 6], 40, 'a'), session('2026-11-20', [8, 7, 6], 40, 'b')], false);
    expect(p.kind).toBe('baixar');
    expect(p.weightKg).toBeLessThan(40);
    expect(p.altWeightKg).toBe(40);
  });
  it('descàrrega: 2 sèries i menys pes', () => {
    const p = planFor(item, ex, P, [session('2026-11-20', [10, 10, 10], 40)], true);
    expect(p.reps.length).toBe(2);
    expect(p.weightKg).toBeLessThan(40);
  });
  it('rotació A → B → C', () => {
    expect(nextDayKey([])).toBe('A');
    expect(nextDayKey([{ ...session('2026-11-20', [10], 40), dayKey: 'C' }])).toBe('A');
    expect(nextDayKey([{ ...session('2026-11-20', [10], 40), dayKey: 'A' }])).toBe('B');
  });
  it('suggereix descàrrega al cap de 7 setmanes', () => {
    const s = [session('2026-11-17', [10], 40)];
    expect(deloadDue(P, s, '2026-12-20').due).toBe(false);
    expect(deloadDue(P, s, '2027-01-05').due).toBe(true);
  });
});

describe('generador', () => {
  const { days } = generateRoutine(buildCatalog(), P);
  it('3 dies de 5–7 exercicis', () => {
    expect(days.map((d) => d.key)).toEqual(['A', 'B', 'C']);
    for (const d of days) { expect(d.items.length).toBeGreaterThanOrEqual(5); expect(d.items.length).toBeLessThanOrEqual(7); }
  });
  it('cada dia té genoll i maluc, i la setmana cobreix els 4 patrons de tren superior', () => {
    for (const d of days) { const s = d.items.map((i) => i.slot); expect(s).toContain('knee'); expect(s).toContain('hip'); }
    const all = new Set(days.flatMap((d) => d.items.map((i) => i.slot)));
    for (const p of ['push_h', 'push_v', 'pull_h', 'pull_v']) expect(all.has(p as never)).toBe(true);
  });
  it('evita exercicis d\'impacte alt al peu i els que no agraden', () => {
    const cat = buildCatalog().map((e) => ({ ...e, available: true, preference: e.id === 'premsa-cames' ? 'dislike' as const : e.preference }));
    const r = generateRoutine(cat, P);
    const ids = r.days.flatMap((d) => d.items.map((i) => i.exerciseId));
    expect(ids).not.toContain('premsa-cames');
    for (const id of ids) expect(cat.find((e) => e.id === id)!.footImpact).not.toBe('alt');
  });
});

describe('pes', () => {
  const w = (date: string, kg: number) => ({ id: date, date, weightKg: kg, source: 'manual' as const });
  it('ritme, estat i avís de pèrdua ràpida', () => {
    const data = [w('2026-11-17', 84), w('2026-11-24', 83), w('2026-12-01', 82), w('2026-12-08', 81)];
    const a = analyzeWeight(P, data, dayNum('2026-12-08'));
    expect(a.rateKgWeek).toBeCloseTo(-1, 5);
    expect(a.status).toBe('per_davant');
    expect(a.tooFast).toBe(true);
    expect(a.goals[0].forecast).toBeDefined();
  });
  it('sense avís a ritme moderat', () => {
    const data = [w('2026-11-17', 84), w('2026-11-24', 83.6), w('2026-12-01', 83.2), w('2026-12-08', 82.8)];
    const a = analyzeWeight(P, data, dayNum('2026-12-08'));
    expect(a.tooFast).toBe(false);
    expect(a.status).toBe('en_cami');
  });
});
