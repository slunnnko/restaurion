import { jsonResponse, noDb, requireAdmin } from '../../_shared.ts';
import type { PagesContext } from '../../_shared.ts';
import { purgeDocument } from '../../_lib/licence.ts';
import type { AdminLicenceRequest } from '../../../../src/types/api.ts';

/** GET /api/admin/licence-requests → { requests } čekající žádosti (jen správce, jinak 403) */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const auth = await requireAdmin(request, env, env.DB);
  if ('response' in auth) return auth.response;

  // Sweep: decided/replaced rows whose R2 delete failed earlier still carry an object_key.
  const stale = await env.DB
    .prepare(`SELECT id, object_key FROM licence_requests WHERE status <> 'pending' AND object_key IS NOT NULL LIMIT 20`)
    .all<{ id: string; object_key: string }>();
  for (const s of stale.results) await purgeDocument(env.DB, env.LICENCE_DOCS, s.id, s.object_key);

  const rows = await env.DB
    .prepare(
      `SELECT r.id, r.licence_number, r.content_type, r.created_at, p.name AS p_name, p.email AS p_email
       FROM licence_requests r JOIN profiles p ON p.id = r.profile_id
       WHERE r.status = 'pending' ORDER BY r.created_at LIMIT 100`
    )
    .all<{ id: string; licence_number: string; content_type: string; created_at: string; p_name: string; p_email: string }>();
  const requests: AdminLicenceRequest[] = rows.results.map((r) => ({
    id: r.id,
    profileName: r.p_name,
    email: r.p_email,
    licenceNumber: r.licence_number,
    contentType: r.content_type,
    createdAt: r.created_at,
  }));
  return jsonResponse({ requests });
}
