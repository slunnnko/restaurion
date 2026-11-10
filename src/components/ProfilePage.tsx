'use client';

import React, { useEffect, useState } from 'react';
import { OwnProfile, UnavailabilityBlock } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { PROFILE_REGIONS } from '@/lib/regions';
import { formatRange, todayIso } from '@/lib/format';
import {
  ErrorBox,
  FieldError,
  SelectBox,
  Pill,
  ContactBox,
  cardCls,
  inputCls,
  dateInputCls,
  textareaCls,
  labelCls,
  primaryBtn,
  secondaryBtn,
  dangerBtn,
} from './ui';
import { ArrowLeft, ShieldCheck, Trash2 } from 'lucide-react';

interface ProfilePageProps {
  user: OwnProfile;
  onUserChange: (user: OwnProfile) => void;
  onBack: () => void;
  onLogout: () => Promise<void>;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label className="flex items-center gap-3 text-sm font-bold text-[#111111] dark:text-stone-100 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-5 h-5 shrink-0 accent-[#111111] dark:accent-[#FEF08A] cursor-pointer"
    />
    <span>{label}</span>
  </label>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserChange, onBack, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [region, setRegion] = useState(user.region || 'Celá ČR');
  const [crafts, setCrafts] = useState<string[]>(user.crafts);
  const [experienceText, setExperienceText] = useState(user.experienceText);
  const [portfolioUrl, setPortfolioUrl] = useState(user.portfolioUrl ?? '');
  const [licenceNumber, setLicenceNumber] = useState(user.licenceNumber ?? '');
  const [acceptingJobs, setAcceptingJobs] = useState(user.acceptingJobs);
  const [emailDigest, setEmailDigest] = useState(user.emailDigest);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [blocks, setBlocks] = useState<UnavailabilityBlock[]>(user.blocks);
  const [booked, setBooked] = useState(user.booked);
  const [blockFrom, setBlockFrom] = useState('');
  const [blockTo, setBlockTo] = useState('');
  const [blockNote, setBlockNote] = useState('');
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [blockFieldErrors, setBlockFieldErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');

  const today = todayIso();

  const refresh = async () => {
    setLoadError('');
    try {
      const data = await api<{ profile: OwnProfile }>('/api/profile');
      setBlocks(data.profile.blocks);
      setBooked(data.profile.booked);
      onUserChange(data.profile);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Profil se nepodařilo načíst.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // jednou při otevření
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCraft = (id: string) =>
    setCrafts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    setFieldErrors({});
    try {
      const data = await api<{ profile: OwnProfile }>('/api/profile', {
        method: 'PUT',
        body: {
          name: name.trim(),
          phone: phone.trim(),
          region,
          crafts,
          experienceText: experienceText.trim(),
          portfolioUrl: portfolioUrl.trim(),
          licenceNumber: licenceNumber.trim(),
          acceptingJobs,
          emailDigest,
        },
      });
      onUserChange(data.profile);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.fieldErrors && Object.keys(err.fieldErrors).length > 0 ? 'Zkontroluj zvýrazněná pole.' : err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setSaveError('Profil se nepodařilo uložit.');
      }
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockBusy) return;
    setBlockBusy(true);
    setBlockError('');
    setBlockFieldErrors({});
    try {
      const data = await api<{ block: UnavailabilityBlock }>('/api/availability', {
        method: 'POST',
        body: { dateFrom: blockFrom, dateTo: blockTo, note: blockNote.trim() || undefined },
      });
      setBlocks((prev) => [...prev, data.block].sort((a, b) => a.dateFrom.localeCompare(b.dateFrom)));
      setBlockFrom('');
      setBlockTo('');
      setBlockNote('');
    } catch (err) {
      if (err instanceof ApiError) {
        setBlockError(err.message);
        setBlockFieldErrors(err.fieldErrors ?? {});
      } else {
        setBlockError('Termín se nepodařilo uložit.');
      }
    } finally {
      setBlockBusy(false);
    }
  };

  const removeBlock = async (id: string) => {
    setBlockError('');
    try {
      await api(`/api/availability/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setBlockError(err instanceof ApiError ? err.message : 'Termín se nepodařilo smazat.');
    }
  };

  const sectionTitle = 'font-serif text-lg font-bold text-[#111111] dark:text-white mb-3';

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={secondaryBtn}>
          <ArrowLeft className="w-4 h-4" />
          <span>Zpět na nástěnku</span>
        </button>
        <button type="button" onClick={() => void onLogout()} className={dangerBtn}>
          Odhlásit
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-[#FEF08A]/70 dark:bg-[#FEF08A]/15 border-2 border-[#111111] dark:border-[#FEF08A]/50 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-[#FEF08A]">
        Zakázky ti chodí vždy, kromě termínů, které máš obsazené nebo označené jako nedostupné.
      </div>

      {loadError && <ErrorBox message={loadError} onRetry={() => void refresh()} />}

      <form onSubmit={save} className={`${cardCls} p-5 sm:p-6 space-y-4`}>
        <h2 className={sectionTitle}>Můj profil</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="pf-name" className={labelCls}>
              Jméno
            </label>
            <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            <FieldError message={fieldErrors.name} />
          </div>
          <div>
            <label htmlFor="pf-email" className={labelCls}>
              E-mail
            </label>
            <input
              id="pf-email"
              type="email"
              value={user.email}
              readOnly
              className={`${inputCls} opacity-70 cursor-not-allowed`}
            />
          </div>
          <div>
            <label htmlFor="pf-phone" className={labelCls}>
              Telefon
            </label>
            <input
              id="pf-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.phone} />
          </div>
          <div>
            <label htmlFor="pf-region" className={labelCls}>
              Region
            </label>
            <SelectBox id="pf-region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {PROFILE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectBox>
            <FieldError message={fieldErrors.region} />
          </div>
        </div>

        <div>
          <span className={labelCls}>Obory</span>
          <div className="flex flex-wrap gap-2">
            {CRAFT_CATEGORIES.map((c) => (
              <Pill key={c.id} checked={crafts.includes(c.id)} onChange={() => toggleCraft(c.id)}>
                {c.label}
              </Pill>
            ))}
          </div>
          <FieldError message={fieldErrors.crafts} />
        </div>

        <div>
          <label htmlFor="pf-exp" className={labelCls}>
            Zkušenosti
          </label>
          <textarea
            id="pf-exp"
            rows={4}
            value={experienceText}
            onChange={(e) => setExperienceText(e.target.value)}
            className={textareaCls}
          />
          <FieldError message={fieldErrors.experienceText} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="pf-portfolio" className={labelCls}>
              Odkaz na portfolio
            </label>
            <input
              id="pf-portfolio"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.portfolioUrl} />
          </div>
          <div>
            <label htmlFor="pf-licence" className={labelCls}>
              Číslo povolení MK ČR (samodeklarované)
            </label>
            <input
              id="pf-licence"
              type="text"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              className={inputCls}
            />
            {user.licenceVerified && (
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 text-[10px] font-extrabold">
                <ShieldCheck className="w-3 h-3" />
                Licence ověřena
              </span>
            )}
            <FieldError message={fieldErrors.licenceNumber} />
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <Toggle checked={!acceptingJobs} onChange={(v) => setAcceptingJobs(!v)} label="Teď nepřijímám zakázky" />
          <Toggle checked={emailDigest} onChange={setEmailDigest} label="Posílat denní souhrn e-mailem" />
        </div>

        {saveError && <ErrorBox message={saveError} />}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Ukládám…' : 'Uložit profil'}
          </button>
          {saved && <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">Uloženo.</span>}
        </div>
      </form>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Kdy nemůžu</h2>
        {blocks.length === 0 ? (
          <p className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-4">Žádné nedostupné termíny.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318]"
              >
                <div className="min-w-0 text-xs font-bold text-[#111111] dark:text-stone-100">
                  <div>{formatRange(b.dateFrom, b.dateTo)}</div>
                  {b.note && <div className="font-medium text-stone-600 dark:text-stone-400 break-words">{b.note}</div>}
                </div>
                <button type="button" onClick={() => void removeBlock(b.id)} aria-label="Smazat termín" className={dangerBtn}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addBlock} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="blk-from" className={labelCls}>
              Od
            </label>
            <input
              id="blk-from"
              type="date"
              required
              min={today}
              value={blockFrom}
              onChange={(e) => {
                setBlockFrom(e.target.value);
                if (blockTo && e.target.value > blockTo) setBlockTo(e.target.value);
              }}
              className={dateInputCls}
            />
            <FieldError message={blockFieldErrors.dateFrom} />
          </div>
          <div>
            <label htmlFor="blk-to" className={labelCls}>
              Do
            </label>
            <input
              id="blk-to"
              type="date"
              required
              min={blockFrom || today}
              value={blockTo}
              onChange={(e) => setBlockTo(e.target.value)}
              className={dateInputCls}
            />
            <FieldError message={blockFieldErrors.dateTo} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="blk-note" className={labelCls}>
              Poznámka (nepovinné)
            </label>
            <input
              id="blk-note"
              type="text"
              maxLength={200}
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              className={inputCls}
            />
            <FieldError message={blockFieldErrors.note} />
          </div>
          {blockError && (
            <div className="sm:col-span-2">
              <ErrorBox message={blockError} />
            </div>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={blockBusy} className={primaryBtn}>
              {blockBusy ? 'Ukládám…' : 'Přidat termín'}
            </button>
          </div>
        </form>
      </section>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Moje domluvené zakázky</h2>
        {booked.length === 0 ? (
          <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Zatím žádné domluvené zakázky.</p>
        ) : (
          <ul className="space-y-3">
            {booked.map((b) => (
              <li
                key={b.engagementId}
                className="p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] space-y-2"
              >
                <div className="text-sm font-extrabold text-[#111111] dark:text-white break-words">{b.title}</div>
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {b.city} · {formatRange(b.dateFrom, b.dateTo)}
                </div>
                <ContactBox
                  title="Zadavatel"
                  name={b.posterContact.name}
                  email={b.posterContact.email}
                  phone={b.posterContact.phone}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
