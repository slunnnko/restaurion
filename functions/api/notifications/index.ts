import { jsonResponse, noDb, requireUser, todayUtc } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { loadBusySlots } from '../_lib/data.ts';
import { countBusyDays } from '../../../src/lib/matching.ts';
import type { NotificationItem, NotificationType } from '../../../src/types/api.ts';

interface Row {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  job_id: string | null;
  engagement_id: string | null;
  title: string | null;
  date_from: string | null;
  date_to: string | null;
  reason: string | null;
  poster_name: string | null;
  actor_name: string | null;
}

/** GET /api/notifications → nejnovějších 50 + počet nepřečtených; busyDays se počítá živě. */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const rows = await db
    .prepare(
      `SELECT n.id, n.type, n.created_at, n.read_at, n.job_id, n.engagement_id, j.title, j.date_from, j.date_to, n.reason, pa.name AS poster_name, cb.name AS actor_name
       FROM notifications n
       LEFT JOIN jobs j ON j.id = n.job_id
         AND (j.visibility = 'public' OR n.type IN ('job_closed', 'job_removed')
              OR (j.visibility = 'direct' AND (j.author_id = n.profile_id OR j.direct_to = n.profile_id)))
       LEFT JOIN profiles pa ON pa.id = j.author_id
       LEFT JOIN profiles cb ON cb.id = n.actor_id
       WHERE n.profile_id = ? ORDER BY n.created_at DESC, n.rowid DESC LIMIT 50`
    )
    .bind(auth.userId)
    .all<Row>();
  const unread = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE profile_id = ? AND read_at IS NULL`)
    .bind(auth.userId)
    .first<{ n: number }>();

  const busy = await loadBusySlots(db, auth.userId, todayUtc());
  const items: NotificationItem[] = rows.results.map((r) => ({
    id: r.id,
    type: r.type,
    createdAt: r.created_at,
    read: r.read_at !== null,
    ...(r.job_id ? { jobId: r.job_id } : {}),
    ...(r.title ? { jobTitle: r.title } : {}),
    ...(r.engagement_id ? { engagementId: r.engagement_id } : {}),
    ...(r.type === 'invited' && r.poster_name ? { posterName: r.poster_name } : {}),
    ...((r.type === 'contacted' || r.type === 'no_deal' || r.type === 'reopened') && r.actor_name ? { actorName: r.actor_name } : {}),
    ...((r.type === 'withdrawn' || r.type === 'job_removed') && r.reason ? { reason: r.reason } : {}),
    ...(r.type === 'job_match' && r.date_from && r.date_to
      ? { busyDays: countBusyDays({ dateFrom: r.date_from, dateTo: r.date_to }, busy.blocks, busy.engagements, r.job_id ?? undefined) }
      : {}),
  }));
  return jsonResponse({ items, unread: unread?.n ?? 0 });
}
