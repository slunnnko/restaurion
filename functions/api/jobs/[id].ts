import {
  JOB_SELECT,
  addDays,
  badJson,
  jobClosedNotifications,
  jobRowCrafts,
  jsonResponse,
  mapJobRow,
  noDb,
  readJson,
  requireAdmin,
  requireUser,
  todayUtc,
} from '../_shared.ts';
import type { JobRow, PagesContext } from '../_shared.ts';
import {
  cityError,
  craftsError,
  formatBudgetNote,
  regionError,
  str,
  validCraftIds,
  validateDateRange,
  validateReward,
  validationResponse,
} from '../_lib/validate.ts';
import type { FieldErrors } from '../_lib/validate.ts';
import { notifyJobMatches } from '../_lib/data.ts';

/**
 * PATCH /api/jobs/:id (jen zadavatel): title, description, rewardType/rewardAmount/rewardCurrency/rewardScope, dateFrom, dateTo, crafts, region, city,
 * status:'closed', visibility:'public' (jen z 'direct': zveřejní na nástěnce a pošle párovací upozornění). Typ (jobType) je neměnný; ukončený inzerát je jen ke čtení (409).
 * Úprava NEPOSÍLÁ nové párovací upozornění (job_match jen při vytvoření a při zveřejnění přímého inzerátu).
 */
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
  if (!existing || existing.visibility === 'deleted') return jsonResponse({ error: 'Zakázka nenalezena.' }, 404);
  if (existing.author_id !== auth.userId) return jsonResponse({ error: 'Zakázku může upravit jen její zadavatel.' }, 403);

  if ('jobType' in body && body.jobType !== existing.job_type) {
    return jsonResponse({ error: 'Typ inzerátu nelze změnit.', fieldErrors: { jobType: 'Typ inzerátu nelze změnit.' } }, 400);
  }
  if (existing.status !== 'active') {
    const keys = Object.keys(body);
    // Closing stays idempotent: only status:'closed' on an archived job returns the current job.
    if (keys.length === 1 && body.status === 'closed') {
      return jsonResponse({ job: mapJobRow(existing, { userId: auth.userId }) });
    }
    return jsonResponse({ error: 'Ukončený inzerát nelze upravit.' }, 409);
  }

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
  if (!('rewardType' in body) && ('rewardAmount' in body || 'rewardCurrency' in body || 'rewardScope' in body)) {
    errors.rewardType = 'Vyber typ odměny.';
  } else if ('rewardType' in body) {
    // The four reward fields are always sent together; budget_note is derived from them.
    const reward = validateReward(body, errors);
    sets.push('budget_note = ?', 'reward_type = ?', 'reward_amount = ?', 'reward_currency = ?', 'reward_scope = ?');
    binds.push(formatBudgetNote(reward), reward.type, reward.amount, reward.currency, reward.scope);
  } else if ('budgetNote' in body) {
    // Legacy clients: free text, reward columns reset so the text keeps showing.
    const budgetNote = str(body.budgetNote) || 'Dle dohody';
    if (budgetNote.length > 120) errors.budgetNote = 'Odměna může mít nejvýše 120 znaků.';
    sets.push('budget_note = ?', 'reward_type = NULL', 'reward_amount = NULL', 'reward_currency = NULL', 'reward_scope = NULL');
    binds.push(budgetNote);
  }
  if ('crafts' in body) {
    const validCrafts = validCraftIds(body.crafts);
    const crafts = validCrafts ?? [];
    const err = validCrafts === null ? 'Neznámý obor.' : craftsError(crafts);
    if (err) errors.crafts = err;
    sets.push('required_crafts_json = ?');
    binds.push(JSON.stringify(crafts));
  }
  if ('region' in body) {
    const region = str(body.region);
    const err = regionError(region);
    if (err) errors.region = err;
    sets.push('region = ?');
    binds.push(region);
  }
  if ('city' in body) {
    const city = str(body.city);
    const err = cityError(city);
    if (err) errors.city = err;
    sets.push('city = ?');
    binds.push(city);
  }
  if ('dateFrom' in body || 'dateTo' in body) {
    const dateFrom = 'dateFrom' in body ? body.dateFrom : existing.date_from;
    const dateTo = 'dateTo' in body ? body.dateTo : existing.date_to;
    validateDateRange(dateFrom, dateTo, errors, { checkFrom: 'dateFrom' in body });
    if (!errors.dateFrom && !errors.dateTo && (dateFrom !== existing.date_from || dateTo !== existing.date_to)) {
      const accepted = await db
        .prepare(`SELECT 1 AS x FROM engagements WHERE job_id = ? AND status = 'accepted' LIMIT 1`)
        .bind(jobId)
        .first();
      if (accepted) {
        return jsonResponse({ error: 'Termín nelze změnit, když už je někdo přijatý. Ukonči inzerát a vytvoř nový.' }, 409);
      }
    }
    if (!errors.dateFrom && !errors.dateTo) {
      sets.push('date_from = ?', 'start_date = ?', 'date_to = ?', 'expires_at = ?');
      binds.push(dateFrom, dateFrom, dateTo, addDays(dateTo as string, 14));
    }
  }
  let publishing = false;
  if ('visibility' in body) {
    if (body.visibility !== 'public') errors.visibility = 'Povolená hodnota je pouze „public“.';
    else if (existing.visibility !== 'direct') {
      return jsonResponse({ error: 'Inzerát už je na nástěnce.' }, 409);
    } else {
      // Same states as the "Zveřejnit na nástěnce" button: not while a confirmable invitation waits, not after it was accepted.
      const di = mapJobRow(existing, { userId: auth.userId }).directInvite;
      if (di?.status === 'accepted') return jsonResponse({ error: 'Pozvaný už potvrdil.' }, 409);
      if (di?.status === 'pending' && !di.unconfirmed) return jsonResponse({ error: 'Pozvánka ještě čeká na potvrzení.' }, 409);
      publishing = true;
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
      statements.push(...(await jobClosedNotifications(db, jobId)));
    }
    if (statements.length > 0) await db.batch(statements);
    // Publishing is its own conditional UPDATE: only the request that really flips direct → public notifies.
    let switched = false;
    if (publishing && !closing) {
      const res = await db
        .prepare(`UPDATE jobs SET visibility = 'public', updated_at = datetime('now') WHERE id = ? AND visibility = 'direct'`)
        .bind(jobId)
        .run();
      switched = res.meta?.changes === 1;
    }
    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    if (switched && row) {
      // The invited person already has the invitation, so no job_match for him. A failing notification does not undo the publish.
      try {
        await notifyJobMatches(
          db,
          {
            id: jobId,
            posterId: auth.userId,
            dateFrom: row.date_from,
            dateTo: row.date_to,
            crafts: jobRowCrafts(row),
            expiresAt: row.expires_at ?? addDays(row.date_to, 14),
          },
          todayUtc(),
          row.direct_to ?? undefined
        );
      } catch (err) {
        console.error('Chyba při párovacích upozorněních po zveřejnění:', err);
      }
    }
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }) });
  } catch (err) {
    console.error('Chyba při PATCH /api/jobs/:id:', err);
    return jsonResponse({ error: 'Nepodařilo se upravit zakázku.' }, 500);
  }
}

