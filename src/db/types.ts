export type Sex = 'home' | 'dona';

export interface Goal {
  id: string;
  label: string;
  targetKg: number;
  /** inici de la finestra objectiu (ISO yyyy-mm-dd) */
  dateFrom: string;
  /** final de la finestra objectiu */
  dateTo: string;
}

export interface Profile {
  id: 'me';
  sex: Sex;
  age: number;
  heightCm: number;
  startWeightKg: number;
  startDate: string;
  activityFactor: number;
  deficitKcal: number;
  proteinPerKg: number;
  goals: Goal[];
  sessionsPerWeek: number;
  adaptationWeeks: number;
  /** durada habitual de l'entrenament en minuts (40–120) */
  sessionMinutes?: number;
  /** bloc de cardio HIIT al final de l'entrenament */
  cardio?: CardioPrefs;
  /** null = desactivat */
  deloadEveryWeeks: number | null;
  defaultIncrementKg: { upper: number; lower: number };
  restSec: { compound: number; isolation: number };
  conditions: { plantarFasciitis: boolean };
  notes?: string;
}

export type WeighInSource = 'manual' | 'csv';

export interface WeighIn {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
  source: WeighInSource;
  isDemo?: boolean;
}

export type MuscleGroup =
  | 'pit' | 'esquena' | 'espatlles' | 'quadriceps' | 'isquios'
  | 'glutis' | 'bessons' | 'biceps' | 'triceps' | 'core';

export type Pattern = 'push_h' | 'push_v' | 'pull_h' | 'pull_v' | 'knee' | 'hip' | 'isolation' | 'core';
export type Position = 'assegut' | 'estirat' | 'dempeus';
export type FootImpact = 'baix' | 'mitja' | 'alt';
export type Preference = 'like' | 'neutral' | 'dislike';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  pattern: Pattern;
  position: Position;
  footImpact: FootImpact;
  isCompound: boolean;
  available: boolean;
  preference: Preference;
  incrementKg?: number;
  note?: string;
  isCustom: boolean;
}

export type DayKey = 'A' | 'B' | 'C';

export interface RoutineItem {
  exerciseId: string;
  /** patró de la plantilla que cobreix aquest exercici */
  slot: Pattern;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
}

export interface RoutineDay {
  key: DayKey;
  items: RoutineItem[];
}

export interface Routine {
  id: string;
  name: string;
  createdAt: string;
  active: boolean;
  days: RoutineDay[];
}

export type Effort = 'facil' | 'correcte' | 'dur';

export interface SetLog {
  weightKg: number;
  reps: number;
  done: boolean;
  doneAt?: string;
  rir?: number;
  effort?: Effort;
}

export type SuggestionKind = 'primera' | 'pujar' | 'mantenir' | 'baixar' | 'repetir' | 'descarrega';

export interface SessionEntry {
  exerciseId: string;
  target: { sets: number; repMin: number; repMax: number; weightKg: number; restSec: number };
  suggestion?: { kind: SuggestionKind; reason: string };
  sets: SetLog[];
  effort?: Effort;
}

export type SessionStatus = 'en_curs' | 'feta' | 'descartada';

export interface Session {
  id: string;
  routineId: string;
  dayKey: DayKey;
  startedAt: string;
  finishedAt?: string;
  status: SessionStatus;
  flags: { adaptation: boolean; deload: boolean };
  exerciseIds: string[];
  entries: SessionEntry[];
  /** cooldown es manté per compatibilitat amb dades antigues (ja no es fa servir) */
  checklist: { warmup: string[]; cooldown: string[] };
  /** durada objectiu triada en començar (minuts) */
  targetMinutes?: number;
  /** minuts d'escalfament planificats */
  warmupMin?: number;
  /** bloc de cardio HIIT (si n'hi ha) */
  cardio?: CardioLog;
  note?: string;
  isDemo?: boolean;
}

// ── Cardio HIIT ──
export type CardioMachine = 'bici' | 'eliptica' | 'rem' | 'assault' | 'skierg' | 'cinta_caminar';

export interface CardioPrefs {
  enabled: boolean;
  machine: CardioMachine;
  /** id del protocol d'intervals (p. ex. '30-60') */
  protocolId: string;
}

export interface CardioLog {
  machine: CardioMachine;
  protocolId: string;
  workSec: number;
  restSec: number;
  /** minuts suaus al principi i al final del bloc */
  easyStartSec: number;
  easyEndSec: number;
  rounds: number;
  plannedMin: number;
  roundsDone: number;
  durationSec: number;
  done: boolean;
  skipped?: boolean;
  effort?: Effort;
  kcal?: number;
  distanceKm?: number;
}

// ── Natació ──
export type SwimStyle = 'crol' | 'braca' | 'esquena' | 'papallona' | 'mixt';

export interface Swim {
  id: string;
  date: string;
  durationMin: number;
  distanceM: number;
  poolM: 25 | 50;
  style: SwimStyle;
  effort?: Effort;
  note?: string;
  isDemo?: boolean;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

// ── Futur: preparat però encara sense pantalla ──
export interface BodyMeasurement {
  id: string;
  date: string;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  hipCm?: number;
  thighCm?: number;
  isDemo?: boolean;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  blob: Blob;
  pose?: 'frontal' | 'lateral' | 'esquena';
}
