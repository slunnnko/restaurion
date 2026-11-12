import { JOB_SELECT, jsonResponse, mapJobRow, noDb, rateLimit, requireUser } from '../../_shared.ts';
import type { D1Database, JobRow, PagesContext } from '../../_shared.ts';
import { MAX_PHOTO_BYTES, PHOTO_EXT, PHOTO_PREFIX, detectPhotoType, photoKeyFromUrl, readBodyWithLimit } from '../../_lib/photo.ts';

const NO_BUCKET = 'Nahrávání fotek zatím není zapnuté.';

/** Owner checks shared by POST and DELETE: 401 / 404 / 403 / 409 (closed job). */
type Loaded =
  | { response: Response }
  | { response?: undefined; auth: { userId: string }; existing: JobRow; db: D1Database };

async function loadOwnJob(context: PagesContext): Promise<Loaded> {
  const { request, env, params } = context;
  const db = env.DB!;
  const auth = await requireUser(request, db);
  if ('response' in auth) return { response: auth.response };
  const existing = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(String(params.id)).first<JobRow>();
  if (!existing || existing.visibility === 'deleted') return { response: jsonResponse({ error: 'Zakázka nenalezena.' }, 404) };
  if (existing.author_id !== auth.userId) {
    return { response: jsonResponse({ error: 'Fotku může měnit jen zadavatel inzerátu.' }, 403) };
  }
  if (existing.status !== 'active') return { response: jsonResponse({ error: 'Ukončený inzerát nelze upravit.' }, 409) };
  return { auth, existing, db };
}

async function removeObject(env: PagesContext['env'], imageUrl: string | null): Promise<void> {
  const key = photoKeyFromUrl(imageUrl);
  if (!key || !env.JOB_PHOTOS) return;
  try {
    await env.JOB_PHOTOS.delete(key);
  } catch (err) {
    console.error('R2 delete failed, object stays orphaned:', key, err);
  }
}

/**
 * POST /api/jobs/:id/photo (owner; raw image bytes, Content-Type is ignored) → { job }
 * JPEG / PNG / WebP by magic bytes, max 5 MB. R2 put first, then D1; a failed UPDATE deletes the new object.
 * The previous photo (if it lived under /api/photos/) is deleted afterwards, best effort.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  if (!env.JOB_PHOTOS) return jsonResponse({ error: NO_BUCKET }, 503);
  const bucket = env.JOB_PHOTOS;

  const loaded = await loadOwnJob(context);
  if (loaded.response) return loaded.response;
  const { auth, existing, db } = loaded;

  if (!(await rateLimit(db, 'photo-user', auth.userId, 30, 60))) {
    return jsonResponse({ error: 'Příliš mnoho nahrání. Zkus to za hodinu.' }, 429);
  }

  const bytes = await readBodyWithLimit(request, MAX_PHOTO_BYTES);
  if (!bytes) return jsonResponse({ error: 'Fotka je větší než 5 MB.' }, 413);
  const type = detectPhotoType(bytes);
  if (!type) return jsonResponse({ error: 'Povolené formáty jsou JPEG, PNG a WebP.' }, 400);

  const jobId = String(params.id);
  const key = `jobs/${jobId}/${crypto.randomUUID()}.${PHOTO_EXT[type]}`;
  try {
    await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
    try {
      await db
        .prepare(`UPDATE jobs SET image_url = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(`${PHOTO_PREFIX}${key}`, jobId)
        .run();
    } catch (err) {
      await bucket.delete(key).catch(() => undefined);
      throw err;
    }
    await removeObject(env, existing.image_url);
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při POST /api/jobs/:id/photo:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit fotku.' }, 500);
  }
}

/** DELETE /api/jobs/:id/photo (owner) → { job } without imageUrl; the R2 object is deleted best effort. */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { env, params } = context;
  if (!env.DB) return noDb();
  if (!env.JOB_PHOTOS) return jsonResponse({ error: NO_BUCKET }, 503);

  const loaded = await loadOwnJob(context);
  if (loaded.response) return loaded.response;
  const { auth, existing, db } = loaded;

  const jobId = String(params.id);
  try {
    await db.prepare(`UPDATE jobs SET image_url = NULL, updated_at = datetime('now') WHERE id = ?`).bind(jobId).run();
    await removeObject(env, existing.image_url);
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při DELETE /api/jobs/:id/photo:', err);
    return jsonResponse({ error: 'Nepodařilo se odebrat fotku.' }, 500);
  }
}
