'use client';

import React from 'react';
import { Job } from '@/types';
import {
  MapPin,
  Calendar,
  Coins,
  ShieldCheck,
  Church,
  Clock,
  ArrowRight,
  GraduationCap,
  UserCheck,
  Camera,
  Settings2,
} from 'lucide-react';
import { HammerLogo } from './HammerLogo';

interface JobCardProps {
  job: Job;
  onRespond: (job: Job) => void;
  onViewAuthor: (authorId: string) => void;
  onManage?: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onRespond, onViewAuthor, onManage }) => {
  const isCulturalMonument =
    job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';
  const isLicensedAuthor = job.author.role === 'licensed_restorer';

  // Barevně rozlišené odznaky a ikonky dle zadání:
  // - Hledám subdodavatele: ikonka kladívka (HammerLogo), barva zelená jako v aktuální verzi
  // - Hledám zaštítění: ikonka štítu (ShieldCheck), barva korál (#FF5733)
  // - Nabízím se: ikonka človíčka (UserCheck), barva elektrická modř (#2563EB), bez labelu „běžný objekt/bez licence“
  const getJobTypeBadge = () => {
    switch (job.jobType) {
      case 'subcontract_needed':
        return {
          label: 'Hledám subdodavatele',
          badgeClass:
            'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/80 font-extrabold',
          iconColorClass: 'text-emerald-700 dark:text-emerald-400',
          tileClass:
            'bg-emerald-600 text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]',
          topStripClass: 'bg-emerald-600',
          icon: HammerLogo,
        };
      case 'guarantor_needed':
        return {
          label: 'Hledám zaštítění licencí MK ČR',
          badgeClass:
            'bg-[#FFE4DE] dark:bg-[#4A180D] text-[#7C1D0B] dark:text-[#FFB4A2] border-2 border-[#111111] dark:border-[#FF5733]/80 font-extrabold',
          iconColorClass: 'text-[#E03E1A] dark:text-[#FF7F66]',
          tileClass:
            'bg-[#FF5733] text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]',
          topStripClass: 'bg-[#FF5733]',
          icon: ShieldCheck,
        };
      case 'craftsman_available':
        return {
          label: 'Nabízím se',
          badgeClass:
            'bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD] border-2 border-[#111111] dark:border-[#3B82F6]/80 font-extrabold',
          iconColorClass: 'text-[#2563EB] dark:text-[#60A5FA]',
          tileClass:
            'bg-[#2563EB] text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]',
          topStripClass: 'bg-[#2563EB]',
          icon: UserCheck,
        };
      default:
        return {
          label: 'Poptávka práce',
          badgeClass:
            'bg-stone-100 dark:bg-stone-800 text-[#111111] dark:text-stone-100 border-2 border-[#111111] dark:border-stone-500 font-extrabold',
          iconColorClass: 'text-[#111111] dark:text-stone-200',
          tileClass:
            'bg-stone-800 text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111]',
          topStripClass: 'bg-stone-800',
          icon: HammerLogo,
        };
    }
  };

  const badgeInfo = getJobTypeBadge();
  const BadgeIcon = badgeInfo.icon;

  return (
    <article className="bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 rounded-2xl shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#111111] dark:hover:shadow-[7px_7px_0px_#000000] transition-all duration-150 flex flex-col justify-between overflow-hidden group">
      {/* Horní barevný proužek podle typu inzerátu */}
      <div>
        <div className={`h-2.5 w-full border-b-2 border-[#111111] dark:border-stone-600 ${badgeInfo.topStripClass}`} />

        <div className="p-4 sm:p-5 pb-0">
          {/* Horní řádek odznaků */}
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            {/* Typ inzerátu s barevnou ikonkou */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${badgeInfo.badgeClass}`}
            >
              <BadgeIcon className={`w-3.5 h-3.5 ${badgeInfo.iconColorClass}`} />
              <span>{badgeInfo.label}</span>
            </span>

            {/* Památkový status – POUZE pokud jde o kulturní památku (šedý štítek „Běžný objekt / bez licence“ je zcela skrytý) */}
            {isCulturalMonument && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]"
                title="Vyžaduje odpovědnost a podpis licencovaného restaurátora dle zákona č. 20/1987 Sb."
              >
                <Church className="w-3.5 h-3.5 text-[#111111] shrink-0" />
                <span>Kulturní památka</span>
              </span>
            )}

            {job.urgent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FF5733] text-white border-2 border-[#111111]">
                Spěchá
              </span>
            )}
          </div>

          {/* Výrazná barevná dlaždice s ikonkou + Titulek (přesně dle obrázku 2) */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${badgeInfo.tileClass}`}
              title={badgeInfo.label}
            >
              <BadgeIcon className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#111111] dark:text-white leading-snug">
              {job.title}
            </h3>
          </div>

          {/* Volitelná fotografie ze zakázky / detailu díla (inspirováno variantou 13) */}
          {job.imageUrl && (
            <div className="mb-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 overflow-hidden bg-stone-100 dark:bg-stone-900 relative h-44 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000]">
              <img
                src={job.imageUrl}
                alt={job.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/95 text-[#111111] border border-[#111111]">
                <Camera className="w-3 h-3" />
                Foto zakázky
              </span>
            </div>
          )}

          {/* Popis objektu pokud existuje (s ikonkou kostela) */}
          {job.monumentName && (
            <div className="text-xs font-extrabold text-[#111111] dark:text-[#FEF08A] bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/50 mb-3 flex flex-wrap items-center gap-1.5">
              <Church className="w-3.5 h-3.5 shrink-0 text-[#111111] dark:text-[#FEF08A]" />
              <span>{job.monumentName}</span>
              {job.monumentRegNumber && (
                <span className="text-[11px] text-stone-700 dark:text-stone-300 font-mono">
                  ({job.monumentRegNumber})
                </span>
              )}
            </div>
          )}

          {/* Text popisu */}
          <p className="text-sm text-stone-800 dark:text-stone-300 line-clamp-3 mb-4 leading-relaxed font-medium">
            {job.description}
          </p>

          {/* Vyžadovaná řemesla / tagy */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.requiredCrafts.map((craft, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FFFDF7] dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500"
              >
                {craft}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Spodní metadata a akce */}
      <div className="p-4 sm:p-5 pt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700 bg-[#FFFDF7]/60 dark:bg-[#15171E]">
        {/* Lokalita a termín */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-stone-800 dark:text-stone-300 mb-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-stone-300 shrink-0" />
            <span className="font-extrabold text-[#111111] dark:text-white">{job.city}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#111111] dark:text-stone-300 shrink-0" />
            <span className="font-semibold">{job.startDate || 'Dle dohody'}</span>
          </div>
        </div>

        {/* Odměna / Rozpočet – vždy plně čitelná bez zkracování */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-[#111111] dark:border-emerald-500/70 text-xs mb-3.5">
          <Coins className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 leading-snug">
            <span className="text-[11px] font-bold text-stone-600 dark:text-emerald-300/80 mr-1.5">
              Odměna:
            </span>
            <span className="font-extrabold text-emerald-950 dark:text-emerald-200 break-words">
              {job.budgetNote}
            </span>
          </div>
        </div>

        {/* Autor zakázky (s profilovou fotkou dle varianty 2) + CTA tlačítko „Mám zájem“ */}
        <div className="flex items-center justify-between gap-2.5 bg-white dark:bg-[#222530] p-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]">
          <button
            onClick={() => onViewAuthor(job.author.id)}
            className="flex items-center gap-2.5 text-left group/author min-w-0 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#111111] dark:border-stone-300 bg-[#FEF08A] text-[#111111] flex items-center justify-center font-serif font-bold text-sm shrink-0 overflow-hidden shadow-[1px_1px_0px_#111111]">
              {job.author.avatarUrl ? (
                <img
                  src={job.author.avatarUrl}
                  alt={job.author.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                job.author.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold text-[#111111] dark:text-white truncate group-hover/author:underline">
                  {job.author.name}
                </span>
                {isLicensedAuthor && (
                  <span title={`Ověřená licence MK ČR: ${job.author.mkLicenseNumber}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-700 dark:text-stone-300 truncate flex items-center gap-1 font-semibold">
                {isLicensedAuthor ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Licence MK ČR</span>
                ) : job.author.schoolOrBackground ? (
                  <span className="flex items-center gap-0.5 truncate">
                    <GraduationCap className="w-3 h-3 text-[#111111] dark:text-stone-300 inline shrink-0" />
                    <span className="truncate">{job.author.schoolOrBackground.split(',')[0]}</span>
                  </span>
                ) : (
                  <span>{job.author.title || 'Řemeslník'}</span>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => onRespond(job)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>Mám zájem</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Čas vložení a rychlá správa zakázky */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400 font-bold">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {job.createdAt}
          </span>
          <div className="flex items-center gap-2.5">
            <span>
              {job.responsesCount}{' '}
              {job.responsesCount === 1
                ? 'zájemce'
                : job.responsesCount < 5 && job.responsesCount > 0
                  ? 'zájemci'
                  : 'zájemců'}
            </span>
            {onManage && (
              <button
                type="button"
                onClick={() => onManage(job)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] border border-[#111111] dark:border-stone-500 text-[11px] font-extrabold text-[#111111] dark:text-[#FEF08A] transition-colors cursor-pointer"
                title="Upravit inzerát, zobrazit reakce, propojit realizátora nebo ukončit"
              >
                <Settings2 className="w-3 h-3" />
                <span>Upravit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
