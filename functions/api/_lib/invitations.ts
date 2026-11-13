// Poptat spolupráci (D40): sdílená logika pozvánek zadavatele nabízejícímu. Párování je v src/lib/matching.ts.

import { INVITE_RESPOND_DAYS, offerFitsJob } from '../../../src/lib/matching.ts';
import { addDays, jsonResponse, safeJsonParse } from '../_shared.ts';
import type { D1Database, D1PreparedStatement } from '../_shared.ts';

export interface InvitableOffer {
  id: string;
  authorId: string;
  authorName: string;
  dateFrom: string;
  dateTo: string;
  crafts: string[];
}

/** Pozvánka je „nepotvrzená“: zadavatelova, stále pending, bez navázaného kontaktu (D41) a lhůta uplynula (odvozený stav, bez nového statusu). */
export function isUnconfirmed(
  e: { initiated_by: string; status: string; respond_by: string | null; contacted_at?: string | null },
  today: string
): boolean {
  return e.initiated_by === 'poster' && e.status === 'pending' && !e.contacted_at && !!e.respond_by && e.respond_by < today;
}

export function respondByFrom(today: string): string {
  return addDays(today, INVITE_RESPOND_DAYS);
}

/** Zpráva k pozvánce: volitelná, nejvýše 500 znaků (stejné pravidlo jako u respond). */
export function inviteMessage(body: Record<string, unknown>): { message: string } | { response: Response } {
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length > 500) {
    return {
      response: jsonResponse({ error: 'Zpráva může mít nejvýše 500 znaků.', fieldErrors: { message: 'Nejvýše 500 znaků.' } }, 400),
    };
  }
  return { message };
}

/** Aktivní nabídka „Nabízím se“ cizího člověka, na kterou lze poslat poptávku. */
export async function loadInvitableOffer(
  db: D1Database,
  offerId: string,
  userId: string,
  today: string
): Promise<{ offer: InvitableOffer } | { response: Response }> {
  const row = await db
    .prepare(
      `SELECT j.id, j.author_id, j.date_from, j.date_to, j.required_crafts_json, a.name AS author_name
       FROM jobs j JOIN profiles a ON a.id = j.author_id
       WHERE j.id = ? AND j.job_type = 'craftsman_available' AND j.status = 'active' AND j.visibility = 'public'
         AND j.date_from IS NOT NULL AND j.expires_at >= ?`
    )
    .bind(offerId, today)
    .first<{ id: string; author_id: string; date_from: string; date_to: string; required_crafts_json: string; author_name: string }>();
  if (!row) return { response: jsonResponse({ error: 'Nabídka není dostupná.' }, 404) };
  if (row.author_id === userId) return { response: jsonResponse({ error: 'Na vlastní nabídku nelze poslat poptávku.' }, 403) };
  return {
    offer: {
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      dateFrom: row.date_from,
      dateTo: row.date_to,
      crafts: safeJsonParse<string[]>(row.required_crafts_json, []),
    },
  };
}

export interface InviteJob {
  id: string;
  authorId: string;
  jobType: string;
  status: string;
  expiresAt: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  crafts: string[];
}

export function fitsOffer(offer: InvitableOffer, job: InviteJob, today: string) {
  // A job without dates cannot be matched against the offer's days.
  if (!job.dateFrom || !job.dateTo) return { fits: false, reason: 'no_overlap' as const };
  return offerFitsJob(offer, { ...job, dateFrom: job.dateFrom, dateTo: job.dateTo }, today);
}

/** Statements: engagement INSERT + `invited` notification. The caller puts them into one db.batch. */
export function newInviteStatements(
  db: D1Database,
  p: { engagementId: string; jobId: string; workerId: string; message: string; respondBy: string }
): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `INSERT INTO engagements (id, job_id, worker_id, initiated_by, message, respond_by) VALUES (?, ?, ?, 'poster', ?, ?)`
      )
      .bind(p.engagementId, p.jobId, p.workerId, p.message || null, p.respondBy),
    invitedNotification(db, p.workerId, p.jobId, p.engagementId),
  ];
}

export function invitedNotification(db: D1Database, workerId: string, jobId: string, engagementId: string): D1PreparedStatement {
  return db
    .prepare(`INSERT INTO notifications (id, profile_id, type, job_id, engagement_id) VALUES (?, ?, 'invited', ?, ?)`)
    .bind(`n-${crypto.randomUUID()}`, workerId, jobId, engagementId);
}
