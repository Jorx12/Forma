import { db, getMeta, SCHEMA_VERSION, setMeta } from '../db/db';
import { todayISO } from './dates';

export interface Backup {
  app: 'forma';
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

const TABLES = ['profile', 'weighIns', 'exercises', 'routines', 'sessions', 'meta', 'bodyMeasurements', 'swims', 'schedule', 'activities', 'weeklyReviews'] as const;
const META_SKIP = new Set(['restTimer', 'lastExportAt']);

export async function buildBackup(): Promise<Backup> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    let rows = await db.table(t).toArray();
    if (t === 'meta') rows = rows.filter((r: { key: string }) => !META_SKIP.has(r.key));
    data[t] = rows;
  }
  return { app: 'forma', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
}

/** Exporta: al mòbil fa servir el full de compartir (Desa a Fitxers, iCloud…); si no, descarrega el fitxer */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const backup = await buildBackup();
  const name = `forma-copia-${todayISO()}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  let result: 'shared' | 'downloaded' | 'cancelled' = 'downloaded';
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Còpia de seguretat de Forma' });
      result = 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      download(blob, name);
    }
  } else download(blob, name);
  await setMeta('lastExportAt', new Date().toISOString());
  return result;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function parseBackup(text: string): Backup {
  const b = JSON.parse(text) as Backup;
  if (b?.app !== 'forma' || typeof b.data !== 'object') throw new Error('Aquest fitxer no és una còpia de Forma.');
  if (b.schemaVersion > SCHEMA_VERSION) throw new Error('La còpia és d\'una versió més nova de l\'app. Actualitza-la primer.');
  return b;
}

/** Substitueix totes les dades per les de la còpia */
export async function importBackup(b: Backup) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = b.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows);
    }
  });
  await setMeta('lastExportAt', b.exportedAt);
}

/** Dies des de l'última exportació (o des del primer ús si no s'ha exportat mai) */
export async function daysSinceExport(): Promise<number> {
  const last = (await getMeta<string>('lastExportAt')) ?? (await getMeta<string>('firstUseAt'));
  if (!last) return 0;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
}
