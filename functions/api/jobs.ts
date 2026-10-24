import {
  PagesContext,
  jsonResponse,
  safeJsonParse,
  formatRelativeDateCz,
  getAuthenticatedUserId,
} from './_shared';

interface JoinedJobRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  job_type: string;
  monument_status: string;
  monument_name: string | null;
  monument_reg_number: string | null;
  image_url: string | null;
  required_crafts_json: string;
  region: string;
  city: string;
  start_date: string | null;
  deadline: string | null;
  budget_note: string;
  responses_count: number;
  urgent: number;
  status: string;
  created_at: string;
  matched_partner_id: string | null;
  matched_partner_name: string | null;
  matched_partner_role: string | null;
  completed_at: string | null;
  review_rating: number | null;
  review_text: string | null;
  review_author_name: string | null;
  review_created_at: string | null;

  // Sloupce profilu autora
  u_id: string;
  u_email: string;
  u_name: string;
  u_title: string | null;
  u_role: string;
  u_avatar_url: string | null;
  u_region: string;
  u_city: string;
  u_phone: string | null;
  u_bio: string;
  u_specializations_json: string;
  u_mk_license_number: string | null;
  u_mk_license_fields_json: string;
  u_verification_status: string;
  u_verified_at: string | null;
  u_availability: string;
  u_available_from: string | null;
  u_completed_jobs_count: number;
  u_colleague_endorsements_count: number;
  u_school_or_background: string | null;
}

export function mapRowToJob(row: JoinedJobRow) {
  const normalizedStatus =
    row.status === 'completed' || row.status === 'archived' ? 'completed' : 'active';

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    jobType: row.job_type,
    monumentStatus: row.monument_status,
    status: normalizedStatus,
    ...(row.monument_name ? { monumentName: row.monument_name } : {}),
    ...(row.monument_reg_number ? { monumentRegNumber: row.monument_reg_number } : {}),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    requiredCrafts: safeJsonParse<string[]>(row.required_crafts_json, []),
    region: row.region,
    city: row.city,
    ...(row.start_date ? { startDate: row.start_date } : {}),
    ...(row.deadline ? { deadline: row.deadline } : {}),
    budgetNote: row.budget_note,
    createdAt: formatRelativeDateCz(row.created_at),
    responsesCount: Number(row.responses_count ?? 0),
    urgent: Boolean(row.urgent),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    ...(row.matched_partner_name
      ? {
          matchedPartner: {
            ...(row.matched_partner_id ? { id: row.matched_partner_id } : {}),
            name: row.matched_partner_name,
            ...(row.matched_partner_role ? { roleLabel: row.matched_partner_role } : {}),
          },
        }
      : {}),
    ...(row.review_text
      ? {
          review: {
            rating: Number(row.review_rating ?? 5),
            text: row.review_text,
            authorName: row.review_author_name || row.u_name,
            createdAt: row.review_created_at ? formatRelativeDateCz(row.review_created_at) : 'nedávno',
          },
        }
      : {}),
    author: {
      id: row.u_id,
      name: row.u_name,
      ...(row.u_title ? { title: row.u_title } : {}),
      role: row.u_role,
      ...(row.u_avatar_url ? { avatarUrl: row.u_avatar_url } : {}),
      region: row.u_region,
      city: row.u_city,
      ...(row.u_phone ? { phone: row.u_phone } : {}),
      email: row.u_email,
      bio: row.u_bio,
      specializations: safeJsonParse<string[]>(row.u_specializations_json, []),
      ...(row.u_mk_license_number ? { mkLicenseNumber: row.u_mk_license_number } : {}),
      mkLicenseFields: safeJsonParse<string[]>(row.u_mk_license_fields_json, []),
      verificationStatus: row.u_verification_status,
      ...(row.u_verified_at ? { verifiedAt: row.u_verified_at } : {}),
      availability: row.u_availability,
      ...(row.u_available_from ? { availableFrom: row.u_available_from } : {}),
      completedJobsCount: Number(row.u_completed_jobs_count ?? 0),
      colleagueEndorsementsCount: Number(row.u_colleague_endorsements_count ?? 0),
      ...(row.u_school_or_background ? { schoolOrBackground: row.u_school_or_background } : {}),
    },
  };
}

