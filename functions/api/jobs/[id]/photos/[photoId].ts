import { JOB_SELECT, jsonResponse, mapJobRow, noDb } from '../../../_shared.ts';
import type { JobRow, PagesContext } from '../../../_shared.ts';
import { NO_BUCKET, loadOwnJob, removeObject } from '../../../_lib/jobPhotos.ts';

/** DELETE /api/jobs/:id/photos/:photoId (owner) → { job } without that photo; the R2 object is deleted best effort. */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { env, params } = context;
  if (!env.DB) return noDb();
  if (!env.JOB_PHOTOS) return jsonResponse({ error: NO_BUCKET }, 503);

  const loaded = await loadOwnJob(context);
  if (loaded.response) return loaded.response;
  const { auth, db } = loaded;

  const jobId = String(params.id);
  const photoId = String(params.photoId);
  try {
    const photo = await db
      .prepare(`SELECT id, url FROM job_photos WHERE id = ? AND job_id = ?`)
      .bind(photoId, jobId)
      .first<{ id: string; url: string }>();
    if (!photo) return jsonResponse({ error: 'Fotka nenalezena.' }, 404);
    await db.prepare(`DELETE FROM job_photos WHERE id = ? AND job_id = ?`).bind(photoId, jobId).run();
    // A legacy image_url copied into job_photos by the migration is cleared too, or it would reappear as the fallback.
    await db
      .prepare(`UPDATE jobs SET updated_at = datetime('now'), image_url = CASE WHEN image_url = ? THEN NULL ELSE image_url END WHERE id = ?`)
      .bind(photo.url, jobId)
      .run();
    await removeObject(env, photo.url);
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při DELETE /api/jobs/:id/photos/:photoId:', err);
    return jsonResponse({ error: 'Nepodařilo se odebrat fotku.' }, 500);
  }
}
