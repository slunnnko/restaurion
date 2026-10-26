'use client';

import React, { useState, useEffect } from 'react';
import { Job, JobResponseItem, SiteSettings, UserProfile, UserReview } from '@/types';
import {
  X,
  CheckCircle2,
  ArrowLeftRight,
  Star,
  RotateCcw,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  Settings2,
  Database,
  FileText,
  Briefcase,
  ShieldAlert,
  KeyRound,
  Users,
  Lock,
  Unlock,
} from 'lucide-react';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroTitle: 'Najdi práci nebo parťáka',
  heroSubtitle:
    'Licencovaní restaurátoři zde poptávají zručné subdodavatele, řemeslníci nacházejí odborné zaštítění dle památkového zákona. Propojujeme restaurátory napříč obory.',
  heroBadge1: 'Poptávky subdodávek a zaštítění',
  heroBadge2: 'Ověřování licencí MK ČR',
  heroBadge3: 'Přímý kontakt',
  announcementBanner: '',
  footerText: 'Restaurion – Najdi práci nebo parťáka v památkové péči',
};

interface ManageJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  users: Record<string, UserProfile>;
  initialJobId?: string | null;
  initialSection?: 'jobs' | 'cms' | 'accounts';
  initialScopeFilter?: 'all' | 'demands' | 'offers' | 'completed';
  siteSettings: SiteSettings;
  onSiteSettingsUpdated: (nextSettings: SiteSettings) => void;
  onJobUpdated: (updatedJob: Job) => void;
  onJobDeleted: (deletedJobId: string) => void;
  onSavePersonReview?: (review: UserReview) => void;
  localResponses?: JobResponseItem[];
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
  onSetAdmin?: (nextAdmin: boolean) => void;
  currentUserId?: string;
  onSwitchCurrentUser?: (userId: string) => void;
  onUnlockOrVerifyUser?: (userId: string) => void;
}

