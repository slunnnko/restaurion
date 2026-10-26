'use client';

import React, { useRef, useState } from 'react';
import { Job, JobResponseItem, UserProfile, UserReview } from '@/types';
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
  Bell,
  Settings2,
  ExternalLink,
  MessageSquareReply,
  Lock,
  Archive,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile | null;
  currentUser?: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAvatar?: (userId: string, newAvatarUrl: string) => void;
  allJobs?: Job[];
  reviews?: UserReview[];
  onReplyToReview?: (reviewId: string, replyText: string) => void;
  userResponses?: JobResponseItem[];
  onMarkResponseRead?: (responseId: string) => void;
  onOpenAdministration?: (options?: { jobId?: string; filter?: 'all' | 'demands' | 'offers' }) => void;
  onFocusJobOnBoard?: (job: Job) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  isOpen,
  onClose,
  onUpdateAvatar,
  allJobs = [],
  reviews = [],
  onReplyToReview,
  userResponses = [],
  onMarkResponseRead,
  onOpenAdministration,
  onFocusJobOnBoard,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  if (!isOpen || !user) return null;

  const isLicensed = user.role === 'licensed_restorer';
  const isOwnProfile = currentUser?.id === user.id;

  // Zakázky a nabídky tohoto uživatele
  const userJobs = allJobs.filter((j) => j.author.id === user.id);
  const userDemands = userJobs.filter((j) => j.jobType !== 'craftsman_available');
  const userOffers = userJobs.filter((j) => j.jobType === 'craftsman_available');

  // Reakce (notifikace) na zakázky nebo nabídky přihlášeného uživatele
  const myJobIds = new Set(userJobs.map((j) => j.id));
  const incomingNotifications = userResponses.filter((resp) => myJobIds.has(resp.jobId));
  const unreadNotifications = incomingNotifications.filter((resp) => !resp.isRead);

  // Hodnocení držená přímo na této osobě (zůstávají i po smazání zakázky!)
  const personReviews = reviews.filter(
    (rev) =>
      rev.revieweeId === user.id ||
      rev.reviewerId === user.id ||
      rev.revieweeName === user.name ||
      rev.reviewerName === user.name
  );

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

  const handleSubmitReply = (reviewId: string) => {
    const trimmed = replyDraft.trim();
    if (!trimmed || !onReplyToReview) return;
    onReplyToReview(reviewId, trimmed);
    setReplyDraft('');
    setActiveReplyReviewId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1E26] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-300 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#F8FAFC] relative my-8 text-[#111111] dark:text-white max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-300 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] text-[#111111] dark:text-white flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profilová hlavička s fotkou uživatele */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl border-2 border-[#111111] dark:border-stone-200 bg-[#FEF08A] text-[#111111] flex items-center justify-center font-serif text-2xl font-bold shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] overflow-hidden">
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

            {isOwnProfile && onUpdateAvatar && (
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
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] dark:border-stone-200 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] text-[11px] font-extrabold cursor-pointer disabled:opacity-60"
                  title="Nahrát vlastní profilovou fotografii"
                >
                  <Camera className="w-3 h-3" />
                  <span>{isUploadingAvatar ? 'Ukládám…' : 'Změnit fotku'}</span>
                </button>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
                {user.name}
              </h2>
              {isLicensed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-400">
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

        {/* DĚLÍCÍ LINIE PRO PŘIHLÁŠENÉHO UŽIVATELE: Notifikace na profilu + Proklik na zakázky a nabídky v Administraci */}
        {isOwnProfile && onOpenAdministration && (
          <div className="mb-6 space-y-3">
            {/* 1. Upozornění na reakce (Notifikace na profilu s proklikem do Administrace) */}
            <div className="p-4 rounded-2xl bg-[#FFFDF7] dark:bg-[#15171E] border-2 border-[#111111] dark:border-stone-300 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#FF5733] shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
                    Upozornění na reakce k vašim zakázkám a nabídkám
                  </h3>
                  {unreadNotifications.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FF5733] text-white border border-[#111111] text-[10px] font-extrabold">
                      {unreadNotifications.length} nové
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                  Správa probíhá v Administraci
                </span>
              </div>

              {incomingNotifications.length === 0 ? (
                <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                  Zatím nemáte žádné nové reakce na zadané poptávky či nabídky.
                </p>
              ) : (
                <div className="space-y-2">
                  {incomingNotifications.map((notif) => {
                    const targetJob = allJobs.find((j) => j.id === notif.jobId);
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          !notif.isRead
                            ? 'bg-[#FEF08A]/50 dark:bg-[#FEF08A]/15 border-[#111111] dark:border-[#FEF08A]'
                            : 'bg-white dark:bg-[#1C1E26] border-stone-300 dark:border-stone-600'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            {!notif.isRead && (
                              <span className="px-1.5 py-0.2 rounded bg-[#FF5733] text-white text-[9px] font-extrabold uppercase">
                                Nová reakce
                              </span>
                            )}
                            <span className="text-xs font-extrabold text-[#111111] dark:text-white">
                              {notif.senderName}
                            </span>
                            <span className="text-[10px] font-bold text-stone-500">
                              • {notif.createdAt}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 truncate">
                            K inzerátu: {targetJob?.title || 'Zakázka'}
                          </div>
                          <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1 mt-0.5">
                            „{notif.message}“
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onMarkResponseRead?.(notif.id);
                            onClose();
                            onOpenAdministration({ jobId: notif.jobId });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] dark:border-stone-200 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] text-[11px] font-extrabold shrink-0 cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Otevřít v Administraci</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Rychlé odkazy z profilu na zadané poptávky a nabídky v Administraci */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdministration({ filter: 'demands' });
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border-2 border-[#111111] dark:border-emerald-400 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white border-2 border-[#111111] flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#111111] dark:text-white">
                      Moje zadané poptávky ({userDemands.length})
                    </div>
                    <div className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">
                      Spravovat v Administraci →
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#111111] dark:text-emerald-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdministration({ filter: 'offers' });
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#DBEAFE]/70 dark:bg-[#172554]/80 hover:bg-[#DBEAFE] dark:hover:bg-[#1E3A8A]/80 border-2 border-[#111111] dark:border-blue-400 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white border-2 border-[#111111] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#111111] dark:text-white">
                      Moje nabídky kapacit ({userOffers.length})
                    </div>
                    <div className="text-[10px] font-bold text-[#1E3A8A] dark:text-blue-300">
                      Spravovat v Administraci →
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#111111] dark:text-blue-300 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Dostupnost */}
        <div className="mb-5 p-3.5 bg-[#FFFDF7] dark:bg-[#15171E] rounded-2xl border-2 border-[#111111] dark:border-stone-400 flex items-center justify-between">
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
          <div className="mb-5 p-4 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/70 border-2 border-[#111111] dark:border-emerald-400 text-xs">
            <div className="flex items-center justify-between mb-1.5 font-extrabold text-emerald-950 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Oficiální povolení k restaurování MK ČR
              </span>
              <span className="font-mono bg-white dark:bg-[#121318] px-2.5 py-0.5 rounded-lg border-2 border-[#111111] dark:border-emerald-400 text-[#111111] dark:text-emerald-200">
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

        {/* HODNOCENÍ DRŽENÁ NA ČLOVĚKU (s vazbou na zakázku, trvalým zachováním i po smazání zakázky a max. 1 reakcí) */}
        <div className="mb-6 p-4 bg-[#FEF08A]/45 dark:bg-[#FEF08A]/10 rounded-2xl border-2 border-[#111111] dark:border-[#FEF08A]/60 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-extrabold text-[#111111] dark:text-[#FEF08A]">
              <Award className="w-4 h-4 text-[#111111] dark:text-[#FEF08A]" />
              <span>
                Hodnocení na profilu a historie spoluprací ({personReviews.length})
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#1C1E26] text-stone-700 dark:text-stone-300 border border-[#111111] dark:border-stone-500">
              Trvale vedeno u osoby • max. 1 reakce
            </span>
          </div>

          <p className="text-stone-800 dark:text-stone-300 font-medium text-[11px]">
            Hodnocení jsou uložena přímo u profilu řemeslníka/restaurátora. I pokud je původní inzerát zakázky smazán, reference a komentář zůstávají zachovány.
          </p>

          {personReviews.length === 0 ? (
            <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1C1E26] border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400">
              Zatím nebylo uděleno žádné slovní hodnocení.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {personReviews.map((rev) => {
                const linkedJob = rev.jobId ? allJobs.find((j) => j.id === rev.jobId) : undefined;
                const canReply =
                  !rev.reply &&
                  currentUser &&
                  (currentUser.id === rev.revieweeId || currentUser.name === rev.revieweeName);

                return (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-300 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC]"
                  >
                    {/* Vazba na zakázku (aktivní proklik nebo informace o smazaném inzerátu) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200 dark:border-stone-700">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-[#111111] dark:text-white">
                          Zakázka: {rev.jobTitle}
                        </span>
                        {linkedJob ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onFocusJobOnBoard?.(linkedJob);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-[#111111] dark:border-emerald-500 text-[10px] font-extrabold hover:bg-[#FEF08A] hover:text-[#111111] cursor-pointer"
                            title="Zobrazit kartu zakázky"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Přejít na zakázku</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-400 dark:border-stone-600 text-[10px] font-bold"
                            title="Původní inzerát byl ze seznamu odstraněn, ale hodnocení na profilu člověka zůstává trvale uloženo."
                          >
                            <Archive className="w-2.5 h-2.5" />
                            <span>Inzerát smazán – hodnocení zachováno</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                        {rev.completedAt || rev.createdAt}
                      </span>
                    </div>

                    {/* Kdo hodnotil koho + hvězdičky */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        <span>Hodnotil: {rev.reviewerName}</span>
                        <ArrowLeftRight className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                        <span className="text-emerald-800 dark:text-emerald-400 font-extrabold">
                          Realizoval: {rev.revieweeName}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-amber-500 shrink-0">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="w-3 h-3 fill-amber-400 text-[#111111] dark:text-amber-300" />
                        ))}
                      </span>
                    </div>

                    {/* Samotný komentář hodnocení */}
                    <p className="text-xs text-[#111111] dark:text-stone-100 italic font-medium leading-relaxed">
                      „{rev.text}“
                    </p>

                    {/* Jednorázová reakce hodnoceného (max. 1 odpověď, žádné vlákno) */}
                    {rev.reply ? (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-stone-100 dark:bg-[#15171E] border-l-4 border-[#111111] dark:border-[#FEF08A]">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-extrabold text-[#111111] dark:text-[#FEF08A] flex items-center gap-1">
                            <MessageSquareReply className="w-3 h-3" />
                            Jednorázová reakce ({rev.reply.authorName}):
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-stone-500 dark:text-stone-400">
                            <Lock className="w-2.5 h-2.5" />
                            Uzamčeno (1/1 reakce)
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-800 dark:text-stone-200 font-medium">
                          „{rev.reply.text}“
                        </p>
                      </div>
                    ) : canReply ? (
                      <div className="mt-2.5 pt-2 border-t border-stone-200 dark:border-stone-700">
                        {activeReplyReviewId === rev.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-stone-600 dark:text-stone-400">
                              <span>Vaše jednorázová reakce k hodnocení (nelze dále větvit do diskuze):</span>
                              <span>{replyDraft.length}/240</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'Děkuji za spolupráci i profesionální přístup.',
                                'Potvrzuji bezproblémovou realizaci a děkuji za hodnocení.',
                              ].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setReplyDraft(preset)}
                                  className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-[#FEF08A] hover:text-[#111111] text-[10px] font-bold border border-stone-400 cursor-pointer"
                                >
                                  + „{preset}“
                                </button>
                              ))}
                            </div>
                            <textarea
                              rows={2}
                              maxLength={240}
                              value={replyDraft}
                              onChange={(e) => setReplyDraft(e.target.value)}
                              placeholder="Napište stručné vyjádření nebo poděkování (max. 240 znaků)..."
                              className="w-full p-2 rounded-xl bg-[#FFFDF7] dark:bg-[#15171E] border-2 border-[#111111] dark:border-stone-300 text-xs font-medium text-[#111111] dark:text-white focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReplyReviewId(null);
                                  setReplyDraft('');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-600 dark:text-stone-400 hover:underline cursor-pointer"
                              >
                                Zrušit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSubmitReply(rev.id)}
                                disabled={!replyDraft.trim()}
                                className="px-3 py-1 rounded-lg bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-[11px] font-extrabold cursor-pointer disabled:opacity-50"
                              >
                                Uložit reakci (1×)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyReviewId(rev.id);
                              setReplyDraft('');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] hover:text-[#111111] text-[#111111] dark:text-[#FEF08A] border border-[#111111] dark:border-stone-400 text-[11px] font-extrabold cursor-pointer"
                          >
                            <MessageSquareReply className="w-3 h-3" />
                            <span>Přidat jednorázovou reakci</span>
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kontakty */}
        <div className="pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700 space-y-2.5">
          {user.phone && (
            <a
              href={`tel:${user.phone}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] dark:border-stone-200 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Zavolat ({user.phone})</span>
            </a>
          )}
          <a
            href={`mailto:${user.email}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#262933] hover:bg-stone-100 dark:hover:bg-[#323644] border-2 border-[#111111] dark:border-stone-300 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] transition-colors"
          >
            <Mail className="w-4 h-4 text-[#111111] dark:text-stone-300" />
            <span>Napsat e-mail ({user.email})</span>
          </a>
        </div>
      </div>
    </div>
  );
};
