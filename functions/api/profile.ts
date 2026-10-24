import {
  PagesContext,
  jsonResponse,
  safeJsonParse,
  getAuthenticatedUserId,
} from './_shared';

interface ProfileRow {
  id: string;
  name: string;
  title: string | null;
  role: string;
  avatar_url: string | null;
  mk_license_number: string | null;
  mk_license_fields: string | null;
  verification_status: string;
  school_or_background: string | null;
  specializations: string | null;
  regions: string | null;
  region: string;
  city: string;
  bio: string | null;
  phone: string | null;
  email: string;
  availability: string;
  completed_jobs_count: number;
  colleague_endorsements_count: number;
}

function mapProfileRow(row: ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    title: row.title || undefined,
    role: row.role,
    avatarUrl: row.avatar_url || undefined,
    mkLicenseNumber: row.mk_license_number || undefined,
    mkLicenseFields: safeJsonParse<string[] | undefined>(row.mk_license_fields, undefined),
    verificationStatus: row.verification_status,
    schoolOrBackground: row.school_or_background || undefined,
    specializations: safeJsonParse<string[]>(row.specializations, []),
    regions: safeJsonParse<string[]>(row.regions, [row.region]),
    region: row.region,
    city: row.city,
    bio: row.bio || '',
    phone: row.phone || undefined,
    email: row.email,
    availability: row.availability,
    completedJobsCount: Number(row.completed_jobs_count ?? 0),
    colleagueEndorsementsCount: Number(row.colleague_endorsements_count ?? 0),
  };
}

/**
 * GET /api/profile?id=u1
 * Vrátí detail profilu uživatele (nebo aktuálně přihlášeného uživatele, případně výchozího u1).
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse(
      { error: 'Databáze D1 zatím není připojená (binding DB).' },
      503
    );
  }

  const url = new URL(request.url);
  const requestedId = url.searchParams.get('id');
  const authUserId = await getAuthenticatedUserId(request, env.DB);
  const targetId = requestedId || authUserId || 'u1';

  try {
    const row = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ? LIMIT 1`)
      .bind(targetId)
      .first<ProfileRow>();

    if (!row) {
      return jsonResponse({ error: 'Profil nebyl nalezen.' }, 404);
    }

    return jsonResponse({ profile: mapProfileRow(row) });
  } catch (err) {
    console.error('Chyba při GET /api/profile:', err);
    return jsonResponse({ error: 'Nepodařilo se načíst profil.' }, 500);
  }
}

interface UpdateProfileBody {
  id?: string;
  userId?: string;
  avatarUrl?: string;
  name?: string;
  title?: string;
  bio?: string;
  region?: string;
  city?: string;
  phone?: string;
  availability?: string;
}

/**
 * PUT /api/profile
 * Aktualizuje profil uživatele v Cloudflare D1 (např. při změně profilové fotky avatarUrl).
 */
export async function onRequestPut(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse(
      { error: 'Databáze D1 zatím není připojená (binding DB).' },
      503
    );
  }

  let body: UpdateProfileBody;
  try {
    body = (await request.json()) as UpdateProfileBody;
  } catch {
    return jsonResponse({ error: 'Neplatný formát JSON požadavku.' }, 400);
  }

  const authUserId = await getAuthenticatedUserId(request, env.DB);
  const targetUserId = authUserId || body.userId || body.id || 'u1';

  try {
    const existing = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ? LIMIT 1`)
      .bind(targetUserId)
      .first<ProfileRow>();

    if (!existing) {
      return jsonResponse({ error: 'Profil uživatele nebyl nalezen.' }, 404);
    }

    const nextAvatarUrl = body.avatarUrl !== undefined ? body.avatarUrl : existing.avatar_url;
    const nextName = body.name?.trim() || existing.name;
    const nextTitle = body.title !== undefined ? body.title.trim() : existing.title;
    const nextBio = body.bio !== undefined ? body.bio.trim() : existing.bio;
    const nextRegion = body.region?.trim() || existing.region;
    const nextCity = body.city?.trim() || existing.city;
    const nextPhone = body.phone !== undefined ? body.phone.trim() : existing.phone;
    const nextAvailability = body.availability || existing.availability;

    await env.DB.prepare(
      `UPDATE profiles
       SET avatar_url = ?,
           name = ?,
           title = ?,
           bio = ?,
           region = ?,
           city = ?,
           phone = ?,
           availability = ?
       WHERE id = ?`
    )
      .bind(
        nextAvatarUrl,
        nextName,
        nextTitle,
        nextBio,
        nextRegion,
        nextCity,
        nextPhone,
        nextAvailability,
        targetUserId
      )
      .run();

    const updated = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ? LIMIT 1`)
      .bind(targetUserId)
      .first<ProfileRow>();

    return jsonResponse({
      success: true,
      profile: updated ? mapProfileRow(updated) : null,
    });
  } catch (err) {
    console.error('Chyba při PUT /api/profile:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit změny profilu.' }, 500);
  }
}

