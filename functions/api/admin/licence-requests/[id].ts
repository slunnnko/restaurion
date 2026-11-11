import { badJson, jsonResponse, noDb, readJson, requireAdmin } from '../../_shared.ts';
import type { PagesContext } from '../../_shared.ts';
import { str } from '../../_lib/validate.ts';
import { mapLicenceRequest, purgeDocument } from '../../_lib/licence.ts';
import type { RequestRow } from '../../_lib/licence.ts';

/**
 * POST /api/admin/licence-requests/:id {decision: 'approve'|'reject', note?} (jen správce)
 * approve: licence_verified = 1 a skupina 'licensed' (firma zůstane firmou). approve zkopíruje číslo z žádosti do profilu. Obě rozhodnutí smažou dokument z R2 (selhání: object_key zůstane, uklidí GET seznamu).
 * Typ upozornění pro žadatele zatím není: CHECK na notifications.type by vyžadoval přestavbu tabulky,
 * stav vidí žadatel v dialogu „Ověřit licenci MK ČR“ (GET /api/licence/request).
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const auth = await requireAdmin(request, env, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<{ decision?: unknown; note?: unknown }>(request);
  if (!body) return badJson();
  if (body.decision !== 'approve' && body.decision !== 'reject') {
    return jsonResponse({ error: 'Neznámé rozhodnutí.', fieldErrors: { decision: 'approve nebo reject' } }, 400);
  }
  const note = str(body.note);
  if (note.length > 300) return jsonResponse({ error: 'Poznámka může mít nejvýše 300 znaků.', fieldErrors: { note: 'Nejvýše 300 znaků.' } }, 400);

  const id = String(params.id);
  const row = await db
    .prepare(`SELECT id, profile_id, object_key, status FROM licence_requests WHERE id = ?`)
    .bind(id)
    .first<{ id: string; profile_id: string; object_key: string | null; status: string }>();
  if (!row) return jsonResponse({ error: 'Žádost nenalezena.' }, 404);
  if (row.status !== 'pending') return jsonResponse({ error: 'Žádost už je rozhodnutá.' }, 409);

  const approve = body.decision === 'approve';
  try {
    const statements = [
      db
        .prepare(
          `UPDATE licence_requests SET status = ?, note = ?, decided_at = datetime('now') WHERE id = ? AND status = 'pending'`
        )
        .bind(approve ? 'approved' : 'rejected', note || null, id),
    ];
    if (approve) {
      // Runs after the guarded UPDATE above in the same batch: only when this request is now approved.
      statements.push(
        db
          .prepare(
            `UPDATE profiles SET licence_number = (SELECT licence_number FROM licence_requests WHERE id = ?), licence_verified = 1,
                    directory_group = CASE WHEN directory_group = 'firm' THEN 'firm' ELSE 'licensed' END,
                    updated_at = datetime('now')
             WHERE id = ? AND EXISTS (SELECT 1 FROM licence_requests WHERE id = ? AND status = 'approved')`
          )
          .bind(id, row.profile_id, id)
      );
    }
    const results = await db.batch<{ meta?: { changes?: number } }>(statements);
    if (!results[0]?.meta?.changes) return jsonResponse({ error: 'Žádost už je rozhodnutá.' }, 409);

    const documentDeleted = await purgeDocument(db, env.LICENCE_DOCS, id, row.object_key);

    const updated = await db
      .prepare(`SELECT id, status, licence_number, note, created_at, decided_at FROM licence_requests WHERE id = ?`)
      .bind(id)
      .first<RequestRow>();
    return jsonResponse({ request: mapLicenceRequest(updated as RequestRow), documentDeleted });
  } catch (err) {
    console.error('Chyba při POST /api/admin/licence-requests/:id:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit rozhodnutí.' }, 500);
  }
}
