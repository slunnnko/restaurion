'use client';

import React, { useState } from 'react';
import { FeatureFlags, FilterState } from '@/types';
import { Search, MapPin, RotateCcw, ChevronDown, UserRound } from 'lucide-react';
import { CRAFT_CATEGORIES, suggestCrafts } from '@/lib/crafts';

interface JobFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  activeCount: number;
  featureFlags?: FeatureFlags;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onChange,
  onReset,
  activeCount,
  featureFlags,
}) => {
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);

  const ffWhiteShadows = Boolean(featureFlags?.darkWhiteShadows);

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const cardShadow = ffWhiteShadows
    ? 'shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#F8FAFC]'
    : 'shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000]';
  const pillShadow = ffWhiteShadows
    ? 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
    : 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';
  const inputBorder = ffWhiteShadows ? 'dark:border-stone-400' : 'dark:border-stone-500';

  const query = filters.searchQuery.trim();
  const suggestions = suggestCrafts(query);

  const selectedCraft = CRAFT_CATEGORIES.find((c) => c.id === filters.craft);
  const isMineActive = Boolean(filters.ownerFilter && filters.ownerFilter !== 'all');

  const selectCraft = (id: string) => {
    onChange({ ...filters, craft: id, searchQuery: '' });
    setIsSuggestOpen(false);
  };

  return (
    <div
      className={`bg-white dark:bg-[#1C1E26] border-2 border-[#111111] ${
        ffWhiteShadows ? 'dark:border-stone-300' : 'dark:border-stone-500'
      } rounded-2xl p-3.5 sm:p-5 ${cardShadow} mb-5 sm:mb-6 transition-colors`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
        {/* Vyhledávání + nabídka oborů */}
        <div className="relative md:col-span-7">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Hledat zakázku, řemeslo nebo město…"
            value={filters.searchQuery}
            onChange={(e) => update('searchQuery', e.target.value)}
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
                  onClick={() => selectCraft(cat.id)}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-[#111111] dark:text-white hover:bg-[#FEF08A] dark:hover:bg-[#323644] cursor-pointer"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Region + Moje inzeráty: na mobilu vedle sebe */}
        <div className="flex gap-2.5 md:contents">
          <div className="relative flex-1 min-w-0 md:col-span-3">
            <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none z-10" />
            <select
              value={filters.region}
              onChange={(e) => update('region', e.target.value)}
              className={`w-full h-11 pl-10 pr-9 rounded-xl border-2 border-[#111111] ${inputBorder} bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all text-[#111111] dark:text-white font-bold cursor-pointer appearance-none`}
            >
              <option value="Všechny regiony">Všechny regiony</option>
              <option value="Praha">Praha</option>
              <option value="Středočeský kraj">Středočeský kraj</option>
              <option value="Jihočeský kraj">Jihočeský kraj</option>
              <option value="Plzeňský kraj">Plzeňský kraj</option>
              <option value="Karlovarský kraj">Karlovarský kraj</option>
              <option value="Ústecký kraj">Ústecký kraj</option>
              <option value="Liberecký kraj">Liberecký kraj</option>
              <option value="Královéhradecký kraj">Královéhradecký kraj</option>
              <option value="Pardubický kraj">Pardubický kraj</option>
              <option value="Kraj Vysočina">Kraj Vysočina</option>
              <option value="Jihomoravský kraj">Jihomoravský kraj</option>
              <option value="Olomoucký kraj">Olomoucký kraj</option>
              <option value="Zlínský kraj">Zlínský kraj</option>
              <option value="Moravskoslezský kraj">Moravskoslezský kraj</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          </div>

          <button
            type="button"
            aria-pressed={isMineActive}
            onClick={() => onChange({ ...filters, ownerFilter: isMineActive ? 'all' : 'mine' })}
            className={`h-11 w-auto md:w-full md:col-span-2 shrink-0 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border-2 border-[#111111] ${inputBorder} text-xs font-extrabold transition-all cursor-pointer ${
              isMineActive
                ? `bg-[#FEF08A] text-[#111111] ${pillShadow}`
                : 'bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-white'
            }`}
          >
            <UserRound className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Moje</span>
            <span className="hidden sm:inline">Moje inzeráty</span>
          </button>
        </div>
      </div>

      {(selectedCraft || activeCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t-2 border-[#111111]/15 dark:border-stone-700">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {selectedCraft && (
              <span className="inline-flex items-center gap-1.5 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-extrabold">
                {selectedCraft.label}
                <button
                  type="button"
                  onClick={() => update('craft', 'all')}
                  aria-label="Zrušit filtr oboru"
                  className="leading-none cursor-pointer hover:text-rose-700"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-[#111111] bg-rose-100 hover:bg-rose-200 text-xs font-extrabold text-[#111111] ${pillShadow} transition-all cursor-pointer`}
              title="Obnovit filtry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
