'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { JobCard } from '@/components/JobCard';
import { CompactArchivedJobRow } from '@/components/CompactArchivedJobRow';
import { JobFilters } from '@/components/JobFilters';
import { CreateJobModal } from '@/components/CreateJobModal';
import { LicenseVerificationModal } from '@/components/LicenseVerificationModal';
import { UserProfileModal } from '@/components/UserProfileModal';
import { ProfilePageView } from '@/components/ProfilePageView';
import { RespondModal } from '@/components/RespondModal';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { ManageJobsModal, DEFAULT_SITE_SETTINGS } from '@/components/ManageJobsModal';
import { mockJobs, mockUsers, mockReviews, mockJobResponses } from '@/data/mockData';
import {
  FeatureFlags,
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
  Archive,
  Settings2,
  Megaphone,
} from 'lucide-react';
import { HammerLogo } from '@/components/HammerLogo';

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  darkWhiteShadows: false,
  greyedInactiveCards: false,
  personHeldReviews: false,
  headerAdministration: false,
  soloHeroBadges: false,
  mobileCompactUi: false,
};

const ALL_ENABLED_FEATURE_FLAGS: FeatureFlags = {
  darkWhiteShadows: true,
  greyedInactiveCards: true,
  personHeldReviews: true,
  headerAdministration: true,
  soloHeroBadges: true,
  mobileCompactUi: true,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'available' | 'vop'>('jobs');
  const [isProfilePageOpen, setIsProfilePageOpen] = useState<boolean>(false);
  const [users, setUsers] = useState<Record<string, UserProfile>>(mockUsers);
  const [activeUserId, setActiveUserId] = useState<string>('user-novak');
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [reviews, setReviews] = useState<UserReview[]>(mockReviews);
  const [responses, setResponses] = useState<JobResponseItem[]>(mockJobResponses);
  const [selectedRegion, setSelectedRegion] = useState<string>('Všechny regiony');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

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

  // Načtení Feature Flags:
  // 1) Na hlavní doméně (restaurion.pages.dev) jsou ve výchozím stavu VŠECHNY VYPNUTÉ (100% verze před chatem).
  // 2) Na testovací subdoméně (test.restaurion.pages.dev nebo ?ff=all) jsou ve výchozím stavu VŠECHNY ZAPNUTÉ.
  // 3) Admin si je může kdykoliv přepínat po rozkliku „Můj profil“.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ffParam = params.get('ff');
    const hostname = window.location.hostname;
    const isTestSubdomain =
      hostname.startsWith('test.') || hostname.startsWith('test-') || ffParam === 'all';

    if (ffParam === 'reset' || ffParam === 'off') {
      localStorage.removeItem('restaurion-feature-flags');
      setFeatureFlags(DEFAULT_FEATURE_FLAGS);
      return;
    }

    const savedFlagsRaw = localStorage.getItem('restaurion-feature-flags');
    if (savedFlagsRaw) {
      try {
        const parsed = JSON.parse(savedFlagsRaw) as Partial<FeatureFlags>;
        setFeatureFlags({
          ...DEFAULT_FEATURE_FLAGS,
          ...parsed,
        });
        return;
      } catch {
        // Ignore invalid JSON
      }
    }

    if (isTestSubdomain) {
      setFeatureFlags(ALL_ENABLED_FEATURE_FLAGS);
    }
  }, []);

  const handleUpdateFeatureFlags = async (
    nextFlags: FeatureFlags,
    saveToServer = false
  ): Promise<void> => {
    setFeatureFlags(nextFlags);
    localStorage.setItem('restaurion-feature-flags', JSON.stringify(nextFlags));

    if (saveToServer) {
      const updatedSettings: SiteSettings = {
        ...siteSettings,
        featureFlagsJson: JSON.stringify(nextFlags),
      };
      setSiteSettings(updatedSettings);
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings),
        });
      } catch {
        // Fallback: uloženo v localStorage
      }
    }
  };

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

            // Pokud uživatel nemá lokální override v localStorage a v D1 jsou uložené featureFlagsJson, načteme je
            if (
              !localStorage.getItem('restaurion-feature-flags') &&
              !window.location.hostname.startsWith('test.') &&
              settingsData.settings.featureFlagsJson
            ) {
              try {
                const parsedServerFlags = JSON.parse(
                  settingsData.settings.featureFlagsJson
                ) as Partial<FeatureFlags>;
                setFeatureFlags((prev) => ({
                  ...prev,
                  ...parsedServerFlags,
                }));
              } catch {
                // Ignore invalid JSON
              }
            }
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
    setIsProfilePageOpen(false);
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

  const handleDeleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

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
          reply: prev[existingIndex].reply,
        };
      } else {
        next = [newReview, ...prev];
      }
      return next;
    });
  };

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

  const handleFocusJobOnBoard = (targetJob: Job) => {
    setIsProfilePageOpen(false);
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

  const canManageJob = (job: Job) =>
    isAdmin || job.author.id === currentUser.id || job.matchedPartner?.id === currentUser.id;

  // Základní filtrování zakázek
  const baseFilteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (activeTab === 'available' && job.jobType !== 'craftsman_available') {
        return false;
      }
      if (activeTab === 'jobs' && job.jobType === 'craftsman_available') {
        return false;
      }

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

      if (filters.region !== 'Všechny regiony' && filters.region !== 'Celá ČR') {
        if (!job.region.includes(filters.region.split(' ')[0])) {
          return false;
        }
      }

      if (filters.craft !== 'all') {
        const matchesCraft = job.requiredCrafts.some((c) =>
          c.toLowerCase().includes(filters.craft.toLowerCase())
        );
        if (!matchesCraft) return false;
      }

      if (filters.monumentStatus === 'cultural_monument') {
        if (job.monumentStatus !== 'cultural_monument' && job.monumentStatus !== 'national_monument') {
          return false;
        }
      } else if (filters.monumentStatus === 'non_monument') {
        if (job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument') {
          return false;
        }
      }

      if (filters.jobType !== 'all') {
        if (job.jobType !== filters.jobType) return false;
      }

      return true;
    });
  }, [jobs, filters, activeTab]);

  // Aktivní zakázky a realizované/ukončené zakázky
  const activeJobs = useMemo(
    () =>
      filters.statusFilter === 'completed'
        ? []
        : baseFilteredJobs.filter((j) => j.status !== 'completed'),
    [baseFilteredJobs, filters.statusFilter]
  );

  const completedJobs = useMemo(
    () =>
      filters.statusFilter === 'active'
        ? []
        : baseFilteredJobs.filter((j) => j.status === 'completed'),
    [baseFilteredJobs, filters.statusFilter]
  );

  // Když je zapnutý featureFlag `greyedInactiveCards`, zobrazují se vyfiltrované neaktivní zakázky jako zašedlé JobCard přímo v mřížce
  const greyedGridJobs = useMemo(() => {
    if (filters.statusFilter === 'active') {
      return baseFilteredJobs.filter((j) => j.status !== 'completed');
    }
    if (filters.statusFilter === 'completed') {
      return baseFilteredJobs.filter((j) => j.status === 'completed');
    }
    const active = baseFilteredJobs.filter((j) => j.status !== 'completed');
    const completed = baseFilteredJobs.filter((j) => j.status === 'completed');
    return [...active, ...completed];
  }, [baseFilteredJobs, filters.statusFilter]);

  const completedJobsCount = useMemo(
    () => baseFilteredJobs.filter((j) => j.status === 'completed').length,
    [baseFilteredJobs]
  );

  const visibleCount = featureFlags.greyedInactiveCards
    ? greyedGridJobs.length
    : activeJobs.length + (filters.statusFilter === 'completed' ? completedJobs.length : 0);

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

  const ffDarkWhite = Boolean(featureFlags.darkWhiteShadows);
  const ffGreyedInactive = Boolean(featureFlags.greyedInactiveCards);
  const ffSoloBadges = Boolean(featureFlags.soloHeroBadges);
  const ffMobileCompact = Boolean(featureFlags.mobileCompactUi);

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-12 bg-transparent text-[#111111] dark:text-[#F8FAFC] transition-colors">
      {/* Volitelný informační banner z Admin CMS */}
      {siteSettings.announcementBanner.trim() && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-extrabold border-b-2 border-[#111111] flex items-center justify-center gap-2 text-center">
          <Megaphone className="w-4 h-4 shrink-0" />
          <span>{siteSettings.announcementBanner}</span>
        </div>
      )}

      {/* Hlavička – kliknutí na „Můj profil“ přepne na stránku profilu (s ukrytým Adminem a Feature Flags) */}
      <Header
        onOpenCreateJob={() => setIsCreateOpen(true)}
        onOpenVerificationModal={() => setIsVerificationOpen(true)}
        onOpenAdministration={() => handleOpenAdministration('all', null)}
        currentUser={currentUser}
        onOpenCurrentUserProfile={() => setIsProfilePageOpen((prev) => !prev)}
        unreadNotificationsCount={unreadNotificationsCount}
        isAdmin={isAdmin}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectHeaderRegion}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        featureFlags={featureFlags}
      />

      {/* Pokud uživatel rozklikl „Můj profil“, přepne se zobrazení na novou stránku profilu (kde jsou pro admina i Feature Flags) */}
      {isProfilePageOpen ? (
        <ProfilePageView
          user={currentUser}
          allUsers={users}
          onBackToBoard={() => setIsProfilePageOpen(false)}
          onUpdateAvatar={handleUpdateAvatar}
          allJobs={jobs}
          reviews={reviews}
          onReplyToReview={handleReplyToReview}
          userResponses={currentUserNotifications}
          onMarkResponseRead={handleMarkNotificationRead}
          onOpenAdministration={(options) => {
            handleOpenAdministration(
              options?.filter || 'all',
              options?.jobId || null
            );
          }}
          onFocusJobOnBoard={handleFocusJobOnBoard}
          isAdmin={isAdmin}
          onSetAdmin={handleSetAdmin}
          onSwitchCurrentUser={(userKeyOrId: string) => {
            const found =
              users[userKeyOrId] ||
              Object.values(users).find((u) => u.id === userKeyOrId);
            if (found) {
              setActiveUserId(found.id);
            }
          }}
          featureFlags={featureFlags}
          onUpdateFeatureFlags={handleUpdateFeatureFlags}
          siteSettings={siteSettings}
        />
      ) : (
        <>
          {/* Hero sekce */}
          <section
            className={`bg-[#FEF08A] dark:bg-[#191B22] text-[#111111] dark:text-white ${
              ffMobileCompact ? 'py-5 sm:py-9' : 'py-7 sm:py-9'
            } px-4 sm:px-6 lg:px-8 border-b-2 border-[#111111] ${
              ffDarkWhite ? 'dark:border-stone-400' : 'dark:border-stone-600'
            } transition-colors`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl text-left">
                <h1
                  className={`font-serif ${
                    ffMobileCompact ? 'text-2xl sm:text-4xl lg:text-5xl mb-2.5 sm:mb-3' : 'text-3xl sm:text-4xl lg:text-5xl mb-3'
                  } font-bold text-[#111111] dark:text-[#FEF08A] leading-tight tracking-tight`}
                >
                  {siteSettings.heroTitle}
                </h1>

                <p
                  className={`${
                    ffMobileCompact ? 'text-xs sm:text-base mb-4 sm:mb-5' : 'text-sm sm:text-base mb-5'
                  } text-stone-900 dark:text-stone-200 font-semibold leading-relaxed max-w-3xl`}
                >
                  {siteSettings.heroSubtitle}
                </p>

                {/* Klíčové výhody – 3 fajfky pod podtitulkem (ve výchozím stavu vedle sebe jako e08fd7f, při soloHeroBadges pod sebou) */}
                <div
                  className={
                    ffSoloBadges
                      ? 'flex flex-col items-start gap-2 sm:gap-2.5 pt-1 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white'
                      : 'flex flex-wrap items-center justify-start gap-3 sm:gap-4 pt-1 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white'
                  }
                >
                  <div
                    className={`inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] ${
                      ffDarkWhite
                        ? 'dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                        : 'dark:border-stone-500 shadow-[2px_2px_0px_#111111]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{siteSettings.heroBadge1}</span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] ${
                      ffDarkWhite
                        ? 'dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                        : 'dark:border-stone-500 shadow-[2px_2px_0px_#111111]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{siteSettings.heroBadge2}</span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] ${
                      ffDarkWhite
                        ? 'dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                        : 'dark:border-stone-500 shadow-[2px_2px_0px_#111111]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{siteSettings.heroBadge3}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Hlavní obsah s nabídkami práce */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full relative z-10">
            {/* Záložky portálu: Nástěnka zakázek vs. Nabízím se + tlačítka „+ Přidat“ a „Právní rámec & VOP“ */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div
                className={`${
                  ffMobileCompact ? 'w-full sm:w-auto grid grid-cols-2 sm:flex' : 'flex'
                } items-center gap-2 p-1.5 bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] ${
                  ffDarkWhite
                    ? 'dark:border-stone-300 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC]'
                    : 'dark:border-stone-500 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#000000]'
                }`}
              >
                <button
                  onClick={() => setActiveTab('jobs')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
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
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
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
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] text-sm font-extrabold border-2 border-[#111111] ${
                    ffDarkWhite
                      ? 'shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#F8FAFC]'
                      : 'shadow-[4px_4px_0px_#111111]'
                  } hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Přidat</span>
                </button>
                <button
                  onClick={() => setIsVopOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1C1E26] hover:bg-stone-100 dark:hover:bg-[#262933] border-2 border-[#111111] ${
                    ffDarkWhite
                      ? 'dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
                      : 'dark:border-stone-500 shadow-[2px_2px_0px_#111111]'
                  } text-xs text-[#111111] dark:text-stone-200 font-extrabold transition-all cursor-pointer`}
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
              featureFlags={featureFlags}
            />

            {/* Informační lišta s počtem výsledků */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-700 dark:text-stone-300 font-bold mb-4 px-1">
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

            {/* Zobrazení zakázek: buď s featureFlagem greyedInactiveCards, nebo původní e08fd7f rozdělení */}
            {ffGreyedInactive ? (
              greyedGridJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {greyedGridJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onRespond={(targetJob) => setRespondingJob(targetJob)}
                      onViewAuthor={handleOpenAuthor}
                      onManage={canManageJob(job) ? handleOpenManageJob : undefined}
                      featureFlags={featureFlags}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={`bg-white dark:bg-[#1C1E26] rounded-3xl border-2 border-[#111111] ${
                    ffDarkWhite
                      ? 'dark:border-stone-300 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#F8FAFC]'
                      : 'dark:border-stone-500 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#000000]'
                  } p-12 text-center my-6`}
                >
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
                      className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                    >
                      Resetovat filtry
                    </button>
                    {filters.statusFilter === 'active' && completedJobsCount > 0 && (
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, statusFilter: 'completed' }))}
                        className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-300 shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                      >
                        Zobrazit neaktivní / realizované ({completedJobsCount})
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* Původní e08fd7f zobrazení: Mřížka aktivních zakázek + Kompaktní archiv realizovaných spoluprací dole */
              <>
                {activeJobs.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onRespond={(targetJob) => setRespondingJob(targetJob)}
                        onViewAuthor={handleOpenAuthor}
                        onManage={canManageJob(job) ? handleOpenManageJob : undefined}
                        featureFlags={featureFlags}
                      />
                    ))}
                  </div>
                )}

                {completedJobs.length > 0 && (
                  <section className={activeJobs.length > 0 ? 'mt-8 pt-6 border-t-2 border-[#111111]/15 dark:border-stone-700' : ''}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        <h2 className="font-serif text-sm sm:text-base font-bold text-[#111111] dark:text-white">
                          Archiv realizovaných spoluprací & recenzí ({completedJobs.length})
                        </h2>
                      </div>
                      <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                        Kompaktní přehled ukončených zakázek (nezabírá místo aktivním nabídkám)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {completedJobs.map((job) => (
                        <CompactArchivedJobRow
                          key={job.id}
                          job={job}
                          onViewUser={handleOpenAuthor}
                          onManageJob={canManageJob(job) ? handleOpenManageJob : undefined}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {activeJobs.length === 0 && completedJobs.length === 0 && (
                  <div className="bg-white dark:bg-[#1C1E26] rounded-3xl border-2 border-[#111111] dark:border-stone-500 p-12 text-center my-6 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#000000]">
                    <div className="w-14 h-14 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white mb-1">
                      Žádné zakázky neodpovídají zadaným filtrům
                    </h3>
                    <p className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-4">
                      Zkuste uvolnit vyhledávání, přepnout filtr stavu na „Všechny zakázky“ nebo vyberte jiný obor.
                    </p>
                    <button
                      onClick={() => setFilters(initialFilters)}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                    >
                      Resetovat filtry
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* Footer – odkaz na Admin v patičce je skrytý pro běžné návštěvníky (admin je dostupný až po rozkliku Můj profil) */}
      <footer
        className={`border-t-2 border-[#111111] ${
          ffDarkWhite ? 'dark:border-stone-400' : 'dark:border-stone-600'
        } bg-white dark:bg-[#181A20] py-8 px-4 sm:px-6 lg:px-8 text-xs text-stone-700 dark:text-stone-300 font-bold transition-colors`}
      >
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
            {isAdmin && (
              <button
                onClick={() => handleOpenAdministration('all', null)}
                className="inline-flex items-center gap-1.5 text-[#111111] dark:text-stone-200 hover:underline font-extrabold cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#FEF08A]" />
                <span>Administrace</span>
              </button>
            )}
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
            setIsProfilePageOpen(false);
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
        featureFlags={featureFlags}
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
