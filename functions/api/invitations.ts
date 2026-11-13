import { JOB_SELECT, jsonResponse, mapJobRow, noDb, requireUser, todayUtc } from './_shared.ts';
import type { JobRow, PagesContext } from './_shared.ts';
import { isUnconfirmed } from './_lib/invitations.ts';
import { endedFields } from '../../src/lib/engagementEnd.ts';
import type { EngagementStatus, Invitation } from '../../src/types/api.ts';

interface EngRow {
  id: string;
  job_id: string;
  status: EngagementStatus;
  message: string | null;
  created_at: string;
  initiated_by: string;
  respond_by: string | null;
  contacted_at: string | null;
  ended_by: string | null;
  author_id: string;
  j_expires: string | null;
}

/**
 * GET /api/invitations → pozvánky („Poptat spolupráci“) pro přihlášeného nabízejícího: zadavatelem založené
 * engagementy s jeho worker_id, všechny stavy (D43: odmítnuté a zrušené zůstávají, ztlumené), i nepotvrzené po lhůtě.
 * Kontakty zadavatele jsou v job.posterContact (přihlášený je vidí vždy).
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;
  const today = todayUtc();

  try {
    const engs = await db
      .prepare(
        `SELECT e.id, e.job_id, e.status, e.message, e.created_at, e.initiated_by, e.respond_by, e.contacted_at, e.ended_by, j.author_id, j.expires_at AS j_expires
         FROM engagements e JOIN jobs j ON j.id = e.job_id
         WHERE e.worker_id = ? AND e.initiated_by = 'poster'
           AND j.status = 'active' AND j.visibility IN ('public', 'direct')
         ORDER BY e.created_at DESC, e.rowid DESC LIMIT 100`
      )
      .bind(auth.userId)
      .all<EngRow>();

    // One query for all jobs (no N+1).
    const rows =
      engs.results.length === 0
        ? []
        : (
            await db
              .prepare(`${JOB_SELECT} WHERE j.id IN (${engs.results.map(() => '?').join(',')})`)
              .bind(...engs.results.map((e) => e.job_id))
              .all<JobRow>()
          ).results;
    const rowById = new Map(rows.map((r) => [r.id, r]));

    const invitations: Invitation[] = [];
    for (const e of engs.results) {
      const row = rowById.get(e.job_id);
      if (!row) continue;
      const unconfirmed = isUnconfirmed(e, today);
      const ended = endedFields(
        { status: e.status, initiated_by: e.initiated_by, ended_by: e.ended_by, worker_id: auth.userId, author_id: e.author_id, contacted_at: e.contacted_at },
        auth.userId,
        !!e.j_expires && e.j_expires >= today // the query already keeps active jobs only
      );
      const contactedAt = e.status !== 'accepted' && e.contacted_at ? { contactedAt: e.contacted_at } : {};
      invitations.push({
        engagementId: e.id,
        status: e.status,
        ...(e.message ? { message: e.message } : {}),
        createdAt: e.created_at,
        respondBy: e.respond_by ?? '',
        unconfirmed,
        ...contactedAt,
        ...ended,
        job: mapJobRow(row, {
          userId: auth.userId,
          engagement: {
            id: e.id,
            status: e.status,
            initiatedBy: 'poster',
            ...(e.respond_by ? { respondBy: e.respond_by } : {}),
            ...(unconfirmed ? { unconfirmed: true } : {}),
            ...contactedAt,
            ...ended,
          },
        }),
      });
    }
    return jsonResponse({ invitations });
  } catch (err) {
    console.error('Chyba při GET /api/invitations:', err);
    return jsonResponse({ error: 'Nepodařilo se načíst poptávky.' }, 500);
  }
}
