import {
  PagesContext,
  jsonResponse,
  getAuthenticatedUserId,
  sendEmailViaResend,
} from '../../_shared';

export const onRequestPost = async (context: PagesContext<{ id: string }>) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'Databáze D1 není připojena.' }, 503);
  }

  const jobId = context.params.id;
  if (!jobId) {
    return jsonResponse({ error: 'Chybí ID zakázky.' }, 400);
  }

  try {
    const body = (await context.request.json()) as {
      message?: string;
      phone?: string;
      senderName?: string;
      senderEmail?: string;
      attachProfile?: boolean;
    };

    if (!body.message || !body.phone) {
      return jsonResponse({ error: 'Vyplňte prosím zprávu a telefonní kontakt.' }, 400);
    }

    // Ověření zakázky a získání e-mailu autora pro notifikaci
    const jobRow = await db
      .prepare(
        `SELECT j.id, j.title, j.city, p.email AS author_email, p.name AS author_name
         FROM jobs j
         JOIN profiles p ON j.author_id = p.id
         WHERE j.id = ? LIMIT 1`
      )
      .bind(jobId)
      .first<{
        id: string;
        title: string;
        city: string;
        author_email: string;
        author_name: string;
      }>();

    if (!jobRow) {
      return jsonResponse({ error: 'Zakázka nebyla nalezena.' }, 404);
    }

    const applicantId = await getAuthenticatedUserId(context.request, db);
    const responseId = `resp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const senderName = body.senderName?.trim() || 'Zájemce z platformy Restaurion';

    await db.batch([
      db
        .prepare(
          `INSERT INTO job_responses (
            id, job_id, applicant_id, sender_name, sender_email, sender_phone, message, attach_profile
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          responseId,
          jobId,
          applicantId,
          senderName,
          body.senderEmail?.trim() || null,
          body.phone.trim(),
          body.message.trim(),
          body.attachProfile === false ? 0 : 1
        ),
      db
        .prepare(`UPDATE jobs SET responses_count = responses_count + 1, updated_at = datetime('now') WHERE id = ?`)
        .bind(jobId),
    ]);

    // Odeslání e-mailu zadavateli zakázky přes Resend (neblokující)
    context.waitUntil(
      sendEmailViaResend(context.env, {
        to: jobRow.author_email,
        replyTo: body.senderEmail?.trim() || undefined,
        subject: `Nová reakce na inzerát: ${jobRow.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; color: #111111;">
            <h2 style="margin-bottom: 8px;">Nový zájemce o spolupráci na Restaurion.cz</h2>
            <p style="color: #444;">K vašemu inzerátu <strong>${jobRow.title}</strong> (${jobRow.city}) přišla nová odpověď:</p>
            <div style="border: 2px solid #111111; background: #FFFDF7; padding: 16px; border-radius: 12px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Od:</strong> ${senderName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Telefon:</strong> <a href="tel:${body.phone.trim()}">${body.phone.trim()}</a></p>
              ${body.senderEmail ? `<p style="margin: 0 0 8px 0;"><strong>E-mail:</strong> ${body.senderEmail}</p>` : ''}
              <hr style="border: none; border-top: 1px solid #ddd; margin: 12px 0;" />
              <p style="white-space: pre-wrap; margin: 0;">${body.message.trim()}</p>
            </div>
            <p style="font-size: 12px; color: #666;">Odesláno z platformy <a href="https://restaurion.pages.dev">Restaurion</a>.</p>
          </div>
        `,
      })
    );

    return jsonResponse({ ok: true, id: responseId }, 201);
  } catch (err) {
    console.error('Chyba při ukládání reakce na zakázku:', err);
    return jsonResponse({ error: 'Nepodařilo se odeslat odpověď.' }, 500);
  }
};

