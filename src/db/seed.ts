import { buildCatalog } from '../data/catalog';
import { DEFAULT_PROFILE } from '../data/defaults';
import { db } from './db';

/** Crea el perfil i el catàleg el primer cop que s'obre l'app */
export async function ensureSeed() {
  await db.transaction('rw', db.profile, db.exercises, db.meta, async () => {
    if (!(await db.meta.get('firstUseAt'))) await db.meta.put({ key: 'firstUseAt', value: new Date().toISOString() });
    if (!(await db.profile.get('me'))) await db.profile.put(DEFAULT_PROFILE);
    if ((await db.exercises.count()) === 0) await db.exercises.bulkPut(buildCatalog());
  });
  // Demana emmagatzematge persistent perquè el navegador no esborri les dades
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
}
