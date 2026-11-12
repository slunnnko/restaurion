import {
  PROFILE_COLUMNS,
  getAuthenticatedUserId,
  jsonResponse,
  mapContact,
  mapPublicPerson,
  noDb,
  safeJsonParse,
} from './_shared.ts';
import type { PagesContext, ProfileRow } from './_shared.ts';
import { isDirectoryGroup } from './_lib/validate.ts';
import { normalizeText, toCraftIds } from '../../src/lib/crafts.ts';
import type { DirectoryEntry } from '../../src/types/api.ts';

const LIMIT = 200;
const SCAN_LIMIT = 2000;

/**
 * GET /api/directory?group=&craft=&region=&q= → { entries, total }. Veřejné; kontakty jen s relací.
 * Zveřejněn je profil s directory_visible=1, souhlasem a jménem o 3+ znacích. Dostupnost a blokace tu nejsou nikdy.
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  try {
    const url = new URL(request.url);
    const group = url.searchParams.get('group') ?? '';
    const craft = url.searchParams.get('craft') ?? '';
    const region = (url.searchParams.get('region') ?? '').trim();
    const q = normalizeText((url.searchParams.get('q') ?? '').trim());

    const where = [`directory_visible = 1`, `consent_at IS NOT NULL`, `LENGTH(TRIM(name)) >= 3`];
    const binds: unknown[] = [];
    if (group) {
      if (!isDirectoryGroup(group)) return jsonResponse({ entries: [], total: 0 });
      where.push('directory_group = ?');
      binds.push(group);
    }
    if (region && region !== 'Všechny regiony' && region !== 'Celá ČR') {
      where.push(`(region = ? OR region = 'Celá ČR')`);
      binds.push(region);
    }
    const rows = await db
      .prepare(
        `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE ${where.join(' AND ')}
         ORDER BY name COLLATE NOCASE LIMIT ${SCAN_LIMIT}`
      )
      .bind(...binds)
      .all<ProfileRow>();

    // Craft and text filters run here: crafts is JSON (legacy free text included) and LOWER() in SQLite ignores diacritics.
    const matching = rows.results.filter((r) => {
      if (craft && !toCraftIds(safeJsonParse<string[]>(r.crafts, [])).includes(craft)) return false;
      if (q && !normalizeText(`${r.name} ${r.experience_text ?? ''}`).includes(q)) return false;
      return true;
    });

    const loggedIn = Boolean(await getAuthenticatedUserId(request, db));
    const entries: DirectoryEntry[] = matching.slice(0, LIMIT).map((r) => ({
      ...mapPublicPerson(r),
      ...(loggedIn ? { contact: mapContact(r) } : {}),
    }));
    return jsonResponse({ entries, total: matching.length });
  } catch (err) {
    console.error('Chyba při GET /api/directory:', err);
    return jsonResponse({ error: 'Adresář se nepodařilo načíst.' }, 500);
  }
}
