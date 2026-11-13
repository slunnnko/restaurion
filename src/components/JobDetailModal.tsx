'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { PublicJob } from '@/types/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { formatRange, rewardDisplay } from '@/lib/format';
import { jobPhotoList, LEGACY_PHOTO_ID } from '@/lib/photos';
import { MAX_PHOTO_CAPTION } from '@/lib/limits';
import { ApiError } from '@/lib/api';
import { deleteJobPhoto, setJobPhotoCaption } from '@/lib/image';
import { ContactsOrLogin } from './ui';
import { MapPin, Calendar, Coins, Church, ArrowRight, ChevronLeft, ChevronRight, X, Trash2, Pencil } from 'lucide-react';

export interface JobDetailTypeInfo {
  label: string;
  badgeClass: string;
  iconColorClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface JobDetailModalProps {
  job: PublicJob;
  typeInfo: JobDetailTypeInfo;
  /** Fotka, na kterou uživatel klikl (index v galerii). */
  startIndex?: number;
  onClose: () => void;
  onLogin: () => void;
  /** Primární akce karty (Mám zájem / Poptat spolupráci); jen když ji karta nabízí. */
  primaryAction?: { label: string; onClick: () => void };
  /** D47: vlastník změnil fotky (smazání, popisek); rodič si načte inzeráty znovu. */
  onChanged?: () => void;
}

const navBtn =
  'absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#FEF08A] text-[#111111] dark:text-white dark:hover:text-[#111111] flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer';

function formatCreated(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('cs-CZ');
}

/** D44: celý inzerát: plný popis, galerie fotek, odměna, zadavatel. Akce vlastníka a čipy zůstávají na kartě. */
export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job: jobProp, typeInfo, startIndex = 0, onClose, onLogin, primaryAction, onChanged }) => {
  // D47: after a photo change the server returns the fresh job; it overrides the prop until the parent reloads.
  const [fresh, setFresh] = useState<{ base: PublicJob; job: PublicJob } | null>(null);
  const job = fresh && fresh.base === jobProp ? fresh.job : jobProp;
  const photos = jobPhotoList(job);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const canEdit = job.isMine === true && job.status === 'active';
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(jobPhotoList(jobProp).length - 1, 0)));
  const isOffer = job.jobType === 'craftsman_available';
  const reward = rewardDisplay(job);
  const BadgeIcon = typeInfo.icon;
  const isCulturalMonument = job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';
  const created = formatCreated(job.createdAt);

  const step = useCallback((delta: number) => setIndex((i) => (photos.length === 0 ? 0 : (i + delta + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // the caption input handles its own Enter / Esc
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const safeIndex = Math.min(index, Math.max(photos.length - 1, 0));
  const current = photos[safeIndex];
  const caption = current?.caption ?? '';
  const canCaption = canEdit && current !== undefined && current.id !== LEGACY_PHOTO_ID;

  const applyJob = (updated: PublicJob) => {
    setFresh({ base: jobProp, job: updated });
    onChanged?.();
  };
  const errorText = (err: unknown) => (err instanceof ApiError ? err.message : 'Nepodařilo se uložit změnu.');
  const removeCurrent = async () => {
    if (!current || busy || !window.confirm('Smazat tuhle fotku?')) return;
    setBusy(true);
    setPhotoError('');
    try {
      applyJob(await deleteJobPhoto(job.id, current.id));
      setEditing(false);
    } catch (err) {
      setPhotoError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const startEdit = () => {
    setDraft(caption);
    setPhotoError('');
    setEditing(true);
  };
  const saveCaption = async () => {
    if (!current || busy) return;
    setBusy(true);
    setPhotoError('');
    try {
      applyJob(await setJobPhotoCaption(job.id, current.id, draft));
      setEditing(false);
    } catch (err) {
      setPhotoError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const labelFor = (id: string) => CRAFT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4 bg-[#111111]/60 backdrop-blur-xs overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
        className="bg-white dark:bg-[#1C1E26] sm:rounded-3xl max-w-3xl w-full sm:my-auto p-5 sm:p-8 border-0 sm:border-2 border-[#111111] dark:border-stone-300 sm:shadow-[8px_8px_0px_#111111] dark:sm:shadow-[8px_8px_0px_#000000] relative overflow-x-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavřít"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#FEF08A] text-[#111111] dark:text-white dark:hover:text-[#111111] flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-wrap items-center gap-2 mb-3.5 pr-12">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${typeInfo.badgeClass}`}>
            <BadgeIcon className={`w-3.5 h-3.5 ${typeInfo.iconColorClass}`} />
            <span>{typeInfo.label}</span>
          </span>
          {isCulturalMonument && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]">
              <Church className="w-3.5 h-3.5 text-[#111111] shrink-0" />
              <span>{job.monumentStatus === 'national_monument' ? 'Národní kulturní památka' : 'Kulturní památka'}</span>
            </span>
          )}
        </div>

        <h2 id="job-detail-title" className="font-serif font-bold text-xl sm:text-2xl text-[#111111] dark:text-white leading-snug break-words mb-3">
          {job.title}
        </h2>

        {job.monumentName && (
          <div className="text-xs font-extrabold text-[#111111] dark:text-[#FEF08A] bg-[#FEF08A]/50 dark:bg-[#FEF08A]/10 px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/40 mb-3 flex flex-wrap items-center gap-1.5">
            <Church className="w-3.5 h-3.5 shrink-0" />
            <span className="break-words min-w-0">{job.monumentName}</span>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mb-4">
            <div className="relative rounded-2xl border-2 border-[#111111] dark:border-stone-500 bg-stone-200 dark:bg-[#252834] overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current?.url} alt={caption || job.title} className="max-h-[70vh] w-full object-contain" />
              {canEdit && (
                <button
                  type="button"
                  onClick={removeCurrent}
                  disabled={busy}
                  aria-label="Smazat fotku"
                  className="absolute top-2 right-2 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#252834] hover:bg-red-100 dark:hover:bg-red-200 text-red-700 dark:hover:text-red-800 flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => { step(-1); setEditing(false); }} aria-label="Předchozí fotka" className={`${navBtn} left-2`}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => { step(1); setEditing(false); }} aria-label="Další fotka" className={`${navBtn} right-2`}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {editing ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveCaption();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing(false);
                    }
                  }}
                  maxLength={MAX_PHOTO_CAPTION}
                  autoFocus
                  placeholder="Popisek (nepovinné)"
                  aria-label="Popisek fotky"
                  className="flex-1 min-w-[12rem] h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-white dark:bg-[#252834] text-sm font-semibold text-[#111111] dark:text-white"
                />
                <button type="button" onClick={() => void saveCaption()} disabled={busy} className="h-10 px-3 rounded-xl text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] cursor-pointer disabled:opacity-50">
                  Uložit
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={busy} className="h-10 px-3 rounded-xl text-sm font-extrabold text-[#111111] dark:text-white bg-[#FFFDF7] dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-500 cursor-pointer">
                  Zrušit
                </button>
              </div>
            ) : (
              (caption || canCaption) && (
                <div className="mt-2.5 flex items-start gap-2">
                  <p className="flex-1 min-w-0 text-sm font-semibold text-stone-800 dark:text-stone-300 break-words">{caption}</p>
                  {canCaption && (
                    <button
                      type="button"
                      onClick={startEdit}
                      aria-label="Upravit popisek"
                      className="shrink-0 w-8 h-8 rounded-lg border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#FEF08A] text-[#111111] dark:text-white dark:hover:text-[#111111] flex items-center justify-center cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            )}
            {photoError && <p className="mt-1.5 text-xs font-bold text-red-700 dark:text-red-400">{photoError}</p>}
            {photos.length > 1 && (
              <ul className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <li key={p.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setEditing(false);
                      }}
                      title={p.caption}
                      aria-label={`Fotka ${i + 1}`}
                      aria-current={i === index}
                      className={`block w-20 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${
                        i === index ? 'border-[#111111] dark:border-[#FEF08A] ring-2 ring-[#FEF08A]' : 'border-[#111111]/40 dark:border-stone-600 opacity-80'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {job.description?.trim() && (
          <p className="text-sm text-stone-800 dark:text-stone-300 mb-4 leading-relaxed font-medium whitespace-pre-line break-words">{job.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.crafts.map((craft) => (
            <span
              key={craft}
              className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FFFDF7] dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500"
            >
              {labelFor(craft)}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-stone-800 dark:text-stone-300 mb-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="font-extrabold text-[#111111] dark:text-white">
              {job.city}
              {job.region ? `, ${job.region}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold">
              {isOffer ? 'Volno' : 'Termín'}: {formatRange(job.dateFrom, job.dateTo)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#111111] dark:border-emerald-500/50 text-xs mb-4">
          <Coins className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 leading-snug">
            <span className="text-[11px] font-bold text-stone-600 dark:text-emerald-300/80 mr-1.5">{isOffer ? 'Moje sazba:' : 'Odměna:'}</span>
            <span className="font-extrabold text-emerald-950 dark:text-emerald-200 break-words">{reward.headline}</span>
            {reward.scope && (
              <p className="mt-1 font-medium text-stone-800 dark:text-emerald-100/90 whitespace-pre-line break-words">{reward.scope}</p>
            )}
          </div>
        </div>

        <div className="mb-1 text-xs min-w-0">
          <span className="font-extrabold text-[#111111] dark:text-white break-words">{job.poster.name}</span>
          {created && <span className="ml-2 font-semibold text-stone-600 dark:text-stone-400">Přidáno {created}</span>}
        </div>
        {!job.isMine && (
          <div className="mt-2">
            <ContactsOrLogin contact={job.posterContact} onLogin={onLogin} />
          </div>
        )}

        {primaryAction && (
          <div className="mt-5">
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center justify-center gap-1.5 w-full min-h-12 px-4 py-2 rounded-xl text-sm sm:text-base font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] active:scale-95 transition-all cursor-pointer"
            >
              <span>{primaryAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
