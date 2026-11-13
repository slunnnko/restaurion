'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MvpJobType, MvpMonumentStatus, PublicJob, RewardCurrency, RewardType } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES, toCraftIds } from '@/lib/crafts';
import { REGIONS } from '@/lib/regions';
import { plural, pluralCraftsmen, todayIso } from '@/lib/format';
import { deleteJobPhoto, downscaleImage, setJobPhotoCaption, uploadJobPhoto } from '@/lib/image';
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
import { INVITE_RESPOND_DAYS } from '@/lib/matching';
import { MAX_DESCRIPTION, MAX_JOB_PHOTOS, MAX_PHOTO_CAPTION } from '@/lib/limits';
import { jobPhotoList, LEGACY_PHOTO_ID } from '@/lib/photos';
import { HammerLogo } from './HammerLogo';
import { ShieldCheck, CheckCircle2, UserCheck, X } from 'lucide-react';

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
  /** D40: poptávka jen pro autora této nabídky (přímý inzerát mimo nástěnku); předvyplní obory, termín a kraj z nabídky. */
  directOffer?: PublicJob;
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
  directOffer,
}) => {
  const today = todayIso();
  const isEdit = Boolean(editJob);
  const prefill = editJob ?? directOffer;
  const [jobType, setJobType] = useState<MvpJobType>(editJob?.jobType ?? (directOffer ? 'subcontract_needed' : (initialType ?? 'subcontract_needed')));
  const [title, setTitle] = useState(editJob?.title ?? '');
  const [description, setDescription] = useState(editJob?.description ?? '');
  const [crafts, setCrafts] = useState<string[]>(prefill ? toCraftIds(prefill.crafts) : []);
  const [region, setRegion] = useState(prefill?.region ?? REGIONS[0]);
  const [city, setCity] = useState(prefill?.city ?? '');
  const [dateFrom, setDateFrom] = useState(editJob ? editJob.dateFrom : directOffer ? (directOffer.dateFrom < today ? today : directOffer.dateFrom) : '');
  const [dateTo, setDateTo] = useState(prefill?.dateTo ?? '');
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
  // Photos (D45, up to 6): `newPhotos` are downscaled blobs waiting for upload; `removedIds` marks existing photos for deletion (edit).
  const existingPhotos = editJob ? jobPhotoList(editJob) : [];
  const [newPhotos, setNewPhotos] = useState<{ key: string; blob: Blob; preview: string; caption: string }[]>([]);
  // D47: edited captions of existing photos by photo id (only ids whose text differs from the saved one are PATCHed).
  const [captionEdits, setCaptionEdits] = useState<Record<string, string>>({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [photoWarning, setPhotoWarning] = useState('');
  const previewsRef = useRef<string[]>([]);
  useEffect(
    () => () => {
      previewsRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );
  const keptPhotos = existingPhotos.filter((p) => !removedIds.includes(p.id));
  const photoSlots = MAX_JOB_PHOTOS - keptPhotos.length - newPhotos.length;

  const pickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setPhotoError('');
    const accepted: { key: string; blob: Blob; preview: string; caption: string }[] = [];
    let failed = 0;
    let over = 0;
    let firstError = '';
    // Only files that downscaled successfully use up a free slot.
    for (const file of files) {
      if (accepted.length >= photoSlots) {
        over++;
        continue;
      }
      try {
        const blob = await downscaleImage(file);
        const preview = URL.createObjectURL(blob);
        previewsRef.current.push(preview);
        accepted.push({ key: preview, blob, preview, caption: '' });
      } catch (err) {
        failed++;
        firstError ||= err instanceof Error ? err.message : '';
      }
    }
    if (failed > 0 || over > 0) {
      if (failed === 1 && accepted.length === 0 && over === 0 && firstError) {
        setPhotoError(firstError);
      } else {
        const parts: string[] = [];
        if (accepted.length > 0) parts.push(`${accepted.length} ${plural(accepted.length, 'fotka přidána', 'fotky přidány', 'fotek přidáno')}`);
        if (failed > 0) parts.push(`${failed} se nepodařilo načíst`);
        if (over > 0) parts.push(`${over} se nevešlo, limit je ${MAX_JOB_PHOTOS}`);
        setPhotoError(`${parts.join(', ')}.`);
      }
    }
    if (accepted.length > 0) setNewPhotos((cur) => [...cur, ...accepted]);
  };

  const removeNewPhoto = (key: string) => {
    setNewPhotos((cur) => cur.filter((p) => p.key !== key));
    URL.revokeObjectURL(key);
    previewsRef.current = previewsRef.current.filter((u) => u !== key);
    setPhotoError('');
  };

  const removeExistingPhoto = (id: string) => {
    setRemovedIds((cur) => [...cur, id]);
    setPhotoError('');
  };

  const captionOf = (p: { id: string; caption?: string }) => captionEdits[p.id] ?? p.caption ?? '';
  const changedCaptions = keptPhotos.filter((p) => p.id !== LEGACY_PHOTO_ID && captionOf(p).trim() !== (p.caption ?? ''));
  const photosChanged = newPhotos.length > 0 || removedIds.length > 0 || changedCaptions.length > 0;

  /** Non-blocking: the listing is already saved when this fails. Deletes first (frees slots), then uploads one by one. */
  const syncPhotos = async (jobId: string): Promise<string> => {
    try {
      for (const id of removedIds) await deleteJobPhoto(jobId, id);
      let captionFailed = false;
      for (const p of changedCaptions) {
        try {
          await setJobPhotoCaption(jobId, p.id, captionOf(p));
        } catch {
          captionFailed = true;
        }
      }
      for (const p of newPhotos) {
        const { photoId } = await uploadJobPhoto(jobId, p.blob);
        // Uploaded: drop it from the pending list now, so a retry never uploads it twice.
        setNewPhotos((cur) => cur.filter((x) => x.key !== p.key));
        const caption = p.caption.trim();
        if (caption && photoId) {
          try {
            await setJobPhotoCaption(jobId, photoId, caption);
          } catch {
            captionFailed = true;
          }
        }
      }
      return captionFailed ? 'Inzerát je uložený, popisek některé fotky se nepodařilo uložit.' : '';
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) return err.message;
      return 'Inzerát je uložený, fotku se nepodařilo nahrát.';
    }
  };
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
        if (description.trim() !== (editJob.description ?? '').trim()) body.description = description.trim();
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
        }
        const warning = photosChanged ? await syncPhotos(editJob.id) : '';
        if (Object.keys(body).length > 0 || photosChanged) onSaved?.();
        if (warning) {
          setPhotoWarning(warning);
          setNotified(-1);
          return;
        }
        onClose();
        return;
      }
      const data = await api<{ job: PublicJob; notified: number }>('/api/jobs', {
        method: 'POST',
        body: {
          title: title.trim(),
          description: description.trim(),
          jobType,
          ...(isOffer ? {} : { monumentStatus, monumentName: monumentName.trim() || undefined }),
          crafts,
          region,
          city: city.trim(),
          dateFrom,
          dateTo,
          ...rewardBody(),
          ...(directOffer ? { directOfferId: directOffer.id } : {}),
        },
      });
      if (newPhotos.length > 0) setPhotoWarning(await syncPhotos(data.job.id));
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
            {isEdit ? (photoWarning ? 'Změny jsou uložené, fotka ne.' : 'Změny jsou uložené.') : directOffer ? `Poptávka je odeslaná: ${directOffer.poster.name}.` : isOffer ? 'Nabídka je venku.' : `Inzerát je venku. Upozornili jsme ${pluralCraftsmen(notified)}.`}
          </h3>
          {photoWarning && (
            <div className="mt-3 text-left">
              <ErrorBox message={photoWarning} />
            </div>
          )}
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
          {isEdit ? 'Úprava' : directOffer ? 'Poptat spolupráci' : 'Nový inzerát'}
        </span>
        <h2 id="create-title" className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
          {isEdit ? 'Upravit inzerát' : directOffer ? `Poptávka pro ${directOffer.poster.name}` : isOffer ? 'Přidat nabídku' : 'Přidat zakázku'}
        </h2>
      </div>

      {directOffer && (
        <div className="mb-4 p-3 rounded-xl bg-[#FEF08A]/70 dark:bg-[#FEF08A]/15 border-2 border-[#111111] dark:border-[#FEF08A]/50 text-xs font-extrabold text-[#111111] dark:text-[#FEF08A]">
          Poptávka se pošle jen {directOffer.poster.name} a na nástěnce nebude. Na potvrzení má {INVITE_RESPOND_DAYS} dny.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className={labelCls}>Typ inzerátu</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {JOB_TYPES.filter((t) => (!isEdit || t.id === jobType) && !(directOffer && t.id === 'craftsman_available')).map((t) => {
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
          <label htmlFor="job-description" className={labelCls}>
            Popis práce (nepovinné)
          </label>
          <textarea
            id="job-description"
            rows={5}
            maxLength={MAX_DESCRIPTION}
            placeholder="Co je třeba udělat, o jaký objekt jde, v jakém je stavu, jaký je přístup na místo…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaCls}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <FieldError message={fieldErrors.description} />
            <span className="ml-auto text-[11px] font-bold text-stone-600 dark:text-stone-400">
              {description.length} / {MAX_DESCRIPTION}
            </span>
          </div>
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
                  rows={4}
                  required={rewardType === 'fixed'}
                  minLength={rewardType === 'fixed' ? 20 : undefined}
                  maxLength={1000}
                  placeholder="rozsah, množství, výstup, materiál ano/ne"
                  value={rewardScope}
                  onChange={(e) => setRewardScope(e.target.value)}
                  className={textareaCls}
                />
                <p className="mt-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">Každou položku napiš na nový řádek.</p>
                <FieldError message={fieldErrors.rewardScope} />
              </div>
            </div>
          )}
        </div>

        <div>
          <span className={labelCls}>Fotky (nepovinné, nejvýše {MAX_JOB_PHOTOS})</span>
          <div className="flex flex-wrap items-center gap-3">
            {keptPhotos.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="Fotka inzerátu" className="w-24 h-16 object-cover rounded-xl border-2 border-[#111111] dark:border-stone-500" />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(p.id)}
                  aria-label="Odebrat fotku"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-[#111111] bg-white text-[#111111] flex items-center justify-center cursor-pointer hover:bg-red-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {p.id !== LEGACY_PHOTO_ID && (
                  <input
                    type="text"
                    value={captionOf(p)}
                    onChange={(e) => setCaptionEdits((cur) => ({ ...cur, [p.id]: e.target.value }))}
                    maxLength={MAX_PHOTO_CAPTION}
                    placeholder="Popisek (nepovinné)"
                    aria-label="Popisek fotky"
                    className="mt-1.5 w-24 sm:w-40 h-8 px-2 rounded-lg border-2 border-[#111111] dark:border-stone-500 bg-white dark:bg-[#252834] text-xs font-semibold text-[#111111] dark:text-white"
                  />
                )}
              </div>
            ))}
            {newPhotos.map((p) => (
              <div key={p.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="Náhled fotky" className="w-24 h-16 object-cover rounded-xl border-2 border-[#111111] dark:border-stone-500" />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(p.key)}
                  aria-label="Odebrat fotku"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-[#111111] bg-white text-[#111111] flex items-center justify-center cursor-pointer hover:bg-red-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={p.caption}
                  onChange={(e) => setNewPhotos((cur) => cur.map((x) => (x.key === p.key ? { ...x, caption: e.target.value } : x)))}
                  maxLength={MAX_PHOTO_CAPTION}
                  placeholder="Popisek (nepovinné)"
                  aria-label="Popisek fotky"
                  className="mt-1.5 w-24 sm:w-40 h-8 px-2 rounded-lg border-2 border-[#111111] dark:border-stone-500 bg-white dark:bg-[#252834] text-xs font-semibold text-[#111111] dark:text-white"
                />
              </div>
            ))}
            {photoSlots > 0 && (
              <label className={`${secondaryBtn} cursor-pointer`}>
                {keptPhotos.length + newPhotos.length > 0 ? 'Přidat další' : 'Vybrat fotky'}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={pickPhotos} className="sr-only" />
              </label>
            )}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            JPEG, PNG nebo WebP. Fotky se před nahráním zmenší. První fotka je na kartě.
          </p>
          {photoError && <p className="mt-1 text-xs font-bold text-red-700 dark:text-red-400">{photoError}</p>}
        </div>

        {error && <ErrorBox message={error} />}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Zrušit
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Ukládám…' : isEdit ? 'Uložit změny' : directOffer ? 'Poslat poptávku' : 'Zveřejnit inzerát'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
