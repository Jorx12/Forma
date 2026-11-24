import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { DailyLog, Session, WeighIn } from '../../db/types';
import { addDaysISO } from '../dates';
import { alcoholInsight, applyShortcut, parseShortcut, weekHabits } from '../habits';
import { monthSummary, prevMonth } from '../monthly';

describe('text de Dreceres', () => {
  it('llegeix passos i pes en diferents formats', () => {
    expect(parseShortcut('FORMA passos=8532 pes=83,4 kg')).toEqual({ steps: 8532, weightKg: 83.4 });
    expect(parseShortcut('FORMA passos=8.532 pes=83.4')).toEqual({ steps: 8532, weightKg: 83.4 });
    expect(parseShortcut('passos=8 532')).toEqual({ steps: 8532 });
    expect(parseShortcut('passos=8532,6 data=2026-11-23')).toEqual({ steps: 8533, date: '2026-11-23' });
    expect(parseShortcut('steps: 10450 weight: 82.95 kg')).toEqual({ steps: 10450, weightKg: 83 });
  });
  it('llegeix els passos de diversos dies', () => {
    expect(parseShortcut('2026-11-22 7.410\n2026-11-23 9003\n2026-11-24 10.200')?.days).toEqual([
      { date: '2026-11-22', steps: 7410 }, { date: '2026-11-23', steps: 9003 }, { date: '2026-11-24', steps: 10200 },
    ]);
    expect(parseShortcut('FORMA 2026-11-23: 8532, 2026-11-24: 9100')?.days?.length).toBe(2);
    expect(parseShortcut('FORMA passos=8532 data=2026-11-24')).toEqual({ steps: 8532, date: '2026-11-24' });
  });
  it('ignora textos que no són de Forma o valors absurds', () => {
    expect(parseShortcut('hola')).toBeNull();
    expect(parseShortcut('FORMA passos= pes=')).toBeNull();
    expect(parseShortcut('pes=8 passos=999999')).toBeNull();
  });
  it('desa passos i pes, però no sobreescriu una pesada manual', async () => {
    const { db } = await import('../../db/db');
    await db.weighIns.put({ id: 'm', date: '2026-11-25', weightKg: 83.9, source: 'manual' });
    const r1 = await applyShortcut({ steps: 9000, weightKg: 83.2, date: '2026-11-25' });
    expect((await db.weighIns.get('m'))?.weightKg).toBe(83.9);
    expect(r1.result.join(' ')).toMatch(/no desat/);
    expect((await db.dailyLogs.get('2026-11-25'))?.steps).toBe(9000);
    await applyShortcut({ days: [{ date: '2026-11-20', steps: 7000 }, { date: '2026-11-21', steps: 12000 }] });
    expect((await db.dailyLogs.get('2026-11-21'))?.steps).toBe(12000);
    await applyShortcut({ weightKg: 83.1, date: '2026-11-26' });
    expect((await db.weighIns.where('date').equals('2026-11-26').first())).toMatchObject({ weightKg: 83.1, source: 'salut' });
  });
});

describe('hàbits', () => {
  const logs: DailyLog[] = [
    { date: '2026-11-23', snack: true, alcohol: false, steps: 8000 },
    { date: '2026-11-24', snack: true, steps: 10000 },
    { date: '2026-11-28', snack: false, alcohol: true },
    { date: '2026-11-29', alcohol: true },
    { date: '2026-11-30', snack: true },
  ];
  it('resum setmanal per a la revisió', () => {
    expect(weekHabits('2026-11-23', logs)).toEqual({ snacks: 2, alcoholDays: 2, stepsAvg: 9000, stepsDays: 2, loggedDays: 4 });
  });
  it('relaciona l\'alcohol amb el canvi de pes', () => {
    const w = (d: string, kg: number): WeighIn => ({ id: d, date: d, weightKg: kg, source: 'manual' });
    const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
    const kg = [84, 83.5, 83.6, 83.1, 83.2];
    const alcohol = [0, 1, 3, 1, 3];
    const weighIns = weeks.map((wk, i) => w(wk, kg[i]));
    const l: DailyLog[] = weeks.flatMap((wk, i) => Array.from({ length: 7 }, (_, d) => ({ date: addDaysISO(wk, d), alcohol: d < alcohol[i] })));
    const r = alcoholInsight(weighIns, l, []);
    expect(r).not.toBeNull();
    expect(r!.high).toBeGreaterThan(0);
    expect(r!.low).toBeLessThan(0);
  });
});

describe('resum mensual', () => {
  const s = (id: string, date: string, w: number, dayKey: 'A' | 'H' = 'A'): Session => ({
    id, routineId: 'r', dayKey, startedAt: `${date}T18:00:00Z`, status: 'feta', flags: { adaptation: false, deload: false }, exerciseIds: ['x'],
    entries: [{ exerciseId: 'x', target: { sets: 1, repMin: 8, repMax: 12, weightKg: w, restSec: 90 }, sets: [{ weightKg: w, reps: 10, done: true }] }],
    checklist: { warmup: [], cooldown: [] },
  });
  it('compta sessions, rècords i canvis', () => {
    const r = monthSummary('2026-12', {
      weighIns: [{ id: '1', date: '2026-11-20', weightKg: 84, source: 'manual' }, { id: '2', date: '2026-12-10', weightKg: 83, source: 'manual' }],
      measures: [{ id: 'a', date: '2026-12-07', waistCm: 98 }, { id: 'b', date: '2026-12-28', waistCm: 96.5 }],
      sessions: [s('a', '2026-11-25', 40), s('b', '2026-12-02', 42.5), s('c', '2026-12-09', 42.5, 'H')],
      swims: [{ id: 'w', date: '2026-12-07', durationMin: 45, distanceM: 0, poolM: 25, style: 'crol' }],
      extras: [], logs: [{ date: '2026-12-01', snack: true, alcohol: true, steps: 9000 }],
    });
    expect(r.kgChange).toBe(-1);
    expect(r.waistChange).toBe(-1.5);
    expect(r.strength).toBe(1);
    expect(r.hotel).toBe(1);
    expect(r.swims).toBe(1);
    expect(r.totalSessions).toBe(3);
    expect(r.prs.length).toBe(1);
    expect(r.alcoholDays).toBe(1);
  });
  it('mes anterior al gener', () => expect(prevMonth('2027-01')).toBe('2026-12'));
});
