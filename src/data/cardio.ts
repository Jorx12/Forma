import type { CardioLog, CardioMachine, FootImpact } from '../db/types';

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
  { id: '30-60', label: '30" fort / 60" suau', workSec: 30, restSec: 60, level: 'Iniciació' },
  { id: '30-30', label: '30" fort / 30" suau', workSec: 30, restSec: 30, level: 'Intermedi' },
  { id: '20-40', label: '20" fort / 40" suau', workSec: 20, restSec: 40, level: 'Curt i explosiu' },
  { id: '40-20', label: '40" fort / 20" suau', workSec: 40, restSec: 20, level: 'Avançat' },
  { id: '60-60', label: '1\' fort / 1\' suau', workSec: 60, restSec: 60, level: 'Trams llargs' },
];

export const protocolById = (id: string) => HIIT_PROTOCOLS.find((p) => p.id === id) ?? HIIT_PROTOCOLS[0];

/** Planifica el bloc HIIT: 2' suaus + intervals + 1' de tornada a la calma, dins dels minuts disponibles */
export function planCardio(minutes: number, machine: CardioMachine, protocolId: string): CardioLog {
  const p = protocolById(protocolId);
  const easyStartSec = 120, easyEndSec = 60;
  const rounds = Math.max(3, Math.floor((minutes * 60 - easyStartSec - easyEndSec) / (p.workSec + p.restSec)));
  return {
    machine, protocolId: p.id, workSec: p.workSec, restSec: p.restSec, easyStartSec, easyEndSec, rounds,
    plannedMin: minutes, roundsDone: 0, durationSec: 0, done: false,
  };
}

export const cardioTotalSec = (c: Pick<CardioLog, 'easyStartSec' | 'easyEndSec' | 'rounds' | 'workSec' | 'restSec'>) =>
  c.easyStartSec + c.rounds * (c.workSec + c.restSec) + c.easyEndSec;

export interface HiitPhase { kind: 'escalfar' | 'fort' | 'suau' | 'calma'; start: number; end: number; round: number }

export function hiitPhases(c: CardioLog): HiitPhase[] {
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
