import { badJson, getCookie, jsonResponse, loadOwnProfile, noDb, rateLimit, readJson, requireUser, sha256Hex } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { hashPassword, validateNewPassword, verifyPassword } from '../_lib/password.ts';

/**
 * POST /api/auth/password {currentPassword?, newPassword}  (přihlášený)
 * Má-li profil už heslo, je nutné současné (10/h na uživatele). Ostatní relace se smažou, aktuální zůstane.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;

  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<{ currentPassword?: unknown; newPassword?: unknown }>(request);
  if (!body) return badJson();

  const pwError = validateNewPassword(body.newPassword);
  if (pwError) return jsonResponse({ error: pwError, fieldErrors: { newPassword: pwError } }, 400);

  try {
    const row = await db
      .prepare(`SELECT password_hash FROM profiles WHERE id = ? LIMIT 1`)
      .bind(auth.userId)
      .first<{ password_hash: string | null }>();
    if (!row) return jsonResponse({ error: 'Profil nenalezen.' }, 404);

    if (row.password_hash) {
      if (!(await rateLimit(db, 'pw-change', auth.userId, 10, 60))) {
        return jsonResponse({ error: 'Příliš mnoho pokusů. Zkuste to znovu za hodinu.' }, 429);
      }
      const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      const ok = current.length > 0 && current.length <= 200 && (await verifyPassword(current, row.password_hash));
      if (!ok) {
        const msg = 'Současné heslo nesedí.';
        return jsonResponse({ error: msg, fieldErrors: { currentPassword: msg } }, 400);
      }
    }

    const hash = await hashPassword(body.newPassword as string);
    await db
      .prepare(`UPDATE profiles SET password_hash = ?, password_set_at = datetime('now') WHERE id = ?`)
      .bind(hash, auth.userId)
      .run();

    const raw = getCookie(request, 'restaurion_session');
    const currentHash = raw ? await sha256Hex(raw) : '';
    await db
      .prepare(`DELETE FROM auth_sessions WHERE user_id = ? AND token_hash <> ?`)
      .bind(auth.userId, currentHash)
      .run();

    const user = await loadOwnProfile(db, auth.userId, env);
    return jsonResponse({ user });
  } catch (err) {
    console.error('Chyba při POST /api/auth/password:', err);
    return jsonResponse({ error: 'Heslo se nepodařilo uložit.' }, 500);
  }
}
