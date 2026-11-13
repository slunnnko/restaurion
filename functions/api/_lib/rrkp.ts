// Automatic licence check against the public MK ČR restorer registry (D49). Pure parsers + one check function.
import type { Env } from '../_shared.ts';
import { stripTitles } from '../../../src/lib/names.ts';

export type LicenceCheckResult = 'verified' | 'not_found' | 'name_mismatch' | 'ambiguous' | 'taken' | 'unavailable';

export const DEFAULT_RRKP_BASE_URL = 'https://rrkp.mkcr.cz';
const MAX_LIST_IDS = 5;
const NO_RECORDS_MARKER = 'Nebyly nalezeny žádné záznamy';

/** One rate limit for both ways of starting a check (POST /api/profile/licence-check and the inline check in PUT /api/profile). */
export const LICENCE_CHECK_BUCKET = 'licence-check';
export const LICENCE_CHECK_MAX = 5;
export const LICENCE_CHECK_WINDOW_MIN = 60;

export interface LicenceIdentity {
  licenceNumber: string | null;
  firstName: string;
  lastName: string;
}

/** True when a save invalidates the verification: the number changed (or was cleared), or the name changed while a number is set. */
export function licenceRecheckNeeded(before: LicenceIdentity, after: LicenceIdentity): boolean {
  const numberChanged = (after.licenceNumber ?? '') !== (before.licenceNumber ?? '');
  const nameChanged = after.firstName !== before.firstName || after.lastName !== before.lastName;
  return numberChanged || (nameChanged && Boolean(after.licenceNumber));
}
const TIMEOUT_MS = 8000;

export function rrkpBase(env?: Pick<Env, 'RRKP_BASE_URL'>): string {
  return (env?.RRKP_BASE_URL || DEFAULT_RRKP_BASE_URL).replace(/\/$/, '');
}

/** Lowercase, no whitespace, no leading "č.j." / "čj" / "MK" / "MK ČR" prefix or its separators. */
export function normalizeLicenceNumber(s: string): string {
  let v = s.trim().toLowerCase().replace(/\s+/g, '');
  v = v.replace(/^(?:mkčr|mk|č\.j\.|čj\.?|č\.j)/, '');
  return v.replace(/^[-:]+/, '');
}

/** Equal after normalisation; numbers that differ only by dots (15077/91 vs 15.077/91) are equal too. */
export function licenceNumbersEqual(a: string, b: string): boolean {
  const x = normalizeLicenceNumber(a);
  const y = normalizeLicenceNumber(b);
  if (x === '' || y === '') return false;
  return x === y || x.replace(/\./g, '') === y.replace(/\./g, '');
}

