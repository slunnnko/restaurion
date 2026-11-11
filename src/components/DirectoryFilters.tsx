'use client';

import React, { useState } from 'react';
import { DirectoryGroup } from '@/types/api';
import { Search, MapPin, RotateCcw, ChevronDown } from 'lucide-react';
import { CRAFT_CATEGORIES, suggestCrafts } from '@/lib/crafts';
import { REGIONS } from '@/lib/regions';

export interface DirectoryFilterState {
  q: string;
  region: string;
  craft: string; // 'all' nebo id oboru
  group: 'all' | DirectoryGroup;
}

export const initialDirectoryFilters: DirectoryFilterState = {
  q: '',
  region: 'Všechny regiony',
  craft: 'all',
  group: 'all',
};

const GROUPS: { id: DirectoryFilterState['group']; label: string }[] = [
  { id: 'all', label: 'Vše' },
  { id: 'firm', label: 'Firmy' },
  { id: 'licensed', label: 'Licencovaní' },
  { id: 'unlicensed', label: 'Bez licence' },
];

interface DirectoryFiltersProps {
  filters: DirectoryFilterState;
  onChange: (filters: DirectoryFilterState) => void;
}

export const DirectoryFilters: React.FC<DirectoryFiltersProps> = ({ filters, onChange }) => {
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const inputBorder = 'dark:border-stone-500';
  const pillShadow = 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';

  const query = filters.q.trim();
  const suggestions = suggestCrafts(query);
  const selectedCraft = CRAFT_CATEGORIES.find((c) => c.id === filters.craft);
  const active =
    (filters.q ? 1 : 0) + (filters.region !== 'Všechny regiony' ? 1 : 0) + (filters.craft !== 'all' ? 1 : 0) + (filters.group !== 'all' ? 1 : 0);

  return (
    <div className="bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-3.5 sm:p-5 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000] mb-5 sm:mb-6 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
        <div className="relative md:col-span-8">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Hledat jméno, firmu nebo zkušenost…"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            onFocus={() => setIsSuggestOpen(true)}
            onBlur={() => setIsSuggestOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSuggestOpen(false);
            }}
            className={`w-full h-11 pl-10 pr-3.5 rounded-xl border-2 border-[#111111] ${inputBorder} bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all placeholder:text-stone-500 dark:placeholder:text-stone-400 text-[#111111] dark:text-white font-semibold`}
          />
          {isSuggestOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-400 rounded-xl shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] p-1.5">
              <div className="px-3 pt-1 pb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {query ? 'Filtrovat obor:' : 'Obory'}
              </div>
              {suggestions.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ ...filters, craft: cat.id, q: '' });
                    setIsSuggestOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-[#111111] dark:text-white hover:bg-[#FEF08A] dark:hover:bg-[#323644] cursor-pointer"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative md:col-span-4">
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none z-10" />
          <select
            value={filters.region}
            onChange={(e) => onChange({ ...filters, region: e.target.value })}
            className={`w-full h-11 pl-10 pr-9 rounded-xl border-2 border-[#111111] ${inputBorder} bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all text-[#111111] dark:text-white font-bold cursor-pointer appearance-none`}
          >
            <option value="Všechny regiony">Všechny regiony</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t-2 border-[#111111]/15 dark:border-stone-700">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {GROUPS.map((g) => {
            const on = filters.group === g.id;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...filters, group: g.id })}
                className={`px-3 py-1.5 rounded-lg border-2 border-[#111111] ${inputBorder} text-xs font-extrabold transition-all cursor-pointer ${
                  on
                    ? `bg-[#FEF08A] text-[#111111] ${pillShadow}`
                    : 'bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#262933]'
                }`}
              >
                {g.label}
              </button>
            );
          })}
          {selectedCraft && (
            <span className="inline-flex items-center gap-1.5 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-extrabold">
              {selectedCraft.label}
              <button
                type="button"
                onClick={() => onChange({ ...filters, craft: 'all' })}
                aria-label="Zrušit filtr oboru"
                className="leading-none cursor-pointer hover:text-rose-700"
              >
                ×
              </button>
            </span>
          )}
        </div>
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(initialDirectoryFilters)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-[#111111] bg-rose-100 hover:bg-rose-200 text-xs font-extrabold text-[#111111] ${pillShadow} transition-all cursor-pointer`}
            title="Obnovit filtry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
