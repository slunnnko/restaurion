import { jsonResponse, noDb, rateLimit, requireUser } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { MAX_DOC_BYTES, detectDocType } from '../_lib/files.ts';
import { str, validationResponse } from '../_lib/validate.ts';
import type { FieldErrors } from '../_lib/validate.ts';
import { mapLicenceRequest, purgeDocument } from '../_lib/licence.ts';
import type { RequestRow } from '../_lib/licence.ts';

/** GET /api/licence/request → { request } vlastní poslední žádost (nikdy ne dokument) */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const auth = await requireUser(request, env.DB);
  if ('response' in auth) return auth.response;
  const row = await env.DB
    .prepare(
      `SELECT id, status, licence_number, note, created_at, decided_at FROM licence_requests
       WHERE profile_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`
    )
    .bind(auth.userId)
    .first<RequestRow>();
  return jsonResponse({ request: row ? mapLicenceRequest(row) : null });
}

/**
 * POST /api/licence/request (multipart: licenceNumber, file) → 201 { request }
 * Sken rozhodnutí MK ČR (PDF/JPEG/PNG/HEIC do 10 MB, typ podle prvních bajtů). Jedna čekající žádost na uživatele:
 * nový soubor nahradí starý a ten se smaže z R2. Číslo povolení zůstává jen na žádosti; do profilu ho zkopíruje až schválení.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const bucket = env.LICENCE_DOCS;
  if (!bucket) return jsonResponse({ error: 'Úložiště dokumentů zatím není připojené (binding LICENCE_DOCS).' }, 503);

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  if (!(await rateLimit(db, 'licence-upload', auth.userId, 5, 60))) {
    return jsonResponse({ error: 'Příliš mnoho nahrání. Zkus to za hodinu.' }, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'Očekává se formulář s polem licenceNumber a souborem file.' }, 400);
  }

  const errors: FieldErrors = {};
  const licenceNumber = str(form.get('licenceNumber'));
  if (!licenceNumber) errors.licenceNumber = 'Vyplň číslo povolení.';
  else if (licenceNumber.length > 40) errors.licenceNumber = 'Nejvýše 40 znaků.';

  const file = form.get('file');
  let bytes: Uint8Array | null = null;
  let type: ReturnType<typeof detectDocType> = null;
  if (!file || typeof file === 'string') errors.file = 'Přilož soubor.';
  else if (file.size > MAX_DOC_BYTES) errors.file = 'Soubor je větší než 10 MB.';
  else {
    bytes = new Uint8Array(await file.arrayBuffer());
    type = detectDocType(bytes);
    if (!type) errors.file = 'Povolené formáty jsou PDF, JPEG, PNG a HEIC.';
  }
  if (Object.keys(errors).length > 0 || !bytes || !type) return validationResponse(errors);

  const id = `lr-${crypto.randomUUID()}`;
  const objectKey = `licence/${auth.userId}/${id}`;
  try {
    const old = await db
      .prepare(`SELECT id, object_key FROM licence_requests WHERE profile_id = ? AND status = 'pending'`)
      .bind(auth.userId)
      .all<{ id: string; object_key: string | null }>();

    await bucket.put(objectKey, bytes, { httpMetadata: { contentType: type } });
    try {
      await db.batch([
        db
          .prepare(`UPDATE licence_requests SET status = 'replaced', decided_at = datetime('now') WHERE profile_id = ? AND status = 'pending'`)
          .bind(auth.userId),
        db
          .prepare(
            `INSERT INTO licence_requests (id, profile_id, licence_number, object_key, content_type) VALUES (?, ?, ?, ?, ?)`
          )
          .bind(id, auth.userId, licenceNumber, objectKey, type),
      ]);
    } catch (err) {
      await bucket.delete(objectKey).catch(() => undefined);
      throw err;
    }
    for (const o of old.results) await purgeDocument(db, bucket, o.id, o.object_key);

    const row = await db
      .prepare(`SELECT id, status, licence_number, note, created_at, decided_at FROM licence_requests WHERE id = ?`)
      .bind(id)
      .first<RequestRow>();
    return jsonResponse({ request: mapLicenceRequest(row as RequestRow) }, 201);
  } catch (err) {
    console.error('Chyba při POST /api/licence/request:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit žádost o ověření.' }, 500);
  }
}
