'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { JobCard } from '@/components/JobCard';
import { JobFilters } from '@/components/JobFilters';
import { CreateJobModal } from '@/components/CreateJobModal';
import { LicenseVerificationModal } from '@/components/LicenseVerificationModal';
import { UserProfileModal } from '@/components/UserProfileModal';
import { RespondModal } from '@/components/RespondModal';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { mockJobs, mockUsers } from '@/data/mockData';
import { FilterState, Job, UserProfile } from '@/types';
import {
  Briefcase,
  UserCheck,
  Scale,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { HammerLogo } from '@/components/HammerLogo';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'available' | 'vop'>('jobs');
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [selectedRegion, setSelectedRegion] = useState<string>('Všechny regiony');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [respondingJob, setRespondingJob] = useState<Job | null>(null);
  const [isVopOpen, setIsVopOpen] = useState(false);

  // Filters state
  const initialFilters: FilterState = {
    searchQuery: '',
    region: 'Všechny regiony',
    craft: 'all',
    monumentStatus: 'all',
    jobType: 'all',
  };
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Synchronizace rychlého přepínače regionů v hlavičce s filtrem
  const handleSelectHeaderRegion = (reg: string) => {
    setSelectedRegion(reg);
    setFilters((prev) => ({ ...prev, region: reg }));
  };

  // Vytvoření nové zakázky
  const handleCreateJob = (newJobData: Partial<Job>) => {
    const newJob: Job = {
      id: `job-${Date.now()}`,
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
      author: mockUsers.novak, // Autor přihlášený v prototypu
      createdAt: 'Právě teď',
      responsesCount: 0,
      urgent: false,
    };
    setJobs([newJob, ...jobs]);
  };

  // Filtrování
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Filtr záložky (Poptávky práce vs. Nabízím se)
      if (activeTab === 'available' && job.jobType !== 'craftsman_available') {
        return false;
      }
      if (activeTab === 'jobs' && job.jobType === 'craftsman_available') {
        return false;
      }

      // Hledání
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesDesc = job.description.toLowerCase().includes(query);
        const matchesCity = job.city.toLowerCase().includes(query);
        const matchesCraft = job.requiredCrafts.some((c) => c.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesCity && !matchesCraft) {
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

  const activeFiltersCount =
    (filters.searchQuery ? 1 : 0) +
    (filters.region !== 'Všechny regiony' ? 1 : 0) +
    (filters.craft !== 'all' ? 1 : 0) +
    (filters.monumentStatus !== 'all' ? 1 : 0) +
    (filters.jobType !== 'all' ? 1 : 0);

  const handleOpenAuthor = (authorId: string) => {
    const user = Object.values(mockUsers).find((u) => u.id === authorId) || mockUsers.novak;
    setSelectedUser(user);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-12 bg-transparent text-stone-100">
      {/* Hlavička s logem kladívka a názvem Restaurion vlevo */}
      <Header
        onOpenCreateJob={() => setIsCreateOpen(true)}
        onOpenVerificationModal={() => setIsVerificationOpen(true)}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectHeaderRegion}
      />

      {/* Hero sekce – tmavě hnědé/černé kontrastní pozadí, texty a zelené fajfky vlevo */}
      <section className="bg-gradient-to-b from-[#2c180b] via-[#19100a] to-[#120d09] text-white py-10 sm:py-12 px-4 sm:px-6 lg:px-8 border-b border-amber-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl text-left">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug mb-3 tracking-tight">
              Otevíráme cestu k zakázkám na kulturních i nekulturních památkách.
            </h1>

            <p className="text-sm sm:text-base text-stone-300 leading-relaxed mb-6 max-w-3xl">
              Licencovaní restaurátoři zde poptávají zručné subdodavatele, řemeslníci nacházejí odborné zaštítění dle památkového zákona. Propojujeme restaurátory napříč obory.
            </p>

            {/* Klíčové výhody – vlevo a zelené fajfky */}
            <div className="flex flex-wrap items-center justify-start gap-4 sm:gap-7 pt-1 text-xs sm:text-sm font-semibold text-stone-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span>Poptávky subdodávek a zaštítění</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span>Ověřování licencí MK ČR</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span>Přímý kontakt</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hlavní obsah s nabídkami práce */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full relative z-10">
        {/* Záložky portálu: Nástěnka zakázek vs. Nabízím se */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 p-1.5 bg-[#1e1510] rounded-2xl border border-amber-900/50 shadow-lg">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 py-2.5 px-4 text-sm font-bold rounded-xl transition-all ${
                activeTab === 'jobs'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Nástěnka zakázek</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'jobs'
                    ? 'bg-amber-950/50 text-amber-100'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {jobs.filter((j) => j.jobType !== 'craftsman_available').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('available')}
              className={`flex items-center gap-2 py-2.5 px-4 text-sm font-bold rounded-xl transition-all ${
                activeTab === 'available'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Nabízím se</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'available'
                    ? 'bg-blue-950/50 text-blue-100'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {jobs.filter((j) => j.jobType === 'craftsman_available').length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat inzerát</span>
            </button>
            <button
              onClick={() => setIsVopOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-stone-300 hover:text-amber-400 font-medium transition-colors"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
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
        <div className="flex items-center justify-between text-xs text-stone-300 mb-4 px-1">
          <div>
            Nalezeno <strong className="text-white">{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'nabídka' : filteredJobs.length < 5 ? 'nabídky' : 'nabídek'}
            {filters.region !== 'Všechny regiony' && <span> v oblasti <strong className="text-white">{filters.region}</strong></span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Reálné ověření licencí aktivní
            </span>
          </div>
        </div>

        {/* Seznam zakázek */}
        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onRespond={(targetJob) => setRespondingJob(targetJob)}
                onViewAuthor={handleOpenAuthor}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center my-6 shadow-xl">
            <div className="w-14 h-14 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">
              Žádné zakázky neodpovídají zadaným filtrům
            </h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto mb-4">
              Zkuste uvolnit vyhledávání nebo vyberte jiný obor či region.
            </p>
            <button
              onClick={() => setFilters(initialFilters)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 transition-colors"
            >
              Resetovat filtry
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-900/40 bg-[#0d0906] py-8 px-4 sm:px-6 lg:px-8 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <HammerLogo className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-stone-200">Restaurion - Platforma pro památková řemesla</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsVopOpen(true)}
              className="text-stone-300 hover:text-amber-400 transition-colors underline"
            >
              Všeobecné obchodní podmínky (VOP)
            </button>
          </div>
        </div>
      </footer>

      {/* Mobilní spodní lišta pro zážitek jako v mobilní aplikaci */}
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
        onClose={() => setSelectedUser(null)}
      />

      <RespondModal
        job={respondingJob}
        isOpen={Boolean(respondingJob)}
        onClose={() => setRespondingJob(null)}
      />

      <LegalNoticeModal
        isOpen={isVopOpen}
        onClose={() => setIsVopOpen(false)}
      />
    </div>
  );
}
