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
import { ManageJobsModal, DEFAULT_SITE_SETTINGS } from '@/components/ManageJobsModal';
import { mockJobs, mockUsers, mockReviews, mockJobResponses } from '@/data/mockData';
import {
  FilterState,
  Job,
  JobResponseItem,
  SiteSettings,
  UserProfile,
  UserReview,
} from '@/types';
import {
  Briefcase,
  UserCheck,
  Scale,
  CheckCircle2,
  Plus,
  Settings2,
  Megaphone,
} from 'lucide-react';
import { HammerLogo } from '@/components/HammerLogo';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'available' | 'vop'>('jobs');
  const [users, setUsers] = useState<Record<string, UserProfile>>(mockUsers);
  const [activeUserId, setActiveUserId] = useState<string>('user-novak');
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [reviews, setReviews] = useState<UserReview[]>(mockReviews);
  const [responses, setResponses] = useState<JobResponseItem[]>(mockJobResponses);
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
  const [manageScopeFilter, setManageScopeFilter] = useState<
    'all' | 'demands' | 'offers' | 'completed'
  >('all');
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

  const currentUser = useMemo(() => {
    return Object.values(users).find((u) => u.id === activeUserId) || users.novak;
  }, [users, activeUserId]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return Object.values(users).find((u) => u.id === selectedUserId) || currentUser;
  }, [selectedUserId, users, currentUser]);

  // Notifikace (reakce na zakázky a nabídky přihlášeného uživatele) – zobrazují se v „Můj profil“ s proklikem do „Administrace“
  const currentUserJobIds = useMemo(() => {
    return new Set(jobs.filter((j) => j.author.id === currentUser.id).map((j) => j.id));
  }, [jobs, currentUser.id]);

  const currentUserNotifications = useMemo(() => {
    return responses.filter((r) => currentUserJobIds.has(r.jobId));
  }, [responses, currentUserJobIds]);

  const unreadNotificationsCount = useMemo(() => {
    return currentUserNotifications.filter((r) => !r.isRead).length;
  }, [currentUserNotifications]);

  const handleMarkNotificationRead = (responseId: string) => {
    setResponses((prev) =>
      prev.map((r) => (r.id === responseId ? { ...r, isRead: true } : r))
    );
  };

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
          const data = (await jobsRes.json()) as {
            jobs?: Job[];
            reviews?: UserReview[];
          };
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
          if (!cancelled && Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
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
        // Fallback na lokální mockJobs, mockReviews a DEFAULT_SITE_SETTINGS
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

  const handleJobResponded = (jobId: string, newResponse?: JobResponseItem) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, responsesCount: (j.responsesCount || 0) + 1 } : j
      )
    );
    if (newResponse) {
      setResponses((prev) => [newResponse, ...prev]);
    }
  };

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  };

  // Smazání inzerátu zakázky: inzerát zmizí z nástěnky, ale všechna udělená hodnocení v `reviews` zůstávají trvale u lidí!
  const handleDeleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  // Uložení hodnocení přímo k člověku (s vazbou na zakázku)
  const handleSavePersonReview = (newReview: UserReview) => {
    setReviews((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.jobId === newReview.jobId && r.revieweeId === newReview.revieweeId
      );
      let next: UserReview[];
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = {
          ...prev[existingIndex],
          ...newReview,
          reply: prev[existingIndex].reply, // Zachová případnou již odeslanou reakci
        };
      } else {
        next = [newReview, ...prev];
      }
      return next;
    });
  };

  // Jednorázová reakce hodnoceného na komentář (1/1 – po uložení se uzamkne, nevzniká diskuzní vlákno)
  const handleReplyToReview = (reviewId: string, replyText: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    const replyAuthor = selectedUser || currentUser;

    setReviews((prev) =>
      prev.map((rev) => {
        if (rev.id !== reviewId || rev.reply) return rev;
        return {
          ...rev,
          reply: {
            authorId: replyAuthor.id,
            authorName: replyAuthor.name,
            text: trimmed,
            createdAt: 'právě teď',
          },
        };
      })
    );

    void fetch('/api/jobs/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reply_review',
        reviewId,
        replyText: trimmed,
        replyAuthorId: replyAuthor.id,
        replyAuthorName: replyAuthor.name,
      }),
    }).catch(() => {
      // Fallback: uloženo v lokálním state
    });
  };

  const handleOpenManageJob = (job: Job) => {
    setManageScopeFilter('all');
    setManagingJobId(job.id);
    setIsManageOpen(true);
  };

  const handleOpenAdministration = (
    scope: 'all' | 'demands' | 'offers' | 'completed' = 'all',
    targetJobId: string | null = null
  ) => {
    setManageScopeFilter(scope);
    setManagingJobId(targetJobId);
    setIsManageOpen(true);
  };

  // Proklik z recenze na profilu na příslušnou zakázku na nástěnce
  const handleFocusJobOnBoard = (targetJob: Job) => {
    if (targetJob.jobType === 'craftsman_available') {
      setActiveTab('available');
    } else {
      setActiveTab('jobs');
    }
    setFilters((prev) => ({
      ...prev,
      statusFilter: targetJob.status === 'completed' ? 'all' : prev.statusFilter,
      searchQuery: targetJob.title,
    }));
  };

  // V administrátorském režimu (isAdmin === true) máte právo upravit jakoukoliv nabídku i poptávku na celé platformě
  const canManageJob = (job: Job) =>
    isAdmin || job.author.id === currentUser.id || job.matchedPartner?.id === currentUser.id;

  // Základní filtrování zakázek
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

  // Neaktivní (ukončené) zakázky se NEZOBRAZUJÍ automaticky (pouze když uživatel přepne filtr na 'completed' nebo 'all')
  // a když se zobrazí, vykreslí se ve stejném mřížkovém rozložení pomocí JobCard, jen zašedlé.
  const displayedJobs = useMemo(() => {
    if (filters.statusFilter === 'active') {
      return baseFilteredJobs.filter((j) => j.status !== 'completed');
    }
    if (filters.statusFilter === 'completed') {
      return baseFilteredJobs.filter((j) => j.status === 'completed');
    }
    // 'all': nejprve aktivní, poté zašedlé neaktivní/realizované
    const active = baseFilteredJobs.filter((j) => j.status !== 'completed');
    const completed = baseFilteredJobs.filter((j) => j.status === 'completed');
    return [...active, ...completed];
  }, [baseFilteredJobs, filters.statusFilter]);

  const completedJobsCount = useMemo(
    () => baseFilteredJobs.filter((j) => j.status === 'completed').length,
    [baseFilteredJobs]
  );

  const visibleCount = displayedJobs.length;

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

      {/* Hlavička s logem kladívka, názvem Restaurion, přepínačem Dark Mode, tlačítkem Administrace a Můj profil s odznakem upozornění */}
      <Header
        onOpenCreateJob={() => setIsCreateOpen(true)}
        onOpenVerificationModal={() => setIsVerificationOpen(true)}
        onOpenAdministration={() => handleOpenAdministration('all', null)}
        currentUser={currentUser}
        onOpenCurrentUserProfile={() => setSelectedUserId(currentUser.id)}
        unreadNotificationsCount={unreadNotificationsCount}
        isAdmin={isAdmin}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectHeaderRegion}
        isDark={isDark}
        onToggleDark={handleToggleDark}
      />

      {/* Hero sekce – méně ostrá máslově žlutá (#FEF08A) ve světlém režimu, tmavý kontrastní panel s máslově žlutým akcentem v Dark Mode */}
      <section className="bg-[#FEF08A] dark:bg-[#191B22] text-[#111111] dark:text-white py-5 sm:py-9 px-4 sm:px-6 lg:px-8 border-b-2 border-[#111111] dark:border-stone-400 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl text-left">
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-[#111111] dark:text-[#FEF08A] leading-tight mb-2.5 sm:mb-3 tracking-tight">
              {siteSettings.heroTitle}
            </h1>

            <p className="text-xs sm:text-base text-stone-900 dark:text-stone-200 font-semibold leading-relaxed mb-4 sm:mb-5 max-w-3xl">
              {siteSettings.heroSubtitle}
            </p>

            {/* Klíčové výhody – 3 fajfky pod podtitulkem, každá na vlastním sólo řádku */}
            <div className="flex flex-col items-start gap-2 sm:gap-2.5 pt-1 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] max-w-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{siteSettings.heroBadge1}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] max-w-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{siteSettings.heroBadge2}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] max-w-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{siteSettings.heroBadge3}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hlavní obsah s nabídkami práce */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7 flex-1 w-full relative z-10">
        {/* Záložky portálu: Nástěnka zakázek vs. Nabízím se + tlačítka „+ Přidat“ a „Právní rámec & VOP“ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 p-1.5 bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-300 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC]">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2.5 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
                activeTab === 'jobs'
                  ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111]'
                  : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#262933]'
              }`}
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span className="truncate">Nástěnka zakázek</span>
              <span
                className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold border shrink-0 ${
                  activeTab === 'jobs'
                    ? 'bg-white text-[#111111] border-[#111111]'
                    : 'bg-stone-200 dark:bg-stone-700 text-[#111111] dark:text-white border-[#111111] dark:border-stone-400'
                }`}
              >
                {jobs.filter((j) => j.jobType !== 'craftsman_available' && j.status !== 'completed').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('available')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2.5 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-[#2563EB] text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
                  : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#262933]'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Nabízím se</span>
              <span
                className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold border shrink-0 ${
                  activeTab === 'available'
                    ? 'bg-white text-[#1E3A8A] border-[#111111]'
                    : 'bg-stone-200 dark:bg-stone-700 text-[#111111] dark:text-white border-[#111111] dark:border-stone-400'
                }`}
              >
                {jobs.filter((j) => j.jobType === 'craftsman_available' && j.status !== 'completed').length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] text-sm font-extrabold border-2 border-[#111111] shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] dark:hover:shadow-[2px_2px_0px_#F8FAFC] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Přidat</span>
            </button>
            <button
              onClick={() => setIsVopOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-stone-100 dark:hover:bg-[#262933] border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] text-xs text-[#111111] dark:text-stone-200 font-extrabold transition-all cursor-pointer"
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
            {filters.statusFilter !== 'active' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-[#111111] dark:border-stone-400 font-extrabold">
                <span>Zobrazeny i neaktivní (zašedlé) zakázky</span>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'active' }))}
                  className="underline hover:text-[#111111] dark:hover:text-white ml-1 cursor-pointer"
                >
                  Skrýt neaktivní
                </button>
              </span>
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

        {/* Mřížka zakázek (aktivní zakázky + případně vyfiltrované neaktivní/ukončené zakázky jako zašedlé karty) */}
        {displayedJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedJobs.map((job) => (
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
          <div className="bg-white dark:bg-[#1C1E26] rounded-3xl border-2 border-[#111111] dark:border-stone-300 p-12 text-center my-6 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#F8FAFC]">
            <div className="w-14 h-14 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white mb-1">
              Žádné zakázky neodpovídají zadaným filtrům
            </h3>
            <p className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-4">
              Zkuste uvolnit vyhledávání, přepnout filtr stavu na „Ukončené & realizované“ nebo vyberte jiný obor.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setFilters(initialFilters)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] transition-all cursor-pointer"
              >
                Resetovat filtry
              </button>
              {filters.statusFilter === 'active' && completedJobsCount > 0 && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'completed' }))}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-300 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] transition-all cursor-pointer"
                >
                  Zobrazit neaktivní / realizované ({completedJobsCount})
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#111111] dark:border-stone-400 bg-white dark:bg-[#181A20] py-8 px-4 sm:px-6 lg:px-8 text-xs text-stone-700 dark:text-stone-300 font-bold transition-colors">
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
              onClick={() => handleOpenAdministration('all', null)}
              className="inline-flex items-center gap-1.5 text-[#111111] dark:text-stone-200 hover:underline font-extrabold cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#FEF08A]" />
              <span>Administrace</span>
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
        currentUser={currentUser}
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUserId(null)}
        onUpdateAvatar={handleUpdateAvatar}
        allJobs={jobs}
        reviews={reviews}
        onReplyToReview={handleReplyToReview}
        userResponses={currentUserNotifications}
        onMarkResponseRead={handleMarkNotificationRead}
        onOpenAdministration={(options) => {
          setSelectedUserId(null);
          handleOpenAdministration(
            options?.filter || 'all',
            options?.jobId || null
          );
        }}
        onFocusJobOnBoard={handleFocusJobOnBoard}
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
        onSavePersonReview={handleSavePersonReview}
        initialJobId={managingJobId}
        initialScopeFilter={manageScopeFilter}
        onJobUpdated={handleUpdateJob}
        onJobDeleted={handleDeleteJob}
        siteSettings={siteSettings}
        onSiteSettingsUpdated={setSiteSettings}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        onSetAdmin={handleSetAdmin}
        currentUserId={currentUser.id}
        onSwitchCurrentUser={(userKeyOrId: string) => {
          const found =
            users[userKeyOrId] ||
            Object.values(users).find((u) => u.id === userKeyOrId);
          if (found) {
            setActiveUserId(found.id);
          }
        }}
        onUnlockOrVerifyUser={(userKeyOrId: string) => {
          setUsers((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
              if (key === userKeyOrId || next[key].id === userKeyOrId) {
                next[key] = {
                  ...next[key],
                  verificationStatus: 'verified_manual',
                  verifiedAt: 'Ověřeno a odemknuto adminem',
                  availability: 'available_now',
                };
              }
            }
            return next;
          });
        }}
        localResponses={responses}
      />

      <LegalNoticeModal
        isOpen={isVopOpen}
        onClose={() => setIsVopOpen(false)}
      />
    </div>
  );
}
