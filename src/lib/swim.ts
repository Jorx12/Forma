import type { Swim } from '../db/types';
import { addDaysISO, toISODate, weekStartISO } from './dates';

/** Ritme en segons per 100 m */
export const pace100 = (s: Pick<Swim, 'durationMin' | 'distanceM'>) => (s.distanceM > 0 ? (s.durationMin * 60) / (s.distanceM / 100) : 0);

export function fmtPace(sec: number) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')} /100 m`;
}

export const fmtMeters = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString('ca-ES', { maximumFractionDigits: 2 })} km` : `${m} m`);

export function swimWeeks(swims: Swim[], weeks = 12) {
  const thisWeek = weekStartISO(toISODate());
  const out: { week: string; meters: number; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const w = addDaysISO(thisWeek, -7 * i);
    const inWeek = swims.filter((s) => weekStartISO(s.date) === w);
    out.push({ week: w, meters: inWeek.reduce((t, s) => t + s.distanceM, 0), count: inWeek.length });
  }
  return out;
}

export const SWIM_STYLE_LABEL: Record<Swim['style'], string> = {
  crol: 'Crol', braca: 'Braça', esquena: 'Esquena', papallona: 'Papallona', mixt: 'Mixt',
};
