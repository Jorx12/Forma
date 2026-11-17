import type { Exercise, FootImpact, MuscleGroup, Pattern, Position } from '../db/types';

type Def = [id: string, name: string, group: MuscleGroup, pattern: Pattern, position: Position, foot: FootImpact, compound: boolean, available?: boolean];

/**
 * Catàleg predefinit. `available` per defecte: les màquines més habituals a qualsevol gimnàs.
 * L'impacte al peu és pensat per a la fascitis plantar: dempeus amb càrrega = mitjà/alt.
 */
const DEFS: Def[] = [
  // Pit
  ['press-pit-maquina', 'Press de pit a màquina', 'pit', 'push_h', 'assegut', 'baix', true, true],
  ['press-pit-inclinat-maquina', 'Press inclinat a màquina', 'pit', 'push_h', 'assegut', 'baix', true, true],
  ['press-banca-manuelles', 'Press de banca amb manuelles', 'pit', 'push_h', 'estirat', 'baix', true, true],
  ['press-banca-barra', 'Press de banca amb barra', 'pit', 'push_h', 'estirat', 'baix', true, false],
  ['press-pit-smith', 'Press de pit a la Smith', 'pit', 'push_h', 'estirat', 'baix', true, false],
  ['contractora', 'Contractora (pec deck)', 'pit', 'isolation', 'assegut', 'baix', false, true],
  ['creuament-politja', 'Creuament de politges', 'pit', 'isolation', 'dempeus', 'mitja', false, false],
  ['fons-assistits', 'Fons assistits a màquina', 'triceps', 'push_v', 'dempeus', 'baix', true, false],

  // Esquena
  ['jalon-pit', 'Jalón al pit', 'esquena', 'pull_v', 'assegut', 'baix', true, true],
  ['jalon-agafada-estreta', 'Jalón amb agafada estreta', 'esquena', 'pull_v', 'assegut', 'baix', true, false],
  ['dominades-assistides', 'Dominades assistides a màquina', 'esquena', 'pull_v', 'dempeus', 'baix', true, false],
  ['pullover-maquina', 'Pullover a màquina', 'esquena', 'pull_v', 'assegut', 'baix', true, false],
  ['rem-assegut-politja', 'Rem assegut a politja', 'esquena', 'pull_h', 'assegut', 'baix', true, true],
  ['rem-maquina', 'Rem a màquina amb suport de pit', 'esquena', 'pull_h', 'assegut', 'baix', true, true],
  ['rem-manuella-banc', 'Rem amb manuella recolzat al banc', 'esquena', 'pull_h', 'estirat', 'baix', true, true],
  ['rem-t-pit-suportat', 'Rem en T amb suport de pit', 'esquena', 'pull_h', 'estirat', 'baix', true, false],
  ['hiperextensions', 'Hiperextensions (banc lumbar)', 'esquena', 'hip', 'estirat', 'baix', false, true],

  // Espatlles
  ['press-espatlles-maquina', "Press d'espatlles a màquina", 'espatlles', 'push_v', 'assegut', 'baix', true, true],
  ['press-espatlles-manuelles', "Press d'espatlles amb manuelles assegut", 'espatlles', 'push_v', 'assegut', 'baix', true, true],
  ['press-militar-dempeus', 'Press militar dempeus amb barra', 'espatlles', 'push_v', 'dempeus', 'alt', true, false],
  ['elevacions-laterals-maquina', 'Elevacions laterals a màquina', 'espatlles', 'isolation', 'assegut', 'baix', false, true],
  ['elevacions-laterals-manuelles', 'Elevacions laterals amb manuelles', 'espatlles', 'isolation', 'dempeus', 'mitja', false, true],
  ['contractora-inversa', 'Contractora inversa (deltoide posterior)', 'espatlles', 'isolation', 'assegut', 'baix', false, true],
  ['face-pull', 'Face pull a politja', 'espatlles', 'isolation', 'dempeus', 'mitja', false, true],

  // Quàdriceps / cama dominant genoll
  ['premsa-cames', 'Premsa de cames', 'quadriceps', 'knee', 'assegut', 'mitja', true, true],
  ['hack-squat', 'Hack squat', 'quadriceps', 'knee', 'dempeus', 'alt', true, false],
  ['pendulum-squat', 'Pendulum squat', 'quadriceps', 'knee', 'dempeus', 'alt', true, false],
  ['sentadilla-smith', 'Sentadeta a la Smith', 'quadriceps', 'knee', 'dempeus', 'alt', true, false],
  ['sentadilla-barra', 'Sentadeta amb barra', 'quadriceps', 'knee', 'dempeus', 'alt', true, false],
  ['sentadilla-goblet', 'Sentadeta goblet', 'quadriceps', 'knee', 'dempeus', 'mitja', true, true],
  ['extensio-quadriceps', 'Extensió de quàdriceps', 'quadriceps', 'isolation', 'assegut', 'baix', false, true],
  ['zancades', 'Gambades / zancades', 'quadriceps', 'knee', 'dempeus', 'alt', true, false],
  ['bulgara', 'Sentadeta búlgara', 'quadriceps', 'knee', 'dempeus', 'alt', true, false],

  // Isquios
  ['curl-femoral-assegut', 'Curl femoral assegut', 'isquios', 'isolation', 'assegut', 'baix', false, true],
  ['curl-femoral-estirat', 'Curl femoral estirat', 'isquios', 'isolation', 'estirat', 'baix', false, true],
  ['pes-mort-romanes', 'Pes mort romanès amb manuelles', 'isquios', 'hip', 'dempeus', 'mitja', true, true],
  ['pes-mort-barra', 'Pes mort amb barra', 'isquios', 'hip', 'dempeus', 'alt', true, false],

  // Glutis / cama dominant maluc
  ['hip-thrust-maquina', 'Hip thrust a màquina', 'glutis', 'hip', 'assegut', 'baix', true, true],
  ['hip-thrust-barra', 'Hip thrust amb barra', 'glutis', 'hip', 'estirat', 'baix', true, false],
  ['pont-gluti', 'Pont de glutis a terra', 'glutis', 'hip', 'estirat', 'baix', true, true],
  ['abductors', 'Abductors a màquina', 'glutis', 'isolation', 'assegut', 'baix', false, true],
  ['adductors', 'Adductors a màquina', 'quadriceps', 'isolation', 'assegut', 'baix', false, true],
  ['patada-gluti', 'Patada de glutis a màquina/politja', 'glutis', 'isolation', 'dempeus', 'mitja', false, false],

  // Bessons
  ['bessons-asseguts', 'Bessons asseguts (soli)', 'bessons', 'isolation', 'assegut', 'mitja', false, true],
  ['bessons-premsa', 'Bessons a la premsa', 'bessons', 'isolation', 'assegut', 'mitja', false, true],
  ['bessons-dempeus', 'Bessons dempeus amb càrrega', 'bessons', 'isolation', 'dempeus', 'alt', false, false],

  // Bíceps
  ['curl-biceps-maquina', 'Curl de bíceps a màquina', 'biceps', 'isolation', 'assegut', 'baix', false, true],
  ['curl-biceps-politja', 'Curl de bíceps a politja', 'biceps', 'isolation', 'dempeus', 'mitja', false, true],
  ['curl-manuelles-inclinat', 'Curl amb manuelles en banc inclinat', 'biceps', 'isolation', 'assegut', 'baix', false, true],
  ['curl-martell', 'Curl martell assegut', 'biceps', 'isolation', 'assegut', 'baix', false, true],
  ['curl-scott', 'Curl Scott (predicador)', 'biceps', 'isolation', 'assegut', 'baix', false, false],

  // Tríceps
  ['extensio-triceps-maquina', 'Extensió de tríceps a màquina', 'triceps', 'isolation', 'assegut', 'baix', false, true],
  ['triceps-politja', 'Extensió de tríceps a politja (corda)', 'triceps', 'isolation', 'dempeus', 'mitja', false, true],
  ['triceps-sobre-cap', 'Extensió de tríceps per sobre del cap a politja', 'triceps', 'isolation', 'dempeus', 'mitja', false, false],
  ['press-frances', 'Press francès amb barra Z', 'triceps', 'isolation', 'estirat', 'baix', false, false],

  // Core
  ['crunch-maquina', 'Crunch a màquina', 'core', 'core', 'assegut', 'baix', false, true],
  ['crunch-politja', 'Crunch a politja (agenollat)', 'core', 'core', 'dempeus', 'baix', false, true],
  ['elevacio-cames-estirat', 'Elevació de cames estirat', 'core', 'core', 'estirat', 'baix', false, true],
  ['planxa', 'Planxa', 'core', 'core', 'estirat', 'baix', false, true],
  ['pallof', 'Press Pallof a politja', 'core', 'core', 'dempeus', 'mitja', false, false],
  ['rotacio-tronc-maquina', 'Rotació de tronc a màquina', 'core', 'core', 'assegut', 'baix', false, false],
  ['dead-bug', 'Dead bug', 'core', 'core', 'estirat', 'baix', false, true],
];

