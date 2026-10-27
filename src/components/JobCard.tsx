'use client';

import React, { useState } from 'react';
import { FeatureFlags, Job, UserReview } from '@/types';
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
  CheckCircle2,
  Handshake,
  Star,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HammerLogo } from './HammerLogo';

interface JobCardProps {
  job: Job;
  onRespond: (job: Job) => void;
  onViewAuthor: (authorId: string) => void;
  onManage?: (job: Job) => void;
  linkedReview?: UserReview;
  featureFlags?: FeatureFlags;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onRespond,
  onViewAuthor,
  onManage,
  linkedReview,
  featureFlags,
}) => {
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);

  const ffDarkWhite = Boolean(featureFlags?.darkWhiteShadows);
  const ffGreyedInactive = Boolean(featureFlags?.greyedInactiveCards);
  const ffMobileCompact = Boolean(featureFlags?.mobileCompactUi);
  const ffHeaderAdmin = Boolean(featureFlags?.headerAdministration);

  const isCulturalMonument =
    job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';
  const isLicensedAuthor = job.author.role === 'licensed_restorer';
  const isCompleted = ffGreyedInactive && job.status === 'completed';

  // Barevně rozlišené odznaky a ikonky dle zadání:
  // - Hledám subdodavatele: ikonka kladívka (HammerLogo), barva zelená jako v aktuální verzi
  // - Hledám zaštítění: ikonka štítu (ShieldCheck), barva korál (#FF5733)
  // - Nabízím se: ikonka človíčka (UserCheck), barva elektrická modř (#2563EB), bez labelu „běžný objekt/bez licence“
  const getJobTypeBadge = () => {
    const tileShadowBorder = ffDarkWhite
      ? 'border-2 border-[#111111] dark:border-stone-200 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
      : 'border-2 border-[#111111] shadow-[2px_2px_0px_#111111]';

    switch (job.jobType) {
      case 'subcontract_needed':
        return {
          label: 'Hledám subdodavatele',
          badgeClass:
            'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 font-extrabold',
          iconColorClass: 'text-emerald-700 dark:text-emerald-400',
          tileClass: `bg-emerald-600 text-white ${tileShadowBorder}`,
          topStripClass: 'bg-emerald-500',
          icon: HammerLogo,
        };
      case 'guarantor_needed':
        return {
          label: 'Hledám zaštítění licencí MK ČR',
          badgeClass:
            'bg-[#FFE4DE] dark:bg-[#4A180D] text-[#7C1D0B] dark:text-[#FFB4A2] border-2 border-[#111111] dark:border-[#FF5733]/70 font-extrabold',
          iconColorClass: 'text-[#E03E1A] dark:text-[#FF7F66]',
          tileClass: `bg-[#FF5733] text-white ${tileShadowBorder}`,
          topStripClass: 'bg-[#FF5733]',
          icon: ShieldCheck,
        };
      case 'craftsman_available':
        return {
          label: 'Nabízím se',
          badgeClass:
            'bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD] border-2 border-[#111111] dark:border-[#3B82F6]/70 font-extrabold',
          iconColorClass: 'text-[#2563EB] dark:text-[#60A5FA]',
          tileClass: `bg-[#2563EB] text-white ${tileShadowBorder}`,
          topStripClass: 'bg-[#2563EB]',
          icon: UserCheck,
        };
      default:
        return {
          label: 'Poptávka práce',
          badgeClass:
            'bg-stone-100 dark:bg-stone-800 text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500 font-extrabold',
          iconColorClass: 'text-[#111111] dark:text-stone-300',
          tileClass: `bg-stone-800 text-white ${tileShadowBorder}`,
          topStripClass: 'bg-stone-800',
          icon: HammerLogo,
        };
    }
  };

  const badgeInfo = getJobTypeBadge();
  const BadgeIcon = badgeInfo.icon;
  const activeReview = linkedReview || job.review;

  const cardContainerClass = isCompleted
    ? 'bg-stone-100/95 dark:bg-[#161820] border-2 border-stone-500 dark:border-stone-500 shadow-[5px_5px_0px_#78716C] dark:shadow-[5px_5px_0px_#94A3B8] opacity-75 grayscale-[55%] hover:opacity-95 hover:grayscale-[15%]'
    : ffDarkWhite
      ? 'bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-300 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#F8FAFC] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#111111] dark:hover:shadow-[7px_7px_0px_#FFFFFF]'
      : 'bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#111111] dark:hover:shadow-[7px_7px_0px_#000000]';

  // Když je mobileCompactUi VYPNUTÝ (výchozí stav před chatem), vrátíme přesnou 1:1 strukturu e08fd7f
  if (!ffMobileCompact && !isCompleted) {
    return (
      <article
        id={`job-card-${job.id}`}
        className={`rounded-2xl transition-all duration-150 flex flex-col justify-between overflow-hidden group ${cardContainerClass}`}
      >
        {/* Horní barevný proužek podle typu inzerátu */}
        <div>
          <div
            className={`h-2.5 w-full border-b-2 border-[#111111] dark:border-stone-500 ${badgeInfo.topStripClass}`}
          />

          <div className="p-5 pb-0">
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

            {/* Volitelná fotografie ze zakázky / detailu díla */}
            {job.imageUrl && (
              <div
                className={`mb-3.5 rounded-xl border-2 border-[#111111] ${
                  ffDarkWhite ? 'dark:border-stone-300 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC]' : 'dark:border-stone-500 shadow-[3px_3px_0px_#111111]'
                } overflow-hidden bg-stone-100 dark:bg-stone-900 relative h-44`}
              >
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

            {/* Výrazná barevná dlaždice s ikonkou + Titulek */}
            <div className="flex items-start gap-3.5 mb-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${badgeInfo.tileClass}`}
                title={badgeInfo.label}
              >
                <BadgeIcon className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#111111] dark:text-white leading-snug">
                {job.title}
              </h3>
            </div>

            {/* Popis objektu pokud existuje (s ikonkou kostela) */}
            {job.monumentName && (
              <div className="text-xs font-extrabold text-[#111111] dark:text-[#FEF08A] bg-[#FEF08A]/50 dark:bg-[#FEF08A]/10 px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/40 mb-3 flex flex-wrap items-center gap-1.5">
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
        <div className="p-5 pt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700 bg-[#FFFDF7]/60 dark:bg-[#15171E]">
          {/* Lokalita a termín */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-stone-800 dark:text-stone-300 mb-2.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-stone-400 shrink-0" />
              <span className="font-extrabold text-[#111111] dark:text-white">{job.city}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#111111] dark:text-stone-400 shrink-0" />
              <span className="font-semibold">{job.startDate || 'Dle dohody'}</span>
            </div>
          </div>

          {/* Odměna / Rozpočet – vždy plně čitelná bez zkracování */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#111111] dark:border-emerald-500/50 text-xs mb-3.5">
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

          {/* Autor zakázky + CTA tlačítko „Mám zájem“ */}
          <div
            className={`flex items-center justify-between gap-2 bg-white dark:bg-[#222530] p-2.5 rounded-xl border-2 border-[#111111] ${
              ffDarkWhite
                ? 'dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                : 'dark:border-stone-500 shadow-[2px_2px_0px_#111111]'
            }`}
          >
            <button
              onClick={() => onViewAuthor(job.author.id)}
              className="flex items-center gap-2.5 text-left group/author min-w-0 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full border-2 border-[#111111] bg-[#FEF08A] text-[#111111] flex items-center justify-center font-serif font-bold text-sm shrink-0 overflow-hidden shadow-[1px_1px_0px_#111111]">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] active:scale-95 transition-all shrink-0 cursor-pointer"
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
                  title="Spravovat zakázku, upravit nebo ukončit a přidat recenzi"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>{ffHeaderAdmin ? 'Administrace' : 'Upravit'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      id={`job-card-${job.id}`}
      className={`rounded-2xl transition-all duration-150 flex flex-col justify-between overflow-hidden group ${cardContainerClass}`}
    >
      {/* Horní barevný proužek podle typu inzerátu (zašedlý u ukončených) */}
      <div>
        <div
          className={`h-2.5 w-full border-b-2 border-[#111111] dark:border-stone-400 ${
            isCompleted ? 'bg-stone-500 dark:bg-stone-600' : badgeInfo.topStripClass
          }`}
        />

        <div className="p-4 sm:p-5 pb-0">
          {/* Horní řádek odznaků */}
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-stone-300 dark:bg-stone-800 text-stone-900 dark:text-stone-200 border-2 border-stone-700 dark:border-stone-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Neaktivní / Ukončeno {job.completedAt ? `(${job.completedAt})` : ''}</span>
              </span>
            )}

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

            {job.urgent && !isCompleted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FF5733] text-white border-2 border-[#111111]">
                Spěchá
              </span>
            )}
          </div>

          {/* Výrazná barevná dlaždice s ikonkou + Titulek */}
          <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${badgeInfo.tileClass}`}
              title={badgeInfo.label}
            >
              <BadgeIcon className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#111111] dark:text-white leading-snug">
              {job.title}
            </h3>
          </div>

          {/* Volitelná fotografie ze zakázky / detailu díla */}
          {job.imageUrl && (
            <div
              className={`${
                !ffMobileCompact || isMobileDetailsOpen ? 'block' : 'hidden'
              } md:block mb-3.5 rounded-xl border-2 border-[#111111] ${
                ffDarkWhite
                  ? 'dark:border-stone-300 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC]'
                  : 'dark:border-stone-500 shadow-[3px_3px_0px_#111111]'
              } overflow-hidden bg-stone-100 dark:bg-stone-900 relative h-44`}
            >
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
            <div
              className={`${
                !ffMobileCompact || isMobileDetailsOpen ? 'flex' : 'hidden'
              } md:flex text-xs font-extrabold text-[#111111] dark:text-[#FEF08A] bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/50 mb-3 flex-wrap items-center gap-1.5`}
            >
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
          <p
            className={`text-sm text-stone-800 dark:text-stone-300 mb-3 leading-relaxed font-medium ${
              !ffMobileCompact ? 'line-clamp-3' : isMobileDetailsOpen ? '' : 'line-clamp-2 md:line-clamp-3'
            }`}
          >
            {job.description}
          </p>

          {/* Vyžadovaná řemesla / tagy + mobilní tlačítko „... Podrobnosti“ */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 sm:mb-4">
            <div className="flex flex-wrap gap-1.5">
              {job.requiredCrafts.map((craft, idx) => (
                <span
                  key={idx}
                  className={`${
                    ffMobileCompact && !isMobileDetailsOpen && idx >= 2
                      ? 'hidden md:inline-block'
                      : 'inline-block'
                  } px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FFFDF7] dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-400`}
                >
                  {craft}
                </span>
              ))}
              {ffMobileCompact && !isMobileDetailsOpen && job.requiredCrafts.length > 2 && (
                <span className="md:hidden px-2 py-0.5 rounded-lg text-xs font-extrabold bg-stone-200 dark:bg-stone-800 text-[#111111] dark:text-stone-200 border border-[#111111] dark:border-stone-500">
                  +{job.requiredCrafts.length - 2}
                </span>
              )}
            </div>

            {ffMobileCompact && (
              <button
                type="button"
                onClick={() => setIsMobileDetailsOpen((prev) => !prev)}
                className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] border-2 border-[#111111] dark:border-stone-400 text-[11px] font-extrabold text-[#111111] dark:text-[#FEF08A] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>{isMobileDetailsOpen ? 'Méně' : 'Podrobnosti'}</span>
                {job.imageUrl && !isMobileDetailsOpen && (
                  <Camera className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0 ml-0.5" />
                )}
                {isMobileDetailsOpen ? (
                  <ChevronUp className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spodní metadata a akce */}
      <div className="p-3.5 sm:p-5 pt-3 sm:pt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700 bg-[#FFFDF7]/60 dark:bg-[#15171E]">
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
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-[#111111] dark:border-emerald-500/70 text-xs mb-3">
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

        {/* U ukončené zakázky zobrazíme vazbu na realizátora a odkaz na jeho hodnocení */}
        {isCompleted && job.matchedPartner && (
          <div className="mb-3 p-2.5 rounded-xl bg-stone-200/80 dark:bg-stone-800/90 border-2 border-stone-600 dark:border-stone-500 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300">
                <Handshake className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>Realizoval:</span>
                {job.matchedPartner.id ? (
                  <button
                    type="button"
                    onClick={() => onViewAuthor(job.matchedPartner!.id!)}
                    className="font-extrabold text-[#111111] dark:text-white underline hover:text-emerald-700 dark:hover:text-[#FEF08A] cursor-pointer"
                  >
                    {job.matchedPartner.name}
                  </button>
                ) : (
                  <span className="font-extrabold text-[#111111] dark:text-white">
                    {job.matchedPartner.name}
                  </span>
                )}
              </span>
              {activeReview && (
                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-[#FEF08A] font-extrabold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {activeReview.rating}/5
                </span>
              )}
            </div>
            {activeReview && (
              <p className="mt-1 text-[11px] text-stone-700 dark:text-stone-300 italic line-clamp-2">
                „{activeReview.text}“
              </p>
            )}
          </div>
        )}

        {/* Autor zakázky + CTA tlačítko „Mám zájem“ (nebo štítek Ukončeno) */}
        <div
          className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-white dark:bg-[#222530] p-2.5 rounded-xl border-2 border-[#111111] ${
            ffDarkWhite
              ? 'dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
              : 'dark:border-stone-500 shadow-[2px_2px_0px_#111111]'
          }`}
        >
          <button
            onClick={() => onViewAuthor(job.author.id)}
            className="flex items-center gap-2 sm:gap-2.5 text-left group/author min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[#111111] dark:border-stone-200 bg-[#FEF08A] text-[#111111] flex items-center justify-center font-serif font-bold text-sm shrink-0 overflow-hidden shadow-[1px_1px_0px_#111111]">
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
            <div className="min-w-0 flex-1">
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

          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 border-2 border-stone-500 dark:border-stone-500 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Uzavřeno</span>
            </span>
          ) : (
            <button
              onClick={() => onRespond(job)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>Mám zájem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
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
                title="Spravovat v Administraci"
              >
                <Settings2 className="w-3 h-3" />
                <span>{ffHeaderAdmin ? 'Administrace' : 'Upravit'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
