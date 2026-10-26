import {
  PagesContext,
  computeAdminCookieToken,
  isRequestAdminAuthorized,
  jsonResponse,
} from '../_shared';

export const onRequestGet = async (context: PagesContext) => {
  const isAdmin = await isRequestAdminAuthorized(context.request, context.env);
  return jsonResponse({
    isAdmin,
    passwordProtected: true,
  });
};

export const onRequestPost = async (context: PagesContext) => {
  try {
    const body = (await context.request.json()) as {
      username?: string;
      password?: string;
    };
    const username = (body.username?.trim() || 'admin').toLowerCase();
    const password = body.password?.trim() ?? '';

    if (username !== 'admin' && username !== 'root' && username !== 'restaurion') {
      return jsonResponse(
        { ok: false, isAdmin: false, error: 'Neznámý rezervní admin účet.' },
        401
      );
    }

    const configuredSecret = context.env.ADMIN_PASSWORD?.trim() || 'restaurion-admin';
    const authorized = await isRequestAdminAuthorized(
      context.request,
      context.env,
      password
    );

    if (!authorized) {
      return jsonResponse(
        { ok: false, isAdmin: false, error: 'Nesprávné administrátorské heslo.' },
        401
      );
    }

    const token = await computeAdminCookieToken(configuredSecret);
    return jsonResponse(
      { ok: true, isAdmin: true, passwordProtected: true },
      200,
      {
        'Set-Cookie': `restaurion_admin=${encodeURIComponent(
          token
        )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      }
    );
  } catch {
    return jsonResponse({ ok: false, error: 'Neplatný požadavek.' }, 400);
  }
};

export const onRequestDelete = async () => {
  return jsonResponse(
    { ok: true, isAdmin: false },
    200,
    {
      'Set-Cookie':
        'restaurion_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    }
  );
};
