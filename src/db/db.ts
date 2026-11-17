import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyMeasurement, Exercise, MetaRow, Profile, ProgressPhoto, Routine, Session, WeighIn,
} from './types';

export const SCHEMA_VERSION = 1;

export class FormaDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  weighIns!: EntityTable<WeighIn, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;
  bodyMeasurements!: EntityTable<BodyMeasurement, 'id'>;
  progressPhotos!: EntityTable<ProgressPhoto, 'id'>;

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