export function parseListIds(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/\/rejstrik\/([A-Za-z0-9]+)(?![A-Za-z0-9])/g)) ids.add(m[1]);
  return [...ids];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function text(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export interface RrkpPermit {
  scope: string;
  number: string;
  validFrom: string;
}

export function parseDetail(html: string): { name: string; permits: RrkpPermit[] } {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const permits: RrkpPermit[] = [];
  const rowRe =
    /<tr[^>]*>\s*<td[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  for (const m of html.matchAll(rowRe)) {
    permits.push({ scope: text(m[1]), number: text(m[2]), validFrom: text(m[3]) });
  }
  return { name: h1 ? text(h1[1]) : '', permits };
}

function nameTokens(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
}

/** Registry name as shown to people: the part before the first comma, titles stripped (D52). */
export function registryDisplayName(registryName: string): string {
  return stripTitles(registryName.split(',')[0] ?? '');
}

/** Every token of the last name and of the first name must appear in the registry name. Titles are ignored on both sides (D52). */
export function nameMatches(registryName: string, firstName: string, lastName: string): boolean {
  const first = nameTokens(stripTitles(firstName));
  const last = nameTokens(stripTitles(lastName));
  if (first.length === 0 || last.length === 0) return false;
  const reg = new Set(nameTokens(registryDisplayName(registryName)));
  return [...last, ...first].every((t) => reg.has(t));
}

export interface LicenceCheckOutcome {
  result: LicenceCheckResult;
  registryId?: string;
  registryName?: string;
  scope?: string[];
}

export async function checkLicence(args: {
  number: string;
  firstName: string;
  lastName: string;
  fetchFn?: typeof fetch;
  baseUrl?: string;
}): Promise<LicenceCheckOutcome> {
  const number = args.number.trim();
  if (normalizeLicenceNumber(number).length < 4) return { result: 'not_found' };
  const fetchFn = args.fetchFn ?? fetch;
  const base = (args.baseUrl ?? DEFAULT_RRKP_BASE_URL).replace(/\/$/, '');
  const get = async (url: string): Promise<string> => {
    const res = await fetchFn(url, {
      headers: { 'User-Agent': 'Restaurion licence check (+https://restaurion.pages.dev)' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`rrkp ${res.status}`);
    return res.text();
  };
  try {
    const listHtml = await get(`${base}/rejstrik?form[cisloJednaci]=${encodeURIComponent(number)}`);
    const ids = parseListIds(listHtml);
    if (ids.length === 0) {
      // A page with neither ids nor the "no records" text means the markup changed: not a real "not found".
      return { result: listHtml.includes(NO_RECORDS_MARKER) ? 'not_found' : 'unavailable' };
    }
    if (ids.length > MAX_LIST_IDS) return { result: 'ambiguous' };
    let nameMismatch: string | null = null;
    for (const id of ids) {
      const detail = parseDetail(await get(`${base}/rejstrik/${id}`));
      if (!detail.name || detail.permits.length === 0) return { result: 'unavailable' };
      if (!detail.permits.some((p) => licenceNumbersEqual(p.number, number))) continue;
      if (nameMatches(detail.name, args.firstName, args.lastName)) {
        return { result: 'verified', registryId: id, registryName: detail.name, scope: [...new Set(detail.permits.map((p) => p.scope))] };
      }
      nameMismatch ??= detail.name;
    }
    return nameMismatch ? { result: 'name_mismatch', registryName: nameMismatch } : { result: 'not_found' };
  } catch (err) {
    console.error('Kontrola licence selhala:', err);
    return { result: 'unavailable' };
  }
}

/** One registry record can be verified for one profile only: a 'verified' outcome whose record another profile already holds becomes 'taken'. */
export function applyOwnership(out: LicenceCheckOutcome, takenByOther: boolean): LicenceCheckOutcome {
  return out.result === 'verified' && takenByOther ? { result: 'taken' } : out;
}

/** Runs the check for one profile and stores the outcome. Never throws for registry problems. */
export async function runLicenceCheck(
  db: NonNullable<Env['DB']>,
  userId: string,
  env: Env,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const row = await db
    .prepare(`SELECT licence_number, first_name, last_name FROM profiles WHERE id = ?`)
    .bind(userId)
    .first<{ licence_number: string | null; first_name: string; last_name: string }>();
  if (!row) return;
  if (!row.licence_number) {
    await db
      .prepare(
        `UPDATE profiles SET licence_verified = 0, licence_checked_at = NULL, licence_check_result = NULL,
           licence_scope = NULL, licence_registry_id = NULL, licence_registry_name = NULL WHERE id = ?`
      )
      .bind(userId)
      .run();
    return;
  }
  const checked = await checkLicence({
    number: row.licence_number,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    fetchFn,
    baseUrl: rrkpBase(env),
  });
  let takenByOther = false;
  if (checked.result === 'verified' && checked.registryId) {
    const other = await db
      .prepare(`SELECT id FROM profiles WHERE id <> ? AND licence_verified = 1 AND licence_registry_id = ? LIMIT 1`)
      .bind(userId, checked.registryId)
      .first<{ id: string }>();
    takenByOther = Boolean(other);
  }
  const out = applyOwnership(checked, takenByOther);
  // The writes are conditional on the values that were checked: a concurrent profile edit wins and the stale result is dropped.
  const unchanged = `id = ? AND licence_number = ? AND first_name = ? AND last_name = ?`;
  const guard = [userId, row.licence_number, row.first_name ?? '', row.last_name ?? ''];
  if (out.result === 'unavailable') {
    await db
      // licence_checked_at stays untouched, so the cron retries it on its next run.
      // A definitive failure (orange flag, D52) is kept: an outage must not clear it.
      .prepare(
        `UPDATE profiles SET licence_check_result = 'unavailable' WHERE ${unchanged}
           AND (licence_check_result IS NULL OR licence_check_result NOT IN ('not_found', 'name_mismatch', 'ambiguous', 'taken'))`
      )
      .bind(...guard)
      .run();
    return;
  }
  const write = (o: LicenceCheckOutcome) => {
    const ok = o.result === 'verified';
    return db
      .prepare(
        `UPDATE profiles SET licence_verified = ?, licence_check_result = ?, licence_scope = ?, licence_registry_id = ?,
           licence_registry_name = ?, licence_checked_at = datetime('now') WHERE ${unchanged}`
      )
      .bind(
        ok ? 1 : 0,
        o.result,
        ok ? JSON.stringify(o.scope ?? []) : null,
        ok ? o.registryId ?? null : null,
        ok || o.result === 'name_mismatch' ? o.registryName ?? null : null, // name_mismatch keeps the holder name for the owner's hint only (never public)
        ...guard
      )
      .run();
  };
  try {
    await write(out);
  } catch (err) {
    // The partial unique index (0017) is the real guard: a parallel check that verified the same record first wins.
    if (out.result !== 'verified' || !/UNIQUE constraint failed/i.test(String(err))) throw err;
    await write({ result: 'taken' });
  }
}
