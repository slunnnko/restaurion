import { PROFILE_COLUMNS, jsonResponse, mapContact, mapPublicPerson, noDb, requireUser, todayUtc } from '../../_shared.ts';
import type { PagesContext, ProfileRow } from '../../_shared.ts';
import { isUnconfirmed } from '../../_lib/invitations.ts';
import type { EngagementForPoster, EngagementStatus } from '../../../../src/types/api.ts';

interface Row extends ProfileRow {
  eng_id: string;
  eng_status: EngagementStatus;
  eng_message: string | null;
  eng_created_at: string;
  eng_initiated_by: 'worker' | 'poster';
  eng_respond_by: string | null;
}

/** GET /api/jobs/:id/engagements (jen zadavatel) → zájemci s kontakty (zadavatel je přihlášený). */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const job = await db
    .prepare(`SELECT author_id FROM jobs WHERE id = ? AND visibility IN ('public', 'direct')`)
    .bind(String(params.id))
    .first<{ author_id: string }>();
  if (!job) return jsonResponse({ error: 'Zakázka nenalezena.' }, 404);
  if (job.author_id !== auth.userId) return jsonResponse({ error: 'Zájemce vidí jen zadavatel zakázky.' }, 403);

  const cols = PROFILE_COLUMNS.split(', ').map((c) => `p.${c}`).join(', ');
  const rows = await db
    .prepare(
      `SELECT e.id AS eng_id, e.status AS eng_status, e.message AS eng_message, e.created_at AS eng_created_at, e.initiated_by AS eng_initiated_by, e.respond_by AS eng_respond_by, ${cols}
       FROM engagements e JOIN profiles p ON p.id = e.worker_id
       WHERE e.job_id = ? AND e.status IN ('pending', 'accepted') ORDER BY e.created_at`
    )
    .bind(String(params.id))
    .all<Row>();

  const today = todayUtc();
  const engagements: EngagementForPoster[] = rows.results.map((r) => ({
    id: r.eng_id,
    status: r.eng_status,
    ...(r.eng_message ? { message: r.eng_message } : {}),
    createdAt: r.eng_created_at,
    initiatedBy: r.eng_initiated_by,
    ...(r.eng_initiated_by === 'poster' && r.eng_respond_by ? { respondBy: r.eng_respond_by } : {}),
    ...(isUnconfirmed({ initiated_by: r.eng_initiated_by, status: r.eng_status, respond_by: r.eng_respond_by }, today) ? { unconfirmed: true } : {}),
    worker: mapPublicPerson(r),
    workerContact: mapContact(r),
  }));
  return jsonResponse({ engagements });
}