export function buildCatalog(): Exercise[] {
  return DEFS.map(([id, name, muscleGroup, pattern, position, footImpact, isCompound, available]) => ({
    id, name, muscleGroup, pattern, position, footImpact, isCompound,
    available: available ?? false,
    preference: 'neutral',
    isCustom: false,
  }));
}

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  pit: 'Pit', esquena: 'Esquena', espatlles: 'Espatlles', quadriceps: 'Quàdriceps',
  isquios: 'Isquiotibials', glutis: 'Glutis', bessons: 'Bessons', biceps: 'Bíceps',
  triceps: 'Tríceps', core: 'Core',
};

export const MUSCLE_ORDER: MuscleGroup[] = [
  'pit', 'esquena', 'espatlles', 'quadriceps', 'isquios', 'glutis', 'bessons', 'biceps', 'triceps', 'core',
];

export const PATTERN_LABEL: Record<Pattern, string> = {
  push_h: 'Empènyer horitzontal',
  push_v: 'Empènyer vertical',
  pull_h: 'Estirar horitzontal',
  pull_v: 'Estirar vertical',
  knee: 'Cama dominant genoll',
  hip: 'Cama dominant maluc',
  isolation: 'Aïllament',
  core: 'Core',
};

export const PATTERN_SHORT: Record<Pattern, string> = {
  push_h: 'Emp. H', push_v: 'Emp. V', pull_h: 'Est. H', pull_v: 'Est. V',
  knee: 'Genoll', hip: 'Maluc', isolation: 'Aïllament', core: 'Core',
};

