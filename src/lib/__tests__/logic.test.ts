import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../../data/catalog';
import { DEFAULT_PROFILE } from '../../data/defaults';
import type { Exercise, RoutineItem, Session, SessionEntry } from '../../db/types';
import { dayNum } from '../dates';
import { planSession } from '../duration';
import { cardioTotalSec, hiitPhases, HIIT_PROTOCOLS, planCardio } from '../../data/cardio';
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
  it('3 dies amb 5–9 exercicis en ordre de prioritat', () => {
    expect(days.map((d) => d.key)).toEqual(['A', 'B', 'C']);
    for (const d of days) { expect(d.items.length).toBeGreaterThanOrEqual(5); expect(d.items.length).toBeLessThanOrEqual(9); }
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

describe('pes (mitjana setmanal)', () => {
  const w = (date: string, kg: number) => ({ id: date, date, weightKg: kg, source: 'manual' as const });
  it('la dada principal és la mitjana de la setmana', () => {
    const data = [w('2026-11-23', 84.2), w('2026-11-25', 83.6), w('2026-11-27', 83.8)];
    const a = analyzeWeight(P, data, dayNum('2026-11-27'));
    expect(a.current).toBeCloseTo(83.87, 2);
    expect(a.currentN).toBe(3);
  });
  it('avisa si baixa més d\'1 kg per setmana', () => {
    const data = [w('2026-11-16', 84), w('2026-11-18', 84), w('2026-11-23', 82.8), w('2026-11-25', 82.7)];
    const a = analyzeWeight(P, data, dayNum('2026-11-25'));
    expect(a.weeklyChange).toBeCloseTo(-1.25, 2);
    expect(a.tooFast).toBe(true);
  });
  it('sense avís a ritme moderat i en camí segons les fites', () => {
    const data = [w('2026-11-16', 84), w('2026-11-23', 83.8), w('2026-11-30', 83.6)];
    const a = analyzeWeight(P, data, dayNum('2026-11-30'));
    expect(a.tooFast).toBe(false);
    expect(a.status).toBe('en_cami');
  });
  it('mode Nadal: l\'objectiu és mantenir', () => {
    const p = { ...P, modes: { travel: { active: false }, christmas: { active: true, refKg: 83.5 } } };
    const a = analyzeWeight(p, [w('2026-12-14', 83.7), w('2026-12-16', 83.5)], dayNum('2026-12-16'));
    expect(a.maintain).toBe(true);
    expect(a.status).toBe('en_cami');
  });
});

describe('durada', () => {
  const cat = buildCatalog();
  const byId = new Map(cat.map((e) => [e.id, e]));
  const { days } = generateRoutine(cat, P);
  it('40 min: 5 escalfament + força + 10 cardio, dins del temps', () => {
    for (const d of days) {
      const p = planSession(d.items, 40, byId, P, true);
      expect(p.warmupMin).toBe(5);
      expect(p.cardio?.plannedMin).toBe(10);
      expect(p.strength.items.length).toBeGreaterThanOrEqual(4);
      expect(p.totalMin).toBeLessThanOrEqual(41);
      for (const it of p.strength.items) expect(it.sets).toBeGreaterThanOrEqual(2);
    }
  });
  it('2 h (passades les 4 primeres setmanes): 8 escalfament i 20 de cardio', () => {
    const p = planSession(days[0].items, 120, byId, P, { cardioOn: true, today: '2027-02-01' });
    expect(p.warmupMin).toBe(8);
    expect(p.cardio?.plannedMin).toBe(20);
    expect(p.totalMin).toBeLessThanOrEqual(121);
  });
  it('sense HIIT hi cap més força', () => {
    const a = planSession(days[0].items, 60, byId, P, true).strength.items.reduce((t, i) => t + i.sets, 0);
    const b = planSession(days[0].items, 60, byId, P, false).strength.items.reduce((t, i) => t + i.sets, 0);
    expect(b).toBeGreaterThan(a);
  });
  it('més temps → més volum de força', () => {
    for (const d of days) {
      const vol = (m: number) => planSession(d.items, m, byId, P).strength.items.reduce((t, i) => t + i.sets, 0);
      expect(vol(60)).toBeGreaterThan(vol(40));
      expect(vol(120)).toBeGreaterThan(vol(60));
    }
  });
});

describe('HIIT', () => {
  it('el pla cap dins els minuts', () => {
    for (const m of [10, 13, 20]) for (const p of HIIT_PROTOCOLS) {
      const c = planCardio(m, 'bici', p.id);
      expect(cardioTotalSec(c)).toBeLessThanOrEqual(m * 60);
      expect(hiitPhases(c).at(-1)!.end).toBe(cardioTotalSec(c));
    }
  });
});
