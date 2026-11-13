// Sdílené typy a pomocné funkce pro Cloudflare Pages Functions (/api/*)
// Mapování řádků na veřejné typy je jen zde. Kontakty (mapContact) dostává jen přihlášený;
// anonymní odpověď nikdy neobsahuje e-mail ani telefon.

import type {
  BookedJob,
  ContactInfo,
  DirectoryGroup,
  MyEngagement,
  MyInvite,
  OwnProfile,
  PublicJob,
  PublicPerson,
  RewardType,
  UnavailabilityBlock,
} from '../../src/types/api.ts';

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

export interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

export interface Env {
  DB?: D1Database;
  /** Public-by-URL bucket for listing photos (served through GET /api/photos/*). */
  JOB_PHOTOS?: R2Bucket;
  /** Comma-separated e-mails of administrators (case-insensitive). Secret, only the name is in git. */
  ADMIN_EMAILS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
  /** Test only: with this set to '1' and Resend NOT configured, request-code returns the code in the response. */
  TEST_LOGIN_ECHO?: string;
}

export interface PagesContext<P extends Record<string, string | string[]> = Record<string, string | string[]>> {
  request: Request;
  env: Env;
  params: P;
  waitUntil(promise: Promise<unknown>): void;
}

export function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((c) => c.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

export async function getAuthenticatedUserId(request: Request, db?: D1Database): Promise<string | null> {
  if (!db) return null;
  const rawToken = getCookie(request, 'restaurion_session');
  if (!rawToken) return null;

  const tokenHash = await sha256Hex(rawToken);
  const session = await db
    .prepare(
      `SELECT user_id FROM auth_sessions WHERE token_hash = ? AND expires_at > datetime('now') LIMIT 1`
    )
    .bind(tokenHash)
    .first<{ user_id: string }>();

  return session?.user_id ?? null;
}

/** Creates a 30-day session for the user and returns the Set-Cookie value. */
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  await db
    .prepare(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(tokenHash, userId, expiresAt)
    .run();
  return `restaurion_session=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

/** True when the e-mail is listed in the ADMIN_EMAILS env var (comma-separated, case-insensitive). */
export function isAdmin(env: Pick<Env, 'ADMIN_EMAILS'>, email: string | null | undefined): boolean {
  if (!email || !env.ADMIN_EMAILS) return false;
  const wanted = email.trim().toLowerCase();
  return env.ADMIN_EMAILS.split(',').some((e) => e.trim().toLowerCase() === wanted && wanted !== '');
}

/** Returns the session user id, or a 401 JSON response. */
export async function requireUser(
  request: Request,
  db: D1Database
): Promise<{ userId: string } | { response: Response }> {
  const userId = await getAuthenticatedUserId(request, db);
  if (!userId) return { response: jsonResponse({ error: 'Pro tuto akci se musíte přihlásit.' }, 401) };
  return { userId };
}

/** Session user who is an administrator (ADMIN_EMAILS), or a 401 / 403 JSON response. */
export async function requireAdmin(
  request: Request,
  env: Env,
  db: D1Database
): Promise<{ userId: string } | { response: Response }> {
  const auth = await requireUser(request, db);
  if ('response' in auth) return auth;
  const row = await db.prepare(`SELECT email FROM profiles WHERE id = ?`).bind(auth.userId).first<{ email: string }>();
  if (!isAdmin(env, row?.email)) return { response: jsonResponse({ error: 'Tuto akci smí provést jen správce.' }, 403) };
  return auth;
}

export function noDb(): Response {
  return jsonResponse({ error: 'Databáze D1 zatím není připojená (binding DB).' }, 503);
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as T) : null;
  } catch {
    return null;
  }
}

export function badJson(): Response {
  return jsonResponse({ error: 'Neplatný formát JSON požadavku.' }, 400);
}

// ---- Dates ----

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- Rate limit ----

/**
 * Returns true when the event is allowed, false when the limit is reached. The event is inserted
 * first and counted afterwards, so parallel requests cannot all slip under the limit.
 * Old rows are purged by runDigest, not here.
 */
export async function rateLimit(
  db: D1Database,
  bucket: string,
  key: string,
  max: number,
  windowMin: number
): Promise<boolean> {
  const keyHash = await sha256Hex(`rl:${key}`);
  const since = new Date(Date.now() - windowMin * 60_000).toISOString().replace('T', ' ').slice(0, 19);
  const inserted = await db
    .prepare(`INSERT INTO rate_limit_events (bucket, key_hash) VALUES (?, ?) RETURNING id`)
    .bind(bucket, keyHash)
    .first<{ id: number }>();
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM rate_limit_events WHERE bucket = ? AND key_hash = ? AND created_at >= ?`)
    .bind(bucket, keyHash, since)
    .first<{ n: number }>();
  if ((row?.n ?? 0) <= max) return true;
  // Rejected attempts must not count, otherwise retrying keeps extending the lockout.
  if (inserted) await db.prepare(`DELETE FROM rate_limit_events WHERE id = ?`).bind(inserted.id).run();
  return false;
}