/**
 * DELETE /api/jobs/:id (jen správce z ADMIN_EMAILS): měkké smazání cizího i vlastního inzerátu.
 * Řádek zůstane v D1 (visibility = 'deleted', status = 'archived'), zmizí z nástěnky i ze „Moje inzeráty“.
 * Zájemci s pending/accepted dostanou `job_closed`. Opakované smazání vrací 200.
 * Tělo `{ reason }` (3–500 znaků, D46) je povinné; autor inzerátu dostane `job_removed` s důvodem (ne když je správce autor).
 * Obnova ručně: UPDATE jobs SET visibility = 'public', status = 'active' WHERE id = ?;
 */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const jobId = String(params.id);

  const auth = await requireAdmin(request, env, db);
  if ('response' in auth) return auth.response;

  const existing = await db
    .prepare(`SELECT status, visibility, author_id FROM jobs WHERE id = ?`)
    .bind(jobId)
    .first<{ status: string; visibility: string; author_id: string }>();
  if (!existing) return jsonResponse({ error: 'Zakázka nenalezena.' }, 404);
  if (existing.visibility === 'deleted') return jsonResponse({ ok: true });

  const body = await readJson<{ reason?: unknown }>(request);
  const reason = str(body?.reason);
  const reasonLen = [...reason].length; // code points, same as the UI counter
  if (reasonLen < 3 || reasonLen > 500) {
    const message = 'Důvod pro autora musí mít 3 až 500 znaků.';
    return jsonResponse({ error: message, fieldErrors: { reason: message } }, 400);
  }

  try {
    // Workers of an already closed job were notified when it was closed.
    const notifications = existing.status === 'active' ? await jobClosedNotifications(db, jobId) : [];
    await db.batch([
      db
        .prepare(`UPDATE jobs SET visibility = 'deleted', status = 'archived', updated_at = datetime('now') WHERE id = ?`)
        .bind(jobId),
      ...notifications,
      ...(existing.author_id !== auth.userId
        ? [
            db
              .prepare(`INSERT INTO notifications (id, profile_id, type, job_id, reason, actor_id) VALUES (?, ?, 'job_removed', ?, ?, ?)`)
              .bind(`n-${crypto.randomUUID()}`, existing.author_id, jobId, reason, auth.userId),
          ]
        : []),
    ]);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('Chyba při DELETE /api/jobs/:id:', err);
    return jsonResponse({ error: 'Nepodařilo se smazat zakázku.' }, 500);
  }
}
