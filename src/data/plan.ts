import type { Milestone, Modes, PlanActivity, Routine, RoutineDay, RoutineItem } from '../db/types';

/** Setmana tipus del pla personal (0 = diumenge … 6 = dissabte) */
export const DEFAULT_WEEK_PLAN: Record<number, PlanActivity> = {
  1: 'natacio',
  2: 'descans',
  3: 'forca_A',
  4: 'descans',
  5: 'forca_B',
  6: 'extra',
  0: 'extra',
};

export const WEEKDAY_LABEL = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
export const WEEKDAY_SHORT = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
/** Ordre de la setmana començant per dilluns */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const ACTIVITY_INFO: Record<PlanActivity, { label: string; sub: string; emoji: string }> = {
  natacio: { label: 'Natació', sub: '40–45 min', emoji: '🏊' },
  forca_A: { label: 'Força A + cardio', sub: '60–75 min', emoji: '🏋️' },
  forca_B: { label: 'Força B + cardio', sub: '60–75 min', emoji: '🏋️' },
  hotel: { label: "Rutina d'hotel", sub: '3 voltes · ~20 min', emoji: '🧳' },
  extra: { label: 'Extra opcional', sub: 'Pàdel, pitch and putt, caminar', emoji: '⛳' },
  descans: { label: 'Descans', sub: 'Passos diaris i prou', emoji: '😴' },
};

/** Activitats que compten com a sessió de la setmana (/3) */
export const isMainActivity = (a: PlanActivity) => a === 'natacio' || a === 'forca_A' || a === 'forca_B' || a === 'hotel';

/** Fites mensuals (línia objectiu) */
export const DEFAULT_MILESTONES: Milestone[] = [
  { date: '2026-12-31', label: 'Des 2026', kgMin: 83, kgMax: 84 },
  { date: '2027-01-31', label: 'Gen 2027', kgMin: 82, kgMax: 82 },
  { date: '2027-02-28', label: 'Feb', kgMin: 80.5, kgMax: 80.5 },
  { date: '2027-03-31', label: 'Mar', kgMin: 79, kgMax: 79 },
  { date: '2027-04-30', label: 'Abr', kgMin: 77, kgMax: 77 },
  { date: '2027-05-31', label: 'Maig', kgMin: 75, kgMax: 75 },
  { date: '2027-10-31', label: 'Tardor 2027', kgMin: 70, kgMax: 72 },
];

export const DEFAULT_MODES: Modes = { travel: { active: false }, christmas: { active: false } };

const it = (exerciseId: string, slot: RoutineItem['slot'], sets: number, repMin: number, repMax: number, restSec: number, altIds?: string[]): RoutineItem =>
  ({ exerciseId, slot, sets, repMin, repMax, restSec, ...(altIds ? { altIds } : {}) });

/** Rutines del pla personal: Força A, Força B i rutina d'hotel */
export function personalPlanDays(): RoutineDay[] {
  return [
    {
      key: 'A', label: 'Força A', items: [
        it('premsa-cames', 'knee', 3, 10, 12, 105),
        it('press-pit-maquina', 'push_h', 3, 8, 12, 105),
        it('jalon-pit', 'pull_v', 3, 8, 12, 105),
        it('curl-femoral-assegut', 'isolation', 3, 10, 12, 75),
        it('press-espatlles-maquina', 'push_v', 2, 10, 12, 90),
        it('planxa', 'core', 3, 30, 45, 60),
      ],
    },
    {
      key: 'B', label: 'Força B', items: [
        it('extensio-quadriceps', 'isolation', 3, 10, 12, 75),
        it('maquina-gluti', 'hip', 3, 10, 12, 90),
        it('rem-maquina', 'pull_h', 3, 8, 12, 105),
        it('press-pit-inclinat-maquina', 'push_h', 3, 8, 12, 105),
        it('elevacions-laterals-maquina', 'isolation', 2, 12, 15, 60, ['face-pull']),
        it('crunch-maquina', 'core', 3, 12, 15, 60),
      ],
    },
    {
      key: 'H', label: "Hotel (pla B)", circuit: true, items: [
        it('esquat-cadira', 'knee', 3, 12, 12, 20),
        it('flexions', 'push_h', 3, 10, 10, 20),
        it('pont-gluti', 'hip', 3, 12, 12, 20),
        it('planxa', 'core', 3, 30, 30, 20),
        it('rem-motxilla', 'pull_h', 3, 10, 10, 60),
      ],
    },
  ];
}

export function personalRoutine(id: string): Routine {
  return { id, name: 'Pla personal', createdAt: new Date().toISOString(), active: true, fixed: true, template: 'personal-v1', days: personalPlanDays() };
}

export const dayLabel = (key: string, days?: { key: string; label?: string }[]) =>
  days?.find((d) => d.key === key)?.label ?? (key === 'H' ? 'Hotel' : `Dia ${key}`);

/** Exercicis que s'han de marcar com a disponibles perquè el pla funcioni */
export const PLAN_EXERCISE_IDS = [...new Set(personalPlanDays().flatMap((d) => d.items.flatMap((i) => [i.exerciseId, ...(i.altIds ?? [])])))];

// ── Alimentació (recordatoris, sense comptar calories) ──
export const SNACK_OPTIONS = [
  'Fruita + un grapat de fruits secs',
  'Torrada amb pernil',
  'Ous durs',
  'Hummus amb pastanaga',
  'Tonyina amb crackers',
];

export const SNACK_TIME = { from: '17:00', to: '17:30' };
