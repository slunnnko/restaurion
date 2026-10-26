// Sdílené typy a pomocné funkce pro Cloudflare Pages Functions (/api/*)

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
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  writeHttpMetadata(headers: Headers): void;
  etag: string;
}

export interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface Env {
  DB?: D1Database;
  PHOTOS?: R2Bucket;
  RESEND_API_KEY?: string;
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

export function formatRelativeDateCz(isoDate: string | null | undefined): string {
  if (!isoDate) return 'dnes';
  // Pokud je to už český text z původních seed dat (např. "před 2 hodinami"), vrať ho
  if (!/^\d{4}-\d{2}-\d{2}/.test(isoDate)) {
    return isoDate;
  }
  const parsed = new Date(isoDate.includes('T') ? isoDate : `${isoDate.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 2) return 'právě teď';
  if (diffMin < 60) return `před ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `před ${diffHours} hod`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'včera';
  if (diffDays < 7) return `před ${diffDays} dny`;
  return parsed.toLocaleDateString('cs-CZ');
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

export async function isRequestAdminAuthorized(
  request: Request,
  env: Env,
  candidatePassword?: string
): Promise<boolean> {
  const configuredSecret = env.ADMIN_PASSWORD?.trim() || 'restaurion-admin';
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

export async function sendEmailViaResend(
  env: Env,
  options: { to: string; subject: string; html: string; replyTo?: string }
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log('[Resend Fallback - Email Simulation]', options);
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
        from: 'Restaurion <notifikace@restaurion.cz>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Chyba při odesílání e-mailu přes Resend:', err);
    return false;
  }
}