// ---- Email ----

export const DAILY_EMAIL_BUDGET = 100;
/** Login codes for e-mails without a profile share this part of the daily budget (anti-abuse). */
export const NEW_EMAIL_LOGIN_BUDGET = 50;

export function resendConfigured(env: Env): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM);
}

/** Pure budget rule: total cap for everyone, a smaller cap for e-mails without a profile. */
export function loginCodeAllowed(sentToday: number, sentToNewToday: number, hasProfile: boolean): boolean {
  if (sentToday >= DAILY_EMAIL_BUDGET) return false;
  return hasProfile || sentToNewToday < NEW_EMAIL_LOGIN_BUDGET;
}

export async function emailsSentToday(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM email_log WHERE sent_at >= date('now')`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Login-code e-mails sent today to addresses without a profile (profile_id NULL). */
export async function newEmailLoginCodesToday(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM email_log WHERE kind = 'login_code' AND profile_id IS NULL AND sent_at >= date('now')`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Sends through Resend. Without key or from address only logs to console and returns false. */
export async function sendEmailViaResend(
  env: Env,
  options: { to: string; subject: string; html: string; kind: 'login_code' | 'digest'; profileId?: string | null }
): Promise<boolean> {
  if (!resendConfigured(env)) {
    console.log('[Resend not configured - email skipped]', { to: options.to, subject: options.subject });
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });
    if (!res.ok) return false;
    if (env.DB) {
      await env.DB.prepare(`INSERT INTO email_log (kind, profile_id) VALUES (?, ?)`)
        .bind(options.kind, options.profileId ?? null)
        .run();
    }
    return true;
  } catch (err) {
    console.error('Chyba při odesílání e-mailu přes Resend:', err);
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- Row mappers ----

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  region: string;
  phone: string | null;
  crafts: string;
  experience_text: string;
  portfolio_url: string | null;
  licence_number: string | null;
  email_digest: number;
  accepting_jobs: number;
  directory_group: string;
  directory_visible: number;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
}

export const PROFILE_COLUMNS =
  'id, email, name, region, phone, crafts, experience_text, portfolio_url, licence_number, email_digest, accepting_jobs, directory_group, directory_visible, instagram, whatsapp, facebook';

export function mapGroup(value: string | null | undefined): DirectoryGroup {
  return value === 'firm' || value === 'licensed' ? value : 'unlicensed';
}

export function mapPublicPerson(row: ProfileRow): PublicPerson {
  return {
    id: row.id,
    name: row.name,
    group: mapGroup(row.directory_group),
    region: row.region ?? '',
    crafts: safeJsonParse<string[]>(row.crafts, []),
    experienceText: row.experience_text ?? '',
    ...(row.licence_number ? { licenceNumber: row.licence_number } : {}),
  };
}

export type ContactRow = Pick<
  ProfileRow,
  'name' | 'email' | 'phone' | 'portfolio_url' | 'instagram' | 'whatsapp' | 'facebook'
>;

/** The ONE place that turns a profile row into contacts. Call it only for a logged-in viewer. */
export function mapContact(row: ContactRow): ContactInfo {
  return {
    name: row.name,
    email: row.email,
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.portfolio_url ? { website: row.portfolio_url } : {}),
    ...(row.instagram ? { instagram: row.instagram } : {}),
    ...(row.whatsapp ? { whatsapp: row.whatsapp } : {}),
    ...(row.facebook ? { facebook: row.facebook } : {}),
  };
}

