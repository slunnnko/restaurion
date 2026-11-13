import { jsonResponse, loadOwnProfile, noDb, rateLimit, requireUser } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';
import { LICENCE_CHECK_BUCKET, LICENCE_CHECK_MAX, LICENCE_CHECK_WINDOW_MIN, runLicenceCheck } from '../_lib/rrkp.ts';

/** POST /api/profile/licence-check → znovu ověří vlastní číslo povolení v Rejstříku restaurátorů (D49). 5× za hodinu. */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const stored = await db
    .prepare(`SELECT licence_number FROM profiles WHERE id = ?`)
    .bind(auth.userId)
    .first<{ licence_number: string | null }>();
  if (!stored?.licence_number) return jsonResponse({ error: 'Nejdřív ulož číslo povolení.' }, 400);

  if (!(await rateLimit(db, LICENCE_CHECK_BUCKET, auth.userId, LICENCE_CHECK_MAX, LICENCE_CHECK_WINDOW_MIN))) {
    return jsonResponse({ error: 'Příliš mnoho pokusů, zkus to za hodinu.' }, 429);
  }
  try {
    await runLicenceCheck(db, auth.userId, env);
    const profile = await loadOwnProfile(db, auth.userId, env);
    if (!profile) return jsonResponse({ error: 'Profil nenalezen.' }, 404);
    return jsonResponse({ profile });
  } catch (err) {
    console.error('Chyba při POST /api/profile/licence-check:', err);
    return jsonResponse({ error: 'Nepodařilo se ověřit povolení.' }, 500);
  }
}
