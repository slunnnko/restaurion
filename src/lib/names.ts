// D52: tituly nepatří do jmen. Sdílí UI i server (čistá funkce, žádné importy).

// Case-sensitive on purpose: "MA" / "BA" / "DiS" are titles, "Ma" or "Ba" can be a real surname.
const DOTLESS_TITLES = new Set(
  ['MBA', 'MSc', 'BSc', 'MA', 'BA', 'PhD', 'ArtD', 'ThD', 'DiS', 'CSc', 'LLM'].flatMap((t) => [t, t.toUpperCase()]),
);

/** Drops academic/professional title tokens. A token with a dot is a title, so are the dot-less forms from a small list. Commas separate; whitespace collapses. */
export function stripTitles(s: string): string {
  return s
    .split(/[\s,]+/)
    .filter((t) => t !== '' && !t.includes('.') && !DOTLESS_TITLES.has(t))
    .join(' ');
}
