import { JOB_SELECT, addDays, badJson, jsonResponse, mapJobRow, noDb, readJson, requireUser } from '../_shared.ts';
import type { JobRow, PagesContext } from '../_shared.ts';
import { str, validateDateRange, validationResponse } from '../_lib/validate.ts';
import type { FieldErrors } from '../_lib/validate.ts';

/** PATCH /api/jobs/:id (jen zadavatel): title, description, budgetNote, dateFrom, dateTo, status:'closed' */
export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const jobId = String(params.id);

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badJson();

  const existing = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
  if (!existing) return jsonResponse({ error: 'Zakázka nenalezena.' }, 404);
  if (existing.author_id !== auth.userId) return jsonResponse({ error: 'Zakázku může upravit jen její zadavatel.' }, 403);

  const errors: FieldErrors = {};
  const sets: string[] = [];
  const binds: unknown[] = [];

  if ('title' in body) {
    const title = str(body.title);
    if (title.length < 5 || title.length > 120) errors.title = 'Název musí mít 5 až 120 znaků.';
    sets.push('title = ?');
    binds.push(title);
  }
  if ('description' in body) {
    const description = str(body.description);
    if (description.length > 2000) errors.description = 'Popis může mít nejvýše 2000 znaků.';
    sets.push('description = ?');
    binds.push(description);
  }
  if ('budgetNote' in body) {
    const budgetNote = str(body.budgetNote) || 'Dle dohody';
    if (budgetNote.length > 120) errors.budgetNote = 'Odměna může mít nejvýše 120 znaků.';
    sets.push('budget_note = ?');
    binds.push(budgetNote);
  }
  if ('dateFrom' in body || 'dateTo' in body) {
    const dateFrom = 'dateFrom' in body ? body.dateFrom : existing.date_from;
    const dateTo = 'dateTo' in body ? body.dateTo : existing.date_to;
    validateDateRange(dateFrom, dateTo, errors, { checkFrom: 'dateFrom' in body });
    if (!errors.dateFrom && !errors.dateTo) {
      sets.push('date_from = ?', 'start_date = ?', 'date_to = ?', 'expires_at = ?');
      binds.push(dateFrom, dateFrom, dateTo, addDays(dateTo as string, 14));
    }
  }
  if ('status' in body) {
    if (body.status !== 'closed') errors.status = 'Povolená hodnota je pouze „closed“.';
    else {
      sets.push(`status = 'archived'`);
    }
  }
  if (Object.keys(errors).length > 0) return validationResponse(errors);

  try {
    const closing = body.status === 'closed' && existing.status === 'active';
    // The update and all job_closed notifications go in ONE batch (atomic).
    const statements = [];
    if (sets.length > 0) {
      statements.push(
        db.prepare(`UPDATE jobs SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...binds, jobId)
      );
    }
    if (closing) {
      const engagements = await db
        .prepare(`SELECT id, worker_id FROM engagements WHERE job_id = ? AND status IN ('pending', 'accepted')`)
        .bind(jobId)
        .all<{ id: string; worker_id: string }>();
      for (const e of engagements.results) {
        statements.push(
          db
            .prepare(`INSERT INTO notifications (id, profile_id, type, job_id, engagement_id) VALUES (?, ?, 'job_closed', ?, ?)`)
            .bind(`n-${crypto.randomUUID()}`, e.worker_id, jobId, e.id)
        );
      }
    }
    if (statements.length > 0) await db.batch(statements);
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při PATCH /api/jobs/:id:', err);
    return jsonResponse({ error: 'Nepodařilo se upravit zakázku.' }, 500);
  }
}
