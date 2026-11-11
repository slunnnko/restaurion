import { jsonResponse, noDb, requireAdmin } from '../../../_shared.ts';
import type { PagesContext } from '../../../_shared.ts';

/** GET /api/admin/licence-requests/:id/document → soubor inline (jen správce; po rozhodnutí je smazaný → 404) */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const auth = await requireAdmin(request, env, env.DB);
  if ('response' in auth) return auth.response;
  if (!env.LICENCE_DOCS) return jsonResponse({ error: 'Úložiště dokumentů zatím není připojené (binding LICENCE_DOCS).' }, 503);

  const row = await env.DB
    .prepare(`SELECT object_key, content_type FROM licence_requests WHERE id = ? AND status = 'pending'`)
    .bind(String(params.id))
    .first<{ object_key: string | null; content_type: string }>();
  const object = row?.object_key ? await env.LICENCE_DOCS.get(row.object_key) : null;
  if (!row || !object) return jsonResponse({ error: 'Dokument nenalezen.' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': row.content_type,
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
