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
  mk_license_fields_json?: string | null;
  verification_status: string;
  school_or_background: string | null;
  specializations: string | null;
  specializations_json?: string | null;
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
    mkLicenseFields: safeJsonParse<string[] | undefined>(
      row.mk_license_fields_json ?? row.mk_license_fields,
      undefined
    ),
    verificationStatus: row.verification_status,
    schoolOrBackground: row.school_or_background || undefined,
    specializations: safeJsonParse<string[]>(row.specializations_json ?? row.specializations, []),
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
  role?: string;
  email?: string;
  bio?: string;
  region?: string;
  city?: string;
  phone?: string;
  availability?: string;
  mkLicenseNumber?: string;
  schoolOrBackground?: string;
  specializations?: string[];
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
    const nextName = body.name !== undefined ? body.name.trim() : existing.name;
    const nextTitle = body.title !== undefined ? body.title.trim() : existing.title;
    const nextRole = body.role !== undefined ? body.role.trim() : existing.role;
    const nextEmail = body.email !== undefined ? body.email.trim() : existing.email;
    const nextBio = body.bio !== undefined ? body.bio.trim() : existing.bio;
    const nextRegion = body.region !== undefined ? body.region.trim() : existing.region;
    const nextCity = body.city !== undefined ? body.city.trim() : existing.city;
    const nextPhone = body.phone !== undefined ? body.phone.trim() : existing.phone;
    const nextAvailability = body.availability || existing.availability;
    const nextMkLicenseNumber =
      body.mkLicenseNumber !== undefined
        ? body.mkLicenseNumber.trim() || null
        : existing.mk_license_number;
    const nextSchool =
      body.schoolOrBackground !== undefined
        ? body.schoolOrBackground.trim() || null
        : existing.school_or_background;
    const nextSpecsJson =
      Array.isArray(body.specializations)
        ? JSON.stringify(body.specializations.map((s) => String(s).trim()).filter(Boolean))
        : existing.specializations_json ?? existing.specializations ?? '[]';

    // Pokud požadavek mění textové údaje profilu (nikoliv jen avatarUrl), zvalidujeme je
    const isFullProfileUpdate =
      body.name !== undefined ||
      body.email !== undefined ||
      body.phone !== undefined ||
      body.city !== undefined ||
      body.bio !== undefined;

    if (isFullProfileUpdate) {
      const fieldErrors: Record<string, string> = {};
      if (!nextName || nextName.length < 3 || nextName.length > 80) {
        fieldErrors.name = 'Jméno musí mít 3 až 80 znaků.';
      }
      if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(nextEmail)) {
        fieldErrors.email = 'Zadejte platnou e-mailovou adresu.';
      }
      if (nextPhone) {
        const digits = nextPhone.replace(/\D/g, '');
        if (!/^\+?[0-9\s\-()]{9,18}$/.test(nextPhone) || digits.length < 9 || digits.length > 15) {
          fieldErrors.phone = 'Zadejte platné telefonní číslo.';
        }
      }
      if (!nextCity || nextCity.length < 2 || nextCity.length > 60) {
        fieldErrors.city = 'Město musí mít 2 až 60 znaků.';
      }
      if (nextBio && (nextBio.length < 15 || nextBio.length > 1000)) {
        fieldErrors.bio = 'Představení musí mít 15 až 1000 znaků.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        return jsonResponse(
          {
            error: Object.values(fieldErrors)[0],
            fieldErrors,
          },
          400
        );
      }
    }

    await env.DB.prepare(
      `UPDATE profiles
       SET avatar_url = ?,
           name = ?,
           title = ?,
           role = ?,
           email = ?,
           bio = ?,
           region = ?,
           city = ?,
           phone = ?,
           availability = ?,
           mk_license_number = ?,
           school_or_background = ?,
           specializations_json = ?
       WHERE id = ?`
    )
      .bind(
        nextAvatarUrl,
        nextName,
        nextTitle,
        nextRole,
        nextEmail,
        nextBio,
        nextRegion,
        nextCity,
        nextPhone,
        nextAvailability,
        nextMkLicenseNumber,
        nextSchool,
        nextSpecsJson,
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

