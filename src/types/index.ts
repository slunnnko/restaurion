// Tvary API (Job, profil, upozornění …) jsou v src/types/api.ts. Zde jen stav UI.

import type { FilterToken } from '@/lib/jobSearch';

export interface FilterState {
  searchQuery: string;
  /** Štítky z návrhů (obor, kraj, město, zadavatel); viz `src/lib/jobSearch.ts`. */
  tokens: FilterToken[];
  mineOnly: boolean;
}
