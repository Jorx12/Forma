import type { Profile } from '../db/types';
import { DEFAULT_MILESTONES, DEFAULT_MODES, DEFAULT_WEEK_PLAN } from './plan';

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  sex: 'home',
  age: 28,
  heightCm: 172,
  startWeightKg: 84,
  startDate: '2026-11-17',
  activityFactor: 1.5,
  deficitKcal: 450,
  proteinPerKg: 1.9,
  goals: [
    { id: 'g75', label: 'Fita 1', targetKg: 75, dateFrom: '2027-05-01', dateTo: '2027-05-31' },
    { id: 'g70', label: 'Fita 2 (70–72 kg)', targetKg: 70, dateFrom: '2027-09-22', dateTo: '2027-12-21' },
  ],
  sessionsPerWeek: 3,
  adaptationWeeks: 2,
  sessionMinutes: 70,
  cardio: { enabled: true, machine: 'bici', protocolId: 'continu' },
  weekPlan: { ...DEFAULT_WEEK_PLAN },
  milestones: DEFAULT_MILESTONES,
  modes: DEFAULT_MODES,
  deloadEveryWeeks: 7,
  defaultIncrementKg: { upper: 2.5, lower: 5 },
  restSec: { compound: 105, isolation: 75 },
  conditions: { plantarFasciitis: true },
  notes: "Retornant després de gairebé un any aturat. Feina d'oficina, 7.000–10.000 passos diaris.",
};
