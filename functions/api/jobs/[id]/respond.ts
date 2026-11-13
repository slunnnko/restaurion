import { insertNotification, jsonResponse, noDb, readJson, requireUser } from '../../_shared.ts';
import type { PagesContext } from '../../_shared.ts';
import { profileNameMissing, profileNameResponse } from '../../_lib/validate.ts';

/** POST /api/jobs/:id/respond {message?} → „Mám zájem“ / „Poptat spolupráci“: vznikne engagement `pending`, zadavatel (nabízející) dostane upozornění. */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const jobId = String(params.id);

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = (await readJson<{ message?: unknown }>(request)) ?? {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length > 500) {
    return jsonResponse({ error: 'Zpráva může mít nejvýše 500 znaků.', fieldErrors: { message: 'Nejvýše 500 znaků.' } }, 400);
  }

  try {
    const me = await db.prepare(`SELECT name FROM profiles WHERE id = ?`).bind(auth.userId).first<{ name: string }>();
    if (profileNameMissing(me?.name)) return profileNameResponse();

    const job = await db
      .prepare(
        `SELECT id, author_id, job_type FROM jobs WHERE id = ? AND status = 'active' AND visibility = 'public'
           AND date_from IS NOT NULL AND expires_at >= date('now')`
      )
      .bind(jobId)
      .first<{ id: string; author_id: string; job_type: string }>();
    if (!job) return jsonResponse({ error: 'Zakázka není dostupná.' }, 404);
    if (job.author_id === auth.userId) return jsonResponse({ error: 'Na vlastní zakázku nelze reagovat.' }, 403);
    // D40: "Poptat spolupráci" on an offer is an invitation from the poster (POST /api/jobs/:id/invite).
    if (job.job_type === 'craftsman_available') return jsonResponse({ error: 'Použij Poptat spolupráci.' }, 409);

    const existing = await db
      .prepare(`SELECT id, status FROM engagements WHERE job_id = ? AND worker_id = ?`)
      .bind(jobId, auth.userId)
      .first<{ id: string; status: string }>();

    let engagementId: string;
    if (existing) {
      if (existing.status === 'declined') return jsonResponse({ error: 'Zadavatel už vybral jinak.' }, 409);
      if (existing.status !== 'withdrawn') return jsonResponse({ error: 'Zájem jste už projevili.' }, 409);
      engagementId = existing.id;
      await db
        .prepare(`UPDATE engagements SET status = 'pending', initiated_by = 'worker', respond_by = NULL, contacted_at = NULL, contacted_by = NULL, ended_by = NULL, message = ?, responded_at = NULL WHERE id = ?`)
        .bind(message || null, engagementId)
        .run();
    } else {
      engagementId = `e-${crypto.randomUUID().slice(0, 8)}`;
      await db
        .prepare(`INSERT INTO engagements (id, job_id, worker_id, message) VALUES (?, ?, ?, ?)`)
        .bind(engagementId, jobId, auth.userId, message || null)
        .run();
    }

    await insertNotification(db, { profileId: job.author_id, type: 'interest', jobId, engagementId });
    return jsonResponse({ engagement: { id: engagementId, status: 'pending' } }, 201);
  } catch (err) {
    console.error('Chyba při POST /api/jobs/:id/respond:', err);
    return jsonResponse({ error: 'Nepodařilo se odeslat zájem.' }, 500);
  }
}
