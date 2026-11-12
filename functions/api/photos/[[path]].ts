import { jsonResponse, noDb } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { PHOTO_PREFIX } from '../_lib/photo.ts';

/**
 * GET /api/photos/jobs/<jobId>/<uuid>.<ext> → image, only while the job is not deleted and still points at this key.
 * Cache is 1 day (not immutable) so the photo of a moderated listing disappears within a day.
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { env, params } = context;
  if (!env.JOB_PHOTOS) return jsonResponse({ error: 'Nahrávání fotek zatím není zapnuté.' }, 503);
  if (!env.DB) return noDb();

  const parts = Array.isArray(params.path) ? params.path : [String(params.path ?? '')];
  const key = parts.join('/');
  if (parts.length !== 3 || parts[0] !== 'jobs' || parts.some((p) => p === '' || p === '.' || p === '..')) {
    return jsonResponse({ error: 'Fotka nenalezena.' }, 404);
  }

  const live = await env.DB.prepare(`SELECT 1 AS ok FROM jobs WHERE id = ? AND visibility <> 'deleted' AND image_url = ?`)
    .bind(parts[1], `${PHOTO_PREFIX}${key}`)
    .first();
  if (!live) return jsonResponse({ error: 'Fotka nenalezena.' }, 404);

  const object = await env.JOB_PHOTOS.get(key);
  if (!object) return jsonResponse({ error: 'Fotka nenalezena.' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
    },
  });
}
