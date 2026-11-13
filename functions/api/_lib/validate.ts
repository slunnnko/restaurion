// Validace vstupů zakázek, profilu a dostupnosti. Chyby jdou po polích (fieldErrors).

import { CRAFT_CATEGORIES } from '../../../src/lib/crafts.ts';
import { formatRewardText } from '../../../src/lib/format.ts';
import { MAX_DESCRIPTION } from '../../../src/lib/limits.ts';
import { stripTitles } from '../../../src/lib/names.ts';
import { phoneDigits } from '../../../src/lib/phone.ts';
import { daysInRange } from '../../../src/lib/matching.ts';
import { isIsoDate, jsonResponse, todayUtc } from '../_shared.ts';

export type FieldErrors = Record<string, string>;

export function validationResponse(fieldErrors: FieldErrors): Response {
  return jsonResponse({ error: 'Zkontrolujte vyplněné údaje.', fieldErrors }, 400);
}

export const JOB_TYPES = ['subcontract_needed', 'guarantor_needed', 'craftsman_available'];
export const DIRECTORY_GROUPS = ['firm', 'licensed', 'unlicensed'];
export const MONUMENT_STATUSES = ['cultural_monument', 'national_monument', 'historic_unregistered', 'craft_work'];

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Defined in _shared.ts (loadOwnProfile needs it) to keep the import graph acyclic.
export { isThemePreference } from '../_shared.ts';

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
 * Phone → display form `+420 777 111 222` (3-3-3 for 420/421 with 9 more digits, else `+<digits>`).
 * '' stays ''. Returns null without a country code or when invalid.
 */
