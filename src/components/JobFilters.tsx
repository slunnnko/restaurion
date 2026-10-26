'use client';

import React, { useState } from 'react';
import { FilterState } from '@/types';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';

interface JobFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  activeCount: number;
  completedJobsCount?: number;
}

const craftCategories = [
  { id: 'all', label: 'Všechny obory' },
  { id: 'kámen', label: 'Kámen & štuk' },
  { id: 'dřevo', label: 'Dřevo & nábytek' },
  { id: 'malba', label: 'Nástěnné malby & sgrafita' },
  { id: 'kov', label: 'Kovářství & kovy' },
  { id: 'zlacení', label: 'Zlacení & polychromie' },
];

export const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onChange,
  onReset,
  activeCount,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  // Počet aktivních filtrů mimo fulltextové vyhledávání
  const nonSearchActiveCount =
    (filters.region !== 'Všechny regiony' ? 1 : 0) +
    (filters.craft !== 'all' ? 1 : 0) +
    (filters.monumentStatus !== 'all' ? 1 : 0) +
    (filters.jobType !== 'all' ? 1 : 0) +
    (filters.statusFilter !== 'active' ? 1 : 0);

  return (
    <div className="bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-3.5 sm:p-5 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#F8FAFC] mb-5 sm:mb-6 transition-colors overflow-hidden">
      {/* Hlavní vyhledávání + mobilní tlačítko pro rozbalení filtrů („...“) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 md:col-span-6">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Hledat zakázku, řemeslo nebo město..."
              value={filters.searchQuery}
              onChange={(e) => update('searchQuery', e.target.value)}
              className="w-full h-11 pl-10 pr-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all placeholder:text-stone-500 dark:placeholder:text-stone-400 text-[#111111] dark:text-white font-semibold"
            />
          </div>

          {/* Mobilní tlačítko „... Filtry“ pro stručné zobrazení na telefonu */}
          <button
            type="button"
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className={`md:hidden inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-300 text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
              isMobileExpanded || nonSearchActiveCount > 0
                ? 'bg-[#FEF08A] text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                : 'bg-[#FFFDF7] dark:bg-[#262933] text-[#111111] dark:text-white shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
            }`}
            title={isMobileExpanded ? 'Skrýt podrobné filtry' : 'Zobrazit filtry a obory'}
          >
            <MoreHorizontal className="w-4 h-4 shrink-0" />
            <span>Filtry</span>
            {nonSearchActiveCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#111111] text-[#FEF08A] text-[10px] font-extrabold">
                {nonSearchActiveCount}
              </span>
            )}
            {isMobileExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>
        </div>

        {/* Region – na mobilu schovaný pod „... Filtry“, na desktopu vždy viditelný */}
        <div className={`${isMobileExpanded ? 'block' : 'hidden'} md:block relative md:col-span-3`}>
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none z-10" />
          <select
            value={filters.region}
            onChange={(e) => update('region', e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all text-[#111111] dark:text-white font-bold cursor-pointer appearance-none"
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

        {/* Typ poptávky – na mobilu schovaný pod „... Filtry“, na desktopu vždy viditelný */}
        <div className={`${isMobileExpanded ? 'block' : 'hidden'} md:block relative md:col-span-3`}>
          <SlidersHorizontal className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none z-10" />
          <select
            value={filters.jobType}
            onChange={(e) => update('jobType', e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all text-[#111111] dark:text-white font-bold cursor-pointer appearance-none"
          >
            <option value="all">Všechny typy poptávek</option>
            <option value="subcontract_needed">Hledám subdodavatele</option>
            <option value="guarantor_needed">Hledám zaštítění licencí MK ČR</option>
            <option value="craftsman_available">Nabízím se</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
        </div>
      </div>

      {/* Stručný souhrn aktivních filtrů na mobilu, pokud jsou filtry sbalené */}
      {!isMobileExpanded && nonSearchActiveCount > 0 && (
        <div className="md:hidden flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#111111]/15 dark:border-stone-700 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {filters.region !== 'Všechny regiony' && (
              <span className="px-2 py-0.5 rounded-lg bg-[#FEF08A] text-[#111111] border border-[#111111] font-extrabold">
                {filters.region}
              </span>
            )}
            {filters.craft !== 'all' && (
              <span className="px-2 py-0.5 rounded-lg bg-[#FEF08A] text-[#111111] border border-[#111111] font-extrabold">
                {craftCategories.find((c) => c.id === filters.craft)?.label || filters.craft}
              </span>
            )}
            {filters.statusFilter !== 'active' && (
              <span className="px-2 py-0.5 rounded-lg bg-[#FEF08A] text-[#111111] border border-[#111111] font-extrabold">
                {filters.statusFilter === 'completed' ? 'Ukončené' : 'Všechny stavy'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#111111] bg-rose-100 text-[#111111] font-extrabold shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Rychlé pilulky oborů a památkový filtr – na mobilu rozbalitelné přes „... Filtry“, na desktopu vždy viditelné */}
      <div
        className={`${
          isMobileExpanded ? 'flex' : 'hidden'
        } md:flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-3 pt-3.5 mt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700`}
      >
        <div className="flex flex-wrap gap-1.5 sm:gap-2 max-w-full">
          {craftCategories.map((cat) => {
            const isSelected = filters.craft === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => update('craft', cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                    : 'bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-[#111111] dark:border-stone-400 hover:bg-stone-100 dark:hover:bg-[#323644]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Spodní selecty – na mobilu se zalamují každý na vlastní celý řádek (w-full sm:w-auto), nikdy nepřetékají mimo kartu */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:ml-auto min-w-0">
          {/* Filtr stavu zakázek (Aktivní vs. Neaktivní zašedlé karty) */}
          <div className="relative w-full sm:w-auto min-w-0">
            <select
              value={filters.statusFilter}
              onChange={(e) =>
                onChange({
                  ...filters,
                  statusFilter: e.target.value as FilterState['statusFilter'],
                })
              }
              className={`w-full sm:w-auto max-w-full h-11 pl-3 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 text-xs font-extrabold focus:outline-hidden cursor-pointer appearance-none truncate ${
                filters.statusFilter !== 'active'
                  ? 'bg-[#FEF08A] text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                  : 'bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-white'
              }`}
            >
              <option value="active">Jen aktivní nabídky</option>
              <option value="completed">Neaktivní & ukončené (zašedlé)</option>
              <option value="all">Vše (aktivní + neaktivní zašedlé)</option>
            </select>
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                filters.statusFilter !== 'active'
                  ? 'text-[#111111]'
                  : 'text-[#111111] dark:text-stone-300'
              }`}
            />
          </div>

          {/* Filtr na kulturní památku */}
          <div className="relative w-full sm:w-auto min-w-0">
            <select
              value={filters.monumentStatus}
              onChange={(e) => update('monumentStatus', e.target.value)}
              className="w-full sm:w-auto max-w-full h-11 pl-3 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 text-xs font-extrabold text-[#111111] dark:text-white bg-[#FFFDF7] dark:bg-[#121318] focus:outline-hidden cursor-pointer appearance-none truncate"
            >
              <option value="all">Všechny objekty</option>
              <option value="cultural_monument">Jen kulturní památky (vyžadují licenci)</option>
              <option value="non_monument">Jen běžné historické objekty</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={onReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl border-2 border-[#111111] bg-rose-100 hover:bg-rose-200 text-xs font-extrabold text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] transition-all cursor-pointer"
              title="Obnovit filtry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filtrů</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
