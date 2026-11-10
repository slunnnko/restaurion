import { jsonResponse, noDb, requireUser } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/** DELETE /api/availability/:id → jen vlastník bloku (jinak 403) */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const auth = await requireUser(request, env.DB);
  if ('response' in auth) return auth.response;

  const block = await env.DB
    .prepare(`SELECT profile_id FROM unavailability_blocks WHERE id = ?`)
    .bind(String(params.id))
    .first<{ profile_id: string }>();
  if (!block) return jsonResponse({ error: 'Blok nenalezen.' }, 404);
  if (block.profile_id !== auth.userId) return jsonResponse({ error: 'Blok patří jinému uživateli.' }, 403);

  await env.DB.prepare(`DELETE FROM unavailability_blocks WHERE id = ?`).bind(String(params.id)).run();
  return jsonResponse({ ok: true });
}
