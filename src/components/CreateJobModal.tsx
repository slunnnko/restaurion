'use client';

import React, { useState } from 'react';
import { MvpJobType, MvpMonumentStatus, PublicJob, RewardCurrency, RewardType } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES, toCraftIds } from '@/lib/crafts';
import { REGIONS } from '@/lib/regions';
import { pluralCraftsmen, todayIso } from '@/lib/format';
import {
  ModalShell,
  ErrorBox,
  FieldError,
  SelectBox,
  Pill,
  inputCls,
  DateInput,
  textareaCls,
  labelCls,
  primaryBtn,
  secondaryBtn,
} from './ui';
import { HammerLogo } from './HammerLogo';
import { ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';

interface CreateJobModalProps {
  onClose: () => void;
  /** Po úspěšném vytvoření (nástěnka se znovu načte). */
  onCreated: () => void;
  /** API vrátilo 400 profile=name: otevřít profil. */
  onNeedProfile: () => void;
  /** Předvybraný typ (např. na záložce Nabízím se). */
  initialType?: MvpJobType;
  /** Režim úprav: předvyplní pole, typ inzerátu je neměnný, odesílá PATCH jen se změněnými poli. */
  editJob?: PublicJob;
  /** Po úspěšném uložení úprav (seznam i nástěnka se znovu načtou). */
  onSaved?: () => void;
}

const JOB_TYPES: { id: MvpJobType; label: string; hint: string }[] = [
  { id: 'subcontract_needed', label: 'Hledám subdodavatele', hint: 'Potřebuji výpomoc nebo subdodávku' },
  { id: 'guarantor_needed', label: 'Hledám zaštítění licencí MK ČR', hint: 'Potřebuji restaurátora s licencí' },
  { id: 'craftsman_available', label: 'Nabízím se', hint: 'Mám volno a nabízím své služby' },
];

const REWARD_TYPES: { id: RewardType; label: string }[] = [
  { id: 'negotiable', label: 'Dohodou' },
  { id: 'hourly', label: 'Hodinová sazba' },
  { id: 'fixed', label: 'Za celou práci' },
];

const TYPE_STYLE: Record<MvpJobType, { icon: React.ComponentType<{ className?: string }>; tile: string }> = {
  subcontract_needed: { icon: HammerLogo, tile: 'bg-emerald-600' },
  guarantor_needed: { icon: ShieldCheck, tile: 'bg-[#FF5733]' },
  craftsman_available: { icon: UserCheck, tile: 'bg-[#2563EB]' },
};

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  onClose,
  onCreated,
  onNeedProfile,
  initialType,
  editJob,
  onSaved,
}) => {
  const today = todayIso();
  const isEdit = Boolean(editJob);
  const [jobType, setJobType] = useState<MvpJobType>(editJob?.jobType ?? initialType ?? 'subcontract_needed');
  const [title, setTitle] = useState(editJob?.title ?? '');
  const [crafts, setCrafts] = useState<string[]>(editJob ? toCraftIds(editJob.crafts) : []);
  const [region, setRegion] = useState(editJob?.region ?? REGIONS[0]);
  const [city, setCity] = useState(editJob?.city ?? '');
  const [dateFrom, setDateFrom] = useState(editJob?.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(editJob?.dateTo ?? '');
  const [monumentStatus, setMonumentStatus] = useState<MvpMonumentStatus>(editJob?.monumentStatus ?? 'cultural_monument');
  const [monumentName, setMonumentName] = useState(editJob?.monumentName ?? '');
  // Legacy row: free-text budgetNote, no structured reward. Nothing is selected until the user picks a type.
  const legacyNote =
    editJob && !editJob.reward && editJob.budgetNote.trim() !== '' && !['Dle dohody', 'Dohodou'].includes(editJob.budgetNote.trim())
      ? editJob.budgetNote
      : null;
  const [rewardType, setRewardType] = useState<RewardType | null>(legacyNote ? null : (editJob?.reward?.type ?? 'negotiable'));
  const [rewardAmount, setRewardAmount] = useState(editJob?.reward?.amount !== undefined ? String(editJob.reward.amount) : '');
  const [rewardCurrency, setRewardCurrency] = useState<RewardCurrency>(editJob?.reward?.currency ?? 'CZK');
  const [rewardScope, setRewardScope] = useState(editJob?.reward?.scope ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notified, setNotified] = useState<number | null>(null);
  const isOffer = jobType === 'craftsman_available';

  /** Reward part of the request body; negotiable sends the type only. */
  const rewardBody = (): Record<string, unknown> =>
    rewardType === null
      ? {}
      : rewardType === 'negotiable'
      ? { rewardType }
      : {
          rewardType,
          rewardAmount: rewardAmount.trim() === '' ? undefined : Number(rewardAmount),
          rewardCurrency,
          rewardScope: rewardScope.trim(),
        };

  const toggleCraft = (id: string) =>
    setCrafts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setFieldErrors({});
    setBusy(true);
    try {
      if (editJob) {
        const origCrafts = toCraftIds(editJob.crafts);
        const body: Record<string, unknown> = {};
        if (title.trim() !== editJob.title) body.title = title.trim();
        if (crafts.length !== origCrafts.length || crafts.some((c) => !origCrafts.includes(c))) body.crafts = crafts;
        if (region !== editJob.region) body.region = region;
        if (city.trim() !== editJob.city) body.city = city.trim();
        if (dateFrom && dateFrom !== editJob.dateFrom) body.dateFrom = dateFrom;
        if (dateTo && dateTo !== editJob.dateTo) body.dateTo = dateTo;
        const orig = editJob.reward;
        const rewardChanged =
          rewardType !== null &&
          (legacyNote !== null ||
          rewardType !== (orig?.type ?? 'negotiable') ||
          (rewardType !== 'negotiable' &&
            (Number(rewardAmount) !== orig?.amount ||
              rewardCurrency !== (orig?.currency ?? 'CZK') ||
              rewardScope.trim() !== (orig?.scope ?? ''))));
        if (rewardChanged) Object.assign(body, rewardBody());
        if (Object.keys(body).length > 0) {
          await api<{ job: PublicJob }>(`/api/jobs/${encodeURIComponent(editJob.id)}`, { method: 'PATCH', body });
          onSaved?.();
        }
        onClose();
        return;
      }
      const data = await api<{ job: PublicJob; notified: number }>('/api/jobs', {
        method: 'POST',
        body: {
          title: title.trim(),
          description: '',
          jobType,
          ...(isOffer ? {} : { monumentStatus, monumentName: monumentName.trim() || undefined }),
          crafts,
          region,
          city: city.trim(),
          dateFrom,
          dateTo,
          ...rewardBody(),
        },
      });
      setNotified(data.notified);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.profile === 'name') {
        onNeedProfile();
        return;
      }
      if (err instanceof ApiError) {
        setError(err.fieldErrors && Object.keys(err.fieldErrors).length > 0 ? 'Zkontroluj zvýrazněná pole.' : err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Inzerát se nepodařilo uložit.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (notified !== null) {
    return (
      <ModalShell onClose={onClose}>
        <div className="py-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 border-2 border-[#111111] shadow-[3px_3px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#111111] dark:text-white mb-1">
            {isOffer ? 'Nabídka je venku.' : `Inzerát je venku. Upozornili jsme ${pluralCraftsmen(notified)}.`}
          </h3>
          <div className="mt-5">
            <button type="button" onClick={onClose} className={primaryBtn}>
              Zavřít
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl" labelledBy="create-title">
      <div className="mb-4 pr-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
          {isEdit ? 'Úprava' : 'Nový inzerát'}
        </span>
        <h2 id="create-title" className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
          {isEdit ? 'Upravit inzerát' : isOffer ? 'Přidat nabídku' : 'Přidat zakázku'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className={labelCls}>Typ inzerátu</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {JOB_TYPES.filter((t) => !isEdit || t.id === jobType).map((t) => {
              const selected = jobType === t.id;
              const { icon: Icon, tile } = TYPE_STYLE[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={isEdit}
                  onClick={() => setJobType(t.id)}
                  className={`flex items-center gap-3 p-3 text-left rounded-xl border-2 border-[#111111] dark:border-stone-500 transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#FEF08A] dark:bg-[#FEF08A]/20 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000]'
                      : 'bg-[#FFFDF7] dark:bg-[#121318] hover:bg-stone-100 dark:hover:bg-[#262933]'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 border-[#111111] text-white ${tile}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-[#111111] dark:text-white">{t.label}</span>
                    <span className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400">{t.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="job-title" className={labelCls}>
            Název *
          </label>
          <input
            id="job-title"
            type="text"
            required
            maxLength={120}
            placeholder="např. Obnova štukové výzdoby fasády"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
          <FieldError message={fieldErrors.title} />
        </div>

        <div>
          <span className={labelCls}>{isOffer ? 'Moje obory * (alespoň jeden)' : 'Požadované obory * (alespoň jeden)'}</span>
          <div className="flex flex-wrap gap-2">
            {CRAFT_CATEGORIES.map((c) => (
              <Pill key={c.id} checked={crafts.includes(c.id)} onChange={() => toggleCraft(c.id)}>
                {c.label}
              </Pill>
            ))}
          </div>
          <FieldError message={fieldErrors.crafts} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="job-region" className={labelCls}>
              Kraj *
            </label>
            <SelectBox id="job-region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectBox>
            <FieldError message={fieldErrors.region} />
          </div>
          <div>
            <label htmlFor="job-city" className={labelCls}>
              Město / obec *
            </label>
            <input
              id="job-city"
              type="text"
              required
              maxLength={60}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.city} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="job-from" className={labelCls}>
              {isOffer ? 'Volno od *' : 'Termín od *'}
            </label>
            <DateInput
              id="job-from"
              required
              min={editJob && editJob.dateFrom < today ? editJob.dateFrom : today}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                if (dateTo && e.target.value > dateTo) setDateTo(e.target.value);
              }}
            />
            <FieldError message={fieldErrors.dateFrom} />
          </div>
          <div>
            <label htmlFor="job-to" className={labelCls}>
              {isOffer ? 'Volno do *' : 'Termín do *'}
            </label>
            <DateInput
              id="job-to"
              required
              min={dateFrom || today}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <FieldError message={fieldErrors.dateTo} />
          </div>
        </div>

        {!isOffer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="job-monument" className={labelCls}>
              Jde o kulturní památku?
            </label>
            <SelectBox
              id="job-monument"
              value={monumentStatus}
              disabled={isEdit}
              className="disabled:opacity-60 disabled:cursor-not-allowed"
              onChange={(e) => setMonumentStatus(e.target.value as MvpMonumentStatus)}
            >
              <option value="cultural_monument">Ano – Kulturní památka (vyžaduje licenci MK)</option>
              <option value="national_monument">Ano – Národní kulturní památka</option>
              <option value="historic_unregistered">Ne – Běžný historický objekt (bez licence)</option>
              <option value="craft_work">Ne – Běžná řemeslná zakázka / replika</option>
            </SelectBox>
            <FieldError message={fieldErrors.monumentStatus} />
          </div>
          <div>
            <label htmlFor="job-monument-name" className={labelCls}>
              Název objektu (nepovinné)
            </label>
            <input
              id="job-monument-name"
              type="text"
              maxLength={120}
              placeholder="např. Zámek Lednice"
              value={monumentName}
              disabled={isEdit}
              onChange={(e) => setMonumentName(e.target.value)}
              className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
            />
            <FieldError message={fieldErrors.monumentName} />
          </div>
        </div>
        )}

        <div>
          <span className={labelCls}>{isOffer ? 'Moje sazba' : 'Odměna'}</span>
          {legacyNote && rewardType === null && (
            <p className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-300 break-words">Původní odměna: {legacyNote}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {REWARD_TYPES.map((t) => (
              <Pill key={t.id} checked={rewardType === t.id} onChange={() => setRewardType(t.id)}>
                {t.label}
              </Pill>
            ))}
          </div>
          <FieldError message={fieldErrors.rewardType} />
          {rewardType !== null && rewardType !== 'negotiable' && (
            <div className="mt-3 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="job-reward-amount" className={labelCls}>
                    {rewardType === 'hourly' ? 'Částka za hodinu *' : 'Částka za celou práci *'}
                  </label>
                  <input
                    id="job-reward-amount"
                    type="number"
                    inputMode="numeric"
                    required
                    min={1}
                    max={10000000}
                    step={1}
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    className={inputCls}
                  />
                  <FieldError message={fieldErrors.rewardAmount} />
                </div>
                <div>
                  <label htmlFor="job-reward-currency" className={labelCls}>
                    Měna
                  </label>
                  <SelectBox
                    id="job-reward-currency"
                    value={rewardCurrency}
                    onChange={(e) => setRewardCurrency(e.target.value as RewardCurrency)}
                  >
                    <option value="CZK">Kč (CZK)</option>
                    <option value="EUR">€ (EUR)</option>
                  </SelectBox>
                  <FieldError message={fieldErrors.rewardCurrency} />
                </div>
              </div>
              <div>
                <label htmlFor="job-reward-scope" className={labelCls}>
                  {rewardType === 'fixed' ? 'Co se za odměnu očekává *' : 'Co se za odměnu očekává (nepovinné)'}
                </label>
                <textarea
                  id="job-reward-scope"
                  rows={3}
                  required={rewardType === 'fixed'}
                  minLength={rewardType === 'fixed' ? 20 : undefined}
                  maxLength={1000}
                  placeholder="rozsah, množství, výstup, materiál ano/ne"
                  value={rewardScope}
                  onChange={(e) => setRewardScope(e.target.value)}
                  className={textareaCls}
                />
                <FieldError message={fieldErrors.rewardScope} />
              </div>
            </div>
          )}
        </div>

        {error && <ErrorBox message={error} />}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Zrušit
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Zveřejnit inzerát'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
