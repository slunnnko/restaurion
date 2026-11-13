import { JOB_SELECT, jobRowCrafts, jsonResponse, noDb, requireUser, todayUtc } from '../../_shared.ts';
import type { JobRow, PagesContext } from '../../_shared.ts';
import { fitsOffer, isUnconfirmed, loadInvitableOffer } from '../../_lib/invitations.ts';
import type { EngagementStatus, InviteOptionJob } from '../../../../src/types/api.ts';

/**
 * GET /api/jobs/:id/invite-options (:id = nabídka „Nabízím se“ někoho jiného) → moje aktivní inzeráty (veřejné i přímé),
 * které se k nabídce hodí, s případnou existující pozvánkou. Přímý inzerát jen pro jiného člověka se nenabízí.
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;
  const today = todayUtc();

  try {
    const found = await loadInvitableOffer(db, String(params.id), auth.userId, today);
    if ('response' in found) return found.response;
    const { offer } = found;

    const rows = await db
      .prepare(
        `${JOB_SELECT} WHERE j.author_id = ? AND j.status = 'active' AND j.visibility IN ('public', 'direct')
           AND j.job_type != 'craftsman_available' AND j.date_from IS NOT NULL AND j.expires_at >= ?
         ORDER BY j.created_at DESC LIMIT 100`
      )
      .bind(auth.userId, today)
      .all<JobRow>();
    const fitting = rows.results.filter(
      (r) =>
        (r.visibility !== 'direct' || r.direct_to === offer.authorId) &&
        fitsOffer(
          offer,
          {
            id: r.id,
            authorId: r.author_id,
            jobType: r.job_type,
            status: r.status,
            expiresAt: r.expires_at,
            dateFrom: r.date_from,
            dateTo: r.date_to,
            crafts: jobRowCrafts(r),
          },
          today
        ).fits
    );

    const engs = await db
      .prepare(`SELECT id, job_id, status, initiated_by, respond_by, contacted_at FROM engagements WHERE worker_id = ?`)
      .bind(offer.authorId)
      .all<{ id: string; job_id: string; status: EngagementStatus; initiated_by: string; respond_by: string | null; contacted_at: string | null }>();
    const engByJob = new Map(engs.results.map((e) => [e.job_id, e]));

    const jobs: InviteOptionJob[] = fitting.map((r) => {
      const e = engByJob.get(r.id);
      return {
        id: r.id,
        title: r.title,
        dateFrom: r.date_from,
        dateTo: r.date_to,
        crafts: jobRowCrafts(r),
        visibility: r.visibility === 'direct' ? 'direct' : 'public',
        ...(e
          ? {
              invite: {
                engagementId: e.id,
                status: e.status,
                unconfirmed: isUnconfirmed(e, today),
                ...(e.status === 'pending' && e.contacted_at ? { contactedAt: e.contacted_at } : {}),
              },
            }
          : {}),
      };
    });
    return jsonResponse({ offer: { id: offer.id, authorName: offer.authorName }, jobs });
  } catch (err) {
    console.error('Chyba při GET /api/jobs/:id/invite-options:', err);
    return jsonResponse({ error: 'Nepodařilo se načíst nabídky k poptávce.' }, 500);
  }
}
