import { PROFILE_COLUMNS, jsonResponse, mapContact, mapPublicPerson, noDb, requireUser, todayUtc } from '../../_shared.ts';
import type { PagesContext, ProfileRow } from '../../_shared.ts';
import { isUnconfirmed } from '../../_lib/invitations.ts';
import { endedFields } from '../../../../src/lib/engagementEnd.ts';
import type { EngagementForPoster, EngagementStatus } from '../../../../src/types/api.ts';

interface Row extends ProfileRow {
  eng_id: string;
  eng_status: EngagementStatus;
  eng_message: string | null;
  eng_created_at: string;
  eng_initiated_by: 'worker' | 'poster';
  eng_respond_by: string | null;
  eng_contacted_at: string | null;
  eng_ended_by: string | null;
  eng_worker_id: string;
}

/** GET /api/jobs/:id/engagements (jen zadavatel) → zájemci s kontakty (zadavatel je přihlášený); aktivní první, pak ukončení (D43). */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const job = await db
    .prepare(`SELECT author_id, status, expires_at FROM jobs WHERE id = ? AND visibility IN ('public', 'direct')`)
    .bind(String(params.id))
    .first<{ author_id: string; status: string; expires_at: string | null }>();
  if (!job) return jsonResponse({ error: 'Zakázka nenalezena.' }, 404);
  if (job.author_id !== auth.userId) return jsonResponse({ error: 'Zájemce vidí jen zadavatel zakázky.' }, 403);

  const cols = PROFILE_COLUMNS.split(', ').map((c) => `p.${c}`).join(', ');
  const rows = await db
    .prepare(
      `SELECT e.id AS eng_id, e.status AS eng_status, e.message AS eng_message, e.created_at AS eng_created_at, e.initiated_by AS eng_initiated_by, e.respond_by AS eng_respond_by, e.contacted_at AS eng_contacted_at, e.ended_by AS eng_ended_by, e.worker_id AS eng_worker_id, ${cols}
       FROM engagements e JOIN profiles p ON p.id = e.worker_id
       WHERE e.job_id = ? ORDER BY (e.status IN ('pending', 'accepted')) DESC, e.created_at`
    )
    .bind(String(params.id))
    .all<Row>();

  const today = todayUtc();
  const jobOpen = job.status === 'active' && !!job.expires_at && job.expires_at >= today;
  const engagements: EngagementForPoster[] = rows.results.map((r) => ({
    id: r.eng_id,
    status: r.eng_status,
    ...(r.eng_message ? { message: r.eng_message } : {}),
    createdAt: r.eng_created_at,
    initiatedBy: r.eng_initiated_by,
    ...(r.eng_initiated_by === 'poster' && r.eng_respond_by ? { respondBy: r.eng_respond_by } : {}),
    ...(isUnconfirmed({ initiated_by: r.eng_initiated_by, status: r.eng_status, respond_by: r.eng_respond_by, contacted_at: r.eng_contacted_at }, today) ? { unconfirmed: true } : {}),
    ...(r.eng_status !== 'accepted' && r.eng_contacted_at ? { contactedAt: r.eng_contacted_at } : {}),
    ...endedFields(
      {
        status: r.eng_status,
        initiated_by: r.eng_initiated_by,
        ended_by: r.eng_ended_by,
        worker_id: r.eng_worker_id,
        author_id: auth.userId,
        contacted_at: r.eng_contacted_at,
      },
      auth.userId,
      jobOpen
    ),
    worker: mapPublicPerson(r),
    workerContact: mapContact(r),
  }));
  return jsonResponse({ engagements });
}
