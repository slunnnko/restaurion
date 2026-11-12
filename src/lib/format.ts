// Formátování dat a české skloňování.

import type { PublicJob } from '@/types/api';

const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
const dateYearFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** „3. 3. – 12. 3. 2027“ (rok jen na konci, pokud je shodný). */
export function formatRange(from: string, to: string): string {
  const a = parse(from);
  const b = parse(to);
  if (from === to) return dateYearFmt.format(b);
  if (a.getFullYear() === b.getFullYear()) return `${dateFmt.format(a)} – ${dateYearFmt.format(b)}`;
  return `${dateYearFmt.format(a)} – ${dateYearFmt.format(b)}`;
}

/** „15. 11.“ pro lhůtu na potvrzení pozvánky (D40). */
export function formatShortDay(iso: string): string {
  const d = parse(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

/** Dnešní datum jako 'YYYY-MM-DD' (UTC, shodně se serverem). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Czech plural form: 1 → one, 2–4 → few, otherwise many (word only, without the number). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/** 1 den, 2–4 dny, 5+ dní */
export function pluralDays(n: number): string {
  return `${n} ${plural(n, 'den', 'dny', 'dní')}`;
}

/** 1 řemeslníka, 2–4 řemeslníky, 5+ řemeslníků (4. pád: „Upozornili jsme …“). */
export function pluralCraftsmen(n: number): string {
  if (n === 1) return `${n} řemeslníka`;
  if (n >= 2 && n <= 4) return `${n} řemeslníky`;
  return `${n} řemeslníků`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const amountFmt = new Intl.NumberFormat('cs-CZ');

/** Jediná implementace textu odměny (karta i budget_note na serveru): „25 000 Kč za celou práci“, „450 €/hod“, „Dohodou“. */
export function formatRewardText(
  type: 'negotiable' | 'hourly' | 'fixed',
  amount: number | null | undefined,
  currency: 'CZK' | 'EUR' | null | undefined,
): string {
  if (type === 'negotiable' || amount === null || amount === undefined) return 'Dohodou';
  const unit = currency === 'EUR' ? '€' : 'Kč';
  return `${amountFmt.format(amount)} ${unit}${type === 'hourly' ? '/hod' : ' za celou práci'}`;
}

/** Odměna pro kartu: řádek se sumou a případný rozsah. Staré řádky bez `reward` ukážou budgetNote. */
export function rewardDisplay(job: { budgetNote: string; reward?: PublicJob['reward'] }): { headline: string; scope?: string } {
  const r = job.reward;
  if (!r) return { headline: job.budgetNote || 'Dohodou' };
  const headline = formatRewardText(r.type, r.amount, r.currency);
  if (headline === 'Dohodou') return { headline };
  return { headline, scope: r.scope };
}

/** „1 nové upozornění“ / „3 nová upozornění“ / „5 nových upozornění“. */
export function unreadLabel(n: number): string {
  if (n === 1) return '1 nové upozornění';
  if (n >= 2 && n <= 4) return `${n} nová upozornění`;
  return `${n} nových upozornění`;
}
