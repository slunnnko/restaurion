import { JOB_SELECT, jsonResponse, mapJobRow, noDb } from '../../../_shared.ts';
import type { JobRow, PagesContext } from '../../../_shared.ts';
import { NO_BUCKET, loadOwnJob, removeObject } from '../../../_lib/jobPhotos.ts';
import { LEGACY_PHOTO_ID } from '../../../../../src/lib/photos.ts';
import { MAX_PHOTO_CAPTION } from '../../../../../src/lib/limits.ts';
import { validationResponse } from '../../../_lib/validate.ts';

/** DELETE /api/jobs/:id/photos/:photoId (owner) → { job } without that photo; the R2 object is deleted best effort. */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { env, params } = context;
  if (!env.DB) return noDb();
  if (!env.JOB_PHOTOS) return jsonResponse({ error: NO_BUCKET }, 503);

  const loaded = await loadOwnJob(context);
  if (loaded.response) return loaded.response;
  const { auth, existing, db } = loaded;

  const jobId = String(params.id);
  const photoId = String(params.photoId);
  try {
    const photo = await db
      .prepare(`SELECT id, url FROM job_photos WHERE id = ? AND job_id = ?`)
      .bind(photoId, jobId)
      .first<{ id: string; url: string }>();
    // A legacy photo (image_url without a job_photos row) is addressed by the shared fake id.
    const legacyUrl = !photo && photoId === LEGACY_PHOTO_ID ? existing.image_url : null;
    const url = photo?.url ?? legacyUrl;
    if (!url) return jsonResponse({ error: 'Fotka nenalezena.' }, 404);
    // One batch: the row delete and the image_url / updated_at update land together. image_url is cleared when it
    // equals the deleted URL, or it would reappear as the fallback.
    await db.batch([
      ...(photo ? [db.prepare(`DELETE FROM job_photos WHERE id = ? AND job_id = ?`).bind(photoId, jobId)] : []),
      db
        .prepare(`UPDATE jobs SET updated_at = datetime('now'), image_url = CASE WHEN image_url = ? THEN NULL ELSE image_url END WHERE id = ?`)
        .bind(url, jobId),
    ]);
    await removeObject(env, url);
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při DELETE /api/jobs/:id/photos/:photoId:', err);
    return jsonResponse({ error: 'Nepodařilo se odebrat fotku.' }, 500);
  }
}

/** PATCH /api/jobs/:id/photos/:photoId { caption } (owner, D47) → { job }; trimmed, max 200 characters, empty clears it. */
export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const { env, params, request } = context;
  if (!env.DB) return noDb();

  const loaded = await loadOwnJob(context);
  if (loaded.response) return loaded.response;
  const { auth, db } = loaded;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Neplatné tělo požadavku.' }, 400);
  }
  const raw = (body as { caption?: unknown } | null)?.caption;
  if (typeof raw !== 'string') return validationResponse({ caption: 'Popisek musí být text.' });
  const caption = raw.trim();
  if (caption.length > MAX_PHOTO_CAPTION) return validationResponse({ caption: `Popisek může mít nejvýše ${MAX_PHOTO_CAPTION} znaků.` });

  const jobId = String(params.id);
  const photoId = String(params.photoId);
  try {
    // The legacy fake id has no job_photos row, so it falls through to 404 here.
    const photo = await db.prepare(`SELECT id FROM job_photos WHERE id = ? AND job_id = ?`).bind(photoId, jobId).first<{ id: string }>();
    if (!photo) return jsonResponse({ error: 'Fotka nenalezena.' }, 404);
    await db.batch([
      db.prepare(`UPDATE job_photos SET caption = ? WHERE id = ? AND job_id = ?`).bind(caption === '' ? null : caption, photoId, jobId),
      db.prepare(`UPDATE jobs SET updated_at = datetime('now') WHERE id = ?`).bind(jobId),
    ]);
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při PATCH /api/jobs/:id/photos/:photoId:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit popisek.' }, 500);
  }
}
