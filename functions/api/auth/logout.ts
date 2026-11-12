import { getCookie, jsonResponse, noDb, sha256Hex } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/** POST /api/auth/logout → smaže relaci a cookie */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const raw = getCookie(request, 'restaurion_session');
  if (raw) {
    await env.DB.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).bind(await sha256Hex(raw)).run();
  }
  return jsonResponse({ ok: true }, 200, {
    'Set-Cookie': 'restaurion_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  });
}
