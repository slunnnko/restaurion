'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { JobCard } from '@/components/JobCard';
import { JobFilters } from '@/components/JobFilters';
import { DirectoryCard } from '@/components/DirectoryCard';
import { DirectoryFilters, initialDirectoryFilters } from '@/components/DirectoryFilters';
import type { DirectoryFilterState } from '@/components/DirectoryFilters';
import { CreateJobModal } from '@/components/CreateJobModal';
import { RespondModal } from '@/components/RespondModal';
import { InviteModal } from '@/components/InviteModal';
import { LoginModal } from '@/components/LoginModal';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfilePage } from '@/components/ProfilePage';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { ErrorBox } from '@/components/ui';
import { HammerLogo } from '@/components/HammerLogo';
import { FilterState } from '@/types';
import { OwnProfile, PublicJob, NotificationItem, DirectoryEntry, ThemePreference } from '@/types/api';
import { applyTheme, THEME_PREF_KEY } from '@/lib/theme';
import { api, ApiError } from '@/lib/api';
import { initials, plural } from '@/lib/format';
import { jobMatchesText, jobMatchesTokens } from '@/lib/jobSearch';
import { Briefcase, CheckCircle2, Plus, ChevronDown, UserCheck, BookUser } from 'lucide-react';

const initialFilters: FilterState = {
  searchQuery: '',
  tokens: [],
  mineOnly: false,
};

const badgeCls =
  'inline-flex items-center gap-2 bg-white dark:bg-[#252834] px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111]';

type Tab = 'jobs' | 'offers' | 'directory';

const PROFILE_HINT = 'Doplň jméno a obory, ať ti chodí zakázky.';

