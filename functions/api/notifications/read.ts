import { jsonResponse, noDb, readJson, requireUser } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/** POST /api/notifications/read {ids?} → označí vlastní notifikace jako přečtené (bez ids všechny). */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = (await readJson<{ ids?: unknown }>(request)) ?? {};
  if (Array.isArray(body.ids)) {
    const ids = body.ids.filter((v): v is string => typeof v === 'string').slice(0, 100);
    if (ids.length > 0) {
      await db
        .prepare(
          `UPDATE notifications SET read_at = datetime('now')
           WHERE profile_id = ? AND read_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`
        )
        .bind(auth.userId, ...ids)
        .run();
    }
  } else {
    await db
      .prepare(`UPDATE notifications SET read_at = datetime('now') WHERE profile_id = ? AND read_at IS NULL`)
      .bind(auth.userId)
      .run();
  }
  const unread = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE profile_id = ? AND read_at IS NULL`)
    .bind(auth.userId)
    .first<{ n: number }>();
  return jsonResponse({ unread: unread?.n ?? 0 });
}
