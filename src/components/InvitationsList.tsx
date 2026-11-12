'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Invitation, MvpJobType } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { formatRange, formatShortDay, rewardDisplay } from '@/lib/format';
import { ErrorBox, ContactLinks, primaryBtn, secondaryBtn, dangerBtn } from './ui';
import { WithdrawModal } from './WithdrawModal';
import { HammerLogo } from './HammerLogo';
import { ShieldCheck, UserCheck, Calendar, MapPin, Coins } from 'lucide-react';

interface InvitationsListProps {
  /** Po rozhodnutí, aby si nástěnka a profil obnovily data. */
  onChanged: () => void;
  /** Seznam se po načtení hlásí, jestli je neprázdný (sekce se u prázdného seznamu nezobrazí). */
  onLoaded?: (count: number) => void;
}

// Barva a ikona podle závazného design contractu (docs/UI-DESIGN.md).
const TYPE_INFO: Record<MvpJobType, { label: string; icon: React.ComponentType<{ className?: string }>; tile: string }> = {
  subcontract_needed: { label: 'Hledám subdodavatele', icon: HammerLogo, tile: 'bg-emerald-600' },
  guarantor_needed: { label: 'Hledám zaštítění licencí MK ČR', icon: ShieldCheck, tile: 'bg-[#FF5733]' },
  craftsman_available: { label: 'Nabízím se', icon: UserCheck, tile: 'bg-[#2563EB]' },
};

/** D40: „Poptávky pro mě“ – pozvánky, které mi zadavatelé poslali přes Poptat spolupráci. */
export const InvitationsList: React.FC<InvitationsListProps> = ({ onChanged, onLoaded }) => {
  const [items, setItems] = useState<Invitation[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<Invitation | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<{ invitations: Invitation[] }>('/api/invitations');
      setItems(data.invitations);
      onLoaded?.(data.invitations.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Poptávky se nepodařilo načíst.');
      setItems((prev) => prev ?? []);
    }
  }, [onLoaded]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const decide = async (inv: Invitation, action: 'accept' | 'decline') => {
    setBusyId(inv.engagementId);
    setError('');
    try {
      await api(`/api/engagements/${encodeURIComponent(inv.engagementId)}`, { method: 'POST', body: { action } });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Akci se nepodařilo provést.');
    } finally {
      setBusyId(null);
    }
  };

  const withdraw = async (inv: Invitation, reason: string) => {
    try {
      await api(`/api/engagements/${encodeURIComponent(inv.engagementId)}`, {
        method: 'POST',
        body: reason ? { action: 'withdraw', reason } : { action: 'withdraw' },
      });
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Odstoupení se nepodařilo.');
    }
    await load();
    onChanged();
  };

  if (items === null) return <p className="text-sm font-bold text-stone-600 dark:text-stone-300">Načítám…</p>;

  return (
    <div className="space-y-3">
      {error && <ErrorBox message={error} onRetry={() => void load()} />}
      <ul className="space-y-3">
        {items.map((inv) => {
          const job = inv.job;
          const info = TYPE_INFO[job.jobType] ?? TYPE_INFO.subcontract_needed;
          const Icon = info.icon;
          const reward = rewardDisplay(job);
          const confirmable = inv.status === 'pending' && !inv.unconfirmed;
          return (
            <li
              key={inv.engagementId}
              className="rounded-2xl border-2 border-[#111111] dark:border-stone-500 p-3.5 bg-white dark:bg-[#1C1E26] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000]"
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
                      Termín: {formatRange(job.dateFrom, job.dateTo)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {job.city}
                    </span>
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Coins className="w-3.5 h-3.5 shrink-0" />
                      <span className="break-words">{reward.headline}</span>
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-extrabold text-[#111111] dark:text-white break-words">{job.poster.name}</div>
                </div>
              </div>

              {inv.message && (
                <blockquote className="mt-2 text-xs font-semibold text-[#111111] dark:text-stone-100 border-l-4 border-[#FEF08A] pl-3 whitespace-pre-line break-words">
                  {inv.message}
                </blockquote>
              )}

              <div className="mt-2.5 text-xs font-extrabold text-[#111111] dark:text-stone-100">
                {inv.status === 'accepted' ? (
                  <span className="text-emerald-800 dark:text-emerald-300">Potvrzeno</span>
                ) : inv.unconfirmed ? (
                  <span className="text-stone-600 dark:text-stone-400">Nepotvrzeno – lhůta vypršela</span>
                ) : (
                  <span>Potvrď do {formatShortDay(inv.respondBy)}</span>
                )}
              </div>

              {job.posterContact && (
                <div className="mt-2">
                  <ContactLinks contact={job.posterContact} />
                </div>
              )}

              {(confirmable || inv.status === 'accepted') && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {confirmable ? (
                    <>
                      <button type="button" disabled={busyId !== null} onClick={() => void decide(inv, 'accept')} className={primaryBtn}>
                        Přijmout
                      </button>
                      <button type="button" disabled={busyId !== null} onClick={() => void decide(inv, 'decline')} className={dangerBtn}>
                        Odmítnout
                      </button>
                    </>
                  ) : (
                    <button type="button" disabled={busyId !== null} onClick={() => setWithdrawing(inv)} className={secondaryBtn}>
                      Odstoupit
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {withdrawing && (
        <WithdrawModal
          isOffer={false}
          onClose={() => setWithdrawing(null)}
          onConfirm={(reason) => withdraw(withdrawing, reason)}
        />
      )}
    </div>
  );
};