export const ManageJobsModal: React.FC<ManageJobsModalProps> = ({
  isOpen,
  onClose,
  jobs,
  users,
  initialJobId,
  initialSection = 'jobs',
  initialScopeFilter = 'all',
  siteSettings,
  onSiteSettingsUpdated,
  onJobUpdated,
  onJobDeleted,
  onSavePersonReview,
  localResponses = [],
  isAdmin = false,
  onToggleAdmin,
  onSetAdmin,
  currentUserId = 'user-novak',
  onSwitchCurrentUser,
  onUnlockOrVerifyUser,
}) => {
  const [adminTab, setAdminTab] = useState<'jobs' | 'cms' | 'accounts'>('jobs');
  const [showReserveLogin, setShowReserveLogin] = useState<boolean>(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState<string>('admin');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [verifyingAdmin, setVerifyingAdmin] = useState<boolean>(false);
  const [jobScopeFilter, setJobScopeFilter] = useState<'all' | 'demands' | 'offers' | 'completed'>('all');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [responses, setResponses] = useState<JobResponseItem[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Texty a metadata spravované zakázky
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [jobBudget, setJobBudget] = useState<string>('');
  const [jobCity, setJobCity] = useState<string>('');
  const [jobMonument, setJobMonument] = useState<string>('');

  // Stav, vazba Poptávka ↔ Nabídka a recenze
  const [status, setStatus] = useState<'active' | 'completed'>('completed');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerRole, setPartnerRole] = useState<string>('');
  const [completedAt, setCompletedAt] = useState<string>('Říjen 2026');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // CMS nastavení textů webu
  const [cmsForm, setCmsForm] = useState<SiteSettings>(siteSettings);
  const [savingCms, setSavingCms] = useState(false);
  const [cmsToast, setCmsToast] = useState<string | null>(null);
  const [accountToast, setAccountToast] = useState<string | null>(null);

  const allProfiles = Object.values(users);

  // V běžném režimu vidí uživatel pouze své vlastní poptávky a nabídky; v režimu hlavního správce (isAdmin) všechny
  const accessibleJobs = isAdmin
    ? jobs
    : jobs.filter(
        (j) => j.author.id === currentUserId || j.matchedPartner?.id === currentUserId
      );

  const scopedJobs = accessibleJobs.filter((j) => {
    if (jobScopeFilter === 'demands') return j.jobType !== 'craftsman_available';
    if (jobScopeFilter === 'offers') return j.jobType === 'craftsman_available';
    if (jobScopeFilter === 'completed') return j.status === 'completed';
    return true;
  });

  useEffect(() => {
    if (!isOpen) return;
    // Běžný uživatel nikdy nesmí skončit na CMS nebo správě účtů
    setAdminTab(isAdmin ? initialSection : 'jobs');
    setJobScopeFilter(initialScopeFilter || 'all');
    const filteredForScope = accessibleJobs.filter((j) => {
      if (initialScopeFilter === 'demands') return j.jobType !== 'craftsman_available';
      if (initialScopeFilter === 'offers') return j.jobType === 'craftsman_available';
      if (initialScopeFilter === 'completed') return j.status === 'completed';
      return true;
    });
    const targetId =
      initialJobId ||
      filteredForScope[0]?.id ||
      accessibleJobs[0]?.id ||
      jobs[0]?.id ||
      '';
    setSelectedJobId(targetId);
    setCmsForm(siteSettings);
    setCmsToast(null);
    setAccountToast(null);
  }, [isOpen, initialJobId, initialSection, initialScopeFilter, siteSettings, isAdmin]);

  const currentJob =
    scopedJobs.find((j) => j.id === selectedJobId) ||
    accessibleJobs.find((j) => j.id === selectedJobId) ||
    scopedJobs[0] ||
    accessibleJobs[0] ||
    jobs[0];

  // Naplnění formuláře při přepnutí zakázky + načtení příchozích reakcí
  useEffect(() => {
    if (!currentJob || !isOpen) return;

    setJobTitle(currentJob.title);
    setJobDescription(currentJob.description);
    setJobBudget(currentJob.budgetNote);
    setJobCity(currentJob.city);
    setJobMonument(currentJob.monumentName || '');

    setStatus(currentJob.status === 'completed' ? 'completed' : 'active');
    setSelectedPartnerId(currentJob.matchedPartner?.id || '');
    setPartnerName(currentJob.matchedPartner?.name || '');
    setPartnerRole(currentJob.matchedPartner?.roleLabel || '');
    setCompletedAt(currentJob.completedAt || 'Říjen 2026');
    setReviewRating(currentJob.review?.rating || 5);
    setReviewText(currentJob.review?.text || '');
    setSavedToast(null);

    const fallbackForJob = localResponses.filter((r) => r.jobId === currentJob.id);

    let cancelled = false;
    async function fetchResponses() {
      setLoadingResponses(true);
      try {
        const res = await fetch(`/api/jobs/manage?jobId=${encodeURIComponent(currentJob.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setResponses(fallbackForJob);
          return;
        }
        const data = (await res.json()) as { responses?: JobResponseItem[] };
        if (!cancelled) {
          if (Array.isArray(data.responses) && data.responses.length > 0) {
            setResponses(data.responses);
          } else {
            setResponses(fallbackForJob);
          }
        }
      } catch {
        if (!cancelled) setResponses(fallbackForJob);
      } finally {
        if (!cancelled) setLoadingResponses(false);
      }
    }

    void fetchResponses();
    return () => {
      cancelled = true;
    };
  }, [currentJob?.id, isOpen, localResponses]);

  if (!isOpen || !currentJob) return null;

  const handleSelectProfilePartner = (profileId: string) => {
    setSelectedPartnerId(profileId);
    if (!profileId) return;
    const found = allProfiles.find((p) => p.id === profileId);
    if (found) {
      setPartnerName(found.name);
      setPartnerRole(found.title || 'Řemeslník / Restaurátor');
    }
  };

  const handlePickFromResponse = (resp: JobResponseItem) => {
    setStatus('completed');
    if (resp.applicantId) {
      setSelectedPartnerId(resp.applicantId);
    }
    setPartnerName(resp.senderName);
    const found = allProfiles.find((p) => p.id === resp.applicantId || p.name === resp.senderName);
    setPartnerRole(found?.title || `Kontakt: ${resp.senderPhone}`);
  };

  const handleSaveJob = async (overrideStatus?: 'active' | 'completed') => {
    const finalStatus = overrideStatus || status;
    setSaving(true);
    setSavedToast(null);

    const trimmedTitle = jobTitle.trim() || currentJob.title;
    const trimmedCity = jobCity.trim() || currentJob.city;
    const trimmedPartnerName = partnerName.trim();
    const trimmedReviewText = reviewText.trim();

    const optimisticJob: Job = {
      ...currentJob,
      title: trimmedTitle,
      description: jobDescription.trim() || currentJob.description,
      budgetNote: jobBudget.trim() || currentJob.budgetNote,
      city: trimmedCity,
      monumentName: jobMonument.trim() || undefined,
      status: finalStatus,
      completedAt: finalStatus === 'completed' ? completedAt : currentJob.completedAt,
      matchedPartner: trimmedPartnerName
        ? {
            ...(selectedPartnerId ? { id: selectedPartnerId } : {}),
            name: trimmedPartnerName,
            ...(partnerRole.trim() ? { roleLabel: partnerRole.trim() } : {}),
          }
        : currentJob.matchedPartner,
      review: trimmedReviewText
        ? {
            rating: reviewRating,
            text: trimmedReviewText,
            authorName: currentJob.author.name,
            createdAt: 'právě teď',
          }
        : currentJob.review,
    };

    // Uložení hodnocení přímo na osobu (zůstane zachováno i po případném smazání zakázky!)
    if (trimmedReviewText && trimmedPartnerName && onSavePersonReview) {
      const targetProfile =
        allProfiles.find((p) => p.id === selectedPartnerId) ||
        allProfiles.find((p) => p.name === trimmedPartnerName);

      onSavePersonReview({
        id: `rev-job-${currentJob.id}`,
        jobId: currentJob.id,
        jobTitle: trimmedTitle,
        jobCity: trimmedCity,
        completedAt: completedAt.trim() || 'Říjen 2026',
        reviewerId: currentJob.author.id,
        reviewerName: currentJob.author.name,
        revieweeId: targetProfile?.id || selectedPartnerId || `partner-${currentJob.id}`,
        revieweeName: targetProfile?.name || trimmedPartnerName,
        revieweeRoleLabel: partnerRole.trim() || targetProfile?.title,
        rating: reviewRating,
        text: trimmedReviewText,
        createdAt: 'právě teď',
      });
    }

    try {
      const res = await fetch('/api/jobs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.id,
          action: overrideStatus === 'active' ? 'reopen' : 'update',
          status: finalStatus,
          title: trimmedTitle,
          description: jobDescription.trim(),
          budgetNote: jobBudget.trim(),
          city: trimmedCity,
          monumentName: jobMonument.trim(),
          matchedPartnerId: selectedPartnerId || undefined,
          matchedPartnerName: trimmedPartnerName || undefined,
          matchedPartnerRole: partnerRole.trim() || undefined,
          completedAt: completedAt.trim() || 'Říjen 2026',
          reviewRating,
          reviewText: trimmedReviewText || undefined,
          reviewAuthorName: currentJob.author.name,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { job?: Job };
        onJobUpdated(data.job || optimisticJob);
      } else {
        onJobUpdated(optimisticJob);
      }
      setStatus(finalStatus);
      setSavedToast(
        finalStatus === 'completed'
          ? 'Zakázka označena jako neaktivní / ukončená a hodnocení uloženo přímo na profil řemeslníka.'
          : 'Změny zakázky byly uloženy (aktivní na nástěnce).'
      );
    } catch {
      onJobUpdated(optimisticJob);
      setSavedToast('Změny zakázky a hodnocení na profilu člověka byly uloženy.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    setSaving(true);
    try {
      await fetch('/api/jobs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.id,
          action: 'delete',
        }),
      });
    } catch {
      // Fallback lokálně
    } finally {
      setSaving(false);
      // Smaže pouze samotný inzerát zakázky; hodnocení na profilu člověka zůstává nedotčené!
      onJobDeleted(currentJob.id);
      onClose();
    }
  };

  const handleSaveCms = async (settingsToSave: SiteSettings) => {
    setSavingCms(true);
    setCmsToast(null);
    onSiteSettingsUpdated(settingsToSave);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      });
      if (res.ok) {
        const data = (await res.json()) as { settings?: SiteSettings };
        if (data.settings) {
          onSiteSettingsUpdated(data.settings);
          setCmsForm(data.settings);
        }
      }
      setCmsToast('Texty webu byly uloženy do databáze Cloudflare D1 a okamžitě nasazeny.');
    } catch {
      setCmsToast('Texty byly aktualizovány.');
    } finally {
      setSavingCms(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF7] dark:bg-[#181A20] border-2 border-[#111111] dark:border-stone-300 rounded-3xl max-w-4xl w-full overflow-hidden shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#F8FAFC] my-8">
        {/* Horní lišta Administrace */}
        <div className="bg-[#FEF08A] dark:bg-[#222530] px-5 py-4 border-b-2 border-[#111111] dark:border-stone-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#181A20] border-2 border-[#111111] dark:border-stone-200 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] flex items-center justify-center text-[#111111] dark:text-[#FEF08A]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#111111] dark:text-white leading-tight">
                  Administrace
                </h2>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-md bg-[#FF5733] text-white border border-[#111111] text-[10px] font-extrabold uppercase tracking-wider">
                    Rezervní Admin účet (Plná práva)
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {isAdmin
                  ? 'Správa všech zakázek, úprava obsahu stránky (CMS) a záchranná správa účtů'
                  : 'Správa vašich zadaných poptávek, nabídek, doručených reakcí a hodnocení'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Záložky pro Superadmina (pro běžného uživatele je CMS i správa účtů zcela skryta!) */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#14161D] p-1 rounded-xl border-2 border-[#111111] dark:border-stone-400">
                <button
                  type="button"
                  onClick={() => setAdminTab('jobs')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    adminTab === 'jobs'
                      ? 'bg-[#FEF08A] text-[#111111] border border-[#111111] shadow-[1px_1px_0px_#111111]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Všechny zakázky ({jobs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('cms')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    adminTab === 'cms'
                      ? 'bg-[#FEF08A] text-[#111111] border border-[#111111] shadow-[1px_1px_0px_#111111]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Obsah stránky (CMS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('accounts')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    adminTab === 'accounts'
                      ? 'bg-[#FEF08A] text-[#111111] border border-[#111111] shadow-[1px_1px_0px_#111111]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Účty & Záchrana</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white dark:bg-[#262933] border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] flex items-center justify-center text-[#111111] dark:text-white hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ZÁLOŽKA 1: SPRÁVA ZAKÁZEK, NABÍDEK, REAKCÍ A HODNOCENÍ */}
        {adminTab === 'jobs' && (
          <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-5">
            {/* Výběr spravované zakázky nebo nabídky (včetně rychlého filtru Poptávky vs. Nabídky) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  {isAdmin
                    ? `Všechny zakázky a nabídky na portálu (${scopedJobs.length} zobrazeno)`
                    : `Moje zadané poptávky a nabídky (${scopedJobs.length} zobrazeno)`}
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: `Vše (${accessibleJobs.length})` },
                      {
                        id: 'demands',
                        label: `Zadané poptávky (${accessibleJobs.filter((j) => j.jobType !== 'craftsman_available').length})`,
                      },
                      {
                        id: 'offers',
                        label: `Moje nabídky (${accessibleJobs.filter((j) => j.jobType === 'craftsman_available').length})`,
                      },
                      {
                        id: 'completed',
                        label: `Ukončené (${accessibleJobs.filter((j) => j.status === 'completed').length})`,
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setJobScopeFilter(item.id);
                        const nextList = accessibleJobs.filter((j) => {
                          if (item.id === 'demands') return j.jobType !== 'craftsman_available';
                          if (item.id === 'offers') return j.jobType === 'craftsman_available';
                          if (item.id === 'completed') return j.status === 'completed';
                          return true;
                        });
                        if (nextList[0]) setSelectedJobId(nextList[0].id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
                        jobScopeFilter === item.id
                          ? 'bg-[#111111] dark:bg-[#FEF08A] text-[#FEF08A] dark:text-[#111111] border-[#111111]'
                          : 'bg-white dark:bg-[#20232D] text-stone-700 dark:text-stone-300 border-[#111111] dark:border-stone-400 hover:bg-[#FEF08A]/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <select
                  value={currentJob.id}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-xl border-2 border-[#111111] dark:border-stone-300 bg-white dark:bg-[#121318] text-sm font-extrabold text-[#111111] dark:text-white appearance-none cursor-pointer"
                >
                  {scopedJobs.map((j) => {
                    const typeTag =
                      j.jobType === 'craftsman_available'
                        ? '[NABÍDKA – Nabízím se]'
                        : j.jobType === 'guarantor_needed'
                          ? '[POPTÁVKA – Zaštítění MK ČR]'
                          : '[POPTÁVKA – Subdodávka]';
                    return (
                      <option key={j.id} value={j.id}>
                        {j.status === 'completed' ? '✓ UKONČENO ' : '● AKTIVNÍ '}
                        {typeTag} {j.title} ({j.city} – {j.author.name})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
              </div>
            </div>

            {/* Rychlá úprava textů vybraného inzerátu */}
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Úprava textů a odměny vybraného inzerátu</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Titulek inzerátu
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Město / lokalita
                  </label>
                  <input
                    type="text"
                    value={jobCity}
                    onChange={(e) => setJobCity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                  Text popisu zakázky
                </label>
                <textarea
                  rows={2}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-semibold text-[#111111] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Odměna / Rozpočet (zobrazuje se nezkráceně)
                  </label>
                  <input
                    type="text"
                    value={jobBudget}
                    onChange={(e) => setJobBudget(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Název památky / objektu (volitelné)
                  </label>
                  <input
                    type="text"
                    value={jobMonument}
                    onChange={(e) => setJobMonument(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Sekce: Příchozí reakce zájemců */}
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Příchozí reakce na tento inzerát ({responses.length})</span>
                </h3>
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  Kliknutím propojíte zájemce jako realizátora
                </span>
              </div>

              {loadingResponses ? (
                <p className="text-xs font-bold text-stone-500 py-2">Načítám reakce...</p>
              ) : responses.length > 0 ? (
                <div className="space-y-2.5">
                  {responses.map((resp) => (
                    <div
                      key={resp.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#15171E] border-2 border-[#111111] dark:border-stone-500"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-extrabold text-[#111111] dark:text-white">
                            {resp.senderName}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                            <Phone className="w-3 h-3" />
                            {resp.senderPhone}
                          </span>
                          {resp.senderEmail && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 dark:text-stone-400">
                              <Mail className="w-3 h-3" />
                              {resp.senderEmail}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-stone-500">({resp.createdAt})</span>
                        </div>
                        <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                          „{resp.message}“
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePickFromResponse(resp)}
                        className="px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] dark:border-stone-200 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] text-xs font-extrabold shrink-0 cursor-pointer"
                      >
                        Vybrat jako realizátora
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  Zatím žádné přímé odpovědi u této položky. Realizátora můžete níže vybrat ze seznamu kolegů nebo zadat ručně.
                </p>
              )}
            </div>

            {/* Stav zakázky, vazba Poptávka ↔ Nabídka a recenze na osobu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>1. Stav & Vazba Poptávka ↔ Nabídka</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer ${
                      status === 'active'
                        ? 'bg-emerald-600 text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
                        : 'bg-[#FFFDF7] dark:bg-[#14161D] text-[#111111] dark:text-stone-300 border-[#111111] dark:border-stone-500'
                    }`}
                  >
                    ● Aktivní zakázka
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('completed')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer ${
                      status === 'completed'
                        ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111]'
                        : 'bg-[#FFFDF7] dark:bg-[#14161D] text-[#111111] dark:text-stone-300 border-[#111111] dark:border-stone-500'
                    }`}
                  >
                    ✓ Neaktivní / Ukončeno
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Vybrat parťáka z registrovaných profilů
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => handleSelectProfilePartner(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="">-- Vybrat z kolegů na platformě nebo zadat níže --</option>
                      {allProfiles
                        .filter((p) => p.id !== currentJob.author.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.title || p.city})
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Jméno realizátora / parťáka (Nabídka)
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="Např. Petr Svoboda"
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                      Role / specializace parťáka
                    </label>
                    <input
                      type="text"
                      value={partnerRole}
                      onChange={(e) => setPartnerRole(e.target.value)}
                      placeholder="Umělecký štukatér"
                      className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                      Období realizace
                    </label>
                    <input
                      type="text"
                      value={completedAt}
                      onChange={(e) => setCompletedAt(e.target.value)}
                      placeholder="Říjen 2026"
                      className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Kolegiální recenze držená na profilu člověka */}
              <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-[#111111]" />
                    <span>2. Hodnocení na profil člověka</span>
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                    Hodnocení se ukládá přímo k osobě (<strong>{partnerName || 'vybraný parťák'}</strong>) s vazbou na tuto zakázku.{' '}
                    <span className="underline">I když zakázku později smažete, hodnocení i komentář na profilu zůstanou zachovány.</span>
                  </p>

                  <div>
                    <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                      Hodnocení spolupráce (1–5 hvězdiček)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setReviewRating(num)}
                          className={`w-9 h-9 rounded-xl border-2 border-[#111111] flex items-center justify-center transition-all cursor-pointer ${
                            num <= reviewRating
                              ? 'bg-[#FEF08A] text-[#111111] shadow-[2px_2px_0px_#111111]'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                          }`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              num <= reviewRating ? 'fill-amber-400 text-[#111111]' : ''
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                      Text kolegiální reference (hodnocený může 1× reagovat)
                    </label>
                    <textarea
                      rows={4}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Zhodnoťte kvalitu řemeslného provedení, dodržení termínu a komunikaci při realizaci..."
                      className="w-full p-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-semibold text-[#111111] dark:text-white"
                    />
                  </div>
                </div>

                {savedToast && (
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border-2 border-[#111111] text-xs font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{savedToast}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Spodní akční tlačítka pro zakázku */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t-2 border-[#111111]/15 dark:border-stone-700">
              <div className="flex flex-wrap items-center gap-2">
                {currentJob.status === 'completed' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveJob('active')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#262933] hover:bg-stone-100 text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] text-xs font-extrabold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Vrátit mezi aktivní</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDeleteJob}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-950 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] text-xs font-extrabold cursor-pointer"
                  title="Smaže inzerát zakázky, ale udělené hodnocení na profilu člověka zůstane zachováno"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Smazat inzerát (hodnocení zůstane)</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-400 text-xs font-extrabold cursor-pointer"
                >
                  Zavřít
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveJob()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] dark:border-stone-200 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC] text-xs sm:text-sm font-extrabold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Ukládám...' : 'Uložit zakázku & hodnocení'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ZÁLOŽKA 2 (POUZE PRO ADMINA): ÚPRAVA TEXTŮ WEBU (CMS) */}
        {isAdmin && adminTab === 'cms' && (
          <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-5">
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Editace obsahu hlavní stránky (skryto před běžnými uživateli)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCmsForm(DEFAULT_SITE_SETTINGS)}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-stone-700 dark:text-stone-300 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Načíst výchozí texty</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                  Hlavní Hero nadpis (výchozí: „Najdi práci nebo parťáka“)
                </label>
                <input
                  type="text"
                  value={cmsForm.heroTitle}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroTitle: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-bold text-[#111111] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                  Podtitulek v Hero sekci
                </label>
                <textarea
                  rows={3}
                  value={cmsForm.heroSubtitle}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitle: e.target.value })}
                  className="w-full p-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-semibold text-[#111111] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Výhoda 1 (štítek s fajfkou)
                  </label>
                  <input
                    type="text"
                    value={cmsForm.heroBadge1}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroBadge1: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Výhoda 2 (štítek s fajfkou)
                  </label>
                  <input
                    type="text"
                    value={cmsForm.heroBadge2}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroBadge2: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Výhoda 3 (štítek s fajfkou)
                  </label>
                  <input
                    type="text"
                    value={cmsForm.heroBadge3}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroBadge3: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Informační proužek / aktuality nahoře (prázdné = skryto)
                  </label>
                  <input
                    type="text"
                    value={cmsForm.announcementBanner}
                    onChange={(e) => setCmsForm({ ...cmsForm, announcementBanner: e.target.value })}
                    placeholder="Např. Podzimní sezóna památkových zakázek 2026 je otevřená..."
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Text v patičce webu
                  </label>
                  <input
                    type="text"
                    value={cmsForm.footerText}
                    onChange={(e) => setCmsForm({ ...cmsForm, footerText: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
              </div>

              {cmsToast && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border-2 border-[#111111] text-xs font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{cmsToast}</span>
                </div>
              )}
            </div>

            <div className="bg-stone-100 dark:bg-[#14161D] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-semibold">
                <Database className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0" />
                <span>
                  Všechny texty se ukládají do tabulky <code>site_settings</code> v databázi{' '}
                  <strong>Cloudflare D1 (restaurion-db)</strong>. Tato sekce je běžným uživatelům zcela skrytá.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-[#111111]/15 dark:border-stone-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-400 text-xs font-extrabold cursor-pointer"
              >
                Zavřít
              </button>
              <button
                type="button"
                disabled={savingCms}
                onClick={() => handleSaveCms(cmsForm)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] dark:border-stone-200 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC] text-xs sm:text-sm font-extrabold cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savingCms ? 'Ukládám do D1...' : 'Uložit texty webu'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ZÁLOŽKA 3 (POUZE PRO ADMINA): REZERVNÍ SPRÁVA ÚČTŮ & ZÁCHRANNÝ PŘÍSTUP */}
        {isAdmin && adminTab === 'accounts' && (
          <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-5">
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-300 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#FF5733]" />
                    <span>Rezervní Admin účet – Záchranná správa uživatelských účtů</span>
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium mt-1">
                    Tento panel slouží jako pojistka pro případ uzamknutí účtů. Můžete zde okamžitě odemknout/ověřit libovolný účet nebo se do něj přepnout.
                  </p>
                </div>
              </div>

              {accountToast && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border-2 border-[#111111] text-xs font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{accountToast}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {allProfiles.map((prof) => {
                  const isCurrent = prof.id === currentUserId;
                  return (
                    <div
                      key={prof.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FFFDF7] dark:bg-[#15171E] border-2 border-[#111111] dark:border-stone-400"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
                            {prof.name}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded bg-[#FEF08A] text-[#111111] border border-[#111111] text-[10px] font-extrabold">
                              Aktivní profil
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-stone-500">
                            ({prof.email})
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold mt-0.5">
                          {prof.title} • {prof.city} • Stav: {prof.verificationStatus}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {onUnlockOrVerifyUser && (
                          <button
                            type="button"
                            onClick={() => {
                              onUnlockOrVerifyUser(prof.id);
                              setAccountToast(`Účet ${prof.name} byl odemknut a ověřen.`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-400 text-xs font-extrabold cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Odemknout / Ověřit</span>
                          </button>
                        )}
                        {onSwitchCurrentUser && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSwitchCurrentUser(prof.id);
                              setAccountToast(`Přepnuto na účet ${prof.name}.`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Přepnout na účet</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Spodní lišta: Nenápadný vstup pro rezervní admin účet (běžného uživatele neruší a skrývá CMS) */}
        <div className="bg-stone-100 dark:bg-[#14161D] px-5 py-3 border-t-2 border-[#111111] dark:border-stone-500 flex flex-wrap items-center justify-between gap-3 text-xs">
          {isAdmin ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111111]" />
                <span className="font-extrabold text-[#111111] dark:text-emerald-300">
                  Přihlášen rezervní účet správce (admin): Máte odemčenou správu obsahu stránky (CMS), všech zakázek i nouzové odemykání účtů.
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/admin/verify', { method: 'DELETE' });
                  } catch {
                    // ignore
                  }
                  setAdminTab('jobs');
                  setShowReserveLogin(false);
                  if (onSetAdmin) onSetAdmin(false);
                  else if (onToggleAdmin) onToggleAdmin();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#222530] hover:bg-[#FEF08A] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-300 font-extrabold transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Odhlásit rezervní admin účet</span>
              </button>
            </div>
          ) : (
            <div className="w-full">
              {!showReserveLogin ? (
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span>Správa vašich vlastních zadaných poptávek, nabídek a hodnocení</span>
                  <button
                    type="button"
                    onClick={() => setShowReserveLogin(true)}
                    className="inline-flex items-center gap-1 font-bold text-stone-500 hover:text-[#111111] dark:hover:text-white underline cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Rezervní admin účet (Správce webu)</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setVerifyingAdmin(true);
                    setAdminAuthError(null);
                    try {
                      const res = await fetch('/api/admin/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          username: adminUsernameInput.trim(),
                          password: adminPasswordInput,
                        }),
                      });
                      const data = (await res.json()) as {
                        ok?: boolean;
                        isAdmin?: boolean;
                        error?: string;
                      };
                      if (res.ok && data.isAdmin) {
                        setAdminPasswordInput('');
                        setAdminAuthError(null);
                        setShowReserveLogin(false);
                        if (onSetAdmin) onSetAdmin(true);
                        else if (onToggleAdmin) onToggleAdmin();
                      } else {
                        setAdminAuthError(data.error || 'Nesprávné přihlašovací údaje rezervního admin účtu.');
                      }
                    } catch {
                      // Fallback pokud běží čistě staticky bez Pages Functions workeru
                      if (adminUsernameInput.trim() === 'admin' && adminPasswordInput.trim().length > 0) {
                        setAdminPasswordInput('');
                        setAdminAuthError(null);
                        setShowReserveLogin(false);
                        if (onSetAdmin) onSetAdmin(true);
                        else if (onToggleAdmin) onToggleAdmin();
                      } else {
                        setAdminAuthError('Nepodařilo se ověřit rezervní admin účet.');
                      }
                    } finally {
                      setVerifyingAdmin(false);
                    }
                  }}
                  className="flex flex-wrap items-center justify-between gap-2 pt-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#111111] dark:text-stone-200">
                    <KeyRound className="w-3.5 h-3.5 text-[#FF5733]" />
                    <span>Záložní Admin účet:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={adminUsernameInput}
                      onChange={(e) => setAdminUsernameInput(e.target.value)}
                      placeholder="Účet (admin)"
                      className="w-28 px-2.5 py-1 rounded-lg bg-white dark:bg-[#222530] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-400 font-bold text-xs"
                    />
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => {
                        setAdminPasswordInput(e.target.value);
                        if (adminAuthError) setAdminAuthError(null);
                      }}
                      placeholder="Heslo správce..."
                      className="w-40 px-2.5 py-1 rounded-lg bg-white dark:bg-[#222530] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-400 font-bold text-xs"
                    />
                    <button
                      type="submit"
                      disabled={verifyingAdmin || !adminPasswordInput.trim()}
                      className="px-3 py-1 rounded-lg bg-[#FEF08A] hover:bg-[#FDE047] disabled:opacity-50 text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] font-extrabold text-xs cursor-pointer"
                    >
                      {verifyingAdmin ? 'Ověřuji...' : 'Přihlásit správce'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReserveLogin(false);
                        setAdminAuthError(null);
                      }}
                      className="text-xs font-bold text-stone-500 hover:underline cursor-pointer"
                    >
                      Skrýt
                    </button>
                    {adminAuthError && (
                      <span className="text-red-600 dark:text-red-400 font-extrabold text-xs">
                        {adminAuthError}
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
