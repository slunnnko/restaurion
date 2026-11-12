'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { InviteOptionJob, PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { formatRange } from '@/lib/format';
import { ModalShell, ErrorBox, FieldError, textareaCls, labelCls, primaryBtn, secondaryBtn } from './ui';
import { Calendar } from 'lucide-react';

const MAX_MESSAGE = 500;

interface InviteModalProps {
  /** Nabídka „Nabízím se“, které se posílá poptávka. */
  offer: PublicJob;
  onClose: () => void;
  /** Po odeslání poptávky, aby si nástěnka obnovila data. */
  onSent: () => void;
  /** API vrátilo 400 profile=name: otevřít profil. */
  onNeedProfile: () => void;
  /** Otevře formulář nové poptávky jen pro autora nabídky. */
  onCreateDirect: (offer: PublicJob) => void;
}

const labelFor = (id: string) => CRAFT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
const mutedCls = 'text-xs font-semibold text-stone-600 dark:text-stone-400';

export const InviteModal: React.FC<InviteModalProps> = ({ offer, onClose, onSent, onNeedProfile, onCreateDirect }) => {
  const [jobs, setJobs] = useState<InviteOptionJob[] | null>(null);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const authorName = offer.poster.name;
  const length = [...message].length;
  const tooLong = length > MAX_MESSAGE;

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<{ jobs: InviteOptionJob[] }>(`/api/jobs/${encodeURIComponent(offer.id)}/invite-options`);
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tvoje inzeráty se nepodařilo načíst.');
      setJobs((prev) => prev ?? []);
    }
  }, [offer.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const send = async (job: InviteOptionJob) => {
    if (tooLong) return;
    setBusyId(job.id);
    setError('');
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}/invite`, {
        method: 'POST',
        body: { offerId: offer.id, ...(message.trim() ? { message: message.trim() } : {}) },
      });
      onSent();
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.profile === 'name') {
        onNeedProfile();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Poptávku se nepodařilo odeslat.');
    } finally {
      setBusyId(null);
    }
  };

  const state = (j: InviteOptionJob) => {
    const inv = j.invite;
    if (!inv) return null;
    if (inv.status === 'declined') return { label: 'Odmítl', again: false };
    if (inv.status === 'accepted') return { label: 'Potvrzeno', again: false };
    if (inv.status === 'pending') return inv.unconfirmed ? { label: 'Nepotvrzeno', again: true } : { label: 'Čeká na potvrzení', again: false };
    return null; // withdrawn / cancelled: can be sent again like a new one
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg" labelledBy="invite-title">
      <div className="mb-4 pr-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
          Poptat spolupráci
        </span>
        <h2 id="invite-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white break-words">
          {authorName}
        </h2>
        <p className={`${mutedCls} mt-1`}>Vyber svůj inzerát, který se mu pošle. Na potvrzení má 3 dny.</p>
      </div>

      <div className="space-y-3">
        {error && <ErrorBox message={error} />}

        <div>
          <label htmlFor="invite-message" className={labelCls}>
            Zpráva (nepovinné)
          </label>
          <textarea
            id="invite-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={textareaCls}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <FieldError message={tooLong ? 'Nejvýše 500 znaků.' : undefined} />
            <span className="ml-auto text-[11px] font-bold text-stone-600 dark:text-stone-400">
              {length}/{MAX_MESSAGE}
            </span>
          </div>
        </div>

        {jobs === null ? (
          <p className={mutedCls}>Načítám tvoje inzeráty…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm font-bold text-stone-700 dark:text-stone-300">Nemáš inzerát, který by se hodil.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((j) => {
              const st = state(j);
              return (
                <li
                  key={j.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#262933]"
                >
                  <div className="min-w-0">
                    <div className="font-serif font-bold text-sm text-[#111111] dark:text-white break-words">{j.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {formatRange(j.dateFrom, j.dateTo)}
                      </span>
                      <span className="break-words">{j.crafts.map(labelFor).join(', ')}</span>
                      {j.visibility === 'direct' && <span>Jen pro tebe</span>}
                    </div>
                    {st && (
                      <div className={`mt-1 text-xs font-extrabold ${st.label === 'Odmítl' ? 'text-stone-500 dark:text-stone-400' : 'text-[#111111] dark:text-stone-100'}`}>
                        {st.label}
                      </div>
                    )}
                  </div>
                  {(!st || st.again) && (
                    <button
                      type="button"
                      disabled={busyId !== null || tooLong}
                      onClick={() => void send(j)}
                      className={`${primaryBtn} shrink-0`}
                    >
                      {st?.again ? 'Poslat znovu' : 'Poslat'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-1 border-t-2 border-[#111111]/15 dark:border-stone-700">
          <button type="button" onClick={() => onCreateDirect(offer)} className={`${secondaryBtn} w-full mt-3`}>
            Vytvořit poptávku jen pro {authorName}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
