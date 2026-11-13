import {
  badJson,
  contactSelect,
  insertNotification,
  jsonResponse,
  mapContactPrefixed,
  noDb,
  readJson,
  requireUser,
  todayUtc,
} from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { str } from '../_lib/validate.ts';
import { loadBusySlots } from '../_lib/data.ts';
import { isUnconfirmed, respondByFrom } from '../_lib/invitations.ts';
import { endedSide } from '../../../src/lib/engagementEnd.ts';
import { countBusyDays, daysInRange } from '../../../src/lib/matching.ts';

/**
 * POST /api/engagements/:id {action}
 * accept|decline: jen zadavatel, jen z `pending`; u nabídky jen decline. U pozvánky (initiated_by 'poster', D40) rozhoduje
 * pozvaný řemeslník (accept|decline, do respond_by), zadavatel ji může jen zrušit (decline → 'withdrawn'). withdraw: jen zájemce, z `pending`/`accepted`,
 * volitelně s `reason` (max 500 znaků, D38).
 * contact (D41): zadavatel i zájemce potvrdí „Kontakt navázán“ (z `pending`, jednou; ruší lhůtu pozvánky), druhá strana dostane upozornění.
 * no_deal (D41): po navázání kontaktu kterákoli strana ukončí „Nedohodli jsme se“ (zájemce → withdrawn, zadavatel → declined; u pozvánky vždy withdrawn, aby šlo poslat znovu).
 * U pozvánky s navázaným kontaktem zadavatel nemůže použít decline (zrušení), jen no_deal.
 * Každé ukončení ukládá `ended_by` (D43), ukončené jednání zůstává v seznamech.
 * reopen (D43): jen strana, která jednání ukončila, jen z `declined`/`withdrawn`, jen u aktivní zakázky; vrací `pending`, druhá strana dostane upozornění `reopened`.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const id = String(params.id);

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<{ action?: unknown; reason?: unknown }>(request);
  if (!body) return badJson();
  const action = body.action;
  if (action !== 'accept' && action !== 'decline' && action !== 'withdraw' && action !== 'contact' && action !== 'no_deal' && action !== 'reopen') {
    return jsonResponse({ error: 'Neznámá akce.', fieldErrors: { action: 'accept, decline, withdraw, contact, no_deal nebo reopen' } }, 400);
  }

  try {
    let withdrawReason: string | null = null;
    if (action === 'withdraw') {
      if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
        return jsonResponse({ error: 'Důvod musí být text.', fieldErrors: { reason: 'Důvod musí být text.' } }, 400);
      }
      withdrawReason = str(body.reason) || null;
      if (withdrawReason && [...withdrawReason].length > 500) {
        return jsonResponse({ error: 'Důvod je příliš dlouhý.', fieldErrors: { reason: 'Nejvýše 500 znaků.' } }, 400);
      }
    }

    const eng = await db
      .prepare(
        `SELECT e.id, e.status, e.worker_id, e.job_id, j.author_id, j.status AS j_status, j.expires_at AS j_expires,
                j.date_from AS j_from, j.date_to AS j_to, j.job_type AS j_type, e.initiated_by, e.respond_by, e.contacted_at, e.ended_by, j.visibility AS j_visibility,
                ${contactSelect('w', 'w')}
         FROM engagements e JOIN jobs j ON j.id = e.job_id JOIN profiles w ON w.id = e.worker_id
         WHERE e.id = ?`
      )
      .bind(id)
      .first<{
        id: string;
        status: string;
        worker_id: string;
        job_id: string;
        author_id: string;
        j_status: string;
        j_expires: string | null;
        j_from: string | null;
        j_to: string | null;
        j_type: string;
        initiated_by: string;
        respond_by: string | null;
        contacted_at: string | null;
        ended_by: string | null;
        j_visibility: string;
        w_name: string;
        w_email: string;
        w_phone: string | null;
        w_portfolio_url: string | null;
        w_instagram: string | null;
        w_whatsapp: string | null;
        w_facebook: string | null;
      }>();
    if (!eng) return jsonResponse({ error: 'Zájem nenalezen.' }, 404);

    if (action === 'reopen') {
      const isAuthor = eng.author_id === auth.userId;
      if (!isAuthor && eng.worker_id !== auth.userId) return jsonResponse({ error: 'Jen zadavatel nebo zájemce.' }, 403);
      if (eng.status !== 'declined' && eng.status !== 'withdrawn') return jsonResponse({ error: 'Tohle jednání není ukončené.' }, 409);
      const side = endedSide(eng);
      if (side !== 'either' && side !== (isAuthor ? 'poster' : 'worker')) {
        return jsonResponse({ error: 'Vrátit může jen ten, kdo jednání ukončil.' }, 403);
      }
      const today = todayUtc();
      if (eng.j_status !== 'active' || !eng.j_expires || eng.j_expires < today) {
        return jsonResponse({ error: 'Zakázka už není aktivní.' }, 409);
      }
      const isInvite = eng.initiated_by === 'poster';
      if (isInvite && eng.j_visibility === 'direct') {
        // Same spam cap as creating a direct listing: one confirmable direct invitation per person at a time.
        const waiting = await db
          .prepare(
            `SELECT 1 AS x FROM engagements e JOIN jobs j ON j.id = e.job_id
             WHERE j.author_id = ? AND j.visibility = 'direct' AND j.direct_to = ? AND j.status = 'active'
               AND e.worker_id = ? AND e.initiated_by = 'poster' AND e.status = 'pending' AND e.respond_by >= ? AND e.id <> ? LIMIT 1`
          )
          .bind(eng.author_id, eng.worker_id, eng.worker_id, today, id)
          .first();
        if (waiting) return jsonResponse({ error: 'Už mu jedna poptávka čeká na potvrzení.' }, 409);
      }
      // An invitation without confirmed contact gets a fresh deadline; contact cancels the deadline (D41), so it stays as it was.
      const respondBy = isInvite && !eng.contacted_at ? respondByFrom(today) : eng.respond_by;
      // Conditional UPDATE first; the notification is inserted only when this call really changed the row.
      const upd = await db
        .prepare(
          `UPDATE engagements SET status = 'pending', ended_by = NULL, responded_at = datetime('now'), respond_by = ?
           WHERE id = ? AND status IN ('declined', 'withdrawn')`
        )
        .bind(respondBy, id)
        .run();
      if (Number(upd.meta?.changes ?? 0) === 0) return jsonResponse({ error: 'Tohle jednání není ukončené.' }, 409);
      await insertNotification(db, {
        profileId: isAuthor ? eng.worker_id : eng.author_id,
        type: 'reopened',
        jobId: eng.job_id,
        engagementId: id,
        actorId: auth.userId,
      });
      return jsonResponse({
        engagement: {
          id,
          status: 'pending',
          ...(eng.contacted_at ? { contactedAt: eng.contacted_at } : {}),
          ...(isInvite && respondBy ? { respondBy } : {}),
        },
      });
    }

    if (action === 'contact' || action === 'no_deal') {
      const isAuthor = eng.author_id === auth.userId;
      if (!isAuthor && eng.worker_id !== auth.userId) return jsonResponse({ error: 'Jen zadavatel nebo zájemce.' }, 403);
      const otherId = isAuthor ? eng.worker_id : eng.author_id;
      if (eng.status !== 'pending') return jsonResponse({ error: 'O tomto zájmu už bylo rozhodnuto.' }, 409);
      if (action === 'contact') {
        if (eng.j_type === 'craftsman_available') return jsonResponse({ error: 'U nabídky se kontakt nepotvrzuje.' }, 409);
        if (eng.contacted_at) return jsonResponse({ error: 'Kontakt už je potvrzený.' }, 409);
        const today = todayUtc();
        if (eng.j_status !== 'active' || !eng.j_expires || eng.j_expires < today) {
          return jsonResponse({ error: 'Zakázka už není aktivní.' }, 409);
        }
        // Conditional UPDATE first; the notification is inserted only when this call really changed the row.
        const upd = await db
          .prepare(
            `UPDATE engagements SET contacted_at = datetime('now'), contacted_by = ?
             WHERE id = ? AND status = 'pending' AND contacted_at IS NULL`
          )
          .bind(auth.userId, id)
          .run();
        if (Number(upd.meta?.changes ?? 0) === 0) return jsonResponse({ error: 'Kontakt už je potvrzený.' }, 409);
        await insertNotification(db, { profileId: otherId, type: 'contacted', jobId: eng.job_id, engagementId: id, actorId: auth.userId });
        const row = await db.prepare(`SELECT contacted_at FROM engagements WHERE id = ?`).bind(id).first<{ contacted_at: string }>();
        return jsonResponse({ engagement: { id, status: 'pending', contactedAt: row?.contacted_at } });
      }
      if (!eng.contacted_at) return jsonResponse({ error: 'Nejdřív potvrďte navázání kontaktu.' }, 409);
      // Invitation: always withdrawn (a re-invite stays possible; declined would block it as "Už odmítl").
      const result = isAuthor && eng.initiated_by !== 'poster' ? 'declined' : 'withdrawn';
      const upd = await db
        .prepare(
          `UPDATE engagements SET status = ?, ended_by = ?, responded_at = datetime('now')
           WHERE id = ? AND status = 'pending' AND contacted_at IS NOT NULL`
        )
        .bind(result, auth.userId, id)
        .run();
      if (Number(upd.meta?.changes ?? 0) === 0) return jsonResponse({ error: 'Nejdřív potvrďte navázání kontaktu.' }, 409);
      await insertNotification(db, { profileId: otherId, type: 'no_deal', jobId: eng.job_id, engagementId: id, actorId: auth.userId });
      return jsonResponse({ engagement: { id, status: result } });
    }
    if (action === 'withdraw') {
      if (eng.worker_id !== auth.userId) return jsonResponse({ error: 'Odstoupit může jen přihlášený řemeslník.' }, 403);
      if (eng.status !== 'pending' && eng.status !== 'accepted') return jsonResponse({ error: 'Z tohoto stavu nelze odstoupit.' }, 409);
      await db.prepare(`UPDATE engagements SET status = 'withdrawn', ended_by = ?, responded_at = datetime('now') WHERE id = ?`).bind(auth.userId, id).run();
      await insertNotification(db, {
        profileId: eng.author_id,
        type: 'withdrawn',
        jobId: eng.job_id,
        engagementId: id,
        reason: withdrawReason,
      });
      return jsonResponse({ engagement: { id, status: 'withdrawn' } });
    }

    if (eng.initiated_by === 'poster') {
      const today = todayUtc();
      if (eng.author_id === auth.userId) {
        // The poster cancels his own pending invitation: hidden for both, re-invite stays possible.
        if (action !== 'decline') return jsonResponse({ error: 'Pozvánku přijímá pozvaný řemeslník.' }, 409);
        if (eng.status !== 'pending') return jsonResponse({ error: 'O tomto zájmu už bylo rozhodnuto.' }, 409);
        if (eng.contacted_at) return jsonResponse({ error: 'Použij Nedohodli jsme se.' }, 409);
        await db.prepare(`UPDATE engagements SET status = 'withdrawn', ended_by = ?, responded_at = datetime('now') WHERE id = ?`).bind(auth.userId, id).run();
        await insertNotification(db, { profileId: eng.worker_id, type: 'invite_cancelled', jobId: eng.job_id, engagementId: id });
        return jsonResponse({ engagement: { id, status: 'withdrawn' } });
      }
      if (eng.worker_id !== auth.userId) return jsonResponse({ error: 'Rozhodnout může jen pozvaný řemeslník.' }, 403);
      if (eng.status !== 'pending') return jsonResponse({ error: 'O tomto zájmu už bylo rozhodnuto.' }, 409);
      if (isUnconfirmed(eng, today)) {
        return jsonResponse({ error: 'Lhůta na potvrzení vypršela. Ozvi se zadavateli.' }, 409);
      }
      if (action === 'accept') {
        if (eng.j_status !== 'active' || !eng.j_from || !eng.j_to || !eng.j_expires || eng.j_expires < today) {
          return jsonResponse({ error: 'Zakázka už není aktivní.' }, 409);
        }
        const busy = await loadBusySlots(db, eng.worker_id, today);
        const range = { dateFrom: eng.j_from, dateTo: eng.j_to };
        if (countBusyDays(range, busy.blocks, busy.engagements, eng.job_id) >= daysInRange(eng.j_from, eng.j_to)) {
          return jsonResponse({ error: 'V tomto termínu máš už vše obsazeno.' }, 409);
        }
      }
      const result = action === 'accept' ? 'accepted' : 'declined';
      await db
        .prepare(`UPDATE engagements SET status = ?, ended_by = ?, responded_at = datetime('now') WHERE id = ?`)
        .bind(result, action === 'accept' ? null : auth.userId, id)
        .run();
      await insertNotification(db, {
        profileId: eng.author_id,
        type: action === 'accept' ? 'invite_accepted' : 'invite_declined',
        jobId: eng.job_id,
        engagementId: id,
      });
      return jsonResponse({ engagement: { id, status: result } });
    }

    if (eng.author_id !== auth.userId) return jsonResponse({ error: 'Rozhodnout může jen zadavatel zakázky.' }, 403);
    if (eng.j_type === 'craftsman_available' && action === 'accept') return jsonResponse({ error: 'U nabídky se nepřijímá.' }, 409);
    if (eng.status !== 'pending') return jsonResponse({ error: 'O tomto zájmu už bylo rozhodnuto.' }, 409);

    if (action === 'accept') {
      const today = todayUtc();
      if (eng.j_status !== 'active' || !eng.j_from || !eng.j_to || !eng.j_expires || eng.j_expires < today) {
        return jsonResponse({ error: 'Zakázka už není aktivní.' }, 409);
      }
      const busy = await loadBusySlots(db, eng.worker_id, today);
      const range = { dateFrom: eng.j_from, dateTo: eng.j_to };
      if (countBusyDays(range, busy.blocks, busy.engagements, eng.job_id) >= daysInRange(eng.j_from, eng.j_to)) {
        return jsonResponse({ error: 'Řemeslník má v tomto termínu už vše obsazeno.' }, 409);
      }
    }

    const status = action === 'accept' ? 'accepted' : 'declined';
    await db
      .prepare(`UPDATE engagements SET status = ?, ended_by = ?, responded_at = datetime('now') WHERE id = ?`)
      .bind(status, action === 'accept' ? null : auth.userId, id)
      .run();
    await insertNotification(db, { profileId: eng.worker_id, type: status, jobId: eng.job_id, engagementId: id });
    return jsonResponse({
      engagement: { id, status },
      ...(status === 'accepted' ? { contact: mapContactPrefixed(eng, 'w') } : {}),
    });
  } catch (err) {
    console.error('Chyba při POST /api/engagements/:id:', err);
    return jsonResponse({ error: 'Akci se nepodařilo provést.' }, 500);
  }
}
