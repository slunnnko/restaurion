// Tvary API (Job, profil, upozornění …) jsou v src/types/api.ts. Zde jen stav UI.

export interface FilterState {
  searchQuery: string;
  region: string;
  craft: string; // 'all' nebo id oboru z CRAFT_CATEGORIES
  mineOnly: boolean;
}
