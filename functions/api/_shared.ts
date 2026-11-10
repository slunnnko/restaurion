// Sdílené typy a pomocné funkce pro Cloudflare Pages Functions (/api/*)
// Mapování řádků na veřejné typy je jen zde, aby žádný endpoint neprozradil e-mail ani telefon.

import type {
  BookedJob,
  ContactInfo,
  EngagementStatus,
  OwnProfile,
  PublicJob,
  PublicPerson,
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

export interface Env {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
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

export async function computeAdminCookieToken(secret: string): Promise<string> {
  return sha256Hex(`restaurion-admin-v1:${secret}`);
}

/** Fails closed: without a configured ADMIN_PASSWORD nobody is authorized. */
export async function isRequestAdminAuthorized(
  request: Request,
  env: Env,
  candidatePassword?: string
): Promise<boolean> {
  const configuredSecret = env.ADMIN_PASSWORD?.trim();
  if (!configuredSecret) return false;
  const expectedToken = await computeAdminCookieToken(configuredSecret);

  if (typeof candidatePassword === 'string' && candidatePassword.length > 0) {
    const candidateToken = await computeAdminCookieToken(candidatePassword.trim());
    if (candidateToken === expectedToken) return true;
  }

  const headerPassword = request.headers.get('X-Admin-Password');
  if (headerPassword) {
    const headerToken = await computeAdminCookieToken(headerPassword.trim());
    if (headerToken === expectedToken) return true;
  }

  const cookieToken = getCookie(request, 'restaurion_admin');
  if (cookieToken && cookieToken === expectedToken) {
    return true;
  }

  return false;
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

/** Returns the session user id, or a 401 JSON response. */
export async function requireUser(
  request: Request,
  db: D1Database
): Promise<{ userId: string } | { response: Response }> {
  const userId = await getAuthenticatedUserId(request, db);
  if (!userId) return { response: jsonResponse({ error: 'Pro tuto akci se musíte přihlásit.' }, 401) };
  return { userId };
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

/** Returns true when the event is allowed (and records it), false when the limit is reached. */
export async function rateLimit(
  db: D1Database,
  bucket: string,
  key: string,
  max: number,
  windowMin: number
): Promise<boolean> {
  const keyHash = await sha256Hex(`rl:${key}`);
  const since = new Date(Date.now() - windowMin * 60_000).toISOString().replace('T', ' ').slice(0, 19);
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM rate_limit_events WHERE bucket = ? AND key_hash = ? AND created_at >= ?`)
    .bind(bucket, keyHash, since)
    .first<{ n: number }>();
  if ((row?.n ?? 0) >= max) return false;
  await db.prepare(`INSERT INTO rate_limit_events (bucket, key_hash) VALUES (?, ?)`).bind(bucket, keyHash).run();
  // housekeeping: forget events older than a day
  await db.prepare(`DELETE FROM rate_limit_events WHERE created_at < datetime('now', '-1 day')`).run();
  return true;
}

// ---- Email ----

export async function emailsSentToday(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM email_log WHERE sent_at >= date('now')`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Sends through Resend. Without key or from address only logs to console and returns false. */
export async function sendEmailViaResend(
  env: Env,
  options: { to: string; subject: string; html: string; kind: 'login_code' | 'digest'; profileId?: string | null }
): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
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
  licence_verified: number;
  email_digest: number;
  accepting_jobs: number;
}

export const PROFILE_COLUMNS =
  'id, email, name, region, phone, crafts, experience_text, portfolio_url, licence_number, licence_verified, email_digest, accepting_jobs';

export function mapPublicPerson(row: ProfileRow): PublicPerson {
  return {
    id: row.id,
    name: row.name,
    crafts: safeJsonParse<string[]>(row.crafts, []),
    experienceText: row.experience_text ?? '',
    ...(row.portfolio_url ? { portfolioUrl: row.portfolio_url } : {}),
    ...(row.licence_number ? { licenceNumber: row.licence_number } : {}),
    licenceVerified: Boolean(row.licence_verified),
  };
}

export function mapContact(row: Pick<ProfileRow, 'name' | 'email' | 'phone'>): ContactInfo {
  return { name: row.name, email: row.email, ...(row.phone ? { phone: row.phone } : {}) };
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
}

/** Full own profile including blocks and accepted jobs. Only for the profile's owner. */
export async function loadOwnProfile(db: D1Database, userId: string): Promise<OwnProfile | null> {
  const row = await db
    .prepare(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<ProfileRow>();
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
                p.name AS p_name, p.email AS p_email, p.phone AS p_phone
         FROM engagements e
         JOIN jobs j ON j.id = e.job_id
         JOIN profiles p ON p.id = j.author_id
         WHERE e.worker_id = ? AND e.status = 'accepted' AND j.date_to >= ?
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
    posterContact: mapContact({ name: b.p_name, email: b.p_email, phone: b.p_phone }),
  }));
  return {
    ...mapPublicPerson(row),
    email: row.email,
    ...(row.phone ? { phone: row.phone } : {}),
    region: row.region,
    emailDigest: Boolean(row.email_digest),
    acceptingJobs: Boolean(row.accepting_jobs),
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
  required_crafts_json: string;
  region: string;
  city: string;
  date_from: string;
  date_to: string;
  budget_note: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  a_name: string;
  a_licence_verified: number;
  interested_count: number;
}

export const JOB_SELECT = `
  SELECT j.id, j.author_id, j.title, j.description, j.job_type, j.monument_status, j.monument_name,
         j.image_url, j.required_crafts_json, j.region, j.city, j.date_from, j.date_to, j.budget_note,
         j.status, j.created_at, j.expires_at,
         a.name AS a_name, a.licence_verified AS a_licence_verified,
         (SELECT COUNT(*) FROM engagements e WHERE e.job_id = j.id AND e.status IN ('pending', 'accepted')) AS interested_count
  FROM jobs j JOIN profiles a ON a.id = j.author_id`;

export interface JobViewer {
  userId: string;
  engagement?: { id: string; status: EngagementStatus };
  busyDays?: number;
  posterContact?: ContactInfo;
}

export function mapJobRow(row: JobRow, viewer?: JobViewer): PublicJob {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    jobType: row.job_type as PublicJob['jobType'],
    monumentStatus: row.monument_status as PublicJob['monumentStatus'],
    ...(row.monument_name ? { monumentName: row.monument_name } : {}),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    crafts: safeJsonParse<string[]>(row.required_crafts_json, []),
    region: row.region,
    city: row.city,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    budgetNote: row.budget_note,
    status: row.status === 'active' ? 'active' : 'closed',
    createdAt: row.created_at,
    poster: { id: row.author_id, name: row.a_name, licenceVerified: Boolean(row.a_licence_verified) },
    interestedCount: Number(row.interested_count ?? 0),
    ...(viewer
      ? {
          isMine: row.author_id === viewer.userId,
          ...(viewer.engagement ? { myEngagement: viewer.engagement } : {}),
          ...(viewer.busyDays !== undefined ? { myBusyDays: viewer.busyDays } : {}),
          ...(viewer.posterContact ? { posterContact: viewer.posterContact } : {}),
        }
      : {}),
  };
}

export async function insertNotification(
  db: D1Database,
  n: { profileId: string; type: string; jobId?: string; engagementId?: string }
): Promise<void> {
  await db
    .prepare(`INSERT INTO notifications (id, profile_id, type, job_id, engagement_id) VALUES (?, ?, ?, ?, ?)`)
    .bind(`n-${crypto.randomUUID()}`, n.profileId, n.type, n.jobId ?? null, n.engagementId ?? null)
    .run();
}
