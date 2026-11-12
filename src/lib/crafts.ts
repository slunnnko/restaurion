// Obory pro filtr nástěnky: nabízejí se jako návrhy ve vyhledávání (JobFilters) a filtrují
// `job.requiredCrafts` (page.tsx). Kmeny jsou bez diakritiky, aby „Kameník“ i „Čištění kamene“
// spadly pod „Kámen & štuk“ a „Restaurátor dřeva“ pod „Dřevo & nábytek“.

export interface CraftCategory {
  id: string;
  label: string;
  stems: string[];
}

export const CRAFT_CATEGORIES: CraftCategory[] = [
  { id: 'kámen', label: 'Kámen & štuk', stems: ['kamen', 'stuk', 'sochar', 'omitk', 'piskovec', 'mramor'] },
  { id: 'dřevo', label: 'Dřevo & nábytek', stems: ['drev', 'nabyt', 'truhl', 'rezb', 'intarz', 'fladr'] },
  { id: 'malba', label: 'Nástěnné malby & sgrafita', stems: ['malb', 'malir', 'nastenn', 'sgrafit', 'fresk', 'sablon'] },
  { id: 'kov', label: 'Kovářství & kovy', stems: ['kov', 'zamecn', 'mosaz', 'litin'] },
  { id: 'zlacení', label: 'Zlacení & polychromie', stems: ['zlac', 'zlat', 'polychrom', 'poliment'] },
];

export const normalizeText = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Návrhy oborů pro text z vyhledávání. Slovo dotazu musí kmen začínat nebo jím začínat („kovářské“ → kov), nikoli ho jen obsahovat („Mikulov“ ≠ kov). */
export function suggestCrafts(query: string): CraftCategory[] {
  const q = normalizeText(query.trim());
  if (!q) return CRAFT_CATEGORIES;
  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  return CRAFT_CATEGORIES.filter(
    (cat) =>
      normalizeText(cat.label).includes(q) ||
      cat.stems.some((stem) => words.some((w) => stem.startsWith(w) || w.startsWith(stem)))
  );
}

/** Odpovídá zakázka vybranému oboru? Neznámé id (např. starý odkaz) porovná jako podřetězec. */
export function jobMatchesCraft(requiredCrafts: string[], craftId: string): boolean {
  const cat = CRAFT_CATEGORIES.find((c) => c.id === craftId);
  const crafts = requiredCrafts.map(normalizeText);
  if (!cat) {
    const needle = normalizeText(craftId);
    return crafts.some((c) => c.includes(needle));
  }
  return crafts.some((c) => cat.stems.some((stem) => c.includes(stem)));
}

/** Převede id oborů nebo starý volný text (např. „Kameník“) na id kategorií; bez duplicit. */
export function toCraftIds(values: string[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    if (CRAFT_CATEGORIES.some((c) => c.id === value)) {
      out.add(value);
      continue;
    }
    // Kmen musí začínat slovo („Pískovec“ nesmí spadnout pod kov kvůli podřetězci).
    const words = normalizeText(value).split(/[^a-z0-9]+/).filter(Boolean);
    for (const cat of CRAFT_CATEGORIES) {
      if (cat.stems.some((stem) => words.some((w) => w.startsWith(stem)))) out.add(cat.id);
    }
  }
  return [...out];
}
