import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { ca } from 'date-fns/locale';

export const DAY_MS = 86_400_000;

/** Data local en format ISO yyyy-mm-dd */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISODate(new Date());

/** Dies (valor numèric) per a càlculs i gràfics: dia 0 = 1970-01-01, a migdia local per evitar canvis d'hora */
export function dayNum(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNum(n: number): string {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function daysBetween(aISO: string, bISO: string) {
  return dayNum(bISO) - dayNum(aISO);
}

export function midDate(aISO: string, bISO: string) {
  return fromDayNum(Math.round((dayNum(aISO) + dayNum(bISO)) / 2));
}

export function fmtDate(iso: string, pattern = 'd MMM yyyy') {
  return format(parseISO(iso), pattern, { locale: ca });
}

export const fmtShort = (iso: string) => fmtDate(iso, 'd MMM');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtLong = (iso: string) => cap(fmtDate(iso, "EEEE d 'de' MMMM"));

export function fmtDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Dilluns de la setmana (ISO) */
export function weekStartISO(iso: string) {
  return toISODate(startOfWeek(parseISO(iso), { weekStartsOn: 1 }));
}

export function addDaysISO(iso: string, n: number) {
  return toISODate(addDays(parseISO(iso), n));
}

export function daysAgo(iso: string) {
  return differenceInCalendarDays(new Date(), parseISO(iso));
}

export const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString('ca-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