/** SQL columns for mapContactPrefixed: `t.name AS <prefix>_name, ...`. */
export function contactSelect(table: string, prefix: string): string {
  return ['name', 'email', 'phone', 'portfolio_url', 'instagram', 'whatsapp', 'facebook']
    .map((c) => `${table}.${c} AS ${prefix}_${c}`)
    .join(', ');
}

export function mapContactPrefixed(row: object, prefix: string): ContactInfo {
  const r = row as Record<string, string | null>;
  return mapContact({
    name: r[`${prefix}_name`] ?? '',
    email: r[`${prefix}_email`] ?? '',
    phone: r[`${prefix}_phone`] ?? null,
    portfolio_url: r[`${prefix}_portfolio_url`] ?? null,
    instagram: r[`${prefix}_instagram`] ?? null,
    whatsapp: r[`${prefix}_whatsapp`] ?? null,
    facebook: r[`${prefix}_facebook`] ?? null,
  });
}

export interface BlockRow {
  id: string;
  date_from: string;
  date_to: string;
  note: string | null;
}

export function mapBlock(row: BlockRow): UnavailabilityBlock {
  return { id: row.id, dateFrom: row.date_from, dateTo: row.date_to, ...(row.note ? { note: row.note } : {}) };
}

export interface BookedRow {
  engagement_id: string;
  job_id: string;
  title: string;
  city: string;
  date_from: string;
  date_to: string;
  p_name: string;
  p_email: string;
  p_phone: string | null;
  p_portfolio_url: string | null;
  p_instagram: string | null;
  p_whatsapp: string | null;
  p_facebook: string | null;
}

/** Full own profile including blocks and accepted jobs. Only for the profile's owner. */
export function isThemePreference(value: unknown): value is 'system' | 'light' | 'dark' {
  return value === 'system' || value === 'light' || value === 'dark';
}

