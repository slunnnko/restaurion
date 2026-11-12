import { badJson, jsonResponse, loadOwnProfile, noDb, readJson, requireUser } from './_shared.ts';
import type { PagesContext } from './_shared.ts';
import {
  PHONE_RE,
  groupLicenceError,
  isDirectoryGroup,
  isHttpUrl,
  isThemePreference,
  normalizeFacebook,
  normalizeInstagram,
  normalizeWhatsapp,
  str,
  validCraftIds,
  validationResponse,
} from './_lib/validate.ts';
import type { FieldErrors } from './_lib/validate.ts';

/** GET /api/profile → vlastní profil (jen relace) */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const auth = await requireUser(request, env.DB);
  if ('response' in auth) return auth.response;
  const profile = await loadOwnProfile(env.DB, auth.userId, env);
  if (!profile) return jsonResponse({ error: 'Profil nenalezen.' }, 404);
  return jsonResponse({ profile });
}

/** PUT /api/profile → úprava VLASTNÍHO profilu (žádné id v požadavku se nepřijímá). E-mail se nemění. */
export async function onRequestPut(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return noDb();
  const db = env.DB;
  const auth = await requireUser(request, db);
  if ('response' in auth) return auth.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badJson();

  const errors: FieldErrors = {};
  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, value: unknown) => {
    sets.push(`${col} = ?`);
    binds.push(value);
  };

  if ('name' in body) {
    const name = str(body.name);
    if (name.length < 3 || name.length > 80) errors.name = 'Jméno musí mít 3 až 80 znaků.';
    set('name', name);
  }
  if ('phone' in body) {
    const phone = str(body.phone);
    if (phone && !PHONE_RE.test(phone)) errors.phone = 'Zadejte platné telefonní číslo.';
    set('phone', phone || null);
  }
  if ('region' in body) {
    const region = str(body.region);
    if (region.length > 60) errors.region = 'Kraj může mít nejvýše 60 znaků.';
    set('region', region);
  }
  if ('crafts' in body) {
    const crafts = validCraftIds(body.crafts);
    if (!crafts) errors.crafts = 'Vyberte obory ze seznamu.';
    set('crafts', JSON.stringify(crafts ?? []));
  }
  if ('experienceText' in body) {
    const text = str(body.experienceText);
    if (text.length > 1000) errors.experienceText = 'Nejvýše 1000 znaků.';
    set('experience_text', text);
  }
  if ('portfolioUrl' in body) {
    const url = str(body.portfolioUrl);
    if (url !== '' && !isHttpUrl(url)) errors.portfolioUrl = 'Zadejte odkaz začínající http:// nebo https://.';
    set('portfolio_url', url || null);
  }
  if ('licenceNumber' in body) {
    const lic = str(body.licenceNumber);
    if (lic.length > 40) errors.licenceNumber = 'Nejvýše 40 znaků.';
    set('licence_number', lic || null);
  }
  if ('instagram' in body) {
    const handle = normalizeInstagram(str(body.instagram));
    if (handle === null) errors.instagram = 'Zadej uživatelské jméno nebo odkaz na Instagram (písmena, čísla, tečka, podtržítko).';
    set('instagram', handle || null);
  }
  if ('whatsapp' in body) {
    const wa = normalizeWhatsapp(str(body.whatsapp));
    if (wa === null) errors.whatsapp = 'Zadejte platné telefonní číslo.';
    set('whatsapp', wa || null);
  }
  if ('facebook' in body) {
    const fb = str(body.facebook);
    const fbNorm = normalizeFacebook(fb);
    if (fbNorm === null) errors.facebook = 'Zadejte odkaz na Facebook (https://facebook.com/…).';
    set('facebook', fbNorm || null);
  }
  if ('group' in body && !isDirectoryGroup(body.group)) errors.group = 'Vyberte, kdo jsi.';
  if ('group' in body || 'licenceNumber' in body) {
    // 'licensed' needs a licence number: judge the values this request leaves behind.
    const stored = await db
      .prepare(`SELECT directory_group, licence_number FROM profiles WHERE id = ?`)
      .bind(auth.userId)
      .first<{ directory_group: string; licence_number: string | null }>();
    const group = isDirectoryGroup(body.group) ? body.group : stored?.directory_group ?? 'unlicensed';
    const licence = 'licenceNumber' in body ? str(body.licenceNumber) : stored?.licence_number;
    const problem = groupLicenceError(group, licence);
    if (problem && !errors.group && !errors.licenceNumber) errors.licenceNumber = problem;
    if (isDirectoryGroup(body.group)) set('directory_group', body.group);
  }
  for (const [key, col] of [
    ['emailDigest', 'email_digest'],
    ['acceptingJobs', 'accepting_jobs'],
    ['directoryVisible', 'directory_visible'],
  ] as const) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') errors[key] = 'Očekává se ano/ne.';
      set(col, body[key] ? 1 : 0);
    }
  }
  if ('themePreference' in body) {
    if (!isThemePreference(body.themePreference)) errors.themePreference = 'Vyberte vzhled ze seznamu.';
    else set('theme_preference', body.themePreference);
  }
  if (Object.keys(errors).length > 0) return validationResponse(errors);

  try {
    if (sets.length > 0) {
      await db
        .prepare(`UPDATE profiles SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
        .bind(...binds, auth.userId)
        .run();
    }
    const profile = await loadOwnProfile(db, auth.userId, env);
    return jsonResponse({ profile });
  } catch (err) {
    console.error('Chyba při PUT /api/profile:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit profil.' }, 500);
  }
}
