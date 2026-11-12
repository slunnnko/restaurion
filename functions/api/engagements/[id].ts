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
import { countBusyDays, daysInRange } from '../../../src/lib/matching.ts';

/**
 * POST /api/engagements/:id {action}
 * accept|decline: jen zadavatel, jen z `pending`; u nabídky jen decline. withdraw: jen zájemce, z `pending`/`accepted`,
 * volitelně s `reason` (max 500 znaků, D38).
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
  if (action !== 'accept' && action !== 'decline' && action !== 'withdraw') {
    return jsonResponse({ error: 'Neznámá akce.', fieldErrors: { action: 'accept, decline nebo withdraw' } }, 400);
  }

  try {
    let withdrawReason: string | null = null;
    if (action === 'withdraw') {
      withdrawReason = str(body.reason) || null;
      if (withdrawReason && withdrawReason.length > 500) {
        return jsonResponse({ error: 'Důvod je příliš dlouhý.', fieldErrors: { reason: 'Nejvýše 500 znaků.' } }, 400);
      }
    }

    const eng = await db
      .prepare(
        `SELECT e.id, e.status, e.worker_id, e.job_id, j.author_id, j.status AS j_status, j.expires_at AS j_expires,
                j.date_from AS j_from, j.date_to AS j_to, j.job_type AS j_type,
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
        w_name: string;
        w_email: string;
        w_phone: string | null;
        w_portfolio_url: string | null;
        w_instagram: string | null;
        w_whatsapp: string | null;
        w_facebook: string | null;
      }>();
    if (!eng) return jsonResponse({ error: 'Zájem nenalezen.' }, 404);

    if (action === 'withdraw') {
      if (eng.worker_id !== auth.userId) return jsonResponse({ error: 'Odstoupit může jen přihlášený řemeslník.' }, 403);
      if (eng.status !== 'pending' && eng.status !== 'accepted') return jsonResponse({ error: 'Z tohoto stavu nelze odstoupit.' }, 409);
      await db
        .prepare(`UPDATE engagements SET status = 'withdrawn', responded_at = datetime('now'), withdraw_reason = ? WHERE id = ?`)
        .bind(withdrawReason, id)
        .run();
      await insertNotification(db, { profileId: eng.author_id, type: 'withdrawn', jobId: eng.job_id, engagementId: id });
      return jsonResponse({ engagement: { id, status: 'withdrawn' } });
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
    await db.prepare(`UPDATE engagements SET status = ?, responded_at = datetime('now') WHERE id = ?`).bind(status, id).run();
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
