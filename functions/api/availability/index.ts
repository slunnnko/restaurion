import { badJson, jsonResponse, mapBlock, noDb, readJson, requireUser, todayUtc } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { str, validateDateRange, validationResponse } from '../_lib/validate.ts';
import type { FieldErrors } from '../_lib/validate.ts';

const MAX_FUTURE_BLOCKS = 50;

/** POST /api/availability {dateFrom, dateTo, note?} → 201 { block } */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badJson();

  const errors: FieldErrors = {};
  const note = str(body.note);
  if (note.length > 200) errors.note = 'Poznámka může mít nejvýše 200 znaků.';
  // A block may start in the past (already running absence) but must not end there.
  validateDateRange(body.dateFrom, body.dateTo, errors, { checkFrom: false });
  if (!errors.dateTo && (body.dateTo as string) < todayUtc()) errors.dateTo = 'Konec nemůže být v minulosti.';
  if (Object.keys(errors).length > 0) return validationResponse(errors);

  const count = await db
    .prepare(`SELECT COUNT(*) AS n FROM unavailability_blocks WHERE profile_id = ? AND date_to >= ?`)
    .bind(auth.userId, todayUtc())
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_FUTURE_BLOCKS) {
    return jsonResponse({ error: `Můžete mít nejvýše ${MAX_FUTURE_BLOCKS} budoucích bloků nedostupnosti.` }, 409);
  }

  const id = `b-${crypto.randomUUID().slice(0, 8)}`;
  await db
    .prepare(`INSERT INTO unavailability_blocks (id, profile_id, date_from, date_to, note) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, auth.userId, body.dateFrom, body.dateTo, note || null)
    .run();
  return jsonResponse(
    { block: mapBlock({ id, date_from: body.dateFrom as string, date_to: body.dateTo as string, note: note || null }) },
    201
  );
}
