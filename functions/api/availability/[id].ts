import { badJson, jsonResponse, mapBlock, noDb, readJson, requireUser } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { validateBlock, validationResponse } from '../_lib/validate.ts';

/** PUT /api/availability/:id {dateFrom, dateTo, note?} → { block } (owner only; foreign or missing id → 404) */
export async function onRequestPut(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const auth = await requireUser(request, env.DB);
  if ('response' in auth) return auth.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badJson();

  const id = String(params.id);
  const block = await env.DB
    .prepare(`SELECT profile_id FROM unavailability_blocks WHERE id = ?`)
    .bind(id)
    .first<{ profile_id: string }>();
  if (!block || block.profile_id !== auth.userId) return jsonResponse({ error: 'Blok nenalezen.' }, 404);

  const { errors, note } = validateBlock(body);
  if (Object.keys(errors).length > 0) return validationResponse(errors);

  const result = await env.DB
    .prepare(`UPDATE unavailability_blocks SET date_from = ?, date_to = ?, note = ? WHERE id = ? AND profile_id = ?`)
    .bind(body.dateFrom, body.dateTo, note || null, id, auth.userId)
    .run();
  if (!result.meta?.changes) return jsonResponse({ error: 'Blok nenalezen.' }, 404);
  const saved = await env.DB
    .prepare(`SELECT id, date_from, date_to, note FROM unavailability_blocks WHERE id = ? AND profile_id = ?`)
    .bind(id, auth.userId)
    .first<{ id: string; date_from: string; date_to: string; note: string | null }>();
  if (!saved) return jsonResponse({ error: 'Blok nenalezen.' }, 404);
  return jsonResponse({ block: mapBlock(saved) });
}

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
