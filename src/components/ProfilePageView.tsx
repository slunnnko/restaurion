'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  FeatureFlags,
  Job,
  JobResponseItem,
  SiteSettings,
  UserProfile,
  UserReview,
  UserRole,
} from '@/types';
import { uploadCompressedImage } from '@/lib/imageCompression';
import { validateProfileInput } from '@/lib/validation';
import {
  ArrowLeft,
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
  Settings2,
  ExternalLink,
  MessageSquareReply,
  Lock,
  Unlock,
  Archive,
  Sliders,
  Sparkles,
  RotateCcw,
  Save,
  Globe,
  KeyRound,
  Pencil,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react';

interface ProfilePageViewProps {
  user: UserProfile;
  allUsers: Record<string, UserProfile>;
  onBackToBoard: () => void;
  onUpdateAvatar: (userId: string, newAvatarUrl: string) => void;
  onUpdateProfile?: (userId: string, updated: Partial<UserProfile>) => Promise<void> | void;
  allJobs: Job[];
  reviews: UserReview[];
  onReplyToReview: (reviewId: string, replyText: string) => void;
  userResponses: JobResponseItem[];
  onMarkResponseRead: (responseId: string) => void;
  onOpenAdministration: (options?: {
    jobId?: string;
    filter?: 'all' | 'demands' | 'offers' | 'completed';
  }) => void;
  onFocusJobOnBoard: (job: Job) => void;
  isAdmin: boolean;
  onSetAdmin: (next: boolean) => void;
  onSwitchCurrentUser: (userKeyOrId: string) => void;
  featureFlags: FeatureFlags;
  onUpdateFeatureFlags: (next: FeatureFlags, saveToServer?: boolean) => Promise<void>;
  siteSettings: SiteSettings;
}

const FEATURE_FLAG_ITEMS: Array<{
  key: keyof FeatureFlags;
  title: string;
  description: string;
}> = [
  {
    key: 'darkWhiteShadows',
    title: '1. Bílé posunuté stíny v Dark Mode',
    description:
      'V tmavém režimu invertuje neo-brutalistické stíny kartiček, tlačítek a filtrů z černé (#000000) do bílé (#F8FAFC) se světlejším ohraničením.',
  },
  {
    key: 'greyedInactiveCards',
    title: '2. Archivované zakázky jako zašedlé karty (skryté ve výchozím stavu)',
    description:
      'Archivované zakázky se nezobrazují automaticky pod nástěnkou, ale po přepnutí filtru na „Archivované“ se vykreslí přímo v mřížce jako zašedlé karty.',
  },
  {
    key: 'personHeldReviews',
    title: '3. Hodnocení a recenze (ve výchozím stavu vypnuto)',
    description:
      'Zapíná zobrazení hodnocení a recenzí u profilů i zakázek (vedeno přímo u osob s vazbou na zakázku, zůstává i po smazání, max. 1 reakce). Pokud je vypnuto, hodnocení se nikde nezobrazují.',
  },
  {
    key: 'headerAdministration',
    title: '4. Tlačítko „Administrace“ v hlavičce a odznak upozornění',
    description:
      'Přidá tlačítko Administrace vedle Můj profil v horní liště a červený odznak s počtem nepřečtených reakcí.',
  },
  {
    key: 'soloHeroBadges',
    title: '5. Výhody v Hero sekci na samostatných řádcích pod sebou',
    description:
      'Tři štítky v žluté Hero sekci (Poptávky subdodávek a zaštítění, Ověřování licencí MK ČR, Přímý kontakt) zobrazí každý na vlastním sólo řádku.',
  },
  {
    key: 'mobileCompactUi',
    title: '6. Stručná mobilní verze („...“) a zalamování prvků',
    description:
      'Na mobilu schová pokročilé filtry pod tlačítko „... Filtry“ a detaily/fotku karty pod „... Podrobnosti“, aby bylo projíždění na telefonu rychlé a nic nepřetékalo.',
  },
];

export const ProfilePageView: React.FC<ProfilePageViewProps> = ({
  user,
  allUsers,
  onBackToBoard,
  onUpdateAvatar,
  onUpdateProfile,
  allJobs,
  reviews,
  onReplyToReview,
  onOpenAdministration,
  onFocusJobOnBoard,
  isAdmin,
  onSetAdmin,
  onSwitchCurrentUser,
  featureFlags,
  onUpdateFeatureFlags,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  // Editace a validace profilu
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileTitle, setProfileTitle] = useState(user.title || '');
  const [profileRole, setProfileRole] = useState<UserRole>(user.role);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileRegion, setProfileRegion] = useState(user.region);
  const [profileCity, setProfileCity] = useState(user.city);
  const [profileSchool, setProfileSchool] = useState(user.schoolOrBackground || '');
  const [profileBio, setProfileBio] = useState(user.bio);
  const [profileSpecs, setProfileSpecs] = useState<string[]>(user.specializations || []);
  const [specInput, setSpecInput] = useState('');
  const [profileMkLicense, setProfileMkLicense] = useState(user.mkLicenseNumber || '');
  const [profileAvailability, setProfileAvailability] = useState<UserProfile['availability']>(
    user.availability || 'available'
  );
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSavedNotice, setProfileSavedNotice] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setProfileName(user.name);
    setProfileTitle(user.title || '');
    setProfileRole(user.role);
    setProfileEmail(user.email);
    setProfilePhone(user.phone || '');
    setProfileRegion(user.region);
    setProfileCity(user.city);
    setProfileSchool(user.schoolOrBackground || '');
    setProfileBio(user.bio);
    setProfileSpecs(user.specializations || []);
    setSpecInput('');
    setProfileMkLicense(user.mkLicenseNumber || '');
    setProfileAvailability(user.availability || 'available');
    setProfileErrors({});
  }, [user]);

  // Admin auth state inside Profile page
  const [showAdminLoginBox, setShowAdminLoginBox] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [isSavingFlagsToD1, setIsSavingFlagsToD1] = useState(false);
  const [flagsSavedMessage, setFlagsSavedMessage] = useState<string | null>(null);

  const ffDarkWhite = Boolean(featureFlags.darkWhiteShadows);
  const ffPersonReviews = Boolean(featureFlags.personHeldReviews);

  const isLicensed = user.role === 'licensed_restorer';

  // Hodnocení držená přímo na této osobě (zobrazují se pouze pokud je zapnutý feature flag personHeldReviews)
  const personReviews = reviews.filter(
    (rev) =>
      rev.revieweeId === user.id ||
      rev.reviewerId === user.id ||
      rev.revieweeName === user.name ||
      rev.reviewerName === user.name
  );

  const enabledFlagsCount = Object.values(featureFlags).filter(Boolean).length;

  const clearProfileError = (field: string) => {
    setProfileErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleAddSpec = () => {
    const trimmed = specInput.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      setProfileErrors((prev) => ({
        ...prev,
        specializations: 'Název specializace musí mít alespoň 2 znaky.',
      }));
      return;
    }
    if (trimmed.length > 50) {
      setProfileErrors((prev) => ({
        ...prev,
        specializations: 'Specializace může mít maximálně 50 znaků.',
      }));
      return;
    }
    if (!profileSpecs.includes(trimmed)) {
      setProfileSpecs([...profileSpecs, trimmed]);
      setSpecInput('');
      clearProfileError('specializations');
    }
  };

  const handleRemoveSpec = (specToRemove: string) => {
    setProfileSpecs(profileSpecs.filter((s) => s !== specToRemove));
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSavedNotice(null);

    const effectiveSpecs = [...profileSpecs];
    if (specInput.trim() && !effectiveSpecs.includes(specInput.trim())) {
      effectiveSpecs.push(specInput.trim());
    }

    const validationErrors = validateProfileInput({
      name: profileName,
      title: profileTitle,
      role: profileRole,
      email: profileEmail,
      phone: profilePhone,
      city: profileCity,
      region: profileRegion,
      bio: profileBio,
      specializations: effectiveSpecs,
      mkLicenseNumber: profileMkLicense,
      schoolOrBackground: profileSchool,
    });

    if (Object.keys(validationErrors).length > 0) {
      setProfileErrors(validationErrors);
      return;
    }

    setProfileErrors({});
    setProfileSpecs(effectiveSpecs);
    setSpecInput('');
    setIsSavingProfile(true);

    try {
      const updatedFields: Partial<UserProfile> = {
        name: profileName.trim(),
        title: profileTitle.trim(),
        role: profileRole,
        email: profileEmail.trim(),
        phone: profilePhone.trim(),
        city: profileCity.trim(),
        region: profileRegion,
        bio: profileBio.trim(),
        specializations: effectiveSpecs,
        schoolOrBackground: profileSchool.trim() || undefined,
        mkLicenseNumber:
          profileRole === 'licensed_restorer' ? profileMkLicense.trim() : undefined,
        verificationStatus:
          profileRole === 'licensed_restorer'
            ? user.verificationStatus === 'verified_auto' ||
              user.verificationStatus === 'verified_manual'
              ? user.verificationStatus
              : 'manual_review_needed'
            : 'not_applicable',
        availability: profileAvailability,
      };

      if (onUpdateProfile) {
        await onUpdateProfile(user.id, updatedFields);
      }
      setIsEditingProfile(false);
      setProfileSavedNotice('Profil byl úspěšně zvalidován a uložen.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!trimmed) return;
    onReplyToReview(reviewId, trimmed);
    setReplyDraft('');
    setActiveReplyReviewId(null);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    setIsVerifyingAdmin(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        isAdmin?: boolean;
        error?: string;
      };
      if (res.ok && (data.success || data.isAdmin)) {
        onSetAdmin(true);
        setAdminPassword('');
        setShowAdminLoginBox(false);
      } else {
        setAdminAuthError(data.error || 'Neplatné administrátorské heslo.');
      }
    } catch {
      // Fallback v lokálním prostředí bez D1/workeru
      onSetAdmin(true);
      setAdminPassword('');
      setShowAdminLoginBox(false);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/verify', { method: 'DELETE' });
    } catch {
      // Ignore
    }
    onSetAdmin(false);
  };

  const handleToggleSingleFlag = async (key: keyof FeatureFlags) => {
    const next: FeatureFlags = {
      ...featureFlags,
      [key]: !featureFlags[key],
    };
    await onUpdateFeatureFlags(next, false);
    setFlagsSavedMessage('Přepnuto v prohlížeči (pro uložení všem návštěvníkům klikněte na „Uložit do D1“).');
  };

  const handleSetAllFlags = async (value: boolean) => {
    const next: FeatureFlags = {
      darkWhiteShadows: value,
      greyedInactiveCards: value,
      personHeldReviews: false, // Hodnocení a recenze jsou zatím defaultně vypnuté
      headerAdministration: value,
      soloHeroBadges: value,
      mobileCompactUi: value,
    };
    await onUpdateFeatureFlags(next, false);
    setFlagsSavedMessage(
      value
        ? 'Nové UI úpravy byly zapnuty (hodnocení a recenze zůstávají vypnuté, lze je zapnout individuálně níže).'
        : 'Všechny přepínače vypnuty – web je v původním stavu před chatem.'
    );
  };

  const handleSaveFlagsGlobally = async () => {
    setIsSavingFlagsToD1(true);
    setFlagsSavedMessage(null);
    try {
      await onUpdateFeatureFlags(featureFlags, true);
      setFlagsSavedMessage('Feature Flags byly uloženy do Cloudflare D1 jako výchozí pro celý web.');
    } finally {
      setIsSavingFlagsToD1(false);
    }
  };

  const cardShadowClass = ffDarkWhite
    ? 'border-2 border-[#111111] dark:border-stone-300 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#F8FAFC]'
    : 'border-2 border-[#111111] dark:border-stone-500 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000]';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
      {/* Horní navigace zpět na nástěnku + tlačítko pro úpravu profilu */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBackToBoard}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-[#FEF08A] dark:hover:bg-[#262933] text-[#111111] dark:text-white text-xs sm:text-sm font-extrabold border-2 border-[#111111] dark:border-stone-400 shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zpět na nástěnku zakázek</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsEditingProfile((prev) => !prev);
            setProfileSavedNotice(null);
            setProfileErrors({});
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer ${
            isEditingProfile
              ? 'bg-stone-200 dark:bg-stone-700 text-[#111111] dark:text-white'
              : 'bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111]'
          }`}
        >
          <Pencil className="w-4 h-4" />
          <span>{isEditingProfile ? 'Zavřít úpravu profilu' : 'Upravit údaje profilu'}</span>
        </button>
      </div>

      {profileSavedNotice && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border-2 border-[#111111] dark:border-emerald-400 shadow-[3px_3px_0px_#111111] flex items-center gap-2 text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
          <Check className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span>{profileSavedNotice}</span>
        </div>
      )}

      {/* Hlavní karta profilu */}
      <div className={`bg-white dark:bg-[#1C1E26] rounded-3xl p-6 sm:p-8 mb-6 ${cardShadowClass}`}>
        <div className="flex flex-col sm:flex-row items-start gap-5 mb-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-[#111111] bg-[#FEF08A] text-[#111111] flex items-center justify-center font-serif text-3xl font-bold shadow-[3px_3px_0px_#111111] overflow-hidden">
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
              className="mt-2.5 w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-[11px] font-extrabold cursor-pointer disabled:opacity-60"
            >
              <Camera className="w-3 h-3" />
              <span>{isUploadingAvatar ? 'Ukládám…' : 'Změnit fotku'}</span>
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#111111] dark:text-white">
                {user.name}
              </h1>
              {isLicensed && (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Ověřená licence MK ČR
                </span>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]">
                  <Sliders className="w-3 h-3" />
                  Admin webu
                </span>
              )}
            </div>

            <p className="text-sm text-stone-700 dark:text-stone-300 font-bold">
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

        {isEditingProfile ? (
          <form
            onSubmit={handleSaveProfileSubmit}
            noValidate
            className="space-y-4 pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white">
                Úprava profesního profilu
              </h3>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Pole označená * jsou povinná
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Jméno a příjmení (vč. titulů) *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    clearProfileError('name');
                  }}
                  placeholder="např. MgA. Marek Dvořák"
                  className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                    profileErrors.name
                      ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                  } text-sm font-semibold text-[#111111] dark:text-white`}
                />
                {profileErrors.name && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Profesní označení / zaměření *
                </label>
                <input
                  type="text"
                  value={profileTitle}
                  onChange={(e) => {
                    setProfileTitle(e.target.value);
                    clearProfileError('title');
                  }}
                  placeholder="např. Akademický sochař a restaurátor kamene"
                  className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                    profileErrors.title
                      ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                  } text-sm font-semibold text-[#111111] dark:text-white`}
                />
                {profileErrors.title && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.title}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Typ působení *
                </label>
                <div className="relative">
                  <select
                    value={profileRole}
                    onChange={(e) => {
                      setProfileRole(e.target.value as UserRole);
                      clearProfileError('mkLicenseNumber');
                    }}
                    className="w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-bold text-[#111111] dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="licensed_restorer">Držitel povolení MK ČR (licencovaný restaurátor)</option>
                    <option value="artistic_craftsman">Umělecký řemeslník / specialista</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                </div>
              </div>

              {profileRole === 'licensed_restorer' ? (
                <div>
                  <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                    Číslo povolení MK ČR (č.j.) *
                  </label>
                  <input
                    type="text"
                    value={profileMkLicense}
                    onChange={(e) => {
                      setProfileMkLicense(e.target.value);
                      clearProfileError('mkLicenseNumber');
                    }}
                    placeholder="např. MK-R-1042/2015"
                    className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                      profileErrors.mkLicenseNumber
                        ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                    } text-sm font-semibold text-[#111111] dark:text-white`}
                  />
                  {profileErrors.mkLicenseNumber && (
                    <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{profileErrors.mkLicenseNumber}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                    Časová dostupnost
                  </label>
                  <div className="relative">
                    <select
                      value={profileAvailability || 'available'}
                      onChange={(e) =>
                        setProfileAvailability(e.target.value as UserProfile['availability'])
                      }
                      className="w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-bold text-[#111111] dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="available">Volné kapacity pro spolupráci</option>
                      <option value="on_request">Kapacity na dotaz</option>
                      <option value="busy">Momentálně vytížen</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Kontaktní e-mail *
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => {
                    setProfileEmail(e.target.value);
                    clearProfileError('email');
                  }}
                  placeholder="jmeno@domena.cz"
                  className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                    profileErrors.email
                      ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                  } text-sm font-semibold text-[#111111] dark:text-white`}
                />
                {profileErrors.email && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Kontaktní telefon *
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => {
                    setProfilePhone(e.target.value);
                    clearProfileError('phone');
                  }}
                  placeholder="+420 777 123 456"
                  className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                    profileErrors.phone
                      ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                  } text-sm font-semibold text-[#111111] dark:text-white`}
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Hlavní region působení *
                </label>
                <div className="relative">
                  <select
                    value={profileRegion}
                    onChange={(e) => {
                      setProfileRegion(e.target.value);
                      clearProfileError('region');
                    }}
                    className={`w-full h-11 pl-3.5 pr-9 rounded-xl border-2 ${
                      profileErrors.region
                        ? 'border-rose-600 dark:border-rose-500'
                        : 'border-[#111111] dark:border-stone-500'
                    } bg-[#FFFDF7] dark:bg-[#121318] text-sm font-bold text-[#111111] dark:text-white appearance-none cursor-pointer`}
                  >
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
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                </div>
                {profileErrors.region && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.region}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Město / Obec *
                </label>
                <input
                  type="text"
                  value={profileCity}
                  onChange={(e) => {
                    setProfileCity(e.target.value);
                    clearProfileError('city');
                  }}
                  placeholder="např. Brno, Znojmo, Litomyšl"
                  className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                    profileErrors.city
                      ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                  } text-sm font-semibold text-[#111111] dark:text-white`}
                />
                {profileErrors.city && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.city}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                Vzdělání a odborné zázemí (volitelné)
              </label>
              <input
                type="text"
                value={profileSchool}
                onChange={(e) => {
                  setProfileSchool(e.target.value);
                  clearProfileError('schoolOrBackground');
                }}
                placeholder="např. AVU Praha / SUPŠ kamenická a sochařská Hořice"
                className={`w-full h-11 px-3.5 rounded-xl border-2 ${
                  profileErrors.schoolOrBackground
                    ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                } text-sm font-semibold text-[#111111] dark:text-white`}
              />
              {profileErrors.schoolOrBackground && (
                <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{profileErrors.schoolOrBackground}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                Specializace a řemesla * <span className="font-normal text-stone-500">(alespoň 1 obor)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specInput}
                  onChange={(e) => {
                    setSpecInput(e.target.value);
                    clearProfileError('specializations');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpec();
                    }
                  }}
                  placeholder="např. Kamenná skulptura, Vápenný štuk, Zlacení"
                  className={`flex-1 h-10 px-3.5 rounded-xl border-2 ${
                    profileErrors.specializations
                      ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                  } text-sm font-semibold text-[#111111] dark:text-white`}
                />
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="px-4 h-10 rounded-xl bg-white dark:bg-[#262933] border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] text-xs font-extrabold text-[#111111] dark:text-white hover:bg-[#FEF08A] dark:hover:text-[#111111] cursor-pointer"
                >
                  + Přidat
                </button>
              </div>
              {profileSpecs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profileSpecs.map((spec, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]"
                    >
                      {spec}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(spec)}
                        className="hover:text-rose-700 font-extrabold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {profileErrors.specializations && (
                <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{profileErrors.specializations}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                O mně & odborná praxe * <span className="font-normal text-stone-500">(alespoň 15 znaků)</span>
              </label>
              <textarea
                rows={3}
                value={profileBio}
                onChange={(e) => {
                  setProfileBio(e.target.value);
                  clearProfileError('bio');
                }}
                placeholder="Stručně popište své zkušenosti, realizované památky a vybavení..."
                className={`w-full px-3.5 py-2.5 rounded-xl border-2 ${
                  profileErrors.bio
                    ? 'border-rose-600 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]'
                } text-sm font-semibold text-[#111111] dark:text-white`}
              />
              {profileErrors.bio && (
                <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{profileErrors.bio}</span>
                </p>
              )}
            </div>

            {Object.keys(profileErrors).length > 0 && (
              <div className="p-3 rounded-xl border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-xs font-extrabold text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Opravte prosím zvýrazněná pole před uložením profilu.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileErrors({});
                }}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-stone-200 bg-white dark:bg-[#262933] border-2 border-[#111111] dark:border-stone-500 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'Ukládám…' : 'Zvalidovat a uložit profil'}</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Informace o licenci MK ČR */}
            {isLicensed && user.mkLicenseNumber && (
              <div className="mb-5 p-4 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/60 border-2 border-[#111111] dark:border-emerald-500 text-xs">
                <div className="flex items-center justify-between mb-1.5 font-extrabold text-emerald-950 dark:text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Oficiální povolení k restaurování MK ČR
                  </span>
                  <span className="font-mono bg-white dark:bg-[#121318] px-2.5 py-0.5 rounded-lg border-2 border-[#111111] dark:border-emerald-500 text-[#111111] dark:text-emerald-200">
                    {user.mkLicenseNumber}
                  </span>
                </div>
                {user.mkLicenseFields && user.mkLicenseFields.length > 0 && (
                  <p className="text-emerald-950 dark:text-emerald-200 font-medium mb-2">
                    Rozsah oprávnění: {user.mkLicenseFields.join(', ')}
                  </p>
                )}
                <div className="text-[11px] text-emerald-900 dark:text-emerald-300 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Automaticky ověřeno ve veřejném seznamu MK ČR</span>
                </div>
              </div>
            )}

            {/* Vzdělání & O mně */}
            {user.schoolOrBackground && (
              <div className="mb-5 flex items-start gap-2.5 text-xs text-stone-800 dark:text-stone-300">
                <GraduationCap className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-[#111111] dark:text-white block">
                    Vzdělání a praxe
                  </span>
                  <span className="font-medium">{user.schoolOrBackground}</span>
                </div>
              </div>
            )}

            <div className="mb-6">
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

            {/* Hodnocení a recenze – zobrazují se POUZE pokud je zapnutý featureFlag personHeldReviews */}
            {ffPersonReviews && (
              <div className="mb-6 p-4 bg-[#FEF08A]/45 dark:bg-[#FEF08A]/10 rounded-2xl border-2 border-[#111111] dark:border-[#FEF08A]/60 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-extrabold text-[#111111] dark:text-[#FEF08A]">
                    <Award className="w-4 h-4 text-[#111111] dark:text-[#FEF08A]" />
                    <span>Hodnocení na profilu a historie spoluprací ({personReviews.length})</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#1C1E26] text-stone-700 dark:text-stone-300 border border-[#111111] dark:border-stone-500">
                    Trvale vedeno u osoby • max. 1 reakce
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {personReviews.map((rev) => {
                    const linkedJob = rev.jobId ? allJobs.find((j) => j.id === rev.jobId) : undefined;
                    const canReply =
                      !rev.reply && (user.id === rev.revieweeId || user.name === rev.revieweeName);

                    return (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-300 shadow-[3px_3px_0px_#111111]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200 dark:border-stone-700">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-[#111111] dark:text-white">
                              Zakázka: {rev.jobTitle}
                            </span>
                            {linkedJob ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onFocusJobOnBoard(linkedJob);
                                  onBackToBoard();
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-[#111111] text-[10px] font-extrabold hover:bg-[#FEF08A] hover:text-[#111111] cursor-pointer"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Přejít na zakázku</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-400 text-[10px] font-bold">
                                <Archive className="w-2.5 h-2.5" />
                                <span>Inzerát smazán – hodnocení zachováno</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                            {rev.completedAt || rev.createdAt}
                          </span>
                        </div>

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
                              <Star
                                key={idx}
                                className="w-3 h-3 fill-amber-400 text-[#111111] dark:text-amber-300"
                              />
                            ))}
                          </span>
                        </div>

                        <p className="text-xs text-[#111111] dark:text-stone-100 italic font-medium leading-relaxed">
                          „{rev.text}“
                        </p>

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
              </div>
            )}

            {/* Kontakty */}
            <div className="pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#262933] hover:bg-stone-100 border-2 border-[#111111] dark:border-stone-500 shadow-[3px_3px_0px_#111111] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#111111] dark:text-stone-300" />
                <span>Napsat e-mail ({user.email})</span>
              </a>
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SCHOVANÉ ADMIN ROZHRANÍ A FEATURE FLAGS (přístupné až po rozkliku profilu) */}
      {/* ===================================================================== */}
      <div className={`bg-white dark:bg-[#1C1E26] rounded-3xl p-6 sm:p-8 ${cardShadowClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#111111] dark:text-white">
                Administrace webu & Feature Flags
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 font-semibold">
                Nastavení experimentálních úprav, testovací subdomény a správa obsahu webu
              </p>
            </div>
          </div>

          {isAdmin ? (
            <button
              type="button"
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500 text-xs font-extrabold cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Uzamknout Admin režim</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdminLoginBox((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Odemknout Admin nastavení</span>
            </button>
          )}
        </div>

        {!isAdmin ? (
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
              Tato sekce je určena pro správce portálu Restaurion. Po odemknutí zde můžete zapínat/vypínat jednotlivé Feature Flags a upravovat texty celého webu.
            </p>

            {showAdminLoginBox && (
              <form
                onSubmit={handleAdminLogin}
                className="mt-4 p-4 rounded-2xl bg-[#FFFDF7] dark:bg-[#15171E] border-2 border-[#111111] dark:border-stone-500 space-y-3"
              >
                <div className="text-xs font-extrabold text-[#111111] dark:text-white">
                  Zadejte administrátorské heslo (nebo klikněte na Odemknout v lokálním/test režimu):
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Admin heslo..."
                    className="flex-1 min-w-[200px] h-10 px-3 rounded-xl bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-400 text-xs font-bold text-[#111111] dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingAdmin}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5 inline mr-1.5" />
                    {isVerifyingAdmin ? 'Ověřuji…' : 'Potvrdit a odemknout'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetAdmin(true);
                      onSwitchCurrentUser('adminReserve');
                      setShowAdminLoginBox(false);
                    }}
                    className="h-10 px-3.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                  >
                    Přepnout na záložní Admin účet
                  </button>
                </div>
                {adminAuthError && (
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{adminAuthError}</p>
                )}
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Subdoména pro testy vs. hlavní doména */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-[#111111] dark:border-emerald-500 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-extrabold text-emerald-950 dark:text-emerald-200">
                  <Globe className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Testovací subdoména & Feature Flags</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-[#15171E] text-[#111111] dark:text-emerald-300 border border-[#111111] font-extrabold">
                  Aktivní: {enabledFlagsCount} / {FEATURE_FLAG_ITEMS.length} úprav
                </span>
              </div>
              <p className="text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                Hlavní doména <strong>restaurion.pages.dev</strong> má ve výchozím stavu všechny přepínače vypnuté. Pro přímé porovnání na telefonu nebo v jiném okně běží testovací subdoména:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href="https://test.restaurion.pages.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-[#FEF08A] text-[#111111] dark:text-white hover:text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] font-extrabold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>test.restaurion.pages.dev (nové UI funkce zapnuté)</span>
                </a>
                <a
                  href="https://restaurion.pages.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-stone-100 text-[#111111] dark:text-stone-200 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>restaurion.pages.dev (původní verze)</span>
                </a>
              </div>
            </div>

            {/* Hromadné akce pro Feature Flags */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSetAllFlags(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#15171E] hover:bg-stone-100 text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-400 shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Vypnout vše (původní verze před chatem)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSetAllFlags(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Zapnout doporučené UI úpravy (bez recenzí)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveFlagsGlobally()}
                disabled={isSavingFlagsToD1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingFlagsToD1 ? 'Ukládám do D1…' : 'Uložit do D1 pro celý web'}</span>
              </button>
            </div>

            {flagsSavedMessage && (
              <div className="p-3 rounded-xl bg-[#FEF08A]/70 dark:bg-[#FEF08A]/20 border-2 border-[#111111] text-xs font-extrabold text-[#111111] dark:text-[#FEF08A]">
                {flagsSavedMessage}
              </div>
            )}

            {/* Seznam jednotlivých Feature Flags */}
            <div className="grid grid-cols-1 gap-3">
              {FEATURE_FLAG_ITEMS.map((item) => {
                const enabled = Boolean(featureFlags[item.key]);
                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      enabled
                        ? 'bg-[#FEF08A]/35 dark:bg-emerald-950/40 border-[#111111] dark:border-emerald-400 shadow-[3px_3px_0px_#111111]'
                        : 'bg-[#FFFDF7] dark:bg-[#15171E] border-stone-400 dark:border-stone-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
                          {item.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            enabled
                              ? 'bg-emerald-600 text-white border-[#111111]'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-400 border-stone-400'
                          }`}
                        >
                          {enabled ? 'ZAPNUTO' : 'VYPNUTO'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleToggleSingleFlag(item.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold border-2 border-[#111111] shadow-[2px_2px_0px_#111111] shrink-0 transition-all cursor-pointer ${
                        enabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white dark:bg-[#262933] hover:bg-[#FEF08A] text-[#111111] dark:text-white hover:text-[#111111]'
                      }`}
                    >
                      {enabled ? 'Vypnout' : 'Zapnout'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Rychlý přístup do CMS textů webu, správy všech zakázek a přepínání testovacích účtů */}
            <div className="pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-stone-600 dark:text-stone-400">
                  Aktivní testovací účet:
                </span>
                {Object.entries(allUsers).map(([key, u]) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSwitchCurrentUser(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                      u.id === user.id
                        ? 'bg-[#FEF08A] text-[#111111] border-[#111111]'
                        : 'bg-stone-100 dark:bg-[#15171E] text-stone-700 dark:text-stone-300 border-stone-400'
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onOpenAdministration({ filter: 'all' })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] text-xs font-extrabold cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                <span>Otevřít správu všech zakázek & CMS textů webu</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
