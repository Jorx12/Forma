import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export const useProfile = () => useLiveQuery(() => db.profile.get('me'));
export const useWeighIns = () => useLiveQuery(() => db.weighIns.orderBy('date').toArray(), []);
export const useExercises = () => useLiveQuery(() => db.exercises.toArray(), []);
export const useActiveRoutine = () =>
  useLiveQuery(async () => (await db.routines.toArray()).find((r) => r.active) ?? null, []);
export const useSessions = () =>
  useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []);
export const useMeta = <T,>(key: string) =>
  useLiveQuery(async () => ((await db.meta.get(key))?.value as T | undefined) ?? null, [key]);
