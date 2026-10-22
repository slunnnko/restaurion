'use client';

import React from 'react';
import { FilterState } from '@/types';
import { Search, MapPin, SlidersHorizontal, RotateCcw } from 'lucide-react';

interface JobFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  activeCount: number;
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
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#1e1510] border border-amber-900/50 rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
      {/* Hlavní vyhledávání */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        <div className="relative md:col-span-6">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Hledat zakázku, řemeslo nebo město (např. Mikulov, štuk, zlacení...)"
            value={filters.searchQuery}
            onChange={(e) => update('searchQuery', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 bg-white text-sm focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:text-stone-400 text-stone-950 font-medium"
          />
        </div>

        {/* Region */}
        <div className="relative md:col-span-3">
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <select
            value={filters.region}
            onChange={(e) => update('region', e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-stone-300 bg-white text-sm focus:outline-hidden focus:border-amber-500 transition-all text-stone-950 font-medium"
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
        </div>

        {/* Typ poptávky */}
        <div className="relative md:col-span-3">
          <SlidersHorizontal className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <select
            value={filters.jobType}
            onChange={(e) => update('jobType', e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-stone-300 bg-white text-sm focus:outline-hidden focus:border-amber-500 transition-all text-stone-950 font-medium"
          >
            <option value="all">Všechny typy poptávek</option>
            <option value="subcontract_needed">Hledám subdodavatele</option>
            <option value="guarantor_needed">Hledám zaštítění licencí MK</option>
            <option value="craftsman_available">Nabízím se</option>
          </select>
        </div>
      </div>

      {/* Rychlé pilulky oborů a památkový filtr */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-amber-900/30">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-w-full">
          {craftCategories.map((cat) => {
            const isSelected = filters.craft === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => update('craft', cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Filtr na kulturní památku */}
          <select
            value={filters.monumentStatus}
            onChange={(e) => update('monumentStatus', e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-900 bg-white focus:outline-hidden"
          >
            <option value="all">Všechny objekty</option>
            <option value="cultural_monument">Jen kulturní památky (vyžadují licenci)</option>
            <option value="non_monument">Jen běžné historické objekty</option>
          </select>

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-300 hover:text-white transition-colors"
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
