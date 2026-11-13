'use client';

import React from 'react';
import { DirectoryEntry, DirectoryGroup } from '@/types/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { ContactsOrLogin } from './ui';
import { BadgeCheck, MapPin, ShieldCheck, Building2, UserRound } from 'lucide-react';

export const GROUP_LABEL: Record<DirectoryGroup, string> = {
  firm: 'Firma',
  licensed: 'Licencovaný restaurátor',
  unlicensed: 'Bez licence',
};

const GROUP_CLS: Record<DirectoryGroup, string> = {
  firm: 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD] border-2 border-[#111111] dark:border-[#2563EB]/70',
  licensed:
    'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70',
  unlicensed: 'bg-white dark:bg-[#252834] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-400',
};

interface DirectoryCardProps {
  entry: DirectoryEntry;
  onLogin: () => void;
}

export const DirectoryCard: React.FC<DirectoryCardProps> = ({ entry, onLogin }) => {
  const GroupIcon = entry.group === 'firm' ? Building2 : entry.group === 'licensed' ? ShieldCheck : UserRound;
  const labelFor = (id: string) => CRAFT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <article className="rounded-2xl flex flex-col justify-between overflow-hidden bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000]">
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${GROUP_CLS[entry.group]}`}>
            <GroupIcon className="w-3.5 h-3.5" />
            <span>{GROUP_LABEL[entry.group]}</span>
          </span>
        </div>

        <h3 className="font-serif font-bold text-lg text-[#111111] dark:text-white leading-snug break-words mb-2">
          {entry.name}
        </h3>

        {entry.crafts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entry.crafts.map((craft) => (
              <span
                key={craft}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FFFDF7] dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500"
              >
                {labelFor(craft)}
              </span>
            ))}
          </div>
        )}

        {entry.experienceText && (
          <p className="text-sm text-stone-800 dark:text-stone-300 line-clamp-4 whitespace-pre-line break-words leading-relaxed font-medium">
            {entry.experienceText}
          </p>
        )}
      </div>

      <div className="p-5 pt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700 bg-[#FFFDF7]/60 dark:bg-[#15171E] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-stone-800 dark:text-stone-300">
          {entry.region && (
            <span className="inline-flex items-center gap-1.5 font-extrabold text-[#111111] dark:text-white">
              <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-stone-400 shrink-0" />
              {entry.region}
            </span>
          )}
          {entry.licenceNumber && entry.licenceVerified ? (
            <span className="font-semibold break-words">
              Číslo povolení MK ČR: {entry.licenceNumber}
            </span>
          ) : (
            entry.licenceNumber && (
              <span className="font-semibold">
                Číslo povolení MK ČR: {entry.licenceNumber}
                <span className="text-stone-500 dark:text-stone-400"> (uvádí sám, neověřeno)</span>
              </span>
            )
          )}
        </div>
        {entry.licenceNumber && entry.licenceUnverified && !entry.licenceVerified && (
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2 py-0.5 rounded-md border-2 border-[#111111] dark:border-stone-500 bg-orange-200 dark:bg-orange-900 text-[#111111] dark:text-orange-100">
            Nepodařilo se ověřit v rejstříku MK ČR
          </span>
        )}
        {entry.licenceNumber && entry.licenceVerified && (
          <div className="text-xs space-y-0.5">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-400">
              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
              {entry.licenceRegistryUrl ? (
                <a href={entry.licenceRegistryUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Nalezeno v rejstříku MK ČR
                </a>
              ) : (
                'Nalezeno v rejstříku MK ČR'
              )}
            </span>
            {entry.licenceRegistryName && (
              <p className="text-stone-700 dark:text-stone-300 break-words">
                Nalezeno v rejstříku MK ČR: {entry.licenceRegistryName}
              </p>
            )}
            {entry.licenceScope && entry.licenceScope.length > 0 && (
              <p className="text-stone-700 dark:text-stone-300 break-words">{entry.licenceScope.join('; ')}</p>
            )}
          </div>
        )}
        <ContactsOrLogin contact={entry.contact} onLogin={onLogin} />
      </div>
    </article>
  );
};