export default function Home() {
  const [view, setView] = useState<'board' | 'profile'>('board');
  const [tab, setTab] = useState<Tab>('jobs');
  const [dirFilters, setDirFilters] = useState<DirectoryFilterState>(initialDirectoryFilters);
  const [dirEntries, setDirEntries] = useState<DirectoryEntry[]>([]);
  const [dirTotal, setDirTotal] = useState(0);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirError, setDirError] = useState('');
  const [isHeroInfoOpen, setIsHeroInfoOpen] = useState(false);

  const [user, setUser] = useState<OwnProfile | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [unread, setUnread] = useState(0);
  const [profileHint, setProfileHint] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // D44: `?job=<id>` opens the detail of that listing once the board data is loaded (and only if it is in it).
  const [deepLinkId, setDeepLinkId] = useState<string | null>(null);
  const deepLinkPending = useRef<string | null>(
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('job'),
  );

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isVopOpen, setIsVopOpen] = useState(false);
  const [respondingJob, setRespondingJob] = useState<PublicJob | null>(null);
  // D40: Poptat spolupráci = pozvánka (nabídka) a přímá poptávka jen pro autora nabídky.
  const [invitingOffer, setInvitingOffer] = useState<PublicJob | null>(null);
  const [directOffer, setDirectOffer] = useState<PublicJob | null>(null);
  const [editingJob, setEditingJob] = useState<PublicJob | null>(null);

  // Akce, která čeká na přihlášení.
  const pendingAction = useRef<(() => void) | null>(null);

  // Vzhled: preference přihlášeného (profil) nebo systém; .dark na <html>. Cache v localStorage kvůli bliknutí.
  const themePref: ThemePreference | null = user?.themePreference ?? null;
  // /api/auth/me failed (offline, 5xx): keep the cached preference instead of falling back to the system scheme.
  const meFailed = useRef(false);
  useEffect(() => {
    try {
      localStorage.removeItem('restaurion-theme'); // starý přepínač v hlavičce
    } catch {
      /* localStorage nedostupný */
    }
  }, []);
  useEffect(() => {
    if (!authLoaded) return;
    let pref: ThemePreference | null = themePref;
    try {
      if (themePref) localStorage.setItem(THEME_PREF_KEY, themePref);
      else if (meFailed.current) pref = (localStorage.getItem(THEME_PREF_KEY) as ThemePreference | null) ?? null;
      else localStorage.removeItem(THEME_PREF_KEY);
    } catch {
      /* localStorage nedostupný */
    }
    applyTheme(pref);
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-color-scheme: light)');
    } catch {
      return;
    }
    const onChange = () => applyTheme(pref);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePref, authLoaded]);

  const loadJobs = useCallback(async () => {
    setJobsError('');
    try {
      const data = await api<{ jobs: PublicJob[] }>('/api/jobs');
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err) {
      setJobsError(err instanceof ApiError ? err.message : 'Zakázky se nepodařilo načíst.');
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setJobsLoading(true);
    let me: OwnProfile | null = null;
    try {
      const data = await api<{ user: OwnProfile | null }>('/api/auth/me');
      me = data.user;
      meFailed.current = false;
    } catch {
      meFailed.current = true;
      // nepřihlášený / API nedostupné – chyba se ukáže u zakázek
    }
    setUser(me);
    setAuthLoaded(true);
    await loadJobs();
  }, [loadJobs]);

  // Při načtení: session z cookie + zakázky.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  // Adresář: načte se po otevření záložky, změně filtrů (hledání s prodlevou) a změně přihlášení (kontakty).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (tab !== 'directory') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setDirLoading(true);
      setDirError('');
      try {
        const params = new URLSearchParams();
        if (dirFilters.group !== 'all') params.set('group', dirFilters.group);
        if (dirFilters.craft !== 'all') params.set('craft', dirFilters.craft);
        if (dirFilters.region !== 'Všechny regiony') params.set('region', dirFilters.region);
        if (dirFilters.q.trim()) params.set('q', dirFilters.q.trim());
        const data = await api<{ entries: DirectoryEntry[]; total: number }>(`/api/directory?${params.toString()}`);
        if (cancelled) return;
        setDirEntries(Array.isArray(data.entries) ? data.entries : []);
        setDirTotal(data.total ?? 0);
      } catch (err) {
        if (!cancelled) setDirError(err instanceof ApiError ? err.message : 'Adresář se nepodařilo načíst.');
      } finally {
        if (!cancelled) setDirLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab, dirFilters, userId]);

  // Deep link ?profil=1
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (!authLoaded || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    if (new URLSearchParams(window.location.search).get('profil') !== '1') return;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('profile');
    } else {
      pendingAction.current = () => setView('profile');
      setIsLoginOpen(true);
    }
  }, [authLoaded, user]);

  // Počet nepřečtených upozornění každých 60 s (jen při viditelné záložce).
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnread(0);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const data = await api<{ items: NotificationItem[]; unread: number }>('/api/notifications');
        if (!cancelled) setUnread(data.unread);
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 401) setUser(null);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 60_000);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  const requireLogin = (action: () => void) => {
    if (user) {
      action();
    } else {
      pendingAction.current = action;
      setIsLoginOpen(true);
    }
  };

  const handleApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && err.status === 401) {
      setUser(null);
      setActionError('Přihlášení vypršelo. Přihlas se prosím znovu.');
      return;
    }
    if (err instanceof ApiError && err.fieldErrors?.profile === 'name') {
      openProfileWithHint();
      return;
    }
    setActionError(err instanceof ApiError ? err.message : fallback);
  };

  const handleLoggedIn = (u: OwnProfile) => {
    setUser(u);
    setIsLoginOpen(false);
    setActionError('');
    void loadJobs();
    const action = pendingAction.current;
    pendingAction.current = null;
    if (u.name.trim().length < 3 || u.crafts.length === 0) {
      setProfileHint(PROFILE_HINT);
      setView('profile');
    }
    action?.();
  };

  const goDirectory = () => {
    setProfileHint('');
    setView('board');
    setTab('directory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} });
    } catch {
      // cookie se stejně smaže při dalším neúspěšném požadavku; UI se odhlásí
    }
    setUser(null);
    setDirEntries([]);
    setDirTotal(0);
    setView('board');
    setUnread(0);
    setFilters((prev) => ({ ...prev, mineOnly: false }));
    void loadJobs();
  };

  const handleWithdraw = async (job: PublicJob, reason?: string) => {
    if (!job.myEngagement) return;
    setActionError('');
    try {
      await api(`/api/engagements/${encodeURIComponent(job.myEngagement.id)}`, {
        method: 'POST',
        body: reason ? { action: 'withdraw', reason } : { action: 'withdraw' },
      });
      await loadJobs();
    } catch (err) {
      handleApiError(err, 'Odstoupení se nepodařilo.');
      throw err; // WithdrawModal zůstane otevřený a ukáže chybu
    }
  };

  const handleCloseJob = async (job: PublicJob) => {
    setActionError('');
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: 'PATCH', body: { status: 'closed' } });
      await loadJobs();
    } catch (err) {
      handleApiError(err, 'Inzerát se nepodařilo ukončit.');
    }
  };

  const handleDeleteJob = async (job: PublicJob, reason: string) => {
    setActionError('');
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: 'DELETE', body: { reason } });
      await loadJobs();
    } catch (err) {
      handleApiError(err, 'Inzerát se nepodařilo smazat.');
      throw err; // DeleteJobModal zůstane otevřený a ukáže chybu
    }
  };

  const openCreate = () => requireLogin(() => setIsCreateOpen(true));
  const openNotifications = () => requireLogin(() => setIsNotifOpen(true));
  const openProfileWithHint = () => {
    setIsCreateOpen(false);
    setEditingJob(null);
    setRespondingJob(null);
    setInvitingOffer(null);
    setDirectOffer(null);
    setProfileHint(PROFILE_HINT);
    setView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDirectory = () => (view === 'board' && tab === 'directory' ? goBoard() : goDirectory());

  const goBoard = () => {
    setProfileHint('');
    setView('board');
    setTab((t) => (t === 'directory' ? 'jobs' : t));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenJobFromNotification = (jobId: string) => {
    setIsNotifOpen(false);
    setView('board');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      setNotice('Zakázka už není aktivní');
      return;
    }
    setNotice('');
    setTab(job.jobType === 'craftsman_available' ? 'offers' : 'jobs');
    setFilters(initialFilters);
    setHighlightId(jobId);
    setTimeout(() => {
      document.getElementById(`job-${jobId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    setTimeout(() => setHighlightId((cur) => (cur === jobId ? null : cur)), 3500);
  };

  useEffect(() => {
    const id = deepLinkPending.current;
    if (!id || jobsLoading) return;
    deepLinkPending.current = null;
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    setView('board');
    setTab(job.jobType === 'craftsman_available' ? 'offers' : 'jobs');
    setFilters(initialFilters);
    setDeepLinkId(id);
    setTimeout(() => setDeepLinkId((cur) => (cur === id ? null : cur)), 1000);
  }, [jobs, jobsLoading]);

  const boardJobs = useMemo(() => jobs.filter((j) => j.jobType !== 'craftsman_available'), [jobs]);
  const offers = useMemo(() => jobs.filter((j) => j.jobType === 'craftsman_available'), [jobs]);
  const tabJobs = tab === 'offers' ? offers : boardJobs;
  const isOffersTab = tab === 'offers';

  const filteredJobs = useMemo(() => {
    return tabJobs.filter(
      (job) =>
        (!filters.mineOnly || job.isMine) &&
        jobMatchesText(job, filters.searchQuery) &&
        jobMatchesTokens(job, filters.tokens)
    );
  }, [tabJobs, filters]);

  const activeFiltersCount =
    (filters.searchQuery ? 1 : 0) +
    filters.tokens.length +
    (filters.mineOnly ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-12 bg-transparent text-[#111111] dark:text-[#F8FAFC] transition-colors">
      <Header
        user={user}
        unreadCount={unread}
        onOpenDirectory={toggleDirectory}
        directoryActive={view === 'board' && tab === 'directory'}
        onOpenProfile={() => setView((v) => (v === 'profile' ? 'board' : 'profile'))}
        onLogin={() => setIsLoginOpen(true)}
      />

      {view === 'profile' && user ? (
        <ProfilePage
          user={user}
          onUserChange={setUser}
          onBack={goBoard}
          onOpenDirectory={goDirectory}
          onLogout={handleLogout}
          hint={profileHint}
          onListingsChanged={() => void loadJobs()}
          unreadCount={unread}
          onOpenNotifications={openNotifications}
        />
      ) : (
        <>
          {/* Hero sekce */}
          <section className="bg-[#FEF08A] dark:bg-[#191B22] text-[#111111] dark:text-white border-b-2 border-[#111111] dark:border-stone-500 py-5 sm:py-9 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl text-left">
                <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl mb-2.5 sm:mb-3 font-bold text-[#111111] dark:text-[#FEF08A] leading-tight tracking-tight">
                  Najdi práci nebo parťáka
                </h1>

                <button
                  type="button"
                  onClick={() => setIsHeroInfoOpen((prev) => !prev)}
                  aria-expanded={isHeroInfoOpen}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold underline underline-offset-4 decoration-2 text-[#111111] dark:text-[#FEF08A] cursor-pointer mb-3"
                >
                  <span>Co je Restaurion?</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isHeroInfoOpen ? 'rotate-180' : ''}`} />
                </button>
                {isHeroInfoOpen && (
                  <p className="text-xs sm:text-base mb-4 sm:mb-5 text-stone-900 dark:text-stone-200 font-semibold leading-relaxed max-w-3xl">
                    Restaurion propojuje licencované restaurátory a umělecké řemeslníky v ČR. Zadavatel vloží zakázku s
                    termínem, každý řemeslník v oboru dostane upozornění a může se přihlásit. Můžeš se i nabídnout a
                    v Adresáři najít firmy, restaurátory a řemeslníky. Kontakty vidí každý přihlášený.
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 pt-1 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
                  {[
                    'Poptávky subdodávek a zaštítění',
                    'Upozornění na zakázky v tvém oboru',
                    'Adresář s kontakty pro přihlášené',
                  ].map((text) => (
                    <div key={text} className={badgeCls}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              {tab === 'directory' ? (
                <h2 className="inline-flex items-center gap-2.5 font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
                  <BookUser className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Adresář</span>
                </h2>
              ) : (
              <div className="inline-flex items-center gap-2 p-1.5 bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-500 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#000000]">
                {(
                  [
                    { id: 'jobs', label: 'Nástěnka zakázek', icon: Briefcase, count: boardJobs.length },
                    { id: 'offers', label: 'Nabízím se', icon: UserCheck, count: offers.length },
                  ] as const
                ).map((t) => {
                  const on = tab === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
                        on
                          ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111]'
                          : 'border-transparent text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#262933]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                      {t.count !== null && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-extrabold border bg-white text-[#111111] border-[#111111]">
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              )}

              <div className="hidden sm:flex items-center">
                <button
                  onClick={openCreate}
                  aria-label="Přidat inzerát"
                  title="Přidat inzerát"
                  className="inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl text-base font-extrabold bg-white dark:bg-[#252834] text-[#111111] dark:text-stone-100 border-2 border-[#111111] dark:border-stone-400 shadow-[4px_4px_0px_#111111] dark:shadow-[4px_4px_0px_#000000] hover:bg-stone-100 dark:hover:bg-[#323644] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#111111] dark:hover:shadow-[3px_3px_0px_#000000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white border-2 border-[#111111] flex items-center justify-center">
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </span>
                  Přidat inzerát
                </button>
              </div>
            </div>

            {tab === 'directory' ? (
              <DirectoryFilters filters={dirFilters} onChange={setDirFilters} />
            ) : (
              <JobFilters
                filters={filters}
                jobs={tabJobs}
                onChange={setFilters}
                onReset={() => setFilters(initialFilters)}
                activeCount={activeFiltersCount}
              />
            )}

            {actionError && (
              <div className="mb-4">
                <ErrorBox message={actionError} />
              </div>
            )}
            {notice && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 border-2 border-[#111111] dark:border-[#FEF08A]/50 text-xs font-extrabold text-[#111111] dark:text-[#FEF08A]"
              >
                {notice}
              </div>
            )}

            {tab === 'directory' ? (
              dirError ? (
                <ErrorBox message={dirError} onRetry={() => setDirFilters((f) => ({ ...f }))} />
              ) : dirLoading && dirEntries.length === 0 ? (
                <p className="text-sm font-bold text-stone-600 dark:text-stone-400 py-8 text-center">Načítám adresář…</p>
              ) : dirEntries.length > 0 ? (
                <>
                  <div className="text-xs text-stone-700 dark:text-stone-300 font-bold mb-4 px-1">
                    Nalezeno <strong className="text-[#111111] dark:text-white font-extrabold">{dirTotal}</strong>{' '}
                    {plural(dirTotal, 'profil', 'profily', 'profilů')}
                    {dirTotal > dirEntries.length ? ` (zobrazeno ${dirEntries.length})` : ''}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dirEntries.map((entry) => (
                      <DirectoryCard key={entry.id} entry={entry} onLogin={() => setIsLoginOpen(true)} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-[#1C1E26] rounded-3xl border-2 border-[#111111] dark:border-stone-500 p-12 text-center my-6 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#000000]">
                  <div className="w-14 h-14 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <BookUser className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white mb-1">
                    V Adresáři nikdo takový není
                  </h3>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
                    Zkus uvolnit vyhledávání, jiný region, obor nebo skupinu.
                  </p>
                </div>
              )
            ) : jobsError ? (
              <ErrorBox message={jobsError} onRetry={() => void loadAll()} />
            ) : jobsLoading && jobs.length === 0 ? (
              <p className="text-sm font-bold text-stone-600 dark:text-stone-400 py-8 text-center">Načítám inzeráty…</p>
            ) : filteredJobs.length > 0 ? (
              <>
                <div className="text-xs text-stone-700 dark:text-stone-300 font-bold mb-4 px-1">
                  Nalezeno <strong className="text-[#111111] dark:text-white font-extrabold">{filteredJobs.length}</strong>{' '}
                  {isOffersTab
                    ? plural(filteredJobs.length, 'nabídka', 'nabídky', 'nabídek')
                    : plural(filteredJobs.length, 'zakázka', 'zakázky', 'zakázek')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      highlighted={highlightId === job.id}
                      onRespond={(j) =>
                        requireLogin(() => (j.jobType === 'craftsman_available' ? setInvitingOffer(j) : setRespondingJob(j)))
                      }
                      onWithdraw={handleWithdraw}
                      onCloseJob={handleCloseJob}
                      onChanged={() => void loadJobs()}
                      onEdit={setEditingJob}
                      onLogin={() => setIsLoginOpen(true)}
                      viewerName={user ? user.name || user.email : ''}
                      isAdmin={user?.isAdmin === true}
                      onDeleteJob={handleDeleteJob}
                      autoOpenDetail={deepLinkId === job.id}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-[#1C1E26] rounded-3xl border-2 border-[#111111] dark:border-stone-500 p-12 text-center my-6 shadow-[6px_6px_0px_#111111] dark:shadow-[6px_6px_0px_#000000]">
                <div className="w-14 h-14 bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {isOffersTab ? <UserCheck className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
                </div>
                <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white mb-1">
                  {tabJobs.length === 0
                    ? isOffersTab
                      ? 'Zatím tu nikdo nic nenabízí'
                      : 'Zatím tu nejsou žádné zakázky'
                    : isOffersTab
                      ? 'Žádné nabídky neodpovídají zadaným filtrům'
                      : 'Žádné zakázky neodpovídají zadaným filtrům'}
                </h3>
                <p className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-4">
                  {tabJobs.length === 0
                    ? isOffersTab
                      ? 'Buď první a nabídni se s volným termínem.'
                      : 'Buď první a přidej zakázku. Řemeslníci v oboru dostanou upozornění.'
                    : 'Zkus uvolnit vyhledávání nebo filtry, nebo přidej vlastní inzerát.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {tabJobs.length > 0 && activeFiltersCount > 0 && (
                    <button
                      onClick={() => setFilters(initialFilters)}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-white bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-300 shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                    >
                      Resetovat filtry
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      )}

      <footer className="border-t-2 border-[#111111] dark:border-stone-600 bg-white dark:bg-[#181A20] py-8 px-4 sm:px-6 lg:px-8 text-xs text-stone-700 dark:text-stone-300 font-bold transition-colors">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] text-[#111111] flex items-center justify-center shrink-0">
              <HammerLogo className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-[#111111] dark:text-white">
              Restaurion – platforma pro památková řemesla
            </span>
          </div>
          <button
            onClick={() => setIsVopOpen(true)}
            className="text-right text-[#111111] dark:text-[#FEF08A] hover:underline font-extrabold cursor-pointer"
          >
            Všeobecné obchodní podmínky (VOP)
          </button>
        </div>
      </footer>

      <MobileBottomNav
        active={view === 'profile' ? 'profile' : tab === 'directory' ? 'none' : 'board'}
        isLoggedIn={Boolean(user)}
        unreadCount={unread}
        avatarText={user ? initials(user.name || user.email) : ''}
        onBoard={goBoard}
        onCreate={openCreate}
        onProfile={() => (user ? setView((v) => (v === 'profile' ? 'board' : 'profile')) : setIsLoginOpen(true))}
      />

      {/* Modální okna */}
      {isCreateOpen && (
        <CreateJobModal
          initialType={tab === 'offers' ? 'craftsman_available' : undefined}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => void loadJobs()}
          onNeedProfile={openProfileWithHint}
        />
      )}

      {editingJob && (
        <CreateJobModal
          editJob={editingJob}
          onClose={() => setEditingJob(null)}
          onCreated={() => undefined}
          onSaved={() => void loadJobs()}
          onNeedProfile={openProfileWithHint}
        />
      )}

      {respondingJob && (
        <RespondModal
          job={respondingJob}
          onClose={() => setRespondingJob(null)}
          onSubmitted={() => void loadJobs()}
          onNeedProfile={openProfileWithHint}
        />
      )}

      {invitingOffer && (
        <InviteModal
          offer={invitingOffer}
          onClose={() => setInvitingOffer(null)}
          onSent={() => void loadJobs()}
          onNeedProfile={openProfileWithHint}
          onCreateDirect={(o) => {
            setInvitingOffer(null);
            setDirectOffer(o);
          }}
        />
      )}

      {directOffer && (
        <CreateJobModal
          directOffer={directOffer}
          onClose={() => setDirectOffer(null)}
          onCreated={() => void loadJobs()}
          onNeedProfile={openProfileWithHint}
        />
      )}

      {isNotifOpen && user && (
        <NotificationsPanel
          onClose={() => setIsNotifOpen(false)}
          onUnreadChange={setUnread}
          onOpenJob={handleOpenJobFromNotification}
          onOpenProfile={() => {
            setIsNotifOpen(false);
            setProfileHint('');
            setView('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {isLoginOpen && (
        <LoginModal
          onClose={() => {
            pendingAction.current = null;
            setIsLoginOpen(false);
          }}
          onLoggedIn={handleLoggedIn}
          onOpenVop={() => setIsVopOpen(true)}
        />
      )}

      {isVopOpen && <LegalNoticeModal isOpen={isVopOpen} onClose={() => setIsVopOpen(false)} />}
    </div>
  );
}