export const SELECT_JOBS_SQL = `
  SELECT
    j.id, j.author_id, j.title, j.description, j.job_type, j.monument_status,
    j.monument_name, j.monument_reg_number, j.image_url, j.required_crafts_json,
    j.region, j.city, j.start_date, j.deadline, j.budget_note, j.responses_count,
    j.urgent, j.status, j.created_at,
    j.matched_partner_id, j.matched_partner_name, j.matched_partner_role,
    j.completed_at, j.review_rating, j.review_text, j.review_author_name, j.review_created_at,
    p.id AS u_id, p.email AS u_email, p.name AS u_name, p.title AS u_title,
    p.role AS u_role, p.avatar_url AS u_avatar_url, p.region AS u_region,
    p.city AS u_city, p.phone AS u_phone, p.bio AS u_bio,
    p.specializations_json AS u_specializations_json,
    p.mk_license_number AS u_mk_license_number,
    p.mk_license_fields_json AS u_mk_license_fields_json,
    p.verification_status AS u_verification_status,
    p.verified_at AS u_verified_at,
    p.availability AS u_availability,
    p.available_from AS u_available_from,
    p.completed_jobs_count AS u_completed_jobs_count,
    p.colleague_endorsements_count AS u_colleague_endorsements_count,
    p.school_or_background AS u_school_or_background
  FROM jobs j
  JOIN profiles p ON j.author_id = p.id
  WHERE j.status IN ('active', 'completed', 'in_progress')
  ORDER BY CASE WHEN j.status = 'active' THEN 0 ELSE 1 END, j.created_at DESC
`;

export const onRequestGet = async (context: PagesContext) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'Databáze D1 není připojena (binding DB).' }, 503);
  }

  try {
    const { results } = await db.prepare(SELECT_JOBS_SQL).all<JoinedJobRow>();
    const jobs = results.map(mapRowToJob);
    return jsonResponse({ jobs });
  } catch (err) {
    console.error('Chyba při načítání zakázek z D1:', err);
    return jsonResponse({ error: 'Nepodařilo se načíst zakázky z databáze.' }, 500);
  }
};

export const onRequestPost = async (context: PagesContext) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'Databáze D1 není připojena (binding DB).' }, 503);
  }

  try {
    const body = (await context.request.json()) as {
      title?: string;
      description?: string;
      jobType?: string;
      monumentStatus?: string;
      monumentName?: string;
      imageUrl?: string;
      requiredCrafts?: string[];
      region?: string;
      city?: string;
      startDate?: string;
      budgetNote?: string;
      authorId?: string;
    };

    if (!body.title || !body.description || !body.city) {
      return jsonResponse({ error: 'Chybí povinné údaje inzerátu (název, popis, město).' }, 400);
    }

    const sessionUserId = await getAuthenticatedUserId(context.request, db);
    const authorId = sessionUserId || body.authorId || 'user-novak';
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await db
      .prepare(
        `INSERT INTO jobs (
          id, author_id, title, description, job_type, monument_status,
          monument_name, image_url, required_crafts_json, region, city,
          start_date, budget_note, responses_count, urgent, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active')`
      )
      .bind(
        jobId,
        authorId,
        body.title.trim(),
        body.description.trim(),
        body.jobType || 'subcontract_needed',
        body.monumentStatus || 'cultural_monument',
        body.monumentName?.trim() || null,
        body.imageUrl || null,
        JSON.stringify(Array.isArray(body.requiredCrafts) && body.requiredCrafts.length > 0 ? body.requiredCrafts : ['Restaurování']),
        body.region || 'Jihomoravský kraj',
        body.city.trim(),
        body.startDate?.trim() || 'Dle dohody',
        body.budgetNote?.trim() || 'Dle dohody'
      )
      .run();

    const row = await db
      .prepare(
        `${SELECT_JOBS_SQL.replace(
          "ORDER BY CASE WHEN j.status = 'active' THEN 0 ELSE 1 END, j.created_at DESC",
          'AND j.id = ? LIMIT 1'
        )}`
      )
      .bind(jobId)
      .first<JoinedJobRow>();

    if (!row) {
      return jsonResponse({ id: jobId, ok: true }, 201);
    }

    return jsonResponse({ job: mapRowToJob(row) }, 201);
  } catch (err) {
    console.error('Chyba při ukládání zakázky do D1:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit inzerát do databáze.' }, 500);
  }
};

