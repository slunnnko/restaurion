'use client';

import React, { useState } from 'react';
import { ContactInfo, EngagementForPoster, EngagementStatus, PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { ModalShell, ErrorBox, ContactLinks, primaryBtn, secondaryBtn, dangerBtn } from './ui';
import { iconBtn } from './ActionMenu';
import { DirectoryCard } from './DirectoryCard';
import { STATUS_CLS, STATUS_LABEL } from './engagementStatus';
import { invitationChip } from './InterestedList';
import { ArrowLeft, UserRound } from 'lucide-react';

interface EngagementDetailModalProps {
  job: PublicJob;
  engagement: EngagementForPoster;
  onClose: () => void;
  /** Po přijetí / odmítnutí. */
  onDecided: (e: EngagementForPoster) => void;
}

export const EngagementDetailModal: React.FC<EngagementDetailModalProps> = ({ job, engagement, onClose, onDecided }) => {
  const [view, setView] = useState<'detail' | 'profile'>('detail');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const isOffer = job.jobType === 'craftsman_available';
  const x = engagement;
  const isInvite = x.initiatedBy === 'poster';

  const decide = async (action: 'accept' | 'decline') => {
    setBusy(true);
    setActionError('');
    try {
      const data = await api<{ engagement: { id: string; status: EngagementStatus }; contact?: ContactInfo }>(
        `/api/engagements/${encodeURIComponent(x.id)}`,
        { method: 'POST', body: { action } }
      );
      onDecided({ ...x, status: data.engagement.status, workerContact: data.contact ?? x.workerContact });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Akci se nepodařilo provést.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl" labelledBy="engagement-title">
      <div className="mb-4 pr-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
          Zájemce
        </span>
        <div className="flex items-center gap-2.5">
          <h2 id="engagement-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white break-words min-w-0">
            {x.worker.name}
          </h2>
          <button
            type="button"
            onClick={() => setView('profile')}
            aria-label="Zobrazit profil"
            title="Profil"
            className={`${iconBtn} shrink-0 bg-[#FFFDF7] dark:bg-[#252834] text-[#111111] dark:text-white`}
          >
            <UserRound className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'profile' ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setView('detail')} className={secondaryBtn}>
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zpět na detail</span>
          </button>
          <DirectoryCard entry={{ ...x.worker, contact: x.workerContact }} onLogin={() => undefined} />
        </div>
      ) : (
        <div className="space-y-3">
          {actionError && <ErrorBox message={actionError} />}

          {!isOffer && (
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full border-2 border-[#111111] dark:border-stone-400 text-[11px] font-extrabold ${STATUS_CLS[x.status]}`}
              >
                {invitationChip(x).label ?? STATUS_LABEL[x.status]}
              </span>
            </div>
          )}

          {x.message && (
            <blockquote className="text-xs font-semibold text-[#111111] dark:text-stone-100 border-l-4 border-[#FEF08A] pl-3 whitespace-pre-line break-words">
              {x.message}
            </blockquote>
          )}

          {isInvite && x.status === 'pending' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => void decide('decline')} className={dangerBtn}>
                Zrušit poptávku
              </button>
            </div>
          )}

          {!isInvite && x.status === 'pending' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {!isOffer && (
                <button type="button" disabled={busy} onClick={() => void decide('accept')} className={primaryBtn}>
                  Přijmout
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => void decide('decline')} className={dangerBtn}>
                Odmítnout
              </button>
            </div>
          )}

          <ContactLinks contact={x.workerContact} />
        </div>
      )}
    </ModalShell>
  );
};
