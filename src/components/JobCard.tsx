'use client';

import React, { useState } from 'react';
import { PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { formatRange, formatShortDay, pluralDays, rewardDisplay } from '@/lib/format';
import { ContactsOrLogin, ErrorBox, ContactButton, NoDealButton, primaryBtn, dangerBtn } from './ui';
import { engagementBadge } from './engagementStatus';
import { ActionMenu, MenuAction, iconBtn } from './ActionMenu';
import { InterestedList, PersonChip } from './InterestedList';
import { WithdrawModal } from './WithdrawModal';
import { MapPin, Calendar, Coins, ShieldCheck, Church, ArrowRight, UserCheck, Pencil, Trash2, X } from 'lucide-react';
import { HammerLogo } from './HammerLogo';

interface JobCardProps {
  job: PublicJob;
  highlighted?: boolean;
  onRespond: (job: PublicJob) => void;
  onWithdraw: (job: PublicJob, reason?: string) => Promise<void>;
  onCloseJob: (job: PublicJob) => Promise<void>;
  /** Po přijetí / odmítnutí zájemce, aby si nástěnka obnovila data. */
  onChanged: () => void;
  onEdit: (job: PublicJob) => void;
  onLogin: () => void;
  /** Jméno přihlášeného (čip vlastního zájmu). */
  viewerName?: string;
  /** Správce (ADMIN_EMAILS) smí smazat jakýkoli inzerát. */
  isAdmin?: boolean;
  onDeleteJob?: (job: PublicJob) => Promise<void>;
}

const tileShadowBorder = 'border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';

// subcontract_needed: smaragdová + kladívko; guarantor_needed: korálová + štít; craftsman_available: modrá + človíček (závazný design contract)
const TYPE_INFO = {
  subcontract_needed: {
    label: 'Hledám subdodavatele',
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 font-extrabold',
    iconColorClass: 'text-emerald-700 dark:text-emerald-400',
    tileClass: `bg-emerald-600 text-white ${tileShadowBorder}`,
    topStripClass: 'bg-emerald-500',
    icon: HammerLogo,
  },
  guarantor_needed: {
    label: 'Hledám zaštítění licencí MK ČR',
    badgeClass:
      'bg-[#FFE4DE] dark:bg-[#4A180D] text-[#7C1D0B] dark:text-[#FFB4A2] border-2 border-[#111111] dark:border-[#FF5733]/70 font-extrabold',
    iconColorClass: 'text-[#E03E1A] dark:text-[#FF7F66]',
    tileClass: `bg-[#FF5733] text-white ${tileShadowBorder}`,
    topStripClass: 'bg-[#FF5733]',
    icon: ShieldCheck,
  },
  craftsman_available: {
    label: 'Nabízím se',
    badgeClass:
      'bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD] border-2 border-[#111111] dark:border-[#2563EB]/70 font-extrabold',
    iconColorClass: 'text-[#2563EB] dark:text-[#93C5FD]',
    tileClass: `bg-[#2563EB] text-white ${tileShadowBorder}`,
    topStripClass: 'bg-[#2563EB]',
    icon: UserCheck,
  },
} as const;

export const JobCard: React.FC<JobCardProps> = ({
  job,
  highlighted = false,
  onRespond,
  onWithdraw,
  onCloseJob,
  onChanged,
  onEdit,
  onLogin,
  viewerName = '',
  isAdmin = false,
  onDeleteJob,
}) => {
  const [busy, setBusy] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const isCulturalMonument =
    job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';
  const info = TYPE_INFO[job.jobType] ?? TYPE_INFO.subcontract_needed;
  const BadgeIcon = info.icon;
  const eng = job.myEngagement;
  const engStatus = eng?.status;
  const isOffer = job.jobType === 'craftsman_available';
  const reward = rewardDisplay(job);
  // D38: karta, o kterou mám zájem (čekající / přijatý), je zvýrazněná; odmítnutý a odstoupený zájem ne.
  // D40: pozvánka od zadavatele (initiatedBy 'poster'); po lhůtě je „Nepotvrzeno“ a nepočítá se jako zájem.
  const isInvitedToMe = !job.isMine && !isOffer && eng?.initiatedBy === 'poster' && engStatus === 'pending';
  const inviteExpired = isInvitedToMe && eng?.unconfirmed === true;
  const contacted = engStatus === 'pending' && !!eng?.contactedAt;
  // D41: contact was established and then ended ("Nedohodli jsme se") by either side.
  const noDeal = !job.isMine && !isOffer && !!eng?.contactedAt && (engStatus === 'declined' || engStatus === 'withdrawn');
  const invites = job.myInvites ?? [];
  const inviteState: 'pending' | 'accepted' | null = !isOffer
    ? null
    : invites.some((i) => i.status === 'pending' && !i.unconfirmed)
      ? 'pending'
      : invites.some((i) => i.status === 'accepted')
        ? 'accepted'
        : null;
  const legacyInterest =
    !job.isMine && (engStatus === 'pending' || engStatus === 'accepted') && !inviteExpired ? engStatus : null;
  const myInterest = isOffer && !job.isMine ? (legacyInterest ?? inviteState) : legacyInterest;
  const [actionError, setActionError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const decideInvite = (action: 'accept' | 'decline' | 'contact' | 'no_deal') =>
    run(async () => {
      setActionError('');
      try {
        await api(`/api/engagements/${encodeURIComponent(eng?.id ?? '')}`, { method: 'POST', body: { action } });
        onChanged();
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : 'Akci se nepodařilo provést.');
      }
    });

  const handleClose = () => {
    if (!window.confirm('Opravdu chceš inzerát ukončit? Zmizí z nástěnky.')) return;
    void run(() => onCloseJob(job));
  };

  const handleDelete = () => {
    if (!onDeleteJob) return;
    if (!window.confirm('Smazat inzerát? Zájemci dostanou upozornění.')) return;
    void run(() => onDeleteJob(job));
  };

  const canDelete = isAdmin && Boolean(onDeleteJob);
  // D37: akce vlastníka / správce jsou jedna ikona (ActionMenu); jedna akce se spustí rovnou.
  const actions: MenuAction[] = [];
  if (job.isMine && job.status === 'active') {
    actions.push({ key: 'edit', label: 'Upravit', icon: Pencil, onSelect: () => onEdit(job), disabled: busy });
    actions.push({ key: 'close', label: 'Ukončit', icon: X, onSelect: handleClose, disabled: busy });
  }
  if (canDelete) {
    actions.push({ key: 'delete', label: 'Smazat', icon: Trash2, danger: true, onSelect: handleDelete, disabled: busy });
  }
  // Místo vpravo nahoře pro ikonu, aby nepřekrývala odznaky.
  const badgesPad = actions.length > 0 ? 'pr-11' : '';

  const labelFor = (id: string) => CRAFT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <article
      id={`job-${job.id}`}
      className={`relative rounded-2xl transition-all duration-150 flex flex-col justify-between overflow-hidden group bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-500 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000] ${
        highlighted
          ? 'ring-4 ring-[#FF5733] ring-offset-2 ring-offset-[#FAF6EB] dark:ring-offset-[#121318]'
          : myInterest === 'pending'
            ? 'ring-4 ring-[#FEF08A]/80'
            : myInterest === 'accepted'
              ? 'ring-4 ring-emerald-500/70'
              : ''
      }`}
    >
      {actions.length > 0 && (
        <div className="absolute top-8 right-5 z-10">
          <ActionMenu triggerIcon={Pencil} triggerLabel="Upravit inzerát" actions={actions} />
        </div>
      )}
      <div>
        <div className={`h-2.5 w-full border-b-2 border-[#111111] dark:border-stone-500 ${info.topStripClass}`} />
        {job.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={job.imageUrl}
            alt={job.title}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover border-b-2 border-[#111111] dark:border-stone-500 bg-stone-200 dark:bg-[#252834]"
          />
        )}

        <div className="p-5 pb-0">
          <div className={`flex flex-wrap items-center gap-2 mb-3.5 ${badgesPad}`}>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${info.badgeClass}`}>
              <BadgeIcon className={`w-3.5 h-3.5 ${info.iconColorClass}`} />
              <span>{info.label}</span>
            </span>

            {isCulturalMonument && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]"
                title="Vyžaduje odpovědnost a podpis licencovaného restaurátora dle zákona č. 20/1987 Sb."
              >
                <Church className="w-3.5 h-3.5 text-[#111111] shrink-0" />
                <span>{job.monumentStatus === 'national_monument' ? 'Národní kulturní památka' : 'Kulturní památka'}</span>
              </span>
            )}

            {myInterest && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border-2 border-[#111111] dark:border-stone-400 ${
                  myInterest === 'accepted'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200'
                    : 'bg-[#FEF08A] text-[#111111]'
                }`}
              >
                {myInterest === 'accepted' ? (isOffer ? 'Poptáno' : 'Přijat') : isOffer ? 'Poptáno' : isInvitedToMe ? 'Pozvánka' : 'Mám zájem'}
              </span>
            )}

            {job.isMine && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white dark:bg-[#252834] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-400">
                Můj inzerát
              </span>
            )}
          </div>

          <div className="flex items-start gap-3.5 mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${info.tileClass}`} title={info.label}>
              <BadgeIcon className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111] dark:text-white leading-snug break-words min-w-0">
              {job.title}
            </h3>
          </div>

          {job.monumentName && (
            <div className="text-xs font-extrabold text-[#111111] dark:text-[#FEF08A] bg-[#FEF08A]/50 dark:bg-[#FEF08A]/10 px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/40 mb-3 flex flex-wrap items-center gap-1.5">
              <Church className="w-3.5 h-3.5 shrink-0 text-[#111111] dark:text-[#FEF08A]" />
              <span>{job.monumentName}</span>
            </div>
          )}

          {job.description?.trim() && (
            <p className="text-sm text-stone-800 dark:text-stone-300 line-clamp-3 mb-4 leading-relaxed font-medium">
              {job.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.crafts.map((craft) => (
              <span
                key={craft}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FFFDF7] dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-2 border-[#111111] dark:border-stone-500"
              >
                {labelFor(craft)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pt-3.5 border-t-2 border-[#111111]/15 dark:border-stone-700 bg-[#FFFDF7]/60 dark:bg-[#15171E]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-stone-800 dark:text-stone-300 mb-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-stone-400 shrink-0" />
            <span className="font-extrabold text-[#111111] dark:text-white">{job.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#111111] dark:text-stone-400 shrink-0" />
            <span className="font-semibold">
              {isOffer ? 'Volno' : 'Termín'}: {formatRange(job.dateFrom, job.dateTo)}
            </span>
          </div>
        </div>

        {!isOffer && !job.isMine && job.myBusyDays !== undefined && job.myBusyDays > 0 && (
          <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 border-2 border-[#111111] dark:border-[#FEF08A]/50 text-[11px] font-extrabold text-[#111111] dark:text-[#FEF08A]">
            V tomto termínu máš {pluralDays(job.myBusyDays)} obsazeno
          </div>
        )}

        {/* Odměna – vždy plně čitelná, nikdy se nezkracuje */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#111111] dark:border-emerald-500/50 text-xs mb-3.5">
          <Coins className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 leading-snug">
            <span className="text-[11px] font-bold text-stone-600 dark:text-emerald-300/80 mr-1.5">{isOffer ? 'Moje sazba:' : 'Odměna:'}</span>
            <span className="font-extrabold text-emerald-950 dark:text-emerald-200 break-words">
              {reward.headline}
            </span>
            {reward.scope && (
              <p className="mt-1 font-medium text-stone-800 dark:text-emerald-100/90 whitespace-pre-line break-words">{reward.scope}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-2.5 text-xs min-w-0">
          <span className="font-extrabold text-[#111111] dark:text-white truncate">{job.poster.name}</span>
        </div>

        {/* Kontakty zadavatele: přihlášený je vidí hned, anonym dostane tlačítko přihlášení */}
        {!job.isMine && (
          <div className="mb-3">
            <ContactsOrLogin contact={job.posterContact} onLogin={onLogin} />
          </div>
        )}

        {/* Akce */}
        {job.isMine ? (
          <InterestedList job={job} onChanged={onChanged} showHeading />
        ) : engStatus === 'declined' ? (
          // D40: odmítnutý zájem (z obou stran) nemá čip ani tlačítko; opakovaná reakce by skončila 409.
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400">
            {noDeal ? 'Nedohodli jste se.' : 'Zadavatel u tohoto inzerátu vybral jinak.'}
          </div>
        ) : isInvitedToMe ? (
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Pozvánka od zadavatele
            </div>
            {inviteExpired ? (
              <>
                <div className="mb-2 text-xs font-bold text-stone-600 dark:text-stone-400">
                  Nepotvrzeno – lhůta vypršela. Ozvi se zadavateli.
                </div>
                <ContactButton disabled={busy} onClick={() => void decideInvite('contact')} />
              </>
            ) : (
              <>
                {contacted ? (
                  <div className="mb-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full border-2 border-[#111111] dark:border-stone-400 text-[11px] font-extrabold ${
                        engagementBadge({ status: 'pending', contactedAt: eng?.contactedAt }).cls
                      }`}
                    >
                      Kontakt navázán
                    </span>
                  </div>
                ) : (
                  eng?.respondBy && (
                    <div className="mb-2 text-xs font-extrabold text-[#111111] dark:text-stone-100">
                      Potvrď do {formatShortDay(eng.respondBy)}
                    </div>
                  )
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy} onClick={() => void decideInvite('accept')} className={primaryBtn}>
                    Přijmout
                  </button>
                  {contacted ? (
                    <NoDealButton disabled={busy} onConfirm={() => void decideInvite('no_deal')} />
                  ) : (
                    <>
                      <button type="button" disabled={busy} onClick={() => void decideInvite('decline')} className={dangerBtn}>
                        Odmítnout
                      </button>
                      <ContactButton disabled={busy} onClick={() => void decideInvite('contact')} />
                    </>
                  )}
                </div>
              </>
            )}
            {actionError && (
              <div className="mt-2">
                <ErrorBox message={actionError} />
              </div>
            )}
          </div>
        ) : isOffer ? (
          <div className="space-y-3">
            {(engStatus === 'pending' || engStatus === 'accepted') && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Tvůj zájem
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PersonChip name={viewerName || 'Ty'} />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setWithdrawOpen(true)}
                    aria-label="Zrušit zájem"
                    title="Zrušit zájem"
                    className={`${iconBtn} bg-white dark:bg-[#252834] hover:bg-red-100 dark:hover:bg-red-950/60 text-[#111111] dark:text-white`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {invites.length > 0 && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Tvůj zájem
                </div>
                <ul className="flex flex-wrap gap-2">
                  {invites.map((i) => (
                    <li
                      key={i.engagementId}
                      className="inline-flex items-center gap-2 min-h-10 px-3 py-1 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#262933] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] text-xs font-extrabold text-[#111111] dark:text-white"
                    >
                      <span className="truncate max-w-[11rem]">{i.jobTitle}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full border-2 border-[#111111] dark:border-stone-400 text-[10px] font-extrabold ${
                          engagementBadge({ ...i, initiatedBy: 'poster' }).cls
                        }`}
                      >
                        {engagementBadge({ ...i, initiatedBy: 'poster' }).label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRespond(job)}
              className="inline-flex items-center justify-center gap-1.5 w-full min-h-12 px-4 py-2 rounded-xl text-sm sm:text-base font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] active:scale-95 transition-all cursor-pointer"
            >
              <span>Poptat spolupráci</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : engStatus === 'pending' || engStatus === 'accepted' ? (
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Tvůj zájem
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PersonChip name={viewerName || 'Ty'} badge={engagementBadge({ status: engStatus, contactedAt: eng?.contactedAt })} />
              {engStatus === 'pending' && !contacted && <ContactButton small disabled={busy} onClick={() => void decideInvite('contact')} />}
              {contacted ? (
                <NoDealButton small disabled={busy} onConfirm={() => void decideInvite('no_deal')} />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setWithdrawOpen(true)}
                  aria-label="Odstoupit"
                  title="Odstoupit"
                  className={`${iconBtn} bg-white dark:bg-[#252834] hover:bg-red-100 dark:hover:bg-red-950/60 text-[#111111] dark:text-white`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {actionError && (
              <div className="mt-2">
                <ErrorBox message={actionError} />
              </div>
            )}
            {engStatus === 'accepted' && (
              <div className="mt-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">Zadavatel tě přijal</div>
            )}
          </div>
        ) : (
          <div>
            {noDeal && <div className="mb-2 text-xs font-bold text-stone-500 dark:text-stone-400">Nedohodli jste se.</div>}
            <button
              type="button"
              onClick={() => onRespond(job)}
              className="inline-flex items-center justify-center gap-1.5 w-full min-h-12 px-4 py-2 rounded-xl text-sm sm:text-base font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] active:scale-95 transition-all cursor-pointer"
            >
              <span>Mám zájem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {withdrawOpen && (
        <WithdrawModal
          isOffer={isOffer}
          onClose={() => setWithdrawOpen(false)}
          onConfirm={(reason) => onWithdraw(job, reason || undefined)}
        />
      )}
    </article>
  );
};
