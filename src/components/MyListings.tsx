'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MvpJobType, PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { formatRange } from '@/lib/format';
import { ErrorBox, dangerBtn } from './ui';
import { CreateJobModal } from './CreateJobModal';
import { InterestedWorkersModal } from './InterestedWorkersModal';
import { HammerLogo } from './HammerLogo';
import { ShieldCheck, UserCheck, Calendar, MapPin, Users, Pencil } from 'lucide-react';

interface MyListingsProps {
  /** Po změně (úprava, ukončení, rozhodnutí o zájemci), aby si nástěnka obnovila data. */
  onChanged: () => void;
  /** API vrátilo 400 profile=name při úpravě. */
  onNeedProfile?: () => void;
}

// Barva a ikona podle závazného design contractu (docs/UI-DESIGN.md).
const TYPE_INFO: Record<MvpJobType, { label: string; icon: React.ComponentType<{ className?: string }>; tile: string }> = {
  subcontract_needed: { label: 'Hledám subdodavatele', icon: HammerLogo, tile: 'bg-emerald-600' },
  guarantor_needed: { label: 'Hledám zaštítění licencí MK ČR', icon: ShieldCheck, tile: 'bg-[#FF5733]' },
  craftsman_available: { label: 'Nabízím se', icon: UserCheck, tile: 'bg-[#2563EB]' },
};

const smallBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

const Row: React.FC<{
  job: PublicJob;
  busy: boolean;
  onEdit: (j: PublicJob) => void;
  onInterested: (j: PublicJob) => void;
  onClose: (j: PublicJob) => void;
}> = ({ job, busy, onEdit, onInterested, onClose }) => {
  const info = TYPE_INFO[job.jobType] ?? TYPE_INFO.subcontract_needed;
  const Icon = info.icon;
  const isOffer = job.jobType === 'craftsman_available';
  const active = job.status === 'active';
  return (
    <li
      className={`rounded-2xl border-2 border-[#111111] dark:border-stone-500 p-3.5 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] ${
        active ? 'bg-white dark:bg-[#1C1E26]' : 'bg-stone-100 dark:bg-[#15171E] opacity-70'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 border-[#111111] text-white ${info.tile}`}
          title={info.label}
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400">
            {info.label}
          </div>
          <h4 className="font-serif font-bold text-base text-[#111111] dark:text-white leading-snug break-words">{job.title}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-stone-800 dark:text-stone-300">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {isOffer ? 'Volno' : 'Termín'}: {formatRange(job.dateFrom, job.dateTo)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {job.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" />
              Zájemců: {job.interestedCount}
            </span>
          </div>
        </div>
      </div>
      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => onEdit(job)} className={smallBtn}>
            <Pencil className="w-3.5 h-3.5" />
            <span>Upravit</span>
          </button>
          <button type="button" disabled={busy} onClick={() => onInterested(job)} className={smallBtn}>
            <Users className="w-3.5 h-3.5" />
            <span>Zájemci ({job.interestedCount})</span>
          </button>
          <button type="button" disabled={busy} onClick={() => onClose(job)} className={dangerBtn}>
            Ukončit
          </button>
        </div>
      )}
    </li>
  );
};

export const MyListings: React.FC<MyListingsProps> = ({ onChanged, onNeedProfile }) => {
  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicJob | null>(null);
  const [interested, setInterested] = useState<PublicJob | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<{ jobs: PublicJob[] }>('/api/jobs?mine=1');
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inzeráty se nepodařilo načíst.');
      setJobs((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const changed = () => {
    void load();
    onChanged();
  };

  const closeJob = async (job: PublicJob) => {
    if (!window.confirm('Opravdu chceš inzerát ukončit? Zmizí z nástěnky a nepůjde už upravit.')) return;
    setBusyId(job.id);
    setError('');
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: 'PATCH', body: { status: 'closed' } });
      changed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inzerát se nepodařilo ukončit.');
    } finally {
      setBusyId(null);
    }
  };

  const active = (jobs ?? []).filter((j) => j.status === 'active');
  const closed = (jobs ?? []).filter((j) => j.status !== 'active');
  const groupTitle = 'text-xs font-extrabold uppercase tracking-wider text-[#111111] dark:text-stone-200 mb-2';

  return (
    <div className="space-y-4">
      {error && <ErrorBox message={error} onRetry={() => void load()} />}
      {jobs === null ? (
        <p className="text-sm font-bold text-stone-600 dark:text-stone-300">Načítám…</p>
      ) : jobs.length === 0 && !error ? (
        <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
          Zatím nemáš žádný inzerát. Nový přidáš tlačítkem „+ Přidat“.
        </p>
      ) : (
        <>
          <section>
            <h3 className={groupTitle}>Aktivní ({active.length})</h3>
            {active.length === 0 ? (
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Žádný aktivní inzerát.</p>
            ) : (
              <ul className="space-y-3">
                {active.map((j) => (
                  <Row key={j.id} job={j} busy={busyId === j.id} onEdit={setEditing} onInterested={setInterested} onClose={closeJob} />
                ))}
              </ul>
            )}
          </section>
          {closed.length > 0 && (
            <section>
              <h3 className={groupTitle}>Ukončené ({closed.length})</h3>
              <ul className="space-y-3">
                {closed.map((j) => (
                  <Row key={j.id} job={j} busy={false} onEdit={setEditing} onInterested={setInterested} onClose={closeJob} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {editing && (
        <CreateJobModal
          editJob={editing}
          onClose={() => setEditing(null)}
          onCreated={() => undefined}
          onSaved={changed}
          onNeedProfile={() => {
            setEditing(null);
            onNeedProfile?.();
          }}
        />
      )}
      {interested && (
        <InterestedWorkersModal job={interested} onClose={() => setInterested(null)} onChanged={changed} />
      )}
    </div>
  );
};
