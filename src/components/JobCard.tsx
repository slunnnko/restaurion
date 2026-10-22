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
} from 'lucide-react';
import { HammerLogo } from './HammerLogo';

interface JobCardProps {
  job: Job;
  onRespond: (job: Job) => void;
  onViewAuthor: (authorId: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onRespond, onViewAuthor }) => {
  const isCulturalMonument = job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';
  const isLicensedAuthor = job.author.role === 'licensed_restorer';

  // Barevně rozlišené odznaky a ikonky dle typu nabídky:
  // - Hledám subdodavatele: zelené kladívko (HammerLogo)
  // - Hledám zaštítění: oranžovo-červený štít (ShieldCheck)
  // - Nabízím se: modrá ikonka (UserCheck)
  const getJobTypeBadge = () => {
    switch (job.jobType) {
      case 'subcontract_needed':
        return {
          label: 'Hledám subdodavatele',
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
          iconColorClass: 'text-emerald-700',
          tileClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs',
          accentBorder: 'border-t-4 border-t-emerald-600',
          icon: HammerLogo,
        };
      case 'guarantor_needed':
        return {
          label: 'Hledám zaštítění licencí MK ČR',
          badgeClass: 'bg-orange-100 text-orange-950 border-orange-300 font-bold',
          iconColorClass: 'text-orange-700',
          tileClass: 'bg-orange-600 text-white border-orange-700 shadow-xs',
          accentBorder: 'border-t-4 border-t-orange-600',
          icon: ShieldCheck,
        };
      case 'craftsman_available':
        return {
          label: 'Nabízím se',
          badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
          iconColorClass: 'text-blue-700',
          tileClass: 'bg-blue-600 text-white border-blue-700 shadow-xs',
          accentBorder: 'border-t-4 border-t-blue-600',
          icon: UserCheck,
        };
      default:
        return {
          label: 'Poptávka práce',
          badgeClass: 'bg-stone-100 text-stone-800 border-stone-300 font-bold',
          iconColorClass: 'text-stone-700',
          tileClass: 'bg-stone-700 text-white border-stone-800 shadow-xs',
          accentBorder: 'border-t-4 border-t-stone-600',
          icon: HammerLogo,
        };
    }
  };

  const badgeInfo = getJobTypeBadge();
  const BadgeIcon = badgeInfo.icon;

  return (
    <article
      className={`bg-white border border-stone-200 ${badgeInfo.accentBorder} p-4 sm:p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group`}
    >
      <div>
        {/* Horní řádek odznaků */}
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          {/* Typ inzerátu s barevnou ikonkou */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${badgeInfo.badgeClass}`}
          >
            <BadgeIcon className={`w-3.5 h-3.5 ${badgeInfo.iconColorClass}`} />
            <span>{badgeInfo.label}</span>
          </span>

          {/* Památkový status – silueta kostela pro kulturní památku */}
          {isCulturalMonument ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300"
              title="Vyžaduje odpovědnost a podpis licencovaného restaurátora dle zákona č. 20/1987 Sb."
            >
              <Church className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span>Kulturní památka</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
              <span>Běžný objekt / bez licence</span>
            </span>
          )}

          {job.urgent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
              Spěchá
            </span>
          )}
        </div>

        {/* Výrazná barevná ikonka + Titulek */}
        <div className="flex items-start gap-3 mb-2.5">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badgeInfo.tileClass}`}
            title={badgeInfo.label}
          >
            <BadgeIcon className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-stone-950 group-hover:text-amber-800 transition-colors leading-snug">
            {job.title}
          </h3>
        </div>

        {/* Popis objektu pokud existuje (s ikonkou kostela) */}
        {job.monumentName && (
          <div className="text-xs font-bold text-amber-900 bg-amber-50/90 px-2.5 py-1.5 rounded-lg border border-amber-200/80 mb-3 flex items-center gap-1.5">
            <Church className="w-3.5 h-3.5 shrink-0 text-amber-800" />
            <span className="truncate">{job.monumentName}</span>
            {job.monumentRegNumber && (
              <span className="text-[11px] text-stone-500 font-mono">({job.monumentRegNumber})</span>
            )}
          </div>
        )}

        {/* Text popisu */}
        <p className="text-sm text-stone-700 line-clamp-3 mb-4 leading-relaxed">
          {job.description}
        </p>

        {/* Vyžadovaná řemesla / tagy */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.requiredCrafts.map((craft, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200"
            >
              {craft}
            </span>
          ))}
        </div>
      </div>

      {/* Spodní metadata a akce */}
      <div className="pt-3 border-t border-stone-200">
        {/* Lokalita, termín a finance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-700 mb-3.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="truncate font-bold text-stone-900">{job.city}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="truncate font-medium">{job.startDate || 'Dle dohody'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate font-bold text-amber-900">{job.budgetNote}</span>
          </div>
        </div>

        {/* Autor zakázky + CTA tlačítko */}
        <div className="flex items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
          <button
            onClick={() => onViewAuthor(job.author.id)}
            className="flex items-center gap-2.5 text-left group/author min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center font-serif font-bold text-xs shrink-0">
              {job.author.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-stone-950 truncate group-hover/author:text-amber-800">
                  {job.author.name}
                </span>
                {isLicensedAuthor && (
                  <span title={`Ověřená licence MK ČR: ${job.author.mkLicenseNumber}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-600 truncate flex items-center gap-1">
                {isLicensedAuthor ? (
                  <span className="text-emerald-700 font-bold">Licence MK ČR</span>
                ) : job.author.schoolOrBackground ? (
                  <span className="flex items-center gap-0.5">
                    <GraduationCap className="w-3 h-3 text-stone-500 inline" />
                    {job.author.schoolOrBackground.split(',')[0]}
                  </span>
                ) : (
                  <span>{job.author.title || 'Řemeslník'}</span>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => onRespond(job)}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-amber-800 hover:bg-amber-700 active:scale-95 transition-all shrink-0 shadow-xs"
          >
            <span>Mám zájem</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Čas vložení */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {job.createdAt}
          </span>
          <span>{job.responsesCount} {job.responsesCount === 1 ? 'zájemce' : job.responsesCount < 5 ? 'zájemci' : 'zájemců'}</span>
        </div>
      </div>
    </article>
  );
};