export function normalizePhone(value: string): string | null {
  if (value.trim() === '') return '';
  const digits = phoneDigits(value);
  if (!digits) return null;
  const m = /^(42[01])(\d{3})(\d{3})(\d{3})$/.exec(digits);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${digits}`;
}

/**
 * WhatsApp: a `@username` (3–35 chars [A-Za-z0-9._], a letter, no leading/trailing dot; lower-cased)
 * or a number → digits only (wa.me format). '' stays ''. null when invalid.
 */
export function normalizeWhatsapp(value: string): string | null {
  const v = value.trim();
  if (v === '') return '';
  const user = v.replace(/^@/, '');
  // Without a leading @ the username must start with a letter, so a mistyped number is not taken for one.
  const startOk = v.startsWith('@') || /^[A-Za-z]/.test(user);
  if (startOk && /^[A-Za-z0-9._]{3,35}$/.test(user) && /[A-Za-z]/.test(user) && !user.startsWith('.') && !user.endsWith('.')) {
    return `@${user.toLowerCase()}`;
  }
  return phoneDigits(v);
}

/**
 * Name rules: first and last name required (1–40), company optional (0–80). Display name = company when set,
 * else "first last"; it must have 3–80 chars. Errors keyed firstName / lastName / companyName.
 */
export function validateNameParts(first: string, last: string, company: string): FieldErrors {
  const errors: FieldErrors = {};
  // D52: the caller stores names with titles stripped; a part that is only a title becomes empty and is refused.
  if (first !== '' && stripTitles(first) === '') errors.firstName = 'Jméno bez titulů.';
  if (last !== '' && stripTitles(last) === '') errors.lastName = 'Jméno bez titulů.';
  if (errors.firstName || errors.lastName) return errors;
  first = stripTitles(first);
  last = stripTitles(last);
  // Either a company name, or first + last name (owner decision D35).
  if (first.length < 1 && !company) errors.firstName = 'Vyplň jméno, nebo název firmy.';
  else if (first.length > 40) errors.firstName = 'Nejvýše 40 znaků.';
  if (last.length < 1 && !company) errors.lastName = 'Vyplň příjmení, nebo název firmy.';
  else if (last.length > 40) errors.lastName = 'Nejvýše 40 znaků.';
  if (company.length > 80) errors.companyName = 'Nejvýše 80 znaků.';
  if (!errors.firstName && !errors.lastName && !errors.companyName) {
    const name = company || `${first} ${last}`;
    if (name.length < 3 || name.length > 80) errors[company ? 'companyName' : 'firstName'] = 'Jméno musí mít 3 až 80 znaků.';
  }
  return errors;
}

/** Display name stored in profiles.name. */
export function displayName(first: string, last: string, company: string): string {
  return company || `${first} ${last}`.trim();
}

/** Splits a legacy single `name` at the first space (same rule as migration 0012). */
export function splitName(name: string): { first: string; last: string } {
  const t = name.trim();
  const i = t.indexOf(' ');
  return i < 0 ? { first: t, last: '' } : { first: t.slice(0, i), last: t.slice(i + 1).trim() };
}

export function validCraftIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = CRAFT_CATEGORIES.map((c) => c.id);
  if (!value.every((v) => typeof v === 'string' && ids.includes(v))) return null;
  return [...new Set(value as string[])];
}

/** Shared field rules of a job (create and edit). Each returns the error text or null. */
export function cityError(city: string): string | null {
  return city.length < 2 || city.length > 60 ? 'Obec musí mít 2 až 60 znaků.' : null;
}

export function regionError(region: string): string | null {
  return !region || region.length > 60 ? 'Vyberte kraj.' : null;
}

export function craftsError(crafts: string[]): string | null {
  return crafts.length === 0 ? 'Vyberte alespoň jeden obor.' : null;
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

/** Shared by POST and PUT /api/availability. A block may start in the past but must not end there. */
export function validateBlock(body: Record<string, unknown>): { errors: FieldErrors; note: string } {
  const errors: FieldErrors = {};
  const note = str(body.note);
  if (note.length > 200) errors.note = 'Poznámka může mít nejvýše 200 znaků.';
  validateDateRange(body.dateFrom, body.dateTo, errors, { checkFrom: false });
  if (!errors.dateTo && (body.dateTo as string) < todayUtc()) errors.dateTo = 'Konec nemůže být v minulosti.';
  return { errors, note };
}

export const REWARD_TYPES = ['negotiable', 'hourly', 'fixed'] as const;
export const REWARD_CURRENCIES = ['CZK', 'EUR'] as const;
export const MAX_REWARD_AMOUNT = 10_000_000;
export type RewardType = (typeof REWARD_TYPES)[number];
export type RewardCurrency = (typeof REWARD_CURRENCIES)[number];

export interface RewardFields {
  type: RewardType;
  amount: number | null;
  currency: RewardCurrency | null;
  scope: string | null;
}

/** Human string stored in jobs.budget_note (digest, e-mails, old clients): "450 Kč/hod", "25 000 Kč za celou práci", "Dohodou". */
export function formatBudgetNote(r: RewardFields): string {
  return formatRewardText(r.type, r.amount, r.currency);
}

/**
 * Structured reward of a job or offer (create and edit). Negotiable ignores amount, currency and scope.
 * Hourly and fixed need a positive whole amount (max 10 000 000); fixed also needs a 20–1000 char scope.
 */
export function validateReward(body: Record<string, unknown>, errors: FieldErrors): RewardFields {
  const rawType = body.rewardType === undefined || body.rewardType === null || body.rewardType === '' ? 'negotiable' : body.rewardType;
  if (!REWARD_TYPES.includes(rawType as RewardType)) {
    errors.rewardType = 'Vyberte typ odměny.';
    return { type: 'negotiable', amount: null, currency: null, scope: null };
  }
  const type = rawType as RewardType;
  if (type === 'negotiable') return { type, amount: null, currency: null, scope: null };

  const amount = body.rewardAmount;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > MAX_REWARD_AMOUNT) {
    errors.rewardAmount = 'Zadejte celé kladné číslo (nejvýše 10 000 000).';
  }
  const rawCurrency = body.rewardCurrency === undefined || body.rewardCurrency === null || body.rewardCurrency === '' ? 'CZK' : body.rewardCurrency;
  if (!REWARD_CURRENCIES.includes(rawCurrency as RewardCurrency)) errors.rewardCurrency = 'Vyberte měnu.';
  const scope = str(body.rewardScope);
  if (type === 'fixed' && scope.length < 20) errors.rewardScope = 'Popiš, co se za odměnu očekává (alespoň 20 znaků).';
  else if (scope.length > 1000) errors.rewardScope = 'Popis může mít nejvýše 1000 znaků.';
  return {
    type,
    amount: typeof amount === 'number' ? amount : null,
    currency: rawCurrency as RewardCurrency,
    scope: scope || null,
  };
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
  reward: RewardFields;
}

export function validateNewJob(body: Record<string, unknown>): { errors: FieldErrors; values: JobFields } {
  const errors: FieldErrors = {};
  const title = str(body.title);
  const description = str(body.description);
  const city = str(body.city);
  const region = str(body.region);
  const monumentName = str(body.monumentName);
  const crafts = validCraftIds(body.crafts) ?? [];

  if (title.length < 5 || title.length > 120) errors.title = 'Název musí mít 5 až 120 znaků.';
  if (description.length > MAX_DESCRIPTION) errors.description = 'Popis může mít nejvýše 5000 znaků.';
  if (!JOB_TYPES.includes(body.jobType as string)) errors.jobType = 'Vyberte typ zakázky.';
  // An offer ("Nabízím se") has no object: status is fixed and the name is dropped.
  const isOffer = body.jobType === 'craftsman_available';
  if (!isOffer && !MONUMENT_STATUSES.includes(body.monumentStatus as string)) errors.monumentStatus = 'Vyberte status objektu.';
  if (!isOffer && monumentName.length > 120) errors.monumentName = 'Název objektu může mít nejvýše 120 znaků.';
  const craftsErr = craftsError(crafts);
  if (craftsErr) errors.crafts = craftsErr;
  const regionErr = regionError(region);
  if (regionErr) errors.region = regionErr;
  const cityErr = cityError(city);
  if (cityErr) errors.city = cityErr;
  const reward = validateReward(body, errors);
  const budgetNote = formatBudgetNote(reward);
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
      reward,
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