export const POSITION_LABEL: Record<Position, string> = { assegut: 'Assegut', estirat: 'Estirat', dempeus: 'Dempeus' };
export const FOOT_LABEL: Record<FootImpact, string> = { baix: 'Baix', mitja: 'Mitjà', alt: 'Alt' };

/** Grups musculars de tren inferior → increment per defecte més gran */
export const LOWER_GROUPS: MuscleGroup[] = ['quadriceps', 'isquios', 'glutis', 'bessons'];

export const WARMUP: { id: string; label: string }[] = [
  { id: 'bici', label: '5 min de bici estàtica o el·líptica suau (millor que la cinta, pel peu)' },
  { id: 'mobilitat', label: 'Mobilitat: cercles de braços, rotacions de maluc, gat-vaca' },
  { id: 'turmell', label: 'Mobilitat de turmell i dits del peu (assegut, 30 s per peu)' },
  { id: 'aproximacio', label: "1–2 sèries d'aproximació lleugeres al primer exercici" },
];

export const COOLDOWN: { id: string; label: string }[] = [
  { id: 'bessons', label: 'Estirament de bessons a la paret, cama estirada (2 × 30 s per cama)' },
  { id: 'soli', label: 'Estirament de soli a la paret, genoll flexionat (2 × 30 s per cama)' },
  { id: 'fascia', label: 'Estirament de la fàscia plantar: estirar els dits cap amunt amb la mà (3 × 20 s)' },
  { id: 'pilota', label: 'Massatge amb pilota sota la planta del peu (1–2 min per peu)' },
  { id: 'toalla', label: 'Opcional: arrossegar una tovallola amb els dits del peu (1 min)' },
];
