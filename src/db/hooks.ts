import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export const useProfile = () => useLiveQuery(() => db.profile.get('me'));
export const useWeighIns = () => useLiveQuery(() => db.weighIns.orderBy('date').toArray(), []);
export const useExercises = () => useLiveQuery(() => db.exercises.toArray(), []);
export const useActiveRoutine = () =>
  useLiveQuery(async () => (await db.routines.toArray()).find((r) => r.active) ?? null, []);
export const useSessions = () =>
  useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []);
export const useSwims = () => useLiveQuery(() => db.swims.orderBy('date').reverse().toArray(), []);
export const useSchedule = () => useLiveQuery(async () => new Map((await db.schedule.toArray()).map((o) => [o.date, o])), []);
export const useActivities = () => useLiveQuery(() => db.activities.orderBy('date').reverse().toArray(), []);
export const useReviews = () => useLiveQuery(() => db.weeklyReviews.orderBy('week').reverse().toArray(), []);
export const useMeasurements = () => useLiveQuery(() => db.bodyMeasurements.orderBy('date').toArray(), []);
export const useMeta = <T,>(key: string) =>
  useLiveQuery(async () => ((await db.meta.get(key))?.value as T | undefined) ?? null, [key]);
