import {
  PagesContext,
  jsonResponse,
  sha256Hex,
  sendEmailViaResend,
} from '../_shared';

interface RequestCodeBody {
  email?: string;
}

/**
 * POST /api/auth/request-code
 * Vygeneruje 6místný přihlašovací kód (platnost 10 minut), uloží jeho SHA-256 hash
 * do tabulky auth_codes v D1 a odešle jej na e-mail přes Resend.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse(
      { error: 'Databáze D1 zatím není připojená (binding DB).' },
      503
    );
  }

  let body: RequestCodeBody;
  try {
    body = (await request.json()) as RequestCodeBody;
  } catch {
    return jsonResponse({ error: 'Neplatný formát JSON požadavku.' }, 400);
  }

  const email = body.email?.trim().toLowerCase() || '';
  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'Zadejte platnou e-mailovou adresu.' }, 400);
  }

  // 6místný číselný kód
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const code = String(100000 + (randomArray[0] % 900000));
  const codeHash = await sha256Hex(`${email}:${code}`);

  // Platnost 10 minut ve formátu SQLite datetime
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  try {
    await env.DB.prepare(
      `INSERT INTO auth_codes (email, code_hash, expires_at)
       VALUES (?, ?, ?)`
    )
      .bind(email, codeHash, expiresAt)
      .run();

    const emailSent = await sendEmailViaResend(env, {
      to: email,
      subject: `${code} je váš přihlašovací kód do Restaurion`,
      html: `
        <div style="font-family: sans-serif; color: #111111; max-width: 520px; margin: 0 auto; border: 2px solid #111111; border-radius: 16px; padding: 24px; background: #FFFDF7;">
          <div style="background: #FEF08A; border: 2px solid #111111; border-radius: 10px; padding: 8px 14px; display: inline-block; font-weight: 800; font-size: 12px; margin-bottom: 16px;">
            RESTAURION – PŘIHLÁŠENÍ BEZ HESLA
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 20px;">Váš jednorázový přihlašovací kód</h2>
          <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 16px; background: #FFFFFF; border: 2px solid #111111; border-radius: 12px; text-align: center; margin-bottom: 16px;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #444;">Kód platí 10 minut. Pokud jste o přihlášení nežádali, tento e-mail můžete ignorovat.</p>
        </div>
      `,
    });

    return jsonResponse({
      success: true,
      emailSent,
      message: 'Přihlašovací kód byl odeslán na váš e-mail.',
    });
  } catch (err) {
    console.error('Chyba při POST /api/auth/request-code:', err);
    return jsonResponse({ error: 'Nepodařilo se vygenerovat přihlašovací kód.' }, 500);
  }
}

