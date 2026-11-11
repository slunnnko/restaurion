import {
  JOB_SELECT,
  addDays,
  badJson,
  getAuthenticatedUserId,
  jsonResponse,
  mapContact,
  mapJobRow,
  noDb,
  readJson,
  requireUser,
  todayUtc,
} from './_shared.ts';
import type { JobRow, JobViewer, PagesContext } from './_shared.ts';
import { loadBusySlots, loadMatchCandidates } from './_lib/data.ts';
import { profileNameMissing, profileNameResponse, validateNewJob, validationResponse } from './_lib/validate.ts';
import { countBusyDays, evaluateMatch } from '../../src/lib/matching.ts';
import type { EngagementStatus } from '../../src/types/api.ts';

const BOARD_WHERE = `j.date_from IS NOT NULL AND j.date_to IS NOT NULL AND j.status = 'active'
  AND j.visibility = 'public' AND j.expires_at >= date('now')`;

/** GET /api/jobs → veřejná nástěnka; s relací přidá pole pro přihlášeného (isMine, myEngagement, ...). */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  try {
    const rows = await db
      .prepare(`${JOB_SELECT} WHERE ${BOARD_WHERE} ORDER BY j.created_at DESC LIMIT 300`)
      .all<JobRow>();

    const userId = await getAuthenticatedUserId(request, db);
    if (!userId) return jsonResponse({ jobs: rows.results.map((r) => mapJobRow(r)) });

    const today = todayUtc();
    const busy = await loadBusySlots(db, userId, today);
    const mine = await db
      .prepare(
        `SELECT e.id, e.job_id, e.status, p.name AS p_name, p.email AS p_email, p.phone AS p_phone
         FROM engagements e JOIN jobs j ON j.id = e.job_id JOIN profiles p ON p.id = j.author_id
         WHERE e.worker_id = ?`
      )
      .bind(userId)
      .all<{ id: string; job_id: string; status: EngagementStatus; p_name: string; p_email: string; p_phone: string | null }>();
    const engByJob = new Map(mine.results.map((e) => [e.job_id, e]));

    const jobs = rows.results.map((r) => {
      const e = engByJob.get(r.id);
      const viewer: JobViewer = {
        userId,
        busyDays: countBusyDays({ dateFrom: r.date_from, dateTo: r.date_to }, busy.blocks, busy.engagements, r.id),
        ...(e ? { engagement: { id: e.id, status: e.status } } : {}),
        ...(e && e.status === 'accepted'
          ? { posterContact: mapContact({ name: e.p_name, email: e.p_email, phone: e.p_phone }) }
          : {}),
      };
      return mapJobRow(r, viewer);
    });
    return jsonResponse({ jobs });
  } catch (err) {
    console.error('Chyba při GET /api/jobs:', err);
    return jsonResponse({ error: 'Nepodařilo se načíst zakázky.' }, 500);
  }
}

/** POST /api/jobs → vytvoří zakázku a pošle notifikaci každému odpovídajícímu řemeslníkovi. */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badJson();
  const { errors, values } = validateNewJob(body);
  if (Object.keys(errors).length > 0) return validationResponse(errors);

  try {
    const poster = await db.prepare(`SELECT name FROM profiles WHERE id = ?`).bind(auth.userId).first<{ name: string }>();
    if (profileNameMissing(poster?.name)) return profileNameResponse();

    const jobId = `j-${crypto.randomUUID().slice(0, 8)}`;
    const expiresAt = addDays(values.dateTo, 14);
    await db
      .prepare(
        `INSERT INTO jobs (id, author_id, title, description, job_type, monument_status, monument_name,
           required_crafts_json, region, city, start_date, budget_note, status, date_from, date_to,
           visibility, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 'public', ?)`
      )
      .bind(
        jobId,
        auth.userId,
        values.title,
        values.description,
        values.jobType,
        values.monumentStatus,
        values.monumentName || null,
        JSON.stringify(values.crafts),
        values.region,
        values.city,
        values.dateFrom,
        values.budgetNote,
        values.dateFrom,
        values.dateTo,
        expiresAt
      )
      .run();

    const candidates = await loadMatchCandidates(db, auth.userId, values);
    const job = {
      id: jobId,
      posterId: auth.userId,
      status: 'active',
      expiresAt,
      dateFrom: values.dateFrom,
      dateTo: values.dateTo,
      crafts: values.crafts,
    };
    const today = todayUtc();
    const matched = candidates.filter((w) => evaluateMatch(job, w, today).matches);
    const inserts = matched.map((w) =>
      db
        .prepare(`INSERT INTO notifications (id, profile_id, type, job_id) VALUES (?, ?, 'job_match', ?)`)
        .bind(`n-${crypto.randomUUID()}`, w.id, jobId)
    );
    for (let i = 0; i < inserts.length; i += 50) await db.batch(inserts.slice(i, i + 50));

    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }), notified: matched.length }, 201);
  } catch (err) {
    console.error('Chyba při POST /api/jobs:', err);
    return jsonResponse({ error: 'Nepodařilo se vytvořit zakázku.' }, 500);
  }
}
