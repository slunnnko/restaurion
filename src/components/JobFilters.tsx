'use client';

import React from 'react';
import { FilterState } from '@/types';
import { Search, MapPin, SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react';

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
  completedJobsCount = 0,
}) => {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-4 sm:p-5 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000] mb-6 transition-colors">
      {/* Hlavní vyhledávání */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        <div className="relative md:col-span-6">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Hledat zakázku, řemeslo nebo město (např. Mikulov, štuk, zlacení...)"
            value={filters.searchQuery}
            onChange={(e) => update('searchQuery', e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all placeholder:text-stone-500 dark:placeholder:text-stone-400 text-[#111111] dark:text-white font-semibold"
          />
        </div>

        {/* Region */}
        <div className="relative md:col-span-3">
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none z-10" />
          <select
            value={filters.region}
            onChange={(e) => update('region', e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all text-[#111111] dark:text-white font-bold cursor-pointer appearance-none"
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

        {/* Typ poptávky */}
        <div className="relative md:col-span-3">
          <SlidersHorizontal className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none z-10" />
          <select
            value={filters.jobType}
            onChange={(e) => update('jobType', e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all text-[#111111] dark:text-white font-bold cursor-pointer appearance-none"
          >
            <option value="all">Všechny typy poptávek</option>
            <option value="subcontract_needed">Hledám subdodavatele</option>
            <option value="guarantor_needed">Hledám zaštítění licencí MK ČR</option>
            <option value="craftsman_available">Nabízím se</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
        </div>
      </div>

      {/* Rychlé pilulky oborů a památkový filtr */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 max-w-full">
          {craftCategories.map((cat) => {
            const isSelected = filters.craft === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => update('craft', cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]'
                    : 'bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-[#111111] dark:border-stone-500 hover:bg-stone-100 dark:hover:bg-[#323644]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
          {/* Filtr stavu zakázek (Aktivní vs. Kompaktní archiv realizovaných s recenzemi) */}
          <div className="relative">
            <select
              value={filters.statusFilter}
              onChange={(e) =>
                onChange({
                  ...filters,
                  statusFilter: e.target.value as FilterState['statusFilter'],
                })
              }
              className={`pl-3 pr-8 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-xs font-extrabold focus:outline-hidden cursor-pointer appearance-none ${
                filters.statusFilter !== 'active'
                  ? 'bg-[#FEF08A] text-[#111111] shadow-[2px_2px_0px_#111111]'
                  : 'bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-white'
              }`}
            >
              <option value="active">Jen aktivní nabídky</option>
              <option value="completed">
                Ukončené & realizované ({completedJobsCount}) – archiv & recenze
              </option>
              <option value="all">Vše (aktivní + kompaktní archiv)</option>
            </select>
            <ChevronDown
              className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                filters.statusFilter !== 'active'
                  ? 'text-[#111111]'
                  : 'text-[#111111] dark:text-stone-300'
              }`}
            />
          </div>

          {/* Filtr na kulturní památku */}
          <div className="relative">
            <select
              value={filters.monumentStatus}
              onChange={(e) => update('monumentStatus', e.target.value)}
              className="pl-3 pr-8 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-xs font-extrabold text-[#111111] dark:text-white bg-[#FFFDF7] dark:bg-[#121318] focus:outline-hidden cursor-pointer appearance-none"
            >
              <option value="all">Všechny objekty</option>
              <option value="cultural_monument">Jen kulturní památky (vyžadují licenci)</option>
              <option value="non_monument">Jen běžné historické objekty</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-[#111111] bg-rose-100 hover:bg-rose-200 text-xs font-extrabold text-[#111111] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
              title="Obnovit filtry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
