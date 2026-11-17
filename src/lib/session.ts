import { db, deleteMeta, getMeta, setMeta, uid } from '../db/db';
import type { DayKey, Session } from '../db/types';
import { fitDay } from './duration';
import { buildEntries, isAdaptation } from './progression';

export async function getActiveSession(): Promise<Session | undefined> {
  const id = await getMeta<string>('activeSessionId');
  if (!id) return undefined;
  const s = await db.sessions.get(id);
  return s?.status === 'en_curs' ? s : undefined;
}

export async function startSession(day: DayKey, deload: boolean, minutes: number): Promise<string> {
  const [profile, routine, exercises, sessions] = await Promise.all([
    db.profile.get('me'),
    db.routines.filter((r) => r.active).first(),
    db.exercises.toArray(),
    db.sessions.toArray(),
  ]);
  if (!profile || !routine) throw new Error('Cal un perfil i una rutina');
  const all = routine.days.find((d) => d.key === day)?.items ?? [];
  const { items } = fitDay(all, minutes, new Map(exercises.map((e) => [e.id, e])));
  const entries = buildEntries(items, exercises, profile, sessions, deload);
  const s: Session = {
    id: uid(),
    routineId: routine.id,
    dayKey: day,
    startedAt: new Date().toISOString(),
    status: 'en_curs',
    flags: { adaptation: isAdaptation(profile, sessions), deload },
    exerciseIds: entries.map((e) => e.exerciseId),
    entries,
    checklist: { warmup: [], cooldown: [] },
    targetMinutes: minutes,
  };
  await db.sessions.put(s);
  await setMeta('activeSessionId', s.id);
  return s.id;
}

export async function saveSession(s: Session) {
  s.exerciseIds = [...new Set(s.entries.map((e) => e.exerciseId))];
  await db.sessions.put(s);
}

export async function finishSession(s: Session) {
  // Treu les sèries no fetes perquè no comptin
  const entries = s.entries.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length);
  await saveSession({ ...s, entries, status: 'feta', finishedAt: new Date().toISOString() });
  await deleteMeta('activeSessionId');
  await deleteMeta('restTimer');
}

export async function discardSession(s: Session) {
  await db.sessions.delete(s.id);
  await deleteMeta('activeSessionId');
  await deleteMeta('restTimer');
}