export async function loadOwnProfile(db: D1Database, userId: string, env?: Env): Promise<OwnProfile | null> {
  const row = await db
    .prepare(`SELECT ${PROFILE_COLUMNS}, first_name, last_name, company_name, (password_hash IS NOT NULL) AS has_password, theme_preference FROM profiles WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<ProfileRow & { has_password: number; theme_preference: string; first_name: string; last_name: string; company_name: string }>();
  if (!row) return null;
  const today = todayUtc();
  const [blocks, booked] = await Promise.all([
    db
      .prepare(
        `SELECT id, date_from, date_to, note FROM unavailability_blocks
         WHERE profile_id = ? AND date_to >= ? ORDER BY date_from`
      )
      .bind(userId, today)
      .all<BlockRow>(),
    db
      .prepare(
        `SELECT e.id AS engagement_id, j.id AS job_id, j.title, j.city, j.date_from, j.date_to,
                ${contactSelect('p', 'p')}
         FROM engagements e
         JOIN jobs j ON j.id = e.job_id
         JOIN profiles p ON p.id = j.author_id
         WHERE e.worker_id = ? AND e.status = 'accepted' AND j.status = 'active' AND j.visibility IN ('public', 'direct') AND j.date_to >= ?
           AND j.job_type IN ('subcontract_needed', 'guarantor_needed')
         ORDER BY j.date_from`
      )
      .bind(userId, today)
      .all<BookedRow>(),
  ]);
  const bookedJobs: BookedJob[] = booked.results.map((b) => ({
    engagementId: b.engagement_id,
    jobId: b.job_id,
    title: b.title,
    city: b.city,
    dateFrom: b.date_from,
    dateTo: b.date_to,
    posterContact: mapContactPrefixed(b, 'p'),
  }));
  return {
    ...mapPublicPerson(row),
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    companyName: row.company_name ?? '',
    email: row.email,
    isAdmin: env ? isAdmin(env, row.email) : false,
    hasPassword: Boolean(row.has_password),
    themePreference: isThemePreference(row.theme_preference) ? row.theme_preference : 'system',
    ...(row.phone ? { phone: row.phone } : {}),
    region: row.region,
    emailDigest: Boolean(row.email_digest),
    acceptingJobs: Boolean(row.accepting_jobs),
    directoryVisible: Boolean(row.directory_visible),
    ...(row.portfolio_url ? { portfolioUrl: row.portfolio_url } : {}),
    ...(row.instagram ? { instagram: row.instagram } : {}),
    ...(row.whatsapp ? { whatsapp: row.whatsapp } : {}),
    ...(row.facebook ? { facebook: row.facebook } : {}),
    blocks: blocks.results.map(mapBlock),
    booked: bookedJobs,
  };
}

export interface JobRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  job_type: string;
  monument_status: string;
  monument_name: string | null;
  image_url: string | null;
  /** JSON array of job_photos objects (subquery in JOB_SELECT); unordered, jobRowPhotos sorts it. */
  photos_json: string | null;
  required_crafts_json: string;
  region: string;
  city: string;
  date_from: string;
  date_to: string;
  budget_note: string;
  reward_type: string | null;
  reward_amount: number | null;
  reward_currency: string | null;
  reward_scope: string | null;
  status: string;
  visibility: string;
  direct_to: string | null;
  direct_to_name: string | null;
  /** Direct listing: the invited person's engagement (subqueries in JOB_SELECT). */
  di_id: string | null;
  di_status: string | null;
  di_respond_by: string | null;
  di_contacted_at: string | null;
  created_at: string;
  expires_at: string | null;
  a_name: string;
  a_group: string;
  a_email: string;
  a_phone: string | null;
  a_portfolio_url: string | null;
  a_instagram: string | null;
  a_whatsapp: string | null;
  a_facebook: string | null;
  interested_count: number;
  /** declined + withdrawn engagements (D43); exposed to the author only. */
  ended_count: number;
}

export const JOB_SELECT = `
  SELECT j.id, j.author_id, j.title, j.description, j.job_type, j.monument_status, j.monument_name,
         j.image_url,
         (SELECT json_group_array(json_object('id', p.id, 'url', p.url, 'position', p.position, 'created_at', p.created_at)) FROM job_photos p WHERE p.job_id = j.id) AS photos_json,
         j.required_crafts_json, j.region, j.city, j.date_from, j.date_to, j.budget_note,
         j.reward_type, j.reward_amount, j.reward_currency, j.reward_scope,
         j.status, j.visibility, j.direct_to, dt.name AS direct_to_name, j.created_at, j.expires_at,
         a.name AS a_name, a.directory_group AS a_group,
         a.email AS a_email, a.phone AS a_phone, a.portfolio_url AS a_portfolio_url, a.instagram AS a_instagram,
         a.whatsapp AS a_whatsapp, a.facebook AS a_facebook,
         (SELECT COUNT(*) FROM engagements e WHERE e.job_id = j.id AND e.status IN ('pending', 'accepted')) AS interested_count,
         (SELECT COUNT(*) FROM engagements e WHERE e.job_id = j.id AND e.status IN ('declined', 'withdrawn')) AS ended_count,
         (SELECT e.id FROM engagements e WHERE e.job_id = j.id AND e.worker_id = j.direct_to) AS di_id,
         (SELECT e.status FROM engagements e WHERE e.job_id = j.id AND e.worker_id = j.direct_to) AS di_status,
         (SELECT e.respond_by FROM engagements e WHERE e.job_id = j.id AND e.worker_id = j.direct_to) AS di_respond_by,
         (SELECT e.contacted_at FROM engagements e WHERE e.job_id = j.id AND e.worker_id = j.direct_to) AS di_contacted_at
  FROM jobs j JOIN profiles a ON a.id = j.author_id LEFT JOIN profiles dt ON dt.id = j.direct_to`;

export interface JobViewer {
  userId: string;
  engagement?: MyEngagement;
  busyDays?: number;
  /** Offers only: the viewer's own poster-initiated invitations to this offer's author. */
  invites?: MyInvite[];
}

/** Crafts of a job row, parsed once (shared by the mapping and the invitation fit checks). */
export function jobRowCrafts(row: Pick<JobRow, 'required_crafts_json'>): string[] {
  return safeJsonParse<string[]>(row.required_crafts_json, []);
}

/** State of the single invitation of a direct listing (owner only). `unconfirmed` is derived from respond_by. */
function directInviteOf(row: JobRow): NonNullable<PublicJob['directInvite']> {
  const status = (row.di_status ?? 'none') as NonNullable<PublicJob['directInvite']>['status'];
  return {
    ...(row.di_id ? { engagementId: row.di_id } : {}),
    status,
    unconfirmed: status === 'pending' && !row.di_contacted_at && !!row.di_respond_by && row.di_respond_by < todayUtc(),
    ...(status === 'pending' && row.di_contacted_at ? { contactedAt: row.di_contacted_at } : {}),
    ...(row.di_respond_by ? { respondBy: row.di_respond_by } : {}),
  };
}

/** Photos of a job row (D45), in display order; empty when the job has none. */
export function jobRowPhotos(row: Pick<JobRow, 'photos_json'>): { id: string; url: string }[] {
  const raw = safeJsonParse<{ id: string; url: string; position: number; created_at: string }[]>(row.photos_json ?? '[]', []);
  return [...raw]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .map(({ id, url }) => ({ id, url }));
}

export function mapJobRow(row: JobRow, viewer?: JobViewer): PublicJob {
  const photos = jobRowPhotos(row);
  const imageUrl = photos[0]?.url ?? row.image_url;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    jobType: row.job_type as PublicJob['jobType'],
    monumentStatus: row.monument_status as PublicJob['monumentStatus'],
    ...(row.monument_name ? { monumentName: row.monument_name } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(photos.length > 0 ? { photos } : {}),
    crafts: jobRowCrafts(row),
    region: row.region,
    city: row.city,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    budgetNote: row.budget_note,
    ...(row.reward_type
      ? {
          reward: {
            type: row.reward_type as RewardType,
            ...(row.reward_amount !== null ? { amount: Number(row.reward_amount) } : {}),
            ...(row.reward_currency ? { currency: row.reward_currency as 'CZK' | 'EUR' } : {}),
            ...(row.reward_scope ? { scope: row.reward_scope } : {}),
          },
        }
      : {}),
    status: row.status === 'active' ? 'active' : 'closed',
    visibility: row.visibility === 'direct' ? 'direct' : 'public',
    ...(row.visibility === 'direct' && viewer && viewer.userId === row.author_id ? { directInvite: directInviteOf(row) } : {}),
    ...(row.visibility === 'direct' && row.direct_to ? { directTo: { id: row.direct_to, name: row.direct_to_name ?? '' } } : {}),
    createdAt: row.created_at,
    poster: {
      id: row.author_id,
      name: row.a_name,
      group: mapGroup(row.a_group),
    },
    interestedCount: Number(row.interested_count ?? 0),
    ...(viewer
      ? {
          isMine: row.author_id === viewer.userId,
          ...(row.author_id === viewer.userId ? { endedCount: Number(row.ended_count ?? 0) } : {}),
          ...(viewer.engagement ? { myEngagement: viewer.engagement } : {}),
          ...(viewer.invites && viewer.invites.length > 0 ? { myInvites: viewer.invites } : {}),
          ...(viewer.busyDays !== undefined ? { myBusyDays: viewer.busyDays } : {}),
          // Any logged-in viewer sees the poster's contacts; anonymous callers pass no viewer.
          posterContact: mapContactPrefixed(row, 'a'),
        }
      : {}),
  };
}

export async function insertNotification(
  db: D1Database,
  n: { profileId: string; type: string; jobId?: string; engagementId?: string; reason?: string | null; actorId?: string }
): Promise<void> {
  await db
    .prepare(`INSERT INTO notifications (id, profile_id, type, job_id, engagement_id, reason, actor_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(`n-${crypto.randomUUID()}`, n.profileId, n.type, n.jobId ?? null, n.engagementId ?? null, n.reason ?? null, n.actorId ?? null)
    .run();
}

/**
 * Statements that notify every worker with a pending or accepted engagement that the job is closed.
 * Shared by closing (PATCH) and the admin delete; the caller puts them in the same db.batch as the update.
 */
export async function jobClosedNotifications(db: D1Database, jobId: string): Promise<D1PreparedStatement[]> {
  const engagements = await db
    .prepare(`SELECT id, worker_id FROM engagements WHERE job_id = ? AND status IN ('pending', 'accepted')`)
    .bind(jobId)
    .all<{ id: string; worker_id: string }>();
  return engagements.results.map((e) =>
    db
      .prepare(`INSERT INTO notifications (id, profile_id, type, job_id, engagement_id) VALUES (?, ?, 'job_closed', ?, ?)`)
      .bind(`n-${crypto.randomUUID()}`, e.worker_id, jobId, e.id)
  );
}
