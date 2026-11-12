// Vyhledávání na nástěnce: volný text + štítky (obor, kraj, město, zadavatel).
// Štítky stejného druhu se sčítají (NEBO), různé druhy se kombinují (A ZÁROVEŇ).
// Návrhy se skládají z toho, co v zakázkách opravdu je (města, kraje, zadavatelé), takže
// nabídnou jen hodnoty, které něco najdou.

import type { PublicJob } from '@/types/api';
import { CRAFT_CATEGORIES, jobMatchesCraft, normalizeText, suggestCrafts } from './crafts.ts';

export type TokenKind = 'craft' | 'region' | 'city' | 'poster';

export interface FilterToken {
  kind: TokenKind;
  /** craft: id kategorie; ostatní: přesná hodnota z dat (kraj, město, jméno zadavatele). */
  value: string;
}

export interface Suggestion extends FilterToken {
  label: string;
  count: number;
}

export const KIND_LABEL: Record<TokenKind, string> = {
  craft: 'Obory',
  region: 'Kraje',
  city: 'Města',
  poster: 'Zadavatelé',
};

const KIND_ORDER: TokenKind[] = ['craft', 'region', 'city', 'poster'];
/** Kolik návrhů na druh při psaní a při prázdném poli. */
const LIMIT_TYPING = 5;
const LIMIT_EMPTY: Record<TokenKind, number> = { craft: 10, region: 14, city: 6, poster: 5 };

export const sameToken = (a: FilterToken, b: FilterToken) => a.kind === b.kind && a.value === b.value;

export function tokenLabel(token: FilterToken): string {
  if (token.kind === 'craft') return CRAFT_CATEGORIES.find((c) => c.id === token.value)?.label ?? token.value;
  return token.value;
}

/** Slovo v názvu začíná dotazem („pra“ → Praha, „hrad“ → Hradec Králové) nebo ho název obsahuje celý. */
function labelMatches(label: string, normQuery: string): boolean {
  const norm = normalizeText(label);
  if (norm.includes(normQuery) && normQuery.includes(' ')) return true;
  return norm.split(/[\s,-]+/).some((w) => w.startsWith(normQuery));
}

function countBy(jobs: PublicJob[], pick: (j: PublicJob) => string | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const job of jobs) {
    const v = pick(job)?.trim();
    if (v) out.set(v, (out.get(v) ?? 0) + 1);
  }
  return out;
}

/** Návrhy pro text v poli; už vybrané štítky se nenabízejí. Prázdný dotaz = přehled, co v zakázkách je. */
export function buildSuggestions(jobs: PublicJob[], query: string, selected: FilterToken[]): Suggestion[] {
  const normQuery = normalizeText(query.trim());
  const isTaken = (t: FilterToken) => selected.some((s) => sameToken(s, t));
  const out: Suggestion[] = [];

  const byCount = (a: { count: number; label: string }, b: { count: number; label: string }) =>
    b.count - a.count || a.label.localeCompare(b.label, 'cs');

  const push = (kind: TokenKind, items: Suggestion[]) => {
    const limit = normQuery ? LIMIT_TYPING : LIMIT_EMPTY[kind];
    out.push(...items.filter((i) => !isTaken(i)).sort(byCount).slice(0, limit));
  };

  // Obory: jen ty, ke kterým existuje zakázka; shoda přes kmeny (kovářské → Kovářství & kovy).
  const crafts = (normQuery ? suggestCrafts(query) : CRAFT_CATEGORIES)
    .map((c) => ({
      kind: 'craft' as const,
      value: c.id,
      label: c.label,
      count: jobs.filter((j) => jobMatchesCraft(j.crafts, c.id)).length,
    }))
    .filter((c) => c.count > 0);
  push('craft', crafts);

  const regions = [...countBy(jobs, (j) => j.region)]
    .filter(([label]) => !normQuery || labelMatches(label, normQuery))
    .map(([label, count]) => ({ kind: 'region' as const, value: label, label, count }));
  push('region', regions);

  // Město se stejným názvem jako kraj (Praha) se nenabízí dvakrát; kraj je širší.
  const regionNames = new Set(regions.map((r) => normalizeText(r.label)));
  const cities = [...countBy(jobs, (j) => j.city)]
    .filter(([label]) => (!normQuery || labelMatches(label, normQuery)) && !regionNames.has(normalizeText(label)))
    .map(([label, count]) => ({ kind: 'city' as const, value: label, label, count }));
  push('city', cities);

  const posters = [...countBy(jobs, (j) => j.poster.name)]
    .filter(([label]) => !normQuery || labelMatches(label, normQuery))
    .map(([label, count]) => ({ kind: 'poster' as const, value: label, label, count }));
  push('poster', posters);

  return out.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

function jobMatchesToken(job: PublicJob, token: FilterToken): boolean {
  switch (token.kind) {
    case 'craft':
      return jobMatchesCraft(job.crafts, token.value);
    case 'region':
      return job.region === token.value;
    case 'city':
      return job.city === token.value;
    case 'poster':
      return job.poster.name === token.value;
  }
}

/** Druh bez štítku nefiltruje; uvnitř druhu stačí jedna shoda. */
export function jobMatchesTokens(job: PublicJob, tokens: FilterToken[]): boolean {
  return KIND_ORDER.every((kind) => {
    const ofKind = tokens.filter((t) => t.kind === kind);
    return ofKind.length === 0 || ofKind.some((t) => jobMatchesToken(job, t));
  });
}

/** Volný text hledá v názvu, popisu, městě, kraji, památce, oborech a jménu zadavatele. */
export function jobMatchesText(job: PublicJob, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  const craftLabels = job.crafts.map((c) => CRAFT_CATEGORIES.find((cat) => cat.id === c)?.label ?? c);
  const haystack = normalizeText(
    [job.title, job.description, job.city, job.region, job.monumentName ?? '', job.poster.name, ...craftLabels].join(' ')
  );
  return haystack.includes(q);
}
