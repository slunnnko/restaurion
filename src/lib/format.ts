// Formátování dat a české skloňování.

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

/** Dnešní datum jako 'YYYY-MM-DD' (UTC, shodně se serverem). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 1 den, 2–4 dny, 5+ dní */
export function pluralDays(n: number): string {
  if (n === 1) return `${n} den`;
  if (n >= 2 && n <= 4) return `${n} dny`;
  return `${n} dní`;
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
