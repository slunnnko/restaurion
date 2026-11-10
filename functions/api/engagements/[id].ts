import { badJson, insertNotification, jsonResponse, mapContact, noDb, readJson, requireUser } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/**
 * POST /api/engagements/:id {action}
 * accept|decline: jen zadavatel zakázky, jen z `pending`. withdraw: jen řemeslník, z `pending`/`accepted`.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const id = String(params.id);

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<{ action?: unknown }>(request);
  if (!body) return badJson();
  const action = body.action;
  if (action !== 'accept' && action !== 'decline' && action !== 'withdraw') {
    return jsonResponse({ error: 'Neznámá akce.', fieldErrors: { action: 'accept, decline nebo withdraw' } }, 400);
  }

  try {
    const eng = await db
      .prepare(
        `SELECT e.id, e.status, e.worker_id, e.job_id, j.author_id,
                w.name AS w_name, w.email AS w_email, w.phone AS w_phone
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
        w_name: string;
        w_email: string;
        w_phone: string | null;
      }>();
    if (!eng) return jsonResponse({ error: 'Zájem nenalezen.' }, 404);

    if (action === 'withdraw') {
      if (eng.worker_id !== auth.userId) return jsonResponse({ error: 'Odstoupit může jen přihlášený řemeslník.' }, 403);
      if (eng.status !== 'pending' && eng.status !== 'accepted') return jsonResponse({ error: 'Z tohoto stavu nelze odstoupit.' }, 409);
      await db.prepare(`UPDATE engagements SET status = 'withdrawn', responded_at = datetime('now') WHERE id = ?`).bind(id).run();
      await insertNotification(db, { profileId: eng.author_id, type: 'withdrawn', jobId: eng.job_id, engagementId: id });
      return jsonResponse({ engagement: { id, status: 'withdrawn' } });
    }

    if (eng.author_id !== auth.userId) return jsonResponse({ error: 'Rozhodnout může jen zadavatel zakázky.' }, 403);
    if (eng.status !== 'pending') return jsonResponse({ error: 'O tomto zájmu už bylo rozhodnuto.' }, 409);

    const status = action === 'accept' ? 'accepted' : 'declined';
    await db.prepare(`UPDATE engagements SET status = ?, responded_at = datetime('now') WHERE id = ?`).bind(status, id).run();
    await insertNotification(db, { profileId: eng.worker_id, type: status, jobId: eng.job_id, engagementId: id });
    return jsonResponse({
      engagement: { id, status },
      ...(status === 'accepted' ? { contact: mapContact({ name: eng.w_name, email: eng.w_email, phone: eng.w_phone }) } : {}),
    });
  } catch (err) {
    console.error('Chyba při POST /api/engagements/:id:', err);
    return jsonResponse({ error: 'Akci se nepodařilo provést.' }, 500);
  }
}
