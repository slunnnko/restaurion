import {
  PagesContext,
  jsonResponse,
  sha256Hex,
} from '../_shared';

interface VerifyCodeBody {
  email?: string;
  code?: string;
  name?: string;
}

/**
 * POST /api/auth/verify-code
 * Ověří 6místný přihlašovací kód z tabulky auth_codes, vytvoří (nebo načte) profil
 * v tabulce profiles a nastaví HttpOnly cookie `restaurion_session` na 30 dní.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse(
      { error: 'Databáze D1 zatím není připojená (binding DB).' },
      503
    );
  }

  let body: VerifyCodeBody;
  try {
    body = (await request.json()) as VerifyCodeBody;
  } catch {
    return jsonResponse({ error: 'Neplatný formát JSON požadavku.' }, 400);
  }

  const email = body.email?.trim().toLowerCase() || '';
  const code = body.code?.trim() || '';

  if (!email || !code) {
    return jsonResponse({ error: 'Zadejte e-mail i 6místný kód.' }, 400);
  }

  const codeHash = await sha256Hex(`${email}:${code}`);

  try {
    const authCodeRow = await env.DB.prepare(
      `SELECT id FROM auth_codes
       WHERE email = ? AND code_hash = ? AND expires_at > datetime('now')
       ORDER BY id DESC LIMIT 1`
    )
      .bind(email, codeHash)
      .first<{ id: number }>();

    if (!authCodeRow) {
      return jsonResponse({ error: 'Kód je neplatný nebo jeho platnost vypršela.' }, 401);
    }

    // Smažeme použitý kód
    await env.DB.prepare(`DELETE FROM auth_codes WHERE email = ?`).bind(email).run();

    // Najdeme nebo vytvoříme profil
    let profile = await env.DB.prepare(
      `SELECT id, name, email FROM profiles WHERE LOWER(email) = ? LIMIT 1`
    )
      .bind(email)
      .first<{ id: string; name: string; email: string }>();

    if (!profile) {
      const newUserId = `u-${crypto.randomUUID().slice(0, 8)}`;
      const defaultName = body.name?.trim() || email.split('@')[0];

      await env.DB.prepare(
        `INSERT INTO profiles (
          id, name, role, verification_status, region, city, bio, email, availability
        ) VALUES (?, ?, 'craftsman', 'not_applicable', 'Celá ČR', 'Praha', '', ?, 'available_now')`
      )
        .bind(newUserId, defaultName, email)
        .run();

      profile = { id: newUserId, name: defaultName, email };
    }

    // Vygenerujeme session token na 30 dní
    const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    await env.DB.prepare(
      `INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`
    )
      .bind(tokenHash, profile.id, expiresAt)
      .run();

    const maxAge = 30 * 24 * 60 * 60;
    const cookie = `restaurion_session=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;

    return jsonResponse(
      {
        success: true,
        userId: profile.id,
        name: profile.name,
        email: profile.email,
      },
      200,
      { 'Set-Cookie': cookie }
    );
  } catch (err) {
    console.error('Chyba při POST /api/auth/verify-code:', err);
    return jsonResponse({ error: 'Nepodařilo se dokončit přihlášení.' }, 500);
  }
}

