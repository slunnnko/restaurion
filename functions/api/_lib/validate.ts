// Validace vstupů zakázek, profilu a dostupnosti. Chyby jdou po polích (fieldErrors).

import { CRAFT_CATEGORIES } from '../../../src/lib/crafts.ts';
import { daysInRange } from '../../../src/lib/matching.ts';
import { isIsoDate, jsonResponse, todayUtc } from '../_shared.ts';

export type FieldErrors = Record<string, string>;

export function validationResponse(fieldErrors: FieldErrors): Response {
  return jsonResponse({ error: 'Zkontrolujte vyplněné údaje.', fieldErrors }, 400);
}

export const JOB_TYPES = ['subcontract_needed', 'guarantor_needed'];
export const MONUMENT_STATUSES = ['cultural_monument', 'national_monument', 'historic_unregistered', 'craft_work'];
export const PHONE_RE = /^[+()\d\s.-]{7,25}$/;

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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
  if (!MONUMENT_STATUSES.includes(body.monumentStatus as string)) errors.monumentStatus = 'Vyberte status objektu.';
  if (monumentName.length > 120) errors.monumentName = 'Název objektu může mít nejvýše 120 znaků.';
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
      monumentStatus: str(body.monumentStatus),
      monumentName,
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
