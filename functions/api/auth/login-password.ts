import { createSession, jsonResponse, loadOwnProfile, noDb, rateLimit, readJson, badJson } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { verifyPassword } from '../_lib/password.ts';

const FAIL_MESSAGE = 'Nesprávný e-mail nebo heslo. Heslo si nastavíš v profilu po přihlášení kódem.';

/**
 * POST /api/auth/login-password {email, password}
 * 30/h na IP, 10/h na e-mail. Jedna chyba 401 pro neznámý e-mail, chybějící i špatné heslo (žádné zjišťování účtů).
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  if (!body) return badJson();
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 200) return jsonResponse({ error: FAIL_MESSAGE }, 401);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!(await rateLimit(db, 'pw-ip', ip, 30, 60)) || !(await rateLimit(db, 'pw-email', email, 10, 60))) {
    return jsonResponse({ error: 'Příliš mnoho pokusů. Zkuste to znovu za hodinu.' }, 429);
  }

  try {
    const row = await db
      .prepare(`SELECT id, password_hash FROM profiles WHERE LOWER(email) = ? LIMIT 1`)
      .bind(email)
      .first<{ id: string; password_hash: string | null }>();
    const ok = await verifyPassword(password, row?.password_hash ?? null);
    if (!row || !ok) return jsonResponse({ error: FAIL_MESSAGE }, 401);

    const cookie = await createSession(db, row.id);
    const user = await loadOwnProfile(db, row.id, env);
    return jsonResponse({ user }, 200, { 'Set-Cookie': cookie });
  } catch (err) {
    console.error('Chyba při POST /api/auth/login-password:', err);
    return jsonResponse({ error: 'Nepodařilo se dokončit přihlášení.' }, 500);
  }
}
