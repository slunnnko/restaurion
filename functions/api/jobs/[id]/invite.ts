import { JOB_SELECT, badJson, jsonResponse, mapJobRow, noDb, readJson, requireUser, todayUtc } from '../../_shared.ts';
import type { JobRow, PagesContext } from '../../_shared.ts';
import { profileNameMissing, profileNameResponse } from '../../_lib/validate.ts';
import {
  fitsOffer,
  inviteMessage,
  invitedNotification,
  isUnconfirmed,
  loadInvitableOffer,
  newInviteStatements,
  respondByFrom,
} from '../../_lib/invitations.ts';

/**
 * POST /api/jobs/:id/invite {offerId, message?} (:id = můj aktivní inzerát) → „Poslat poptávku“: engagement
 * (initiated_by 'poster', respond_by = dnes + 3 dny) a upozornění `invited` nabízejícímu.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const jobId = String(params.id);

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badJson();
  const rawOfferId = typeof body.offerId === 'string' && body.offerId ? body.offerId : null;
  const msg = inviteMessage(body);
  if ('response' in msg) return msg.response;
  const today = todayUtc();

  try {
    const me = await db.prepare(`SELECT name FROM profiles WHERE id = ?`).bind(auth.userId).first<{ name: string }>();
    if (profileNameMissing(me?.name)) return profileNameResponse();

    const row = await db.prepare(`${JOB_SELECT} WHERE j.id = ?`).bind(jobId).first<JobRow>();
    if (!row || row.visibility === 'deleted') return jsonResponse({ error: 'Zakázka nenalezena.' }, 404);
    if (row.author_id !== auth.userId) return jsonResponse({ error: 'Poptávku může poslat jen zadavatel zakázky.' }, 403);

    // A direct listing can be re-sent without offerId: the offer is the invited person's newest active offer.
    let offerId = rawOfferId;
    if (!offerId && row.visibility === 'direct' && row.direct_to) {
      const latest = await db
        .prepare(
          `SELECT id FROM jobs WHERE author_id = ? AND job_type = 'craftsman_available' AND status = 'active'
             AND visibility = 'public' AND date_from IS NOT NULL AND expires_at >= ? ORDER BY created_at DESC LIMIT 1`
        )
        .bind(row.direct_to, today)
        .first<{ id: string }>();
      offerId = latest?.id ?? null;
      if (!offerId) return jsonResponse({ error: 'Nabídka už není dostupná.' }, 409);
    }
    if (!offerId) return jsonResponse({ error: 'Chybí nabídka.', fieldErrors: { offerId: 'Vyber nabídku.' } }, 400);
    const found = await loadInvitableOffer(db, offerId, auth.userId, today);
    if ('response' in found) return found.response;
    const { offer } = found;

    if (row.visibility === 'direct' && row.direct_to !== offer.authorId) {
      return jsonResponse({ error: 'Tento inzerát je určen jinému řemeslníkovi.' }, 409);
    }
    const fit = fitsOffer(
      offer,
      {
        id: row.id,
        authorId: row.author_id,
        status: row.status,
        expiresAt: row.expires_at,
        dateFrom: row.date_from,
        dateTo: row.date_to,
        crafts: mapJobRow(row).crafts,
      },
      today
    );
    if (!fit.fits) return jsonResponse({ error: 'Zakázka se k nabídce nehodí (obor, termín nebo stav).' }, 409);

    const existing = await db
      .prepare(`SELECT id, status, initiated_by, respond_by FROM engagements WHERE job_id = ? AND worker_id = ?`)
      .bind(jobId, offer.authorId)
      .first<{ id: string; status: string; initiated_by: string; respond_by: string | null }>();

    const respondBy = respondByFrom(today);
    let engagementId: string;
    if (existing) {
      if (existing.status === 'declined') return jsonResponse({ error: 'Tuhle poptávku už odmítl.' }, 409);
      if (existing.status === 'accepted' || (existing.status === 'pending' && !isUnconfirmed(existing, today))) {
        return jsonResponse({ error: 'Poptávka už byla odeslána.' }, 409);
      }
      engagementId = existing.id;
      // withdrawn or unconfirmed: re-open with a new deadline
      await db.batch([
        db
          .prepare(
            `UPDATE engagements SET status = 'pending', initiated_by = 'poster', message = ?, respond_by = ?, responded_at = NULL WHERE id = ?`
          )
          .bind(msg.message || null, respondBy, engagementId),
        invitedNotification(db, offer.authorId, jobId, engagementId),
      ]);
    } else {
      engagementId = `e-${crypto.randomUUID().slice(0, 8)}`;
      await db.batch(newInviteStatements(db, { engagementId, jobId, workerId: offer.authorId, message: msg.message, respondBy }));
    }
    return jsonResponse({ engagement: { id: engagementId, status: 'pending', respondBy } }, 201);
  } catch (err) {
    console.error('Chyba při POST /api/jobs/:id/invite:', err);
    return jsonResponse({ error: 'Nepodařilo se odeslat poptávku.' }, 500);
  }
}
