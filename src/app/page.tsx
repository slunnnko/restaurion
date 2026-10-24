'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { JobCard } from '@/components/JobCard';
import { JobFilters } from '@/components/JobFilters';
import { CreateJobModal } from '@/components/CreateJobModal';
import { LicenseVerificationModal } from '@/components/LicenseVerificationModal';
import { UserProfileModal } from '@/components/UserProfileModal';
import { RespondModal } from '@/components/RespondModal';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { CompactArchivedJobRow } from '@/components/CompactArchivedJobRow';
import { ManageJobsModal, DEFAULT_SITE_SETTINGS } from '@/components/ManageJobsModal';
import { mockJobs, mockUsers } from '@/data/mockData';
import { FilterState, Job, SiteSettings, UserProfile } from '@/types';
import {
  Briefcase,
  UserCheck,
  Scale,
  CheckCircle2,
  Plus,
  Settings2,
  ArrowLeftRight,
  Star,
  Megaphone,
} from 'lucide-react';
import { HammerLogo } from '@/components/HammerLogo';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'available' | 'vop'>('jobs');
  const [users, setUsers] = useState<Record<string, UserProfile>>(mockUsers);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [selectedRegion, setSelectedRegion] = useState<string>('Všechny regiony');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [respondingJob, setRespondingJob] = useState<Job | null>(null);
  const [isVopOpen, setIsVopOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [managingJobId, setManagingJobId] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Inicializace a synchronizace Dark Mode (přepínač v hlavičce + podpora Safari/OS systémového vzhledu)
  useEffect(() => {
    const saved = localStorage.getItem('restaurion-theme');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (saved === 'dark' || (!saved && mediaQuery.matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('restaurion-theme')) {
        setIsDark(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const handleToggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('restaurion-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    const savedAdmin = localStorage.getItem('restaurion-admin-mode');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
    }

    let cancelled = false;
    async function checkAdminSession() {
      try {
        const res = await fetch('/api/admin/verify', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          isAdmin?: boolean;
          passwordProtected?: boolean;
        };
        if (cancelled) return;
        if (typeof data.isAdmin === 'boolean') {
          setIsAdmin(data.isAdmin);
          localStorage.setItem('restaurion-admin-mode', data.isAdmin ? 'true' : 'false');
        }
      } catch {
        // Fallback na lokální stav
      }
    }
    void checkAdminSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetAdmin = (next: boolean) => {
    setIsAdmin(next);
    localStorage.setItem('restaurion-admin-mode', next ? 'true' : 'false');
  };

  const handleToggleAdmin = () => {
    setIsAdmin((prev) => {
      const next = !prev;
      localStorage.setItem('restaurion-admin-mode', next ? 'true' : 'false');
      return next;
    });
  };

  // Filters state
  const initialFilters: FilterState = {
    searchQuery: '',
    region: 'Všechny regiony',
    craft: 'all',
    monumentStatus: 'all',
    jobType: 'all',
    statusFilter: 'active',
  };
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const currentUser = users.novak;

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return Object.values(users).find((u) => u.id === selectedUserId) || users.novak;
  }, [selectedUserId, users]);

  // Synchronizace rychlého přepínače regionů v hlavičce s filtrem
  const handleSelectHeaderRegion = (reg: string) => {
    setSelectedRegion(reg);
    setFilters((prev) => ({ ...prev, region: reg }));
  };

  // Načtení živých dat z Cloudflare D1 (/api/jobs a /api/settings) s plynulým fallbackem
  useEffect(() => {
    let cancelled = false;
    async function loadJobsAndSettingsFromApi() {
      try {
        const [jobsRes, settingsRes] = await Promise.all([
          fetch('/api/jobs', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }).catch(() => null),
        ]);

        if (jobsRes.ok) {
          const data = (await jobsRes.json()) as { jobs?: Job[] };
          if (!cancelled && Array.isArray(data.jobs) && data.jobs.length > 0) {
            setJobs(data.jobs);
            setUsers((prev) => {
              const next = { ...prev };
              for (const job of data.jobs!) {
                if (job.author?.id) {
                  const existingKey = Object.keys(next).find((k) => next[k].id === job.author.id);
                  if (existingKey) {
                    next[existingKey] = { ...next[existingKey], ...job.author };
                  } else {
                    next[job.author.id] = job.author;
                  }
                }
              }
              return next;
            });
          }
        }

        if (settingsRes && settingsRes.ok) {
          const settingsData = (await settingsRes.json()) as { settings?: Partial<SiteSettings> };
          if (!cancelled && settingsData.settings) {
            setSiteSettings((prev) => ({
              ...prev,
              ...settingsData.settings,
            }));
          }
        }
      } catch {
        // Fallback na lokální mockJobs a DEFAULT_SITE_SETTINGS
      }
    }
    void loadJobsAndSettingsFromApi();
    return () => {
      cancelled = true;
    };
  }, []);

  // Změna profilové fotky uživatele (propíše se do profilu, všech jeho inzerátů i do D1)
  const handleUpdateAvatar = (userId: string, newAvatarUrl: string) => {
    setUsers((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        if (updated[key].id === userId) {
          updated[key] = { ...updated[key], avatarUrl: newAvatarUrl };
        }
      }
      return updated;
    });
    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.author.id === userId
          ? { ...j, author: { ...j.author, avatarUrl: newAvatarUrl } }
          : j
      )
    );

    void fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, avatarUrl: newAvatarUrl }),
    }).catch(() => {
      // Fallback: zůstává v lokálním state
    });
  };

  // Vytvoření nové zakázky (okamžitě v UI + uložení do Cloudflare D1)
  const handleCreateJob = (newJobData: Partial<Job>) => {
    const tempId = `job-${Date.now()}`;
    const newJob: Job = {
      id: tempId,
      title: newJobData.title || 'Nová poptávka',
      description: newJobData.description || '',
      jobType: newJobData.jobType || 'subcontract_needed',
      monumentStatus: newJobData.monumentStatus || 'cultural_monument',
      monumentName: newJobData.monumentName,
      monumentRegNumber: newJobData.monumentRegNumber,
      requiredCrafts: newJobData.requiredCrafts || ['Restaurátor'],
      region: newJobData.region || 'Jihomoravský kraj',
      city: newJobData.city || 'Brno',
      budgetNote: newJobData.budgetNote || 'Dle dohody',
      startDate: newJobData.startDate || 'Dle dohody',
      imageUrl: newJobData.imageUrl,
      author: currentUser,
      createdAt: 'právě teď',
      responsesCount: 0,
      urgent: false,
      status: 'active',
    };
    setJobs((prev) => [newJob, ...prev]);
    if (newJob.jobType === 'craftsman_available') {
      setActiveTab('available');
    } else {
      setActiveTab('jobs');
    }

    void fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newJob.title,
        description: newJob.description,
        jobType: newJob.jobType,
        monumentStatus: newJob.monumentStatus,
        monumentName: newJob.monumentName,
        monumentRegNumber: newJob.monumentRegNumber,
        requiredCrafts: newJob.requiredCrafts,
        region: newJob.region,
        city: newJob.city,
        budgetNote: newJob.budgetNote,
        startDate: newJob.startDate,
        imageUrl: newJob.imageUrl,
        authorId: currentUser.id,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { job?: Job };
        if (data.job) {
          setJobs((prev) => prev.map((j) => (j.id === tempId ? data.job! : j)));
        }
      })
      .catch(() => {
        // Fallback: zůstává v lokálním state
      });
  };

  const handleJobResponded = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, responsesCount: (j.responsesCount || 0) + 1 } : j
      )
    );
  };

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleOpenManageJob = (job: Job) => {
    setManagingJobId(job.id);
    setIsManageOpen(true);
  };

  // V administrátorském režimu (isAdmin === true) máte právo upravit jakoukoliv nabídku i poptávku na celé platformě
  const canManageJob = (job: Job) =>
    isAdmin || job.author.id === currentUser.id || job.matchedPartner?.id === currentUser.id;

  // Základní filtrování (bez rozlišení aktivní/ukončené, abychom je mohli rozdělit na plné karty a kompaktní archiv)
  const baseFilteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Filtr záložky (Nástěnka zakázek vs. Nabízím se)
      if (activeTab === 'available' && job.jobType !== 'craftsman_available') {
        return false;
      }
      if (activeTab === 'jobs' && job.jobType === 'craftsman_available') {
        return false;
      }

      // Hledání (včetně jména realizátora a textu recenze u ukončených zakázek)
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesDesc = job.description.toLowerCase().includes(query);
        const matchesCity = job.city.toLowerCase().includes(query);
        const matchesCraft = job.requiredCrafts.some((c) => c.toLowerCase().includes(query));
        const matchesPartner = job.matchedPartner?.name.toLowerCase().includes(query) || false;
        const matchesReview = job.review?.text.toLowerCase().includes(query) || false;
        if (
          !matchesTitle &&
          !matchesDesc &&
          !matchesCity &&
          !matchesCraft &&
          !matchesPartner &&
          !matchesReview
        ) {
          return false;
        }
      }

      // Region
      if (filters.region !== 'Všechny regiony' && filters.region !== 'Celá ČR') {
        if (!job.region.includes(filters.region.split(' ')[0])) {
          return false;
        }
      }

      // Řemeslo
      if (filters.craft !== 'all') {
        const matchesCraft = job.requiredCrafts.some((c) =>
          c.toLowerCase().includes(filters.craft.toLowerCase())
        );
        if (!matchesCraft) return false;
      }

      // Památkový status
      if (filters.monumentStatus === 'cultural_monument') {
        if (job.monumentStatus !== 'cultural_monument' && job.monumentStatus !== 'national_monument') {
          return false;
        }
      } else if (filters.monumentStatus === 'non_monument') {
        if (job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument') {
          return false;
        }
      }

      // Typ poptávky
      if (filters.jobType !== 'all') {
        if (job.jobType !== filters.jobType) return false;
      }

      return true;
    });
  }, [jobs, filters, activeTab]);

  const activeJobs = useMemo(
    () => baseFilteredJobs.filter((j) => j.status !== 'completed'),
    [baseFilteredJobs]
  );

  const completedJobs = useMemo(
    () => baseFilteredJobs.filter((j) => j.status === 'completed'),
    [baseFilteredJobs]
  );

  const visibleCount =
    filters.statusFilter === 'active'
      ? activeJobs.length
      : filters.statusFilter === 'completed'
        ? completedJobs.length
        : activeJobs.length + completedJobs.length;

  const activeFiltersCount =
    (filters.searchQuery ? 1 : 0) +
    (filters.region !== 'Všechny regiony' ? 1 : 0) +
    (filters.craft !== 'all' ? 1 : 0) +
    (filters.monumentStatus !== 'all' ? 1 : 0) +
    (filters.jobType !== 'all' ? 1 : 0) +
    (filters.statusFilter !== 'active' ? 1 : 0);

  const handleOpenAuthor = (authorId: string) => {
    setSelectedUserId(authorId);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-12 bg-transparent text-[#111111] dark:text-[#F8FAFC] transition-colors">
      {/* Volitelný informační banner z Admin CMS */}
      {siteSettings.announcementBanner.trim() && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-extrabold border-b-2 border-[#111111] flex items-center justify-center gap-2 text-center">
          <Megaphone className="w-4 h-4 shrink-0" />
          <span>{siteSettings.announcementBanner}</span>
        </div>
      )}

      {/* Hlavička s logem kladívka, názvem Restaurion, přepínačem Dark Mode a profilovou fotkou */}
      <Header
        onOpenCreateJob={() => setIsCreateOpen(true)}
        onOpenVerificationModal={() => setIsVerificationOpen(true)}
        currentUser={currentUser}
        onOpenCurrentUserProfile={() => setSelectedUserId(currentUser.id)}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectHeaderRegion}
        isDark={isDark}
        onToggleDark={handleToggleDark}
      />

      {/* Hero sekce – méně ostrá máslově žlutá (#FEF08A) ve světlém režimu, tmavý kontrastní panel s máslově žlutým akcentem v Dark Mode */}
      <section className="bg-[#FEF08A] dark:bg-[#191B22] text-[#111111] dark:text-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b-2 border-[#111111] dark:border-stone-600 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl text-left">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#111111] dark:text-[#FEF08A] leading-tight mb-3 tracking-tight">
              {siteSettings.heroTitle}
            </h1>

            <p className="text-sm sm:text-base text-stone-900 dark:text-stone-200 font-semibold leading-relaxed mb-5 max-w-3xl">
              {siteSettings.heroSubtitle}
            </p>

            {/* Klíčové výhody – 3 fajfky pod podtitulkem */}
            <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 pt-1 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{siteSettings.heroBadge1}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{siteSettings.heroBadge2}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{siteSettings.heroBadge3}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hlavní obsah s nabídkami práce */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full relative z-10">
        {/* Záložky portálu: Nástěnka zakázek vs. Nabízím se + tlačítka „+ Přidat“, „Admin & Správa“ a „Právní rámec & VOP“ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-500 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#000000]">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 py-2.5 px-4 text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
                activeTab === 'jobs'
                  ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111]'
                  : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#262933]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Nástěnka zakázek</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-extrabold border ${
                  activeTab === 'jobs'
                    ? 'bg-white text-[#111111] border-[#111111]'
                    : 'bg-stone-200 dark:bg-stone-700 text-[#111111] dark:text-white border-[#111111] dark:border-stone-500'
                }`}
              >
                {jobs.filter((j) => j.jobType !== 'craftsman_available' && j.status !== 'completed').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('available')}
              className={`flex items-center gap-2 py-2.5 px-4 text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-[#2563EB] text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
                  : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#262933]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Nabízím se</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-extrabold border ${
                  activeTab === 'available'
                    ? 'bg-white text-[#1E3A8A] border-[#111111]'
                    : 'bg-stone-200 dark:bg-stone-700 text-[#111111] dark:text-white border-[#111111] dark:border-stone-500'
                }`}
              >
                {jobs.filter((j) => j.jobType === 'craftsman_available' && j.status !== 'completed').length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] text-sm font-extrabold border-2 border-[#111111] shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Přidat</span>
            </button>
            <button
              onClick={() => {
                setManagingJobId(jobs[0]?.id || null);
                setIsManageOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-[#FEF08A] dark:hover:bg-[#262933] border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] text-xs text-[#111111] dark:text-stone-100 font-extrabold transition-all cursor-pointer"
              title="Správa zakázek, propojení Poptávka ↔ Nabídka, recenze a úprava textů webu"
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#FEF08A]" />
              <span>Admin & Správa</span>
            </button>
            <button
              onClick={() => setIsVopOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-stone-100 dark:hover:bg-[#262933] border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] text-xs text-[#111111] dark:text-stone-200 font-extrabold transition-all cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-[#111111] dark:text-[#FEF08A]" />
              <span>Právní rámec & VOP</span>
            </button>
          </div>
        </div>

        {/* Filtry zakázek */}
        <JobFilters
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
          activeCount={activeFiltersCount}
        />

        {/* Informační lišta s počtem výsledků */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-700 dark:text-stone-300 font-bold mb-4 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Nalezeno <strong className="text-[#111111] dark:text-white font-extrabold">{visibleCount}</strong>{' '}
              {visibleCount === 1 ? 'nabídka' : visibleCount < 5 && visibleCount > 0 ? 'nabídky' : 'nabídek'}
              {filters.region !== 'Všechny regiony' && (
                <span>
                  {' '}
                  v oblasti <strong className="text-[#111111] dark:text-white font-extrabold">{filters.region}</strong>
                </span>
              )}
            </span>
            {filters.statusFilter === 'active' && completedJobs.length > 0 && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'all' }))}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FFFDF7] dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#2E3240] text-[#111111] dark:text-stone-200 border border-[#111111] dark:border-stone-500 font-extrabold transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>+ {completedJobs.length} realizovaných v archivu (zobrazit s recenzemi)</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVerificationOpen(true)}
              className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 hover:underline font-extrabold cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111111]" />
              Reálné ověření licencí MK ČR aktivní
            </button>
          </div>
        </div>

        {/* 1. Aktivní zakázky (plné karty v mřížce) */}
        {filters.statusFilter !== 'completed' && (
          <>
            {activeJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onRespond={(targetJob) => setRespondingJob(targetJob)}
                    onViewAuthor={handleOpenAuthor}
                    onManage={canManageJob(job) ? handleOpenManageJob : undefined}
                  />
                ))}
              </div>
            ) : (
              filters.statusFilter === 'active' && (
                <div className="bg-white dark:bg-[#1C1E26] rounded-3xl border-2 border-[#111111] dark:border-stone-500 p-12 text-center my-6 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#000000]">
                  <div className="w-14 h-14 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white mb-1">
                    Žádné aktivní zakázky neodpovídají zadaným filtrům
                  </h3>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-4">
                    Zkuste uvolnit vyhledávání, přepnout filtr stavu na „Ukončené & realizované“ nebo vyberte jiný obor.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setFilters(initialFilters)}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                    >
                      Resetovat filtry
                    </button>
                    {completedJobs.length > 0 && (
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'completed' }))}
                        className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-500 shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                      >
                        Zobrazit realizované v archivu ({completedJobs.length})
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Kompaktní lišta pod aktivními zakázkami pro rychlé rozbalení archivu realizovaných spoluprací */}
        {filters.statusFilter === 'active' && completedJobs.length > 0 && (
          <div className="mt-8 bg-[#FFFDF7] dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-500 p-4 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#000000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#111111] dark:text-white flex items-center gap-2">
                  <span>Archiv realizovaných spoluprací a kolegiálních recenzí ({completedJobs.length})</span>
                </h3>
                <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Neaktuální zakázky nezabírají místo na hlavní nástěnce – zobrazují se jako úsporný jednořádkový přehled se zachovanou vazbou <strong>Poptávka ↔ Nabídka</strong> a hodnocením.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'all' }))}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] text-xs font-extrabold border-2 border-[#111111] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-[#111111]" />
              <span>Zobrazit kompaktní archiv ({completedJobs.length})</span>
            </button>
          </div>
        )}

        {/* 2. Kompaktní přehled neaktuálních / realizovaných zakázek (nezabírá místo, drží vazbu Poptávka ↔ Nabídka + recenze) */}
        {(filters.statusFilter === 'completed' || filters.statusFilter === 'all') && (
          <section className={filters.statusFilter === 'all' && activeJobs.length > 0 ? 'mt-9 pt-7 border-t-2 border-dashed border-[#111111]/30 dark:border-stone-600' : 'mt-2'}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#111111] text-[#FEF08A] text-xs font-extrabold border-2 border-[#111111]">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Ukončené & realizované zakázky ({completedJobs.length})
                </span>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Kompaktní náhled se zachovanou vazbou <strong>Poptával ↔ Realizoval</strong> pro udělování recenzí
                </span>
              </div>
              {filters.statusFilter === 'all' && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'active' }))}
                  className="text-xs font-extrabold text-stone-700 dark:text-stone-300 hover:underline cursor-pointer"
                >
                  Skrýt archiv
                </button>
              )}
            </div>

            {completedJobs.length > 0 ? (
              <div className="space-y-2.5">
                {completedJobs.map((job) => (
                  <CompactArchivedJobRow
                    key={job.id}
                    job={job}
                    onViewUser={handleOpenAuthor}
                    onManageJob={canManageJob(job) ? handleOpenManageJob : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-500 p-8 text-center shadow-[4px_4px_0px_#111111]">
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Zatím zde nejsou žádné ukončené zakázky odpovídající zvolenému filtru.
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#111111] dark:border-stone-600 bg-white dark:bg-[#181A20] py-8 px-4 sm:px-6 lg:px-8 text-xs text-stone-700 dark:text-stone-300 font-bold transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-[#111111] flex items-center justify-center">
              <HammerLogo className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-[#111111] dark:text-white">
              {siteSettings.footerText}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setManagingJobId(jobs[0]?.id || null);
                setIsManageOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-[#111111] dark:text-stone-200 hover:underline font-extrabold cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#FEF08A]" />
              <span>Admin & Správa zakázek / textů</span>
            </button>
            <button
              onClick={() => setIsVopOpen(true)}
              className="text-[#111111] dark:text-[#FEF08A] hover:underline font-extrabold cursor-pointer"
            >
              Všeobecné obchodní podmínky (VOP)
            </button>
          </div>
        </div>
      </footer>

      {/* Mobilní spodní lišta */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'vop') {
            setIsVopOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenCreateJob={() => setIsCreateOpen(true)}
        onOpenVerificationModal={() => setIsVerificationOpen(true)}
      />

      {/* Modální okna */}
      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateJob}
      />

      <LicenseVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
      />

      <UserProfileModal
        user={selectedUser}
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUserId(null)}
        onUpdateAvatar={handleUpdateAvatar}
        completedJobs={jobs}
      />

      <RespondModal
        job={respondingJob}
        isOpen={Boolean(respondingJob)}
        onClose={() => setRespondingJob(null)}
        onSubmitted={handleJobResponded}
      />

      <ManageJobsModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        jobs={jobs}
        users={users}
        initialJobId={managingJobId}
        onJobUpdated={handleUpdateJob}
        onJobDeleted={handleDeleteJob}
        siteSettings={siteSettings}
        onSiteSettingsUpdated={setSiteSettings}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        onSetAdmin={handleSetAdmin}
        currentUserId={currentUser.id}
      />

      <LegalNoticeModal
        isOpen={isVopOpen}
        onClose={() => setIsVopOpen(false)}
      />
    </div>
  );
}
