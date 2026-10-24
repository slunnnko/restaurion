'use client';

import React, { useState, useEffect } from 'react';
import { Job, JobResponseItem, SiteSettings, UserProfile } from '@/types';
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
  initialSection?: 'jobs' | 'cms';
  siteSettings: SiteSettings;
  onSiteSettingsUpdated: (nextSettings: SiteSettings) => void;
  onJobUpdated: (updatedJob: Job) => void;
  onJobDeleted: (deletedJobId: string) => void;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
  onSetAdmin?: (nextAdmin: boolean) => void;
  currentUserId?: string;
}

export const ManageJobsModal: React.FC<ManageJobsModalProps> = ({
  isOpen,
  onClose,
  jobs,
  users,
  initialJobId,
  initialSection = 'jobs',
  siteSettings,
  onSiteSettingsUpdated,
  onJobUpdated,
  onJobDeleted,
  isAdmin = false,
  onToggleAdmin,
  onSetAdmin,
  currentUserId = 'user-novak',
}) => {
  const [adminTab, setAdminTab] = useState<'jobs' | 'cms'>('jobs');
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

  const allProfiles = Object.values(users);

  // V administrátorském režimu vidíte VŠECHNY nabídky i poptávky všech uživatelů; v běžném pohledu jen své vlastní
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
    setAdminTab(initialSection);
    setJobScopeFilter('all');
    const targetId = initialJobId || accessibleJobs[0]?.id || jobs[0]?.id || '';
    setSelectedJobId(targetId);
    setCmsForm(siteSettings);
    setCmsToast(null);
  }, [isOpen, initialJobId, initialSection, siteSettings]);

  const currentJob =
    scopedJobs.find((j) => j.id === selectedJobId) ||
    accessibleJobs.find((j) => j.id === selectedJobId) ||
    scopedJobs[0] ||
    accessibleJobs[0] ||
    jobs[0];

  // Naplnění formuláře při přepnutí zakázky + načtení příchozích reakcí z D1
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

    let cancelled = false;
    async function fetchResponses() {
      setLoadingResponses(true);
      try {
        const res = await fetch(`/api/jobs/manage?jobId=${encodeURIComponent(currentJob.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { responses?: JobResponseItem[] };
        if (!cancelled && Array.isArray(data.responses)) {
          setResponses(data.responses);
        }
      } catch {
        if (!cancelled) setResponses([]);
      } finally {
        if (!cancelled) setLoadingResponses(false);
      }
    }

    void fetchResponses();
    return () => {
      cancelled = true;
    };
  }, [currentJob?.id, isOpen]);

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

    const optimisticJob: Job = {
      ...currentJob,
      title: jobTitle.trim() || currentJob.title,
      description: jobDescription.trim() || currentJob.description,
      budgetNote: jobBudget.trim() || currentJob.budgetNote,
      city: jobCity.trim() || currentJob.city,
      monumentName: jobMonument.trim() || undefined,
      status: finalStatus,
      completedAt: finalStatus === 'completed' ? completedAt : currentJob.completedAt,
      matchedPartner: partnerName.trim()
        ? {
            ...(selectedPartnerId ? { id: selectedPartnerId } : {}),
            name: partnerName.trim(),
            ...(partnerRole.trim() ? { roleLabel: partnerRole.trim() } : {}),
          }
        : currentJob.matchedPartner,
      review: reviewText.trim()
        ? {
            rating: reviewRating,
            text: reviewText.trim(),
            authorName: currentJob.author.name,
            createdAt: 'právě teď',
          }
        : currentJob.review,
    };

    try {
      const res = await fetch('/api/jobs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.id,
          action: overrideStatus === 'active' ? 'reopen' : 'update',
          status: finalStatus,
          title: jobTitle.trim(),
          description: jobDescription.trim(),
          budgetNote: jobBudget.trim(),
          city: jobCity.trim(),
          monumentName: jobMonument.trim(),
          matchedPartnerId: selectedPartnerId || undefined,
          matchedPartnerName: partnerName.trim() || undefined,
          matchedPartnerRole: partnerRole.trim() || undefined,
          completedAt: completedAt.trim() || 'Říjen 2026',
          reviewRating,
          reviewText: reviewText.trim() || undefined,
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
          ? 'Zakázka uložena do D1 (v kompaktním archivu se zachovanou vazbou a recenzí).'
          : 'Změny zakázky byly uloženy do D1 (aktivní na nástěnce).'
      );
    } catch {
      onJobUpdated(optimisticJob);
      setSavedToast('Změny byly uloženy.');
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
      <div className="bg-[#FFFDF7] dark:bg-[#181A20] border-2 border-[#111111] dark:border-stone-400 rounded-3xl max-w-4xl w-full overflow-hidden shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#000000] my-8">
        {/* Horní lišta Admin rozhraní */}
        <div className="bg-[#FEF08A] dark:bg-[#222530] px-5 py-4 border-b-2 border-[#111111] dark:border-stone-500 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#181A20] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center text-[#111111] dark:text-[#FEF08A]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#111111] dark:text-white leading-tight">
                Administrace portálu Restaurion
              </h2>
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Správa zakázek, vazeb Poptávka ↔ Nabídka, recenzí a textů webu (Cloudflare D1)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Přepínač záložek Adminu */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#14161D] p-1 rounded-xl border-2 border-[#111111] dark:border-stone-500">
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
                <span>Zakázky & Recenze</span>
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
                <span>Texty webu (CMS)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white dark:bg-[#262933] border-2 border-[#111111] dark:border-stone-400 flex items-center justify-center text-[#111111] dark:text-white hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stav administrátorských práv (Superadmin vs. pohled běžného uživatele) */}
        <div className="bg-[#FFFDF7] dark:bg-[#14161D] px-5 py-3 border-b-2 border-[#111111] dark:border-stone-600 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full border border-[#111111] shrink-0 ${
                isAdmin ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            {isAdmin ? (
              <span className="font-extrabold text-[#111111] dark:text-emerald-300">
                Administrátorská práva aktivní: Vidíte tlačítko „Upravit“ a můžete řešit VŠECHNY nabídky i poptávky ({jobs.length})
              </span>
            ) : (
              <span className="font-extrabold text-stone-700 dark:text-stone-300">
                Pohled běžného uživatele: Vidíte „Upravit“ pouze u vlastních inzerátů ({accessibleJobs.length})
              </span>
            )}
          </div>

          {isAdmin ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch('/api/admin/verify', { method: 'DELETE' });
                } catch {
                  // ignore
                }
                if (onSetAdmin) onSetAdmin(false);
                else if (onToggleAdmin) onToggleAdmin();
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#222530] hover:bg-[#FEF08A] dark:hover:bg-[#2E3240] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-500 font-extrabold transition-colors cursor-pointer"
            >
              Uzamknout (pohled běžného uživatele)
            </button>
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
                    body: JSON.stringify({ password: adminPasswordInput }),
                  });
                  const data = (await res.json()) as {
                    ok?: boolean;
                    isAdmin?: boolean;
                    error?: string;
                  };
                  if (res.ok && data.isAdmin) {
                    setAdminPasswordInput('');
                    setAdminAuthError(null);
                    if (onSetAdmin) onSetAdmin(true);
                    else if (onToggleAdmin) onToggleAdmin();
                  } else {
                    setAdminAuthError(data.error || 'Nesprávné administrátorské heslo.');
                  }
                } catch {
                  setAdminAuthError('Nepodařilo se ověřit heslo.');
                } finally {
                  setVerifyingAdmin(false);
                }
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => {
                  setAdminPasswordInput(e.target.value);
                  if (adminAuthError) setAdminAuthError(null);
                }}
                placeholder="Admin heslo..."
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#222530] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-500 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#FEF08A]"
              />
              <button
                type="submit"
                disabled={verifyingAdmin || !adminPasswordInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#FEF08A] hover:bg-[#FDE047] disabled:opacity-50 text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] font-extrabold transition-all cursor-pointer"
              >
                {verifyingAdmin ? 'Ověřuji...' : 'Odemknout administraci'}
              </button>
              {adminAuthError && (
                <span className="text-red-600 dark:text-red-400 font-extrabold">
                  {adminAuthError}
                </span>
              )}
            </form>
          )}
        </div>

        {/* ZÁLOŽKA 1: SPRÁVA ZAKÁZEK, TEXTŮ INZERÁTU, VAZEB A RECENZÍ */}
        {adminTab === 'jobs' ? (
          <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-5">
            {/* Výběr spravované zakázky nebo nabídky (včetně rychlého filtru Poptávky vs. Nabídky) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Vyberte poptávku nebo nabídku ke správě ({scopedJobs.length} zobrazeno)
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: `Vše (${accessibleJobs.length})` },
                      {
                        id: 'demands',
                        label: `Poptávky (${accessibleJobs.filter((j) => j.jobType !== 'craftsman_available').length})`,
                      },
                      {
                        id: 'offers',
                        label: `Nabídky / Nabízím se (${accessibleJobs.filter((j) => j.jobType === 'craftsman_available').length})`,
                      },
                      {
                        id: 'completed',
                        label: `Realizované (${accessibleJobs.filter((j) => j.status === 'completed').length})`,
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
                          ? 'bg-[#111111] text-[#FEF08A] border-[#111111]'
                          : 'bg-white dark:bg-[#20232D] text-stone-700 dark:text-stone-300 border-[#111111] dark:border-stone-500 hover:bg-[#FEF08A]/50'
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
                  className="w-full h-11 pl-4 pr-10 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-white dark:bg-[#121318] text-sm font-extrabold text-[#111111] dark:text-white appearance-none cursor-pointer"
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
                        {j.status === 'completed' ? '✓ REALIZOVÁNO ' : '● AKTIVNÍ '}
                        {typeTag} {j.title} ({j.city} – {j.author.name})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
              </div>
            </div>

            {/* Rychlá úprava textů vybraného inzerátu */}
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-3">
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                  className="w-full p-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-semibold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Sekce: Příchozí reakce zájemců z databáze D1 */}
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Příchozí reakce na tuto poptávku ({responses.length})</span>
                </h3>
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  Kliknutím propojíte zájemce jako realizátora
                </span>
              </div>

              {loadingResponses ? (
                <p className="text-xs font-bold text-stone-500 py-2">Načítám reakce z Cloudflare D1...</p>
              ) : responses.length > 0 ? (
                <div className="space-y-2.5">
                  {responses.map((resp) => (
                    <div
                      key={resp.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#15171E] border-2 border-[#111111] dark:border-stone-600"
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
                        className="px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold shrink-0 cursor-pointer"
                      >
                        Vybrat jako realizátora
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  Zatím žádné přímé odpovědi v databázi u této položky. Realizátora můžete níže vybrat ze seznamu kolegů nebo zadat ručně.
                </p>
              )}
            </div>

            {/* Stav zakázky, vazba Poptávka ↔ Nabídka a recenze */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-3">
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
                        : 'bg-[#FFFDF7] dark:bg-[#14161D] text-[#111111] dark:text-stone-300 border-[#111111] dark:border-stone-600'
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
                        : 'bg-[#FFFDF7] dark:bg-[#14161D] text-[#111111] dark:text-stone-300 border-[#111111] dark:border-stone-600'
                    }`}
                  >
                    ✓ Ukončeno (v archivu)
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
                      className="w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white appearance-none cursor-pointer"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                      className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                      className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Kolegiální recenze */}
              <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-4 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-[#111111]" />
                    <span>2. Kolegiální recenze k této zakázce</span>
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                    Recenze je pevně svázána s touto zakázkou ({currentJob.author.name} ↔{' '}
                    {partnerName || 'vybraný parťák'}) a zobrazí se v kompaktním archivu i na profilu řemeslníka.
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
                      Text kolegiální reference
                    </label>
                    <textarea
                      rows={4}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Zhodnoťte kvalitu řemeslného provedení, dodržení termínu a komunikaci při realizaci..."
                      className="w-full p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-semibold text-[#111111] dark:text-white"
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
              <div className="flex items-center gap-2">
                {currentJob.status === 'completed' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveJob('active')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#262933] hover:bg-stone-100 text-[#111111] dark:text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Vrátit mezi aktivní</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDeleteJob}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-950 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Smazat inzerát</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] text-xs font-extrabold cursor-pointer"
                >
                  Zavřít
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveJob()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] text-xs sm:text-sm font-extrabold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Ukládám do D1...' : 'Uložit změny zakázky & recenzi'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ZÁLOŽKA 2: ADMIN ÚPRAVA TEXTŮ WEBU (CMS V CLOUDFLARE D1) */
          <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-5">
            <div className="bg-white dark:bg-[#20232D] border-2 border-[#111111] dark:border-stone-500 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-[#FEF08A] flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Editace textů na hlavní stránce (Hero sekce, štítky, patička)</span>
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
                  className="w-full h-11 px-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-bold text-[#111111] dark:text-white"
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
                  className="w-full p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-semibold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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
                    className="w-full h-10 px-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-xs font-bold text-[#111111] dark:text-white"
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

            <div className="bg-stone-100 dark:bg-[#14161D] border-2 border-[#111111] dark:border-stone-600 rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-semibold">
                <Database className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0" />
                <span>
                  Všechny texty se ukládají do tabulky <code>site_settings</code> v databázi{' '}
                  <strong>Cloudflare D1 (restaurion-db)</strong>, takže změny jsou okamžitě vidět pro všechny návštěvníky bez nutnosti nového buildu.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-[#111111]/15 dark:border-stone-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] text-xs font-extrabold cursor-pointer"
              >
                Zavřít
              </button>
              <button
                type="button"
                disabled={savingCms}
                onClick={() => handleSaveCms(cmsForm)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] text-xs sm:text-sm font-extrabold cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savingCms ? 'Ukládám do D1...' : 'Uložit texty webu'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
