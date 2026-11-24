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
  /** bloc de cardio al final de l'entrenament */
  cardio?: CardioPrefs;
  /** setmana tipus: activitat per dia (0 = diumenge … 6 = dissabte) */
  weekPlan?: Record<number, PlanActivity>;
  /** fites mensuals per a la línia objectiu */
  milestones?: Milestone[];
  modes?: Modes;
  /** null = desactivat */
  deloadEveryWeeks: number | null;
  defaultIncrementKg: { upper: number; lower: number };
  restSec: { compound: number; isolation: number };
  conditions: { plantarFasciitis: boolean };
  notes?: string;
}

export type WeighInSource = 'manual' | 'csv' | 'salut';

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
  /** com es mesura: repeticions (per defecte) o segons (planxa) */
  measure?: 'reps' | 'seconds';
  /** sense pes extern (pes corporal) */
  bodyweight?: boolean;
}

/** A/B/C: dies de força · H: rutina d'hotel (pla B per a viatges) */
export type DayKey = 'A' | 'B' | 'C' | 'H';

export interface RoutineItem {
  exerciseId: string;
  /** patró de la plantilla que cobreix aquest exercici */
  slot: Pattern;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  /** exercicis alternatius (p. ex. elevacions laterals o face pull) */
  altIds?: string[];
}

export interface RoutineDay {
  key: DayKey;
  items: RoutineItem[];
  /** nom visible (p. ex. «Força A», «Hotel») */
  label?: string;
  /** circuit: es fan voltes (un exercici rere l'altre) en lloc de sèries seguides */
  circuit?: boolean;
}

export interface Routine {
  id: string;
  name: string;
  createdAt: string;
  active: boolean;
  days: RoutineDay[];
  /** pla fix: no s'hi afegeixen exercicis ni sèries automàticament segons la durada */
  fixed?: boolean;
  /** identificador del pla de referència (per poder-lo restaurar) */
  template?: 'personal-v1';
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
  altIds?: string[];
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
  /** bloc de cardio (si n'hi ha) */
  cardio?: CardioLog;
  /** sessió de tornada després d'un viatge */
  comeback?: boolean;
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
  /** cardio continu (sense intervals): durada en segons */
  continuousSec?: number;
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

export type Feeling = 1 | 2 | 3 | 4;

export interface Swim {
  id: string;
  date: string;
  durationMin: number;
  /** opcional: 0 = no registrada */
  distanceM: number;
  feeling?: Feeling;
  poolM: 25 | 50;
  style: SwimStyle;
  effort?: Effort;
  note?: string;
  isDemo?: boolean;
}

// ── Pla setmanal ──
export type PlanActivity = 'natacio' | 'forca_A' | 'forca_B' | 'hotel' | 'extra' | 'descans';

export interface Milestone {
  /** data de la fita (normalment l'últim dia del mes) */
  date: string;
  label: string;
  kgMin: number;
  kgMax: number;
}

export interface Modes {
  travel: { active: boolean; since?: string };
  christmas: { active: boolean; since?: string; refKg?: number };
}

/** Canvi puntual del pla per a un dia (moure una sessió, tornada d'un viatge…) */
export interface ScheduleOverride {
  date: string;
  activity: PlanActivity;
  movedFrom?: string;
  movedTo?: string;
  comeback?: boolean;
}

export type ExtraKind = 'padel' | 'pitch' | 'caminar' | 'altre';

export interface ExtraActivity {
  id: string;
  date: string;
  kind: ExtraKind;
  minutes: number;
  feeling?: Feeling;
  note?: string;
  isDemo?: boolean;
}

export interface WeeklyReview {
  /** dilluns de la setmana revisada (ISO) */
  week: string;
  avgKg?: number;
  waistCm?: number;
  sessionsDone: number;
  snacksPlanned: number;
  alcoholDays: number;
  nextGoal?: string;
  savedAt: string;
  isDemo?: boolean;
}

/** Registre diari d'hàbits (un per dia) */
export interface DailyLog {
  date: string;
  snack?: boolean;
  alcohol?: boolean;
  steps?: number;
  /** d'on venen els passos */
  stepsSource?: 'manual' | 'salut';
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
