import {
  badJson,
  emailsSentToday,
  escapeHtml,
  jsonResponse,
  noDb,
  rateLimit,
  readJson,
  sendEmailViaResend,
  sha256Hex,
} from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

const DAILY_EMAIL_BUDGET = 100;

/**
 * POST /api/auth/request-code {email}
 * 6místný kód (platnost 10 minut), uložený jako SHA-256 hash v login_codes. Limit 5/h na e-mail
 * a 20/h na IP. Bez RESEND_API_KEY/RESEND_FROM se kód jen vypíše do konzole (lokální vývoj).
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

  if ((await emailsSentToday(env.DB)) >= DAILY_EMAIL_BUDGET) {
    return jsonResponse({ error: 'Dnešní limit e-mailů je vyčerpán. Zkuste to prosím zítra.' }, 503);
  }

  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const code = String(100000 + (randomArray[0] % 900000));
  const codeHash = await sha256Hex(`${email}:${code}`);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  try {
    await env.DB.prepare(`INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?)`)
      .bind(email, codeHash, expiresAt)
      .run();

    const sent = await sendEmailViaResend(env, {
      to: email,
      kind: 'login_code',
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
    // Local dev only: no mail provider configured, print the code so the developer can log in.
    if (!sent && (!env.RESEND_API_KEY || !env.RESEND_FROM)) {
      console.log(`[dev] login code for ${email}: ${code}`);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('Chyba při POST /api/auth/request-code:', err);
    return jsonResponse({ error: 'Nepodařilo se vygenerovat přihlašovací kód.' }, 500);
  }
}
