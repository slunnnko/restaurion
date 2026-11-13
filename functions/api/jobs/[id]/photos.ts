import { JOB_SELECT, jsonResponse, mapJobRow, noDb, rateLimit } from '../../_shared.ts';
import type { JobRow, PagesContext } from '../../_shared.ts';
import { MAX_JOB_PHOTOS, MAX_PHOTO_BYTES, PHOTO_EXT, PHOTO_PREFIX, detectPhotoType, readBodyWithLimit } from '../../_lib/photo.ts';
import { NO_BUCKET, loadOwnJob } from '../../_lib/jobPhotos.ts';

const LIMIT_REACHED = `Inzerát už má ${MAX_JOB_PHOTOS} fotek.`;

/**
 * POST /api/jobs/:id/photos (owner; raw image bytes, Content-Type is ignored) → { job } with the new photo added
 * JPEG / PNG / WebP by magic bytes, max 5 MB, max 6 photos per listing (409). R2 put first, then D1; a failed or
 * refused INSERT deletes the new object.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  if (!env.JOB_PHOTOS) return jsonResponse({ error: NO_BUCKET }, 503);
  const bucket = env.JOB_PHOTOS;

  const loaded = await loadOwnJob(context);
  if (loaded.response) return loaded.response;
  const { auth, db } = loaded;
  const jobId = String(params.id);

  const count = await db.prepare(`SELECT COUNT(*) AS n FROM job_photos WHERE job_id = ?`).bind(jobId).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_JOB_PHOTOS) return jsonResponse({ error: LIMIT_REACHED }, 409);

  if (!(await rateLimit(db, 'photo-user', auth.userId, 30, 60))) {
    return jsonResponse({ error: 'Příliš mnoho nahrání. Zkus to za hodinu.' }, 429);
  }

  const bytes = await readBodyWithLimit(request, MAX_PHOTO_BYTES);
  if (!bytes) return jsonResponse({ error: 'Fotka je větší než 5 MB.' }, 413);
  const type = detectPhotoType(bytes);
  if (!type) return jsonResponse({ error: 'Povolené formáty jsou JPEG, PNG a WebP.' }, 400);

  const key = `jobs/${jobId}/${crypto.randomUUID()}.${PHOTO_EXT[type]}`;
  try {
    await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
    try {
      // The count is re-checked inside the INSERT so two parallel uploads cannot pass the limit.
      const res = await db
        .prepare(
          `INSERT INTO job_photos (id, job_id, url, position)
           SELECT ?, ?, ?, COALESCE((SELECT MAX(position) + 1 FROM job_photos WHERE job_id = ?), 0)
           WHERE (SELECT COUNT(*) FROM job_photos WHERE job_id = ?) < ?`,
        )
        .bind(crypto.randomUUID().replace(/-/g, ''), jobId, `${PHOTO_PREFIX}${key}`, jobId, jobId, MAX_JOB_PHOTOS)
        .run();
      if (!res.meta?.changes) {
        await bucket.delete(key).catch(() => undefined);
        return jsonResponse({ error: LIMIT_REACHED }, 409);
      }
      await db.prepare(`UPDATE jobs SET updated_at = datetime('now') WHERE id = ?`).bind(jobId).run();
    } catch (err) {
      await bucket.delete(key).catch(() => undefined);
      throw err;
    }
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při POST /api/jobs/:id/photos:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit fotku.' }, 500);
  }
}
