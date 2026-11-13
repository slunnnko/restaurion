'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MvpJobType, PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { formatRange } from '@/lib/format';
import { ErrorBox, secondaryBtn } from './ui';
import { engagementBadge } from './engagementStatus';
import { CreateJobModal } from './CreateJobModal';
import { ActionMenu } from './ActionMenu';
import { InterestedList } from './InterestedList';
import { HammerLogo } from './HammerLogo';
import { ShieldCheck, UserCheck, Calendar, MapPin, Users, Pencil, X } from 'lucide-react';

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

/**
 * D40: stav pozvánky přímého inzerátu je přímo na inzerátu (`directInvite`).
 * `Zveřejnit na nástěnce` jde, když nečeká potvrzení ani není přijato; `Poslat znovu` po lhůtě a po zrušení (ne po odmítnutí).
 */
const DirectActions: React.FC<{ job: PublicJob; onChanged: () => void }> = ({ job, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const di = job.directInvite;
  if (!di) return null;

  const waiting = di.status === 'pending' && !di.unconfirmed;
  const canPublish = !waiting && di.status !== 'accepted';
  const canResend = (di.status === 'pending' && di.unconfirmed) || di.status === 'withdrawn';
  if (!canPublish && !canResend && di.status !== 'declined' && di.status !== 'pending') return null;
  const badge = di.status === 'pending' ? engagementBadge({ status: 'pending', initiatedBy: 'poster', unconfirmed: di.unconfirmed, contactedAt: di.contactedAt }) : null;

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const publish = () => {
    if (!window.confirm('Zveřejnit inzerát na nástěnce? Dostanou ho všichni odpovídající řemeslníci.')) return;
    void run(
      () => api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: 'PATCH', body: { visibility: 'public' } }),
      'Inzerát se nepodařilo zveřejnit.'
    );
  };
  const resend = () =>
    void run(() => api(`/api/jobs/${encodeURIComponent(job.id)}/invite`, { method: 'POST', body: {} }), 'Poptávku se nepodařilo poslat znovu.');

  return (
    <div className="mt-3 space-y-2">
      {error && <ErrorBox message={error} />}
      {badge && (
        <span className={`inline-block px-2.5 py-0.5 rounded-full border-2 border-[#111111] dark:border-stone-400 text-[11px] font-extrabold ${badge.cls}`}>
          {badge.label}
        </span>
      )}
      {di.status === 'declined' && <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Odmítl</p>}
      <div className="flex flex-wrap gap-2">
        {canPublish && (
          <button type="button" disabled={busy} onClick={publish} className={secondaryBtn}>
            Zveřejnit na nástěnce
          </button>
        )}
        {canResend && (
          <button type="button" disabled={busy} onClick={resend} className={secondaryBtn}>
            Poslat znovu
          </button>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{
  job: PublicJob;
  busy: boolean;
  onEdit: (j: PublicJob) => void;
  onChanged: () => void;
  onClose: (j: PublicJob) => void;
}> = ({ job, busy, onEdit, onChanged, onClose }) => {
  const info = TYPE_INFO[job.jobType] ?? TYPE_INFO.subcontract_needed;
  const Icon = info.icon;
  const isOffer = job.jobType === 'craftsman_available';
  const active = job.status === 'active';
  return (
    <li
      className={`relative rounded-2xl border-2 border-[#111111] dark:border-stone-500 p-3.5 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] ${
        active ? 'bg-white dark:bg-[#1C1E26]' : 'bg-stone-100 dark:bg-[#15171E] opacity-70'
      }`}
    >
      {active && (
        <div className="absolute top-3 right-3 z-10">
          <ActionMenu
            triggerIcon={Pencil}
            triggerLabel="Upravit inzerát"
            actions={[
              { key: 'edit', label: 'Upravit', icon: Pencil, onSelect: () => onEdit(job), disabled: busy },
              { key: 'close', label: 'Ukončit', icon: X, onSelect: () => onClose(job), disabled: busy },
            ]}
          />
        </div>
      )}
      <div className="flex items-start gap-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 border-[#111111] text-white ${info.tile}`}
          title={info.label}
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className={`min-w-0 flex-1 ${active ? 'pr-11' : ''}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400">
            {info.label}
          </div>
          {job.visibility === 'direct' && job.directTo && (
            <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD] border-2 border-[#111111] dark:border-[#2563EB]/70">
              Jen pro {job.directTo.name}
            </span>
          )}
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
        <div className="mt-3">
          <InterestedList job={job} onChanged={onChanged} />
          {job.visibility === 'direct' && <DirectActions job={job} onChanged={onChanged} />}
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
                  <Row key={j.id} job={j} busy={busyId === j.id} onEdit={setEditing} onChanged={changed} onClose={closeJob} />
                ))}
              </ul>
            )}
          </section>
          {closed.length > 0 && (
            <section>
              <h3 className={groupTitle}>Ukončené ({closed.length})</h3>
              <ul className="space-y-3">
                {closed.map((j) => (
                  <Row key={j.id} job={j} busy={false} onEdit={setEditing} onChanged={changed} onClose={closeJob} />
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
    </div>
  );
};
