import {
  badJson,
  emailsSentToday,
  escapeHtml,
  jsonResponse,
  loginCodeAllowed,
  newEmailLoginCodesToday,
  noDb,
  rateLimit,
  readJson,
  resendConfigured,
  sendEmailViaResend,
  sha256Hex,
} from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/**
 * POST /api/auth/request-code {email}
 * 6místný kód (platnost 10 minut), uložený jako SHA-256 hash v login_codes. Limit 5/h na e-mail
 * a 20/h na IP. Bez RESEND_API_KEY/RESEND_FROM se kód jen vypíše do konzole (lokální vývoj);
 * s TEST_LOGIN_ECHO=1 (a bez Resendu) ho vrátí v odpovědi jako testCode. Jen pro testování.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();

  const body = await readJson<{ email?: unknown }>(request);
  if (!body) return badJson();

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return jsonResponse({ error: 'Zadejte platnou e-mailovou adresu.', fieldErrors: { email: 'Neplatný e-mail.' } }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const okEmail = await rateLimit(env.DB, 'code-email', email, 5, 60);
  const okIp = okEmail && (await rateLimit(env.DB, 'code-ip', ip, 20, 60));
  if (!okEmail || !okIp) {
    return jsonResponse({ error: 'Příliš mnoho pokusů. Zkuste to znovu za hodinu.' }, 429);
  }

  const profile = await env.DB
    .prepare(`SELECT id FROM profiles WHERE LOWER(email) = ? LIMIT 1`)
    .bind(email)
    .first<{ id: string }>();
  const [sentToday, sentToNew] = await Promise.all([emailsSentToday(env.DB), newEmailLoginCodesToday(env.DB)]);
  if (!loginCodeAllowed(sentToday, sentToNew, Boolean(profile))) {
    return jsonResponse({ error: 'Dnešní limit e-mailů je vyčerpán. Zkuste to prosím zítra.' }, 503);
  }

  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const code = String(100000 + (randomArray[0] % 900000));
  const codeHash = await sha256Hex(`${email}:${code}`);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  try {
    const inserted = await env.DB
      .prepare(`INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?) RETURNING id`)
      .bind(email, codeHash, expiresAt)
      .first<{ id: number }>();

    if (!resendConfigured(env)) {
      // Local dev / test only: no mail provider configured.
      console.log(`[dev] login code for ${email}: ${code}`);
      return jsonResponse(env.TEST_LOGIN_ECHO === '1' ? { ok: true, testCode: code } : { ok: true });
    }

    const sent = await sendEmailViaResend(env, {
      to: email,
      kind: 'login_code',
      profileId: profile?.id ?? null,
      subject: `${code} je váš přihlašovací kód do Restaurion`,
      html: `
        <div style="font-family: sans-serif; color: #111111; max-width: 520px; margin: 0 auto; border: 2px solid #111111; border-radius: 16px; padding: 24px; background: #FFFDF7;">
          <div style="background: #FEF08A; border: 2px solid #111111; border-radius: 10px; padding: 8px 14px; display: inline-block; font-weight: 800; font-size: 12px; margin-bottom: 16px;">
            RESTAURION – PŘIHLÁŠENÍ BEZ HESLA
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 20px;">Váš jednorázový přihlašovací kód</h2>
          <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 16px; background: #FFFFFF; border: 2px solid #111111; border-radius: 12px; text-align: center; margin-bottom: 16px;">
            ${escapeHtml(code)}
          </div>
          <p style="font-size: 13px; color: #444;">Kód platí 10 minut. Pokud jste o přihlášení nežádali, tento e-mail můžete ignorovat.</p>
        </div>
      `,
    });
    if (!sent) {
      if (inserted) await env.DB.prepare(`DELETE FROM login_codes WHERE id = ?`).bind(inserted.id).run();
      return jsonResponse({ error: 'E-mail se nepodařilo odeslat, zkus to prosím znovu.' }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('Chyba při POST /api/auth/request-code:', err);
    return jsonResponse({ error: 'Nepodařilo se vygenerovat přihlašovací kód.' }, 500);
  }
}
