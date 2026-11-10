'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ContactInfo, EngagementForPoster, EngagementStatus, PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { ModalShell, ErrorBox, ContactBox, primaryBtn, dangerBtn } from './ui';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface InterestedWorkersModalProps {
  job: PublicJob;
  onClose: () => void;
  /** Po přijetí / odmítnutí, aby si nástěnka obnovila data. */
  onChanged: () => void;
}

const STATUS_LABEL: Record<EngagementStatus, string> = {
  pending: 'Čeká na rozhodnutí',
  accepted: 'Přijat',
  declined: 'Odmítnut',
  withdrawn: 'Odstoupil',
};
const STATUS_CLS: Record<EngagementStatus, string> = {
  pending: 'bg-[#FEF08A] text-[#111111]',
  accepted: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200',
  declined: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
  withdrawn: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
};

function safeUrl(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export const InterestedWorkersModal: React.FC<InterestedWorkersModalProps> = ({ job, onClose, onChanged }) => {
  const [items, setItems] = useState<EngagementForPoster[] | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    setItems(null);
    try {
      const data = await api<{ engagements: EngagementForPoster[] }>(
        `/api/jobs/${encodeURIComponent(job.id)}/engagements`
      );
      setItems(data.engagements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Zájemce se nepodařilo načíst.');
    }
  }, [job.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const decide = async (id: string, action: 'accept' | 'decline') => {
    setBusyId(id);
    setActionError('');
    try {
      const data = await api<{ engagement: { id: string; status: EngagementStatus }; contact?: ContactInfo }>(
        `/api/engagements/${encodeURIComponent(id)}`,
        { method: 'POST', body: { action } }
      );
      setItems((prev) =>
        prev
          ? prev.map((x) =>
              x.id === id ? { ...x, status: data.engagement.status, workerContact: data.contact ?? x.workerContact } : x
            )
          : prev
      );
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Akci se nepodařilo provést.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl" labelledBy="interested-title">
      <div className="mb-4 pr-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
          Zájemci
        </span>
        <h2 id="interested-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white break-words">
          {job.title}
        </h2>
      </div>

      {actionError && (
        <div className="mb-3">
          <ErrorBox message={actionError} />
        </div>
      )}

      {error ? (
        <ErrorBox message={error} onRetry={() => void load()} />
      ) : items === null ? (
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Načítám…</p>
      ) : items.length === 0 ? (
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
          Zatím se nikdo nepřihlásil. Upozornění dostali řemeslníci ve vašem oboru.
        </p>
      ) : (
        <ul className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {items.map((x) => {
            const portfolio = x.worker.portfolioUrl ? safeUrl(x.worker.portfolioUrl) : null;
            return (
              <li
                key={x.id}
                className="p-4 rounded-2xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#15171E] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-serif font-bold text-base text-[#111111] dark:text-white">{x.worker.name}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full border-2 border-[#111111] dark:border-stone-400 text-[11px] font-extrabold ${STATUS_CLS[x.status]}`}
                  >
                    {STATUS_LABEL[x.status]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {x.worker.crafts.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500"
                    >
                      {CRAFT_CATEGORIES.find((cat) => cat.id === c)?.label ?? c}
                    </span>
                  ))}
                </div>

                {x.worker.experienceText && (
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-300 whitespace-pre-line break-words">
                    {x.worker.experienceText}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-[#111111] dark:text-stone-200">
                  {portfolio && (
                    <a
                      href={portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Portfolio
                    </a>
                  )}
                  {x.worker.licenceNumber && (
                    <span className="inline-flex items-center gap-1.5">
                      Licence: {x.worker.licenceNumber}
                      {x.worker.licenceVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 text-[10px] font-extrabold">
                          <ShieldCheck className="w-3 h-3" />
                          ověřeno
                        </span>
                      ) : (
                        <span className="text-stone-500 dark:text-stone-400 font-semibold">(samodeklarované)</span>
                      )}
                    </span>
                  )}
                </div>

                {x.message && (
                  <blockquote className="text-xs font-semibold text-[#111111] dark:text-stone-100 border-l-4 border-[#FEF08A] pl-3 whitespace-pre-line break-words">
                    {x.message}
                  </blockquote>
                )}

                {x.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" disabled={busyId === x.id} onClick={() => void decide(x.id, 'accept')} className={primaryBtn}>
                      Přijmout
                    </button>
                    <button type="button" disabled={busyId === x.id} onClick={() => void decide(x.id, 'decline')} className={dangerBtn}>
                      Odmítnout
                    </button>
                  </div>
                )}

                {x.status === 'accepted' && x.workerContact && (
                  <ContactBox
                    title="Kontakt na řemeslníka"
                    name={x.workerContact.name}
                    email={x.workerContact.email}
                    phone={x.workerContact.phone}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
};
