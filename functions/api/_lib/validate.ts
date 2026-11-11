// Validace vstupů zakázek, profilu a dostupnosti. Chyby jdou po polích (fieldErrors).

import { CRAFT_CATEGORIES } from '../../../src/lib/crafts.ts';
import { daysInRange } from '../../../src/lib/matching.ts';
import { isIsoDate, jsonResponse, todayUtc } from '../_shared.ts';

export type FieldErrors = Record<string, string>;

export function validationResponse(fieldErrors: FieldErrors): Response {
  return jsonResponse({ error: 'Zkontrolujte vyplněné údaje.', fieldErrors }, 400);
}

export const JOB_TYPES = ['subcontract_needed', 'guarantor_needed', 'craftsman_available'];
export const DIRECTORY_GROUPS = ['firm', 'licensed', 'unlicensed'];
export const MONUMENT_STATUSES = ['cultural_monument', 'national_monument', 'historic_unregistered', 'craft_work'];
export const PHONE_RE = /^[+()\d\s.-]{7,25}$/;

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isDirectoryGroup(value: unknown): value is 'firm' | 'licensed' | 'unlicensed' {
  return typeof value === 'string' && DIRECTORY_GROUPS.includes(value);
}

/** Group 'licensed' needs a licence number. Returns the error text or null. */
export function groupLicenceError(group: string, licenceNumber: string | null | undefined): string | null {
  if (group === 'licensed' && !(licenceNumber ?? '').trim()) {
    return 'Pro skupinu Licencovaný restaurátor vyplň číslo povolení MK ČR.';
  }
  return null;
}

/** http(s) URL up to `max` chars, or false. */
export function isHttpUrl(value: string, max = 300): boolean {
  if (!value || value.length > max) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const INSTAGRAM_RESERVED = ['accounts', 'p', 'reel', 'reels', 'explore', 'stories', 'tv'];
const FACEBOOK_HOSTS = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com'];

/**
 * Instagram handle or profile URL → bare handle (no @). '' stays ''. Returns null when invalid
 * (characters outside [A-Za-z0-9._], longer than 60, or a URL of another site).
 */
export function normalizeInstagram(value: string): string | null {
  let v = value.trim();
  if (v === '') return '';
  if (/^https?:\/\//i.test(v) || /^(www\.)?instagram\.com\//i.test(v)) {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (!/^(www\.)?instagram\.com$/i.test(u.hostname)) return null;
      v = u.pathname.split('/').filter(Boolean)[0] ?? '';
      if (INSTAGRAM_RESERVED.includes(v.toLowerCase())) return null;
    } catch {
      return null;
    }
  }
  v = v.replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,60}$/.test(v) ? v : null;
}

/** Facebook profile/page URL (http(s), host facebook.com / fb.com family, up to 300 chars). '' stays ''. null when invalid. */
export function normalizeFacebook(value: string): string | null {
  const v = value.trim();
  if (v === '') return '';
  if (!isHttpUrl(v)) return null;
  return FACEBOOK_HOSTS.includes(new URL(v).hostname.toLowerCase()) ? v : null;
}

/**
 * WhatsApp number → digits only (wa.me format). '' stays ''. 9 digits without country code get 420.
 * Returns null when invalid (phone-field characters only, 11–15 digits after normalisation).
 */
export function normalizeWhatsapp(value: string): string | null {
  const v = value.trim();
  if (v === '') return '';
  if (!PHONE_RE.test(v)) return null;
  let digits = v.replace(/\D/g, '');
  if (digits.length === 9 && !v.startsWith('+')) digits = `420${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export function validCraftIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = CRAFT_CATEGORIES.map((c) => c.id);
  if (!value.every((v) => typeof v === 'string' && ids.includes(v))) return null;
  return [...new Set(value as string[])];
}

export function validateDateRange(
  dateFrom: unknown,
  dateTo: unknown,
  errors: FieldErrors,
  opts: { checkFrom: boolean }
): void {
  const today = todayUtc();
  if (!isIsoDate(dateFrom)) errors.dateFrom = 'Zadejte datum začátku.';
  else if (opts.checkFrom && dateFrom < today) errors.dateFrom = 'Začátek nemůže být v minulosti.';
  if (!isIsoDate(dateTo)) errors.dateTo = 'Zadejte datum konce.';
  else if (isIsoDate(dateFrom) && dateTo < dateFrom) errors.dateTo = 'Konec nemůže být před začátkem.';
  else if (isIsoDate(dateFrom) && daysInRange(dateFrom, dateTo) > 366) errors.dateTo = 'Zakázka může trvat nejvýše 366 dní.';
}

export interface JobFields {
  title: string;
  description: string;
  jobType: string;
  monumentStatus: string;
  monumentName: string;
  crafts: string[];
  region: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  budgetNote: string;
}

export function validateNewJob(body: Record<string, unknown>): { errors: FieldErrors; values: JobFields } {
  const errors: FieldErrors = {};
  const title = str(body.title);
  const description = str(body.description);
  const city = str(body.city);
  const region = str(body.region);
  const budgetNote = str(body.budgetNote) || 'Dle dohody';
  const monumentName = str(body.monumentName);
  const crafts = validCraftIds(body.crafts) ?? [];

  if (title.length < 5 || title.length > 120) errors.title = 'Název musí mít 5 až 120 znaků.';
  if (description.length > 2000) errors.description = 'Popis může mít nejvýše 2000 znaků.';
  if (!JOB_TYPES.includes(body.jobType as string)) errors.jobType = 'Vyberte typ zakázky.';
  // An offer ("Nabízím se") has no object: status is fixed and the name is dropped.
  const isOffer = body.jobType === 'craftsman_available';
  if (!isOffer && !MONUMENT_STATUSES.includes(body.monumentStatus as string)) errors.monumentStatus = 'Vyberte status objektu.';
  if (!isOffer && monumentName.length > 120) errors.monumentName = 'Název objektu může mít nejvýše 120 znaků.';
  if (crafts.length === 0) errors.crafts = 'Vyberte alespoň jeden obor.';
  if (!region || region.length > 60) errors.region = 'Vyberte kraj.';
  if (city.length < 2 || city.length > 60) errors.city = 'Obec musí mít 2 až 60 znaků.';
  if (budgetNote.length > 120) errors.budgetNote = 'Odměna může mít nejvýše 120 znaků.';
  validateDateRange(body.dateFrom, body.dateTo, errors, { checkFrom: true });

  return {
    errors,
    values: {
      title,
      description,
      jobType: str(body.jobType),
      monumentStatus: isOffer ? 'craft_work' : str(body.monumentStatus),
      monumentName: isOffer ? '' : monumentName,
      crafts,
      region,
      city,
      dateFrom: str(body.dateFrom),
      dateTo: str(body.dateTo),
      budgetNote,
    },
  };
}

/** A profile needs a name (3+ chars) before it can post a job or respond. */
export function profileNameMissing(name: string | null | undefined): boolean {
  return (name ?? '').trim().length < 3;
}

export function profileNameResponse(): Response {
  return jsonResponse({ error: 'Nejdřív si v profilu vyplň jméno.', fieldErrors: { profile: 'name' } }, 400);
}
