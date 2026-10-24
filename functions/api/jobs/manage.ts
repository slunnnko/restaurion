import { PagesContext, jsonResponse, formatRelativeDateCz } from '../_shared';
import { SELECT_JOBS_SQL, mapRowToJob } from '../jobs';

interface ResponseRow {
  id: string;
  job_id: string;
  applicant_id: string | null;
  sender_name: string;
  sender_email: string | null;
  sender_phone: string;
  message: string;
  attach_profile: number;
  status: string;
  created_at: string;
}

export const onRequestGet = async (context: PagesContext) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'Databáze D1 není připojena (binding DB).' }, 503);
  }

  const url = new URL(context.request.url);
  const jobId = url.searchParams.get('jobId');

  try {
    if (jobId) {
      const { results } = await db
        .prepare(
          `SELECT id, job_id, applicant_id, sender_name, sender_email, sender_phone, message, attach_profile, status, created_at
           FROM job_responses
           WHERE job_id = ?
           ORDER BY created_at DESC`
        )
        .bind(jobId)
        .all<ResponseRow>();

      const responses = results.map((r) => ({
        id: r.id,
        jobId: r.job_id,
        applicantId: r.applicant_id || undefined,
        senderName: r.sender_name,
        senderEmail: r.sender_email || undefined,
        senderPhone: r.sender_phone,
        message: r.message,
        attachProfile: Boolean(r.attach_profile),
        status: r.status,
        createdAt: formatRelativeDateCz(r.created_at),
      }));

      return jsonResponse({ responses });
    }

    const { results } = await db
      .prepare(
        `SELECT id, job_id, applicant_id, sender_name, sender_email, sender_phone, message, attach_profile, status, created_at
         FROM job_responses
         ORDER BY created_at DESC
         LIMIT 100`
      )
      .all<ResponseRow>();

    const responses = results.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      applicantId: r.applicant_id || undefined,
      senderName: r.sender_name,
      senderEmail: r.sender_email || undefined,
      senderPhone: r.sender_phone,
      message: r.message,
      attachProfile: Boolean(r.attach_profile),
      status: r.status,
      createdAt: formatRelativeDateCz(r.created_at),
    }));

    return jsonResponse({ responses });
  } catch (err) {
    console.error('Chyba při načítání reakcí na zakázku z D1:', err);
    return jsonResponse({ error: 'Nepodařilo se načíst reakce ze serveru.' }, 500);
  }
};

export const onRequestPost = async (context: PagesContext) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'Databáze D1 není připojena (binding DB).' }, 503);
  }

  try {
    const body = (await context.request.json()) as {
      jobId?: string;
      action?: 'update' | 'reopen' | 'delete';
      status?: 'active' | 'completed';
      title?: string;
      description?: string;
      budgetNote?: string;
      city?: string;
      monumentName?: string;
      matchedPartnerId?: string;
      matchedPartnerName?: string;
      matchedPartnerRole?: string;
      completedAt?: string;
      reviewRating?: number;
      reviewText?: string;
      reviewAuthorName?: string;
    };

    const jobId = body.jobId?.trim();
    if (!jobId) {
      return jsonResponse({ error: 'Chybí ID zakázky (jobId).' }, 400);
    }

    if (body.action === 'delete') {
      await db.prepare('DELETE FROM jobs WHERE id = ?').bind(jobId).run();
      return jsonResponse({ ok: true, deletedId: jobId });
    }

    const nextTitle = body.title?.trim() || null;
    const nextDescription = body.description?.trim() || null;
    const nextBudget = body.budgetNote?.trim() || null;
    const nextCity = body.city?.trim() || null;
    const nextMonument = typeof body.monumentName === 'string' ? body.monumentName.trim() : null;

    if (body.action === 'reopen') {
      await db
        .prepare(
          `UPDATE jobs
           SET status = 'active',
               title = COALESCE(?, title),
               description = COALESCE(?, description),
               budget_note = COALESCE(?, budget_note),
               city = COALESCE(?, city),
               monument_name = COALESCE(?, monument_name),
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(nextTitle, nextDescription, nextBudget, nextCity, nextMonument, jobId)
        .run();
    } else {
      const nextStatus = body.status || 'completed';
      const completedAt = body.completedAt?.trim() || 'Říjen 2026';
      const partnerId = body.matchedPartnerId?.trim() || null;
      const partnerName = body.matchedPartnerName?.trim() || null;
      const partnerRole = body.matchedPartnerRole?.trim() || null;
      const rating = body.reviewRating ? Math.min(5, Math.max(1, Number(body.reviewRating))) : null;
      const reviewText = body.reviewText?.trim() || null;
      const reviewAuthor = body.reviewAuthorName?.trim() || null;

      await db
        .prepare(
          `UPDATE jobs
           SET status = ?,
               title = COALESCE(?, title),
               description = COALESCE(?, description),
               budget_note = COALESCE(?, budget_note),
               city = COALESCE(?, city),
               monument_name = COALESCE(?, monument_name),
               matched_partner_id = COALESCE(?, matched_partner_id),
               matched_partner_name = COALESCE(?, matched_partner_name),
               matched_partner_role = COALESCE(?, matched_partner_role),
               completed_at = COALESCE(?, completed_at),
               review_rating = COALESCE(?, review_rating),
               review_text = COALESCE(?, review_text),
               review_author_name = COALESCE(?, review_author_name),
               review_created_at = CASE WHEN ? IS NOT NULL THEN datetime('now') ELSE review_created_at END,
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(
          nextStatus,
          nextTitle,
          nextDescription,
          nextBudget,
          nextCity,
          nextMonument,
          partnerId,
          partnerName,
          partnerRole,
          completedAt,
          rating,
          reviewText,
          reviewAuthor,
          reviewText,
          jobId
        )
        .run();

      if (reviewText && partnerName) {
        await db
          .prepare(
            `INSERT OR REPLACE INTO job_reviews (
               id, job_id, reviewer_id, reviewer_name, reviewee_id, reviewee_name, rating, review_text, created_at
             ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            `rev-${jobId}`,
            jobId,
            reviewAuthor || 'Zadavatel zakázky',
            partnerId,
            partnerName,
            rating || 5,
            reviewText
          )
          .run();
      }
    }

    const row = await db
      .prepare(
        `${SELECT_JOBS_SQL.replace(
          "ORDER BY CASE WHEN j.status = 'active' THEN 0 ELSE 1 END, j.created_at DESC",
          'AND j.id = ? LIMIT 1'
        )}`
      )
      .bind(jobId)
      .first< Parameters<typeof mapRowToJob>[0] >();

    if (!row) {
      return jsonResponse({ ok: true, id: jobId });
    }

    return jsonResponse({ ok: true, job: mapRowToJob(row) });
  } catch (err) {
    console.error('Chyba při správě zakázky v D1:', err);
    return jsonResponse({ error: 'Nepodařilo se aktualizovat zakázku v databázi.' }, 500);
  }
};
