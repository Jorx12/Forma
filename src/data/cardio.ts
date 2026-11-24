import type { CardioLog, CardioMachine, FootImpact } from '../db/types';

/** Màquines que es poden triar (fascitis: res de córrer ni salts) */
export const CARDIO_ALLOWED: CardioMachine[] = ['bici', 'eliptica', 'rem'];
export const CARDIO_WARNING = 'Mai cinta de córrer ni salts (fascitis plantar). Només bici, el·líptica o rem.';

export const CARDIO_MACHINES: { id: CardioMachine; label: string; foot: FootImpact; tip: string }[] = [
  { id: 'bici', label: 'Bici estàtica', foot: 'baix', tip: 'Puja la resistència als trams forts, no només la cadència.' },
  { id: 'eliptica', label: 'El·líptica', foot: 'baix', tip: 'Recolza tot el peu al pedal, sense aixecar el taló.' },
  { id: 'rem', label: 'Rem (ergòmetre)', foot: 'baix', tip: 'Força amb les cames primer, després esquena i braços.' },
  { id: 'assault', label: 'Bici d\'aire (assault)', foot: 'baix', tip: 'Braços i cames: molt intensa, ideal per a intervals curts.' },
  { id: 'skierg', label: 'SkiErg', foot: 'mitja', tip: 'Dempeus: vigila la planta del peu si notes molèsties.' },
  { id: 'cinta_caminar', label: 'Cinta caminant amb pendent', foot: 'mitja', tip: 'Només caminant (sense córrer), amb pendent als trams forts.' },
];

export const machineLabel = (id: CardioMachine) => CARDIO_MACHINES.find((m) => m.id === id)?.label ?? id;

export interface HiitProtocol { id: string; label: string; workSec: number; restSec: number; level: string }

export const HIIT_PROTOCOLS: HiitProtocol[] = [
  { id: 'continu', label: 'Ritme constant', workSec: 0, restSec: 0, level: 'Moderat, pots parlar' },
  { id: '30-60', label: '30" fort / 60" suau', workSec: 30, restSec: 60, level: 'Iniciació' },
  { id: '30-30', label: '30" fort / 30" suau', workSec: 30, restSec: 30, level: 'Intermedi' },
  { id: '20-40', label: '20" fort / 40" suau', workSec: 20, restSec: 40, level: 'Curt i explosiu' },
  { id: '40-20', label: '40" fort / 20" suau', workSec: 40, restSec: 20, level: 'Avançat' },
  { id: '60-60', label: '1\' fort / 1\' suau', workSec: 60, restSec: 60, level: 'Trams llargs' },
];

export const protocolById = (id: string) => HIIT_PROTOCOLS.find((p) => p.id === id) ?? HIIT_PROTOCOLS[0];

export const isContinuous = (c: Pick<CardioLog, 'protocolId'>) => c.protocolId === 'continu';

/** Planifica el bloc de cardio: continu, o 2' suaus + intervals + 1' de tornada a la calma */
export function planCardio(minutes: number, machine: CardioMachine, protocolId: string): CardioLog {
  const p = protocolById(protocolId);
  if (p.id === 'continu') {
    return {
      machine, protocolId: p.id, workSec: 0, restSec: 0, easyStartSec: 0, easyEndSec: 0, rounds: 0,
      continuousSec: minutes * 60, plannedMin: minutes, roundsDone: 0, durationSec: 0, done: false,
    };
  }
  const easyStartSec = 120, easyEndSec = 60;
  const rounds = Math.max(3, Math.floor((minutes * 60 - easyStartSec - easyEndSec) / (p.workSec + p.restSec)));
  return {
    machine, protocolId: p.id, workSec: p.workSec, restSec: p.restSec, easyStartSec, easyEndSec, rounds,
    plannedMin: minutes, roundsDone: 0, durationSec: 0, done: false,
  };
}

export const cardioTotalSec = (c: Pick<CardioLog, 'easyStartSec' | 'easyEndSec' | 'rounds' | 'workSec' | 'restSec' | 'continuousSec'>) =>
  (c.continuousSec ?? 0) + c.easyStartSec + c.rounds * (c.workSec + c.restSec) + c.easyEndSec;

export interface HiitPhase { kind: 'escalfar' | 'fort' | 'suau' | 'calma' | 'continu'; start: number; end: number; round: number }

export function hiitPhases(c: CardioLog): HiitPhase[] {
  if (c.continuousSec) return [{ kind: 'continu', start: 0, end: c.continuousSec, round: 0 }];
  const out: HiitPhase[] = [];
  let t = 0;
  out.push({ kind: 'escalfar', start: t, end: (t += c.easyStartSec), round: 0 });
  for (let r = 1; r <= c.rounds; r++) {
    out.push({ kind: 'fort', start: t, end: (t += c.workSec), round: r });
    out.push({ kind: 'suau', start: t, end: (t += c.restSec), round: r });
  }
  out.push({ kind: 'calma', start: t, end: (t += c.easyEndSec), round: c.rounds });
  return out;
}

/** Minuts de cardio després de la força: 10 les 4 primeres setmanes del pla, després 15–20 segons la durada */
export function cardioMinutesFor(sessionMinutes: number, weeksSinceStart: number) {
  if (weeksSinceStart < 4) return 10;
  const t = Math.min(1, Math.max(0, (sessionMinutes - 60) / 15));
  return Math.round(15 + 5 * t);
}
