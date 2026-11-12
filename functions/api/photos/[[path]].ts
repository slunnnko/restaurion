import { jsonResponse } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/** GET /api/photos/jobs/<jobId>/<uuid>.<ext> → public image (keys are unique, so the response is immutable) */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { env, params } = context;
  if (!env.JOB_PHOTOS) return jsonResponse({ error: 'Nahrávání fotek zatím není zapnuté.' }, 503);

  const parts = Array.isArray(params.path) ? params.path : [String(params.path ?? '')];
  const key = parts.join('/');
  if (!key.startsWith('jobs/') || parts.some((p) => p === '' || p === '.' || p === '..')) {
    return jsonResponse({ error: 'Fotka nenalezena.' }, 404);
  }

  const object = await env.JOB_PHOTOS.get(key);
  if (!object) return jsonResponse({ error: 'Fotka nenalezena.' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
    },
  });
}
