// Společné části endpointů fotek inzerátu (D45): kontrola vlastníka a mazání objektu z R2.

import { jsonResponse, requireUser } from '../_shared.ts';
import type { D1Database, PagesContext } from '../_shared.ts';
import { photoKeyFromUrl } from './photo.ts';

export const NO_BUCKET = 'Nahrávání fotek zatím není zapnuté.';

/** Owner checks shared by POST and DELETE: 401 / 404 / 403 / 409 (closed job). */
export type LoadedJob =
  | { response: Response }
  | { response?: undefined; auth: { userId: string }; existing: { image_url: string | null }; db: D1Database };

export async function loadOwnJob(context: PagesContext): Promise<LoadedJob> {
  const { request, env, params } = context;
  const db = env.DB!;
  const auth = await requireUser(request, db);
  if ('response' in auth) return { response: auth.response };
  const existing = await db
    .prepare(`SELECT author_id, status, visibility, image_url FROM jobs WHERE id = ?`)
    .bind(String(params.id))
    .first<{ author_id: string; status: string; visibility: string; image_url: string | null }>();
  if (!existing || existing.visibility === 'deleted') return { response: jsonResponse({ error: 'Zakázka nenalezena.' }, 404) };
  if (existing.author_id !== auth.userId) {
    return { response: jsonResponse({ error: 'Fotky může měnit jen zadavatel inzerátu.' }, 403) };
  }
  if (existing.status !== 'active') return { response: jsonResponse({ error: 'Ukončený inzerát nelze upravit.' }, 409) };
  return { auth, existing, db };
}

/** Best effort: a failed R2 delete leaves an orphaned object, never a broken listing. */
export async function removeObject(env: PagesContext['env'], url: string | null): Promise<void> {
  const key = photoKeyFromUrl(url);
  if (!key || !env.JOB_PHOTOS) return;
  try {
    await env.JOB_PHOTOS.delete(key);
  } catch (err) {
    console.error('R2 delete failed, object stays orphaned:', key, err);
  }
}
