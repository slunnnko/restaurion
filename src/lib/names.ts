// D52: tituly nepatří do jmen. Sdílí UI i server (čistá funkce, žádné importy).

const DOTLESS_TITLES = new Set(['mba', 'msc', 'bsc', 'ma', 'ba', 'phd', 'artd', 'thd', 'dis', 'csc', 'llm']);

/** Drops academic/professional title tokens. A token with a dot is a title, so are the dot-less forms from a small list. Commas separate; whitespace collapses. */
export function stripTitles(s: string): string {
  return s
    .split(/[\s,]+/)
    .filter((t) => t !== '' && !t.includes('.') && !DOTLESS_TITLES.has(t.toLowerCase()))
    .join(' ');
}
