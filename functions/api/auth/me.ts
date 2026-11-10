import { getAuthenticatedUserId, jsonResponse, loadOwnProfile, noDb } from '../_shared.ts';
import type { PagesContext } from '../_shared.ts';

/** GET /api/auth/me → { user: OwnProfile | null } */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const userId = await getAuthenticatedUserId(request, env.DB);
  const user = userId ? await loadOwnProfile(env.DB, userId) : null;
  return jsonResponse({ user });
}
