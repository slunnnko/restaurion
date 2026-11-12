'use client';

import React, { useMemo, useState } from 'react';
import { FilterState } from '@/types';
import type { PublicJob } from '@/types/api';
import { Search, MapPin, RotateCcw, UserRound } from 'lucide-react';
import {
  buildSuggestions,
  FilterToken,
  KIND_LABEL,
  sameToken,
  Suggestion,
  tokenLabel,
  TokenKind,
} from '@/lib/jobSearch';

interface JobFiltersProps {
  filters: FilterState;
  /** Zakázky aktuální záložky; z nich se skládají návrhy (města, kraje, zadavatelé, obory). */
  jobs: PublicJob[];
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  activeCount: number;
}

const TokenIcon: React.FC<{ kind: TokenKind }> = ({ kind }) => {
  if (kind === 'region' || kind === 'city') return <MapPin className="w-3 h-3 shrink-0" />;
  if (kind === 'poster') return <UserRound className="w-3 h-3 shrink-0" />;
  return null;
};

export const JobFilters: React.FC<JobFiltersProps> = ({ filters, jobs, onChange, onReset, activeCount }) => {
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const cardShadow = 'shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000]';
  const pillShadow = 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';
  const inputBorder = 'dark:border-stone-500';

  const query = filters.searchQuery.trim();
  const suggestions = useMemo(
    () => buildSuggestions(jobs, filters.searchQuery, filters.tokens),
    [jobs, filters.searchQuery, filters.tokens]
  );
  const isMineActive = filters.mineOnly;

  const addToken = (token: FilterToken) => {
    if (filters.tokens.some((t) => sameToken(t, token))) return;
    onChange({ ...filters, tokens: [...filters.tokens, { kind: token.kind, value: token.value }], searchQuery: '' });
    setActiveIdx(0);
  };

  const removeToken = (token: FilterToken) => {
    onChange({ ...filters, tokens: filters.tokens.filter((t) => !sameToken(t, token)) });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSuggestOpen(false);
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setIsSuggestOpen(true);
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && query && isSuggestOpen && suggestions.length > 0) {
      e.preventDefault();
      addToken(suggestions[Math.min(activeIdx, suggestions.length - 1)]);
    } else if (e.key === 'Backspace' && !filters.searchQuery && filters.tokens.length > 0) {
      removeToken(filters.tokens[filters.tokens.length - 1]);
    }
  };

  // Návrhy po druzích; pořadí v poli `suggestions` už je seřazené podle druhu.
  const groups: { kind: TokenKind; items: { s: Suggestion; idx: number }[] }[] = [];
  suggestions.forEach((s, idx) => {
    const last = groups[groups.length - 1];
    if (last && last.kind === s.kind) last.items.push({ s, idx });
    else groups.push({ kind: s.kind, items: [{ s, idx }] });
  });

  return (
    <div
      className={`bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-3.5 sm:p-5 ${cardShadow} mb-5 sm:mb-6 transition-colors`}
    >
      <div className="flex gap-2.5 sm:gap-3">
        {/* Vyhledávání + návrhy z existujících zakázek */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
          <input
            type="text"
            role="combobox"
            aria-expanded={isSuggestOpen && suggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="job-suggestions"
            placeholder="Hledat zakázku, město, kraj, obor nebo zadavatele…"
            value={filters.searchQuery}
            onChange={(e) => {
              onChange({ ...filters, searchQuery: e.target.value });
              setActiveIdx(0);
              setIsSuggestOpen(true);
            }}
            onFocus={() => setIsSuggestOpen(true)}
            onBlur={() => setIsSuggestOpen(false)}
            onKeyDown={onKeyDown}
            className={`w-full h-11 pl-10 pr-3.5 rounded-xl border-2 border-[#111111] ${inputBorder} bg-[#FFFDF7] dark:bg-[#121318] text-sm focus:outline-hidden focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] transition-all placeholder:text-stone-500 dark:placeholder:text-stone-400 text-[#111111] dark:text-white font-semibold`}
          />

          {isSuggestOpen && suggestions.length > 0 && (
            <div
              id="job-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-80 overflow-y-auto bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-400 rounded-xl shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] p-1.5"
            >
              {groups.map((group) => (
                <div key={group.kind}>
                  <div className="px-3 pt-1.5 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {KIND_LABEL[group.kind]}
                  </div>
                  {group.items.map(({ s, idx }) => (
                    <button
                      key={`${s.kind}:${s.value}`}
                      type="button"
                      role="option"
                      aria-selected={idx === activeIdx}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => addToken(s)}
                      className={`flex w-full items-center justify-between gap-3 text-left px-3 py-2 rounded-lg text-sm font-bold text-[#111111] dark:text-white cursor-pointer ${
                        idx === activeIdx ? 'bg-[#FEF08A] dark:bg-[#323644]' : 'hover:bg-[#FEF08A]/60 dark:hover:bg-[#323644]'
                      }`}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="text-xs font-extrabold text-stone-500 dark:text-stone-400 shrink-0">{s.count}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-pressed={isMineActive}
          onClick={() => onChange({ ...filters, mineOnly: !isMineActive })}
          className={`h-11 shrink-0 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl border-2 border-[#111111] ${inputBorder} text-xs font-extrabold transition-all cursor-pointer ${
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

      {(filters.tokens.length > 0 || activeCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t-2 border-[#111111]/15 dark:border-stone-700">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {filters.tokens.map((token) => (
              <span
                key={`${token.kind}:${token.value}`}
                className="inline-flex items-center gap-1.5 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-extrabold"
              >
                <TokenIcon kind={token.kind} />
                {tokenLabel(token)}
                <button
                  type="button"
                  onClick={() => removeToken(token)}
                  aria-label={`Zrušit filtr ${tokenLabel(token)}`}
                  className="leading-none cursor-pointer hover:text-rose-700"
                >
                  ×
                </button>
              </span>
            ))}
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
