import type { BodyMeasurement, Profile, Session, Swim, WeighIn } from '../db/types';
import { addDaysISO } from './dates';
import { daysSinceTraining, mainSessionsInWeek } from './schedule';
import { weekAvgOf } from './weight';

export interface WeekStats {
  week: string;
  avgKg?: number;
  prevAvgKg?: number;
  /** canvi de la mitjana (kg) respecte a la setmana anterior */
  change?: number;
  waistCm?: number;
  prevWaistCm?: number;
  sessions: number;
}

/** Cintura d'una setmana: la mesura del dilluns següent (dia de revisió) o, si no n'hi ha, l'última dins la setmana */
export function waistFor(week: string, measures: BodyMeasurement[]) {
  const from = addDaysISO(week, 1), to = addDaysISO(week, 7);
  return measures.filter((m) => m.waistCm != null && m.date >= from && m.date <= to).sort((a, b) => b.date.localeCompare(a.date))[0]?.waistCm;
}

export function weekStats(week: string, weighIns: WeighIn[], measures: BodyMeasurement[], sessions: Session[], swims: Swim[]): WeekStats {
  const avgKg = weekAvgOf(weighIns, week);
  const prevAvgKg = weekAvgOf(weighIns, addDaysISO(week, -7));
  return {
    week, avgKg, prevAvgKg,
    change: avgKg != null && prevAvgKg != null ? Math.round((avgKg - prevAvgKg) * 100) / 100 : undefined,
    waistCm: waistFor(week, measures), prevWaistCm: waistFor(addDaysISO(week, -7), measures),
    sessions: mainSessionsInWeek(week, sessions, swims),
  };
}

export type AlertTone = 'ok' | 'info' | 'warn' | 'danger';
export interface ReviewAlert { id: string; tone: AlertTone; text: string; action?: 'hotel' }

/** Avisos automàtics de la revisió setmanal */
export function reviewAlerts(week: string, profile: Profile, weighIns: WeighIn[], measures: BodyMeasurement[], sessions: Session[], swims: Swim[], today: string): ReviewAlert[] {
  const out: ReviewAlert[] = [];
  const xmas = !!profile.modes?.christmas.active;
  const s0 = weekStats(week, weighIns, measures, sessions, swims);
  const s1 = weekStats(addDaysISO(week, -7), weighIns, measures, sessions, swims);

  if (s0.change != null) {
    const loss = -s0.change;
    if (loss > 1) out.push({ id: 'massa', tone: 'warn', text: `−${fmt(loss)} kg: més d'1 kg. Menja una mica més.` });
    else if (loss >= 0.3 && loss <= 0.5) out.push({ id: 'be', tone: 'ok', text: `−${fmt(loss)} kg. Vas bé, no canviïs res.` });
    else if (loss > 0.5) out.push({ id: 'rapid', tone: 'info', text: `−${fmt(loss)} kg. Bon ritme.` });
    else if (xmas) out.push({ id: 'nadal', tone: 'info', text: `Nadal: mantenir (${s0.change > 0 ? '+' : '−'}${fmt(s0.change)} kg).` });
  }

  // 2 setmanes seguides sense baixar pes ni cintura (no s'avisa en mode Nadal)
  if (!xmas && s0.change != null && s1.change != null && s0.change >= 0 && s1.change >= 0) {
    const w0 = s0.waistCm, w2 = waistFor(addDaysISO(week, -14), measures);
    const waistDown = w0 != null && w2 != null && w0 < w2;
    if (!waistDown) out.push({ id: 'estancat', tone: 'warn', text: '2 setmanes sense baixar. Treu un dia d\'alcohol o un picoteig i afegeix 10\' de cardio.' });
  }

  const idle = daysSinceTraining(sessions, swims, today);
  if (idle !== null && idle >= 7) out.push({ id: 'inactiu', tone: 'danger', text: 'Mai dues setmanes seguides sense entrenar.', action: 'hotel' });
  return out;
}

const fmt = (n: number) => Math.abs(n).toLocaleString('ca-ES', { maximumFractionDigits: 2 });
