'use client';

import React, { useRef, useState } from 'react';
import { Job, UserProfile } from '@/types';
import { uploadCompressedImage } from '@/lib/imageCompression';
import {
  X,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Camera,
  Star,
  ArrowLeftRight,
} from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAvatar?: (userId: string, newAvatarUrl: string) => void;
  completedJobs?: Job[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateAvatar,
  completedJobs = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (!isOpen || !user) return null;

  const isLicensed = user.role === 'licensed_restorer';

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadCompressedImage(file, 'avatars');
      onUpdateAvatar(user.id, uploadedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateAvatar(user.id, reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1E26] rounded-3xl max-w-xl w-full p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-500 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#000000] relative my-8 text-[#111111] dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] text-[#111111] dark:text-white flex items-center justify-center shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profilová hlavička s fotkou uživatele (inspirováno variantou 2) */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl border-2 border-[#111111] dark:border-stone-300 bg-[#FEF08A] text-[#111111] flex items-center justify-center font-serif text-2xl font-bold shadow-[3px_3px_0px_#111111] overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>

            {onUpdateAvatar && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-[11px] font-extrabold cursor-pointer disabled:opacity-60"
                  title="Nahrát vlastní profilovou fotografii"
                >
                  <Camera className="w-3 h-3" />
                  <span>{isUploadingAvatar ? 'Ukládám…' : 'Změnit fotku'}</span>
                </button>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
                {user.name}
              </h2>
              {isLicensed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Ověřená licence MK ČR
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-bold">
              {user.title || 'Odborný řemeslník v památkové péči'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 font-semibold mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-stone-300" />
              <span>
                {user.city} ({user.region})
              </span>
            </div>
          </div>
        </div>

        {/* Dostupnost */}
        <div className="mb-5 p-3.5 bg-[#FFFDF7] dark:bg-[#15171E] rounded-2xl border-2 border-[#111111] dark:border-stone-500 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-[#111111]" />
            <span className="font-extrabold text-[#111111] dark:text-white">
              {user.availability === 'available_now'
                ? 'Volné kapacity ihned k dispozici'
                : 'Dostupný dle dohody'}
            </span>
          </div>
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
            {user.completedJobsCount} realizovaných zakázek
          </span>
        </div>

        {/* Informace o licenci MK ČR */}
        {isLicensed && user.mkLicenseNumber && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/70 border-2 border-[#111111] dark:border-emerald-500/70 text-xs">
            <div className="flex items-center justify-between mb-1.5 font-extrabold text-emerald-950 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Oficiální povolení k restaurování MK ČR
              </span>
              <span className="font-mono bg-white dark:bg-[#121318] px-2.5 py-0.5 rounded-lg border-2 border-[#111111] dark:border-emerald-500/70 text-[#111111] dark:text-emerald-200">
                {user.mkLicenseNumber}
              </span>
            </div>
            <p className="text-emerald-950 dark:text-emerald-100 font-medium mb-2">
              Rozsah oprávnění: {user.mkLicenseFields?.join(', ')}
            </p>
            <div className="text-[11px] text-emerald-900 dark:text-emerald-300 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Automaticky ověřeno ve veřejném seznamu MK ČR</span>
            </div>
          </div>
        )}

        {/* Vzdělání / Ateliér */}
        {user.schoolOrBackground && (
          <div className="mb-5 flex items-start gap-2.5 text-xs text-stone-800 dark:text-stone-300">
            <GraduationCap className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-[#111111] dark:text-white block">Vzdělání a praxe</span>
              <span className="font-medium">{user.schoolOrBackground}</span>
            </div>
          </div>
        )}

        {/* O mně */}
        <div className="mb-5">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
            O mně & specializace
          </h4>
          <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-300 font-medium leading-relaxed mb-3">
            {user.bio}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {user.specializations.map((spec, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Reference od kolegů a uskutečněné spolupráce (vazba Poptávka ↔ Nabídka) */}
        <div className="mb-6 p-3.5 bg-[#FEF08A]/50 dark:bg-[#FEF08A]/15 rounded-2xl border-2 border-[#111111] dark:border-[#FEF08A]/50 text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-extrabold text-[#111111] dark:text-[#FEF08A]">
            <Award className="w-4 h-4 text-[#111111] dark:text-[#FEF08A]" />
            <span>Kolegiální reference a uskutečněné spolupráce ({user.colleagueEndorsementsCount})</span>
          </div>
          <p className="text-stone-800 dark:text-stone-300 font-medium text-[11px]">
            Ověřeno a doporučeno {user.colleagueEndorsementsCount} kolegy z oboru (licencovanými restaurátory i spolupracujícími řemeslníky).
          </p>

          {completedJobs.filter(
            (j) =>
              j.status === 'completed' &&
              (j.author.id === user.id ||
                j.matchedPartner?.id === user.id ||
                j.matchedPartner?.name === user.name)
          ).length > 0 && (
            <div className="space-y-2 pt-1">
              {completedJobs
                .filter(
                  (j) =>
                    j.status === 'completed' &&
                    (j.author.id === user.id ||
                      j.matchedPartner?.id === user.id ||
                      j.matchedPartner?.name === user.name)
                )
                .map((collab) => (
                  <div
                    key={collab.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-extrabold text-[#111111] dark:text-white mb-1">
                      <span>{collab.title}</span>
                      <span className="text-[10px] text-stone-500">{collab.completedAt}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      <span>Poptával: {collab.author.name}</span>
                      <ArrowLeftRight className="w-3 h-3 text-emerald-700" />
                      <span className="text-emerald-800 dark:text-emerald-400">
                        Realizoval: {collab.matchedPartner?.name || 'Spolupráce'}
                      </span>
                    </div>
                    {collab.review && (
                      <div className="text-[11px] text-stone-800 dark:text-stone-200 italic flex items-start gap-1.5">
                        <span className="inline-flex items-center text-amber-500 shrink-0 mt-0.5">
                          {Array.from({ length: collab.review.rating }).map((_, idx) => (
                            <Star key={idx} className="w-2.5 h-2.5 fill-amber-400 text-[#111111]" />
                          ))}
                        </span>
                        <span>„{collab.review.text}“</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Kontakty */}
        <div className="pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700 space-y-2.5">
          {user.phone && (
            <a
              href={`tel:${user.phone}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Zavolat ({user.phone})</span>
            </a>
          )}
          <a
            href={`mailto:${user.email}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#262933] hover:bg-stone-100 dark:hover:bg-[#323644] border-2 border-[#111111] dark:border-stone-500 transition-colors"
          >
            <Mail className="w-4 h-4 text-[#111111] dark:text-stone-300" />
            <span>Napsat e-mail ({user.email})</span>
          </a>
        </div>
      </div>
    </div>
  );
};
