import {
  JOB_SELECT,
  addDays,
  badJson,
  getAuthenticatedUserId,
  jsonResponse,
  mapJobRow,
  noDb,
  readJson,
  requireUser,
  todayUtc,
} from './_shared.ts';
import type { JobRow, JobViewer, PagesContext } from './_shared.ts';
import { loadBusySlots, notifyJobMatches } from './_lib/data.ts';
import { fitsOffer, inviteMessage, isUnconfirmed, loadInvitableOffer, newInviteStatements, respondByFrom } from './_lib/invitations.ts';
import { profileNameMissing, profileNameResponse, validateNewJob, validationResponse } from './_lib/validate.ts';
import { countBusyDays } from '../../src/lib/matching.ts';
import { endedFields } from '../../src/lib/engagementEnd.ts';
import type { EngagementStatus, MyEngagement, MyInvite } from '../../src/types/api.ts';

const BOARD_WHERE = `j.date_from IS NOT NULL AND j.date_to IS NOT NULL AND j.status = 'active'
  AND j.visibility = 'public' AND j.expires_at >= date('now')`;

/** GET /api/jobs?mine=1 → vlastní inzeráty přihlášeného (aktivní i ukončené, bez ohledu na data; 401 bez relace).
 * GET /api/jobs → veřejná nástěnka (zakázky i nabídky "Nabízím se"); kontakty zadavatele jen s relací; s relací přidá pole pro přihlášeného (isMine, myEngagement, ...). */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  try {
    if (new URL(request.url).searchParams.get('mine') === '1') {
      const auth = await requireUser(request, db);
      if ('response' in auth) return auth.response;
      const own = await db
        .prepare(`${JOB_SELECT} WHERE j.author_id = ? AND j.status IN ('active', 'archived') AND j.visibility IN ('public', 'direct') ORDER BY (j.status = 'active') DESC, j.created_at DESC LIMIT 100`)
        .bind(auth.userId)
        .all<JobRow>();
      return jsonResponse({ jobs: own.results.map((r) => mapJobRow(r, { userId: auth.userId })) });
    }

    const rows = await db
      .prepare(`${JOB_SELECT} WHERE ${BOARD_WHERE} ORDER BY j.created_at DESC LIMIT 300`)
      .all<JobRow>();

    const userId = await getAuthenticatedUserId(request, db);
    if (!userId) return jsonResponse({ jobs: rows.results.map((r) => mapJobRow(r)) });

    const today = todayUtc();
    const busy = await loadBusySlots(db, userId, today);
    const mine = await db
      .prepare(`SELECT id, job_id, status, initiated_by, respond_by, contacted_at, ended_by FROM engagements WHERE worker_id = ?`)
      .bind(userId)
      .all<{ id: string; job_id: string; status: EngagementStatus; initiated_by: 'worker' | 'poster'; respond_by: string | null; contacted_at: string | null; ended_by: string | null }>();
    const engByJob = new Map(mine.results.map((e) => [e.job_id, e]));
    // Invitations the viewer sent (as poster), grouped by the invited offerer; shown on that person's offer cards.
    const sent = await db
      .prepare(
        `SELECT e.id, e.job_id, e.worker_id, e.status, e.respond_by, e.contacted_at, e.initiated_by, j.title
         FROM engagements e JOIN jobs j ON j.id = e.job_id
         WHERE j.author_id = ? AND e.initiated_by = 'poster' AND e.status IN ('pending', 'accepted')
           AND j.status = 'active' AND j.visibility IN ('public', 'direct') ORDER BY e.created_at DESC`
      )
      .bind(userId)
      .all<{ id: string; job_id: string; worker_id: string; status: EngagementStatus; respond_by: string | null; contacted_at: string | null; initiated_by: string; title: string; }>();
    const invitesByWorker = new Map<string, MyInvite[]>();
    for (const i of sent.results) {
      const list = invitesByWorker.get(i.worker_id) ?? [];
      list.push({
        engagementId: i.id,
        jobId: i.job_id,
        jobTitle: i.title,
        status: i.status,
        unconfirmed: isUnconfirmed(i, today),
        ...(i.status === 'pending' && i.contacted_at ? { contactedAt: i.contacted_at } : {}),
        ...(i.respond_by ? { respondBy: i.respond_by } : {}),
      });
      invitesByWorker.set(i.worker_id, list);
    }

    const jobs = rows.results.map((r) => {
      const e = engByJob.get(r.id);
      const viewer: JobViewer = {
        userId,
        // Offers never count as busy days and the viewer's calendar is irrelevant for them.
        ...(r.job_type !== 'craftsman_available'
          ? { busyDays: countBusyDays({ dateFrom: r.date_from, dateTo: r.date_to }, busy.blocks, busy.engagements, r.id) }
          : {}),
        ...(e
          ? {
              engagement: {
                id: e.id,
                status: e.status,
                initiatedBy: e.initiated_by,
                ...(e.initiated_by === 'poster' && e.respond_by ? { respondBy: e.respond_by } : {}),
                ...(isUnconfirmed(e, today) ? { unconfirmed: true } : {}),
                ...(e.contacted_at && e.status !== 'accepted' ? { contactedAt: e.contacted_at } : {}),
                ...endedFields(
                  { status: e.status, initiated_by: e.initiated_by, ended_by: e.ended_by, worker_id: userId, author_id: r.author_id, contacted_at: e.contacted_at },
                  userId,
                  r.status === 'active' && !!r.expires_at && r.expires_at >= today
                ),
              } satisfies MyEngagement,
            }
          : {}),
        ...(r.job_type === 'craftsman_available' ? { invites: invitesByWorker.get(r.author_id) ?? [] } : {}),
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

  const directOfferId = typeof body.directOfferId === 'string' && body.directOfferId ? body.directOfferId : null;
  if (directOfferId && values.jobType === 'craftsman_available') {
    return validationResponse({ jobType: 'Poptávku pro konkrétní nabídku vytvoř jako zakázku, ne jako nabídku.' });
  }
  const msg = inviteMessage(body);
  if ('response' in msg) return msg.response;

  try {
    const poster = await db.prepare(`SELECT name FROM profiles WHERE id = ?`).bind(auth.userId).first<{ name: string }>();
    if (profileNameMissing(poster?.name)) return profileNameResponse();

    const today = todayUtc();
    const jobId = `j-${crypto.randomUUID().slice(0, 8)}`;
    const expiresAt = addDays(values.dateTo, 14);

    let offer: Awaited<ReturnType<typeof loadInvitableOffer>> | null = null;
    if (directOfferId) {
      offer = await loadInvitableOffer(db, directOfferId, auth.userId, today);
      if ('response' in offer) return offer.response;
      const fit = fitsOffer(
        offer.offer,
        { id: jobId, authorId: auth.userId, jobType: values.jobType, status: 'active', expiresAt, dateFrom: values.dateFrom, dateTo: values.dateTo, crafts: values.crafts },
        today
      );
      if (!fit.fits) return jsonResponse({ error: 'Poptávka se k nabídce nehodí (obor nebo termín).' }, 409);
      // Spam cap: one confirmable direct invitation per person at a time.
      const waiting = await db
        .prepare(
          `SELECT 1 AS x FROM engagements e JOIN jobs j ON j.id = e.job_id
           WHERE j.author_id = ? AND j.visibility = 'direct' AND j.direct_to = ? AND j.status = 'active'
             AND e.worker_id = ? AND e.initiated_by = 'poster' AND e.status = 'pending' AND e.respond_by >= ? LIMIT 1`
        )
        .bind(auth.userId, offer.offer.authorId, offer.offer.authorId, today)
        .first();
      if (waiting) return jsonResponse({ error: 'Už mu jedna poptávka čeká na potvrzení.' }, 409);
    }
    const directTo = offer && 'offer' in offer ? offer.offer : null;

    const insertJob = db
      .prepare(
        `INSERT INTO jobs (id, author_id, title, description, job_type, monument_status, monument_name,
           required_crafts_json, region, city, start_date, budget_note, status, date_from, date_to,
           visibility, direct_to, expires_at, reward_type, reward_amount, reward_currency, reward_scope)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        directTo ? 'direct' : 'public',
        directTo ? directTo.authorId : null,
        expiresAt,
        values.reward.type,
        values.reward.amount,
        values.reward.currency,
        values.reward.scope
      );

    let notified = 0;
    if (directTo) {
      // A direct listing: job + invitation + notification land together, no matching notifications, not on the board.
      await db.batch([
        insertJob,
        ...newInviteStatements(db, {
          engagementId: `e-${crypto.randomUUID().slice(0, 8)}`,
          jobId,
          workerId: directTo.authorId,
          message: msg.message,
          respondBy: respondByFrom(today),
        }),
      ]);
    } else {
      await insertJob.run();
      // An offer ("Nabízím se") triggers no matching notifications.
      if (values.jobType !== 'craftsman_available') {
        notified = await notifyJobMatches(
          db,
          { id: jobId, posterId: auth.userId, dateFrom: values.dateFrom, dateTo: values.dateTo, crafts: values.crafts, expiresAt },
          today
        );
      }
    }

    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    return jsonResponse({ job: mapJobRow(row as JobRow, { userId: auth.userId }), notified }, 201);
  } catch (err) {
    console.error('Chyba při POST /api/jobs:', err);
    return jsonResponse({ error: 'Nepodařilo se vytvořit zakázku.' }, 500);
  }
}
