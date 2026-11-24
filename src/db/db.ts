import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyMeasurement, Exercise, ExtraActivity, MetaRow, Profile, ProgressPhoto, Routine, ScheduleOverride, Session, Swim,
  WeeklyReview, WeighIn, DailyLog,
} from './types';

export const SCHEMA_VERSION = 4;

export class FormaDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  weighIns!: EntityTable<WeighIn, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;
  bodyMeasurements!: EntityTable<BodyMeasurement, 'id'>;
  progressPhotos!: EntityTable<ProgressPhoto, 'id'>;
  swims!: EntityTable<Swim, 'id'>;
  schedule!: EntityTable<ScheduleOverride, 'date'>;
  activities!: EntityTable<ExtraActivity, 'id'>;
  weeklyReviews!: EntityTable<WeeklyReview, 'week'>;
  dailyLogs!: EntityTable<DailyLog, 'date'>;

  constructor() {
    super('forma');
    this.version(1).stores({
      profile: 'id',
      weighIns: 'id, date',
      exercises: 'id, muscleGroup, pattern',
      routines: 'id, active',
      sessions: 'id, startedAt, status, *exerciseIds',
      meta: 'key',
      bodyMeasurements: 'id, date',
      progressPhotos: 'id, date',
    });
    // v2: natació
    this.version(2).stores({ swims: 'id, date' });
    // v3: pla setmanal, activitats extra i revisions setmanals (les dades existents es mantenen)
    this.version(3).stores({ schedule: 'date', activities: 'id, date', weeklyReviews: 'week' });
    // v4: registre diari d'hàbits (berenar, alcohol, passos)
    this.version(4).stores({ dailyLogs: 'date' });
  }
}

export const db = new FormaDB();

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}

export async function deleteMeta(key: string) {
  await db.meta.delete(key);
}
