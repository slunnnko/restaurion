import { badJson, jsonResponse, loadOwnProfile, noDb, readJson, sha256Hex } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

const MAX_ATTEMPTS = 5;

/**
 * POST /api/auth/verify-code {email, code, consent: true}
 * Max. 5 pokusů na kód. Vytvoří profil, nastaví consent_at a cookie `restaurion_session` na 30 dní.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const body = await readJson<{ email?: unknown; code?: unknown; consent?: unknown }>(request);
  if (!body) return badJson();

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) {
    return jsonResponse({ error: 'Zadejte e-mail i 6místný kód.' }, 400);
  }
  if (body.consent !== true) {
    return jsonResponse(
      { error: 'Pro přihlášení je nutný souhlas se zpracováním údajů.', fieldErrors: { consent: 'Souhlas je povinný.' } },
      400
    );
  }

  try {
    const latest = await db
      .prepare(
        `SELECT id, code_hash, attempts FROM login_codes
         WHERE email = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1`
      )
      .bind(email)
      .first<{ id: number; code_hash: string; attempts: number }>();

    if (!latest || latest.attempts >= MAX_ATTEMPTS) {
      return jsonResponse({ error: 'Kód je neplatný nebo jeho platnost vypršela. Vyžádejte si nový.' }, 401);
    }

    const codeHash = await sha256Hex(`${email}:${code}`);
    if (codeHash !== latest.code_hash) {
      await db.prepare(`UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?`).bind(latest.id).run();
      return jsonResponse({ error: 'Kód je neplatný nebo jeho platnost vypršela.' }, 401);
    }

    await db.prepare(`DELETE FROM login_codes WHERE email = ?`).bind(email).run();

    let profile = await db
      .prepare(`SELECT id FROM profiles WHERE LOWER(email) = ? LIMIT 1`)
      .bind(email)
      .first<{ id: string }>();

    if (!profile) {
      const newUserId = `u-${crypto.randomUUID().slice(0, 8)}`;
      await db
        .prepare(
          `INSERT INTO profiles (id, name, role, verification_status, region, city, bio, email, availability, consent_at)
           VALUES (?, ?, 'unlicensed_craftsman', 'not_applicable', '', '—', '', ?, 'available_now', datetime('now'))`
        )
        .bind(newUserId, email.split('@')[0], email)
        .run();
      profile = { id: newUserId };
    } else {
      await db
        .prepare(`UPDATE profiles SET consent_at = datetime('now') WHERE id = ? AND consent_at IS NULL`)
        .bind(profile.id)
        .run();
    }

    const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await db
      .prepare(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`)
      .bind(tokenHash, profile.id, expiresAt)
      .run();

    const cookie = `restaurion_session=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
    const user = await loadOwnProfile(db, profile.id);
    return jsonResponse({ user }, 200, { 'Set-Cookie': cookie });
  } catch (err) {
    console.error('Chyba při POST /api/auth/verify-code:', err);
    return jsonResponse({ error: 'Nepodařilo se dokončit přihlášení.' }, 500);
  }
}
