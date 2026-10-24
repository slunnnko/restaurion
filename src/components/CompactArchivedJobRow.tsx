'use client';

import React from 'react';
import { Job } from '@/types';
import {
  MapPin,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ArrowLeftRight,
  Star,
  Settings2,
  Church,
} from 'lucide-react';
import { HammerLogo } from './HammerLogo';

interface CompactArchivedJobRowProps {
  job: Job;
  onViewUser: (userId: string) => void;
  onManageJob?: (job: Job) => void;
}

export const CompactArchivedJobRow: React.FC<CompactArchivedJobRowProps> = ({
  job,
  onViewUser,
  onManageJob,
}) => {
  const isCulturalMonument =
    job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';

  const getTypeVisual = () => {
    switch (job.jobType) {
      case 'subcontract_needed':
        return {
          label: 'Subdodávka',
          tileClass: 'bg-emerald-600 text-white border-2 border-[#111111]',
          icon: HammerLogo,
        };
      case 'guarantor_needed':
        return {
          label: 'Zaštítění MK ČR',
          tileClass: 'bg-[#FF5733] text-white border-2 border-[#111111]',
          icon: ShieldCheck,
        };
      case 'craftsman_available':
        return {
          label: 'Nabídka prací',
          tileClass: 'bg-[#2563EB] text-white border-2 border-[#111111]',
          icon: UserCheck,
        };
      default:
        return {
          label: 'Zakázka',
          tileClass: 'bg-stone-800 text-white border-2 border-[#111111]',
          icon: HammerLogo,
        };
    }
  };

  const visual = getTypeVisual();
  const TypeIcon = visual.icon;

  return (
    <div className="bg-white/95 dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-3.5 sm:px-4 sm:py-3 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* 1. Kompaktní hlavička zakázky (nezabírá místo jako velká karta) */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 lg:max-w-[38%]">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#111111] ${visual.tileClass}`}
            title={visual.label}
          >
            <TypeIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-200 dark:bg-stone-700 text-[#111111] dark:text-stone-100 border border-[#111111] dark:border-stone-500">
                <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                Realizováno {job.completedAt ? `(${job.completedAt})` : ''}
              </span>

              {isCulturalMonument && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#FEF08A] text-[#111111] border border-[#111111]">
                  <Church className="w-3 h-3 text-[#111111]" />
                  Kulturní památka
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 dark:text-stone-400">
                <MapPin className="w-3 h-3" />
                {job.city}
              </span>
            </div>

            <h4 className="font-serif font-bold text-sm text-[#111111] dark:text-white leading-snug truncate">
              {job.title}
            </h4>
          </div>
        </div>

        {/* 2. Vazba Poptávka ↔ Nabídka (uskutečněná spolupráce) */}
        <div className="flex flex-wrap items-center gap-2 bg-[#FFFDF7] dark:bg-[#14161D] px-3 py-2 rounded-xl border-2 border-[#111111] dark:border-stone-600 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-500 dark:text-stone-400">
              Poptával:
            </span>
            <button
              onClick={() => onViewUser(job.author.id)}
              className="font-extrabold text-[#111111] dark:text-white hover:underline cursor-pointer"
            >
              {job.author.name}
            </button>
          </div>

          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#FEF08A] text-[#111111] border border-[#111111]"
            title="Propojená poptávka a realizovaná nabídka"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 dark:text-emerald-400">
              Realizoval:
            </span>
            {job.matchedPartner ? (
              job.matchedPartner.id ? (
                <button
                  onClick={() => onViewUser(job.matchedPartner!.id!)}
                  className="font-extrabold text-emerald-900 dark:text-emerald-300 hover:underline cursor-pointer"
                >
                  {job.matchedPartner.name}
                </button>
              ) : (
                <span className="font-extrabold text-emerald-900 dark:text-emerald-300">
                  {job.matchedPartner.name}
                </span>
              )
            ) : onManageJob ? (
              <button
                onClick={() => onManageJob(job)}
                className="text-xs font-extrabold text-[#E03E1A] dark:text-[#FF7F66] underline cursor-pointer"
              >
                + Přiřadit parťáka
              </button>
            ) : (
              <span className="text-xs font-semibold text-stone-500">Dokončeno</span>
            )}
          </div>
        </div>

        {/* 3. Kolegiální recenze na základě uskutečněné vazby + tlačítko úpravy */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 lg:max-w-[34%] min-w-0">
          {job.review ? (
            <div className="min-w-0 flex-1 bg-emerald-50/90 dark:bg-emerald-950/50 border-2 border-[#111111] dark:border-emerald-600/60 rounded-xl px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: job.review.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3 h-3 fill-amber-400 text-[#111111] dark:text-amber-300" />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold text-emerald-950 dark:text-emerald-200 truncate">
                  Recenze od {job.review.authorName}:
                </span>
              </div>
              <p className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 line-clamp-2 italic">
                „{job.review.text}“
              </p>
            </div>
          ) : (
            onManageJob && (
              <button
                onClick={() => onManageJob(job)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer shrink-0"
              >
                <Star className="w-3.5 h-3.5" />
                <span>Napsat recenzi</span>
              </button>
            )
          )}

          {onManageJob && (
            <button
              onClick={() => onManageJob(job)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white dark:bg-[#262933] hover:bg-stone-100 dark:hover:bg-[#323644] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] text-xs font-extrabold shrink-0 cursor-pointer"
              title="Upravit zakázku, vazbu nebo recenzi"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upravit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
