'use client';

import { phoneDigits } from '@/lib/phone';
import React, { useEffect, useRef, useState } from 'react';
import { DirectoryGroup, OwnProfile, ThemePreference, UnavailabilityBlock } from '@/types/api';
import { applyTheme } from '@/lib/theme';
import { api, ApiError } from '@/lib/api';
import { CRAFT_CATEGORIES } from '@/lib/crafts';
import { PROFILE_REGIONS } from '@/lib/regions';
import { formatRange, todayIso, unreadLabel } from '@/lib/format';
import {
  ErrorBox,
  FieldError,
  SelectBox,
  Pill,
  ContactBox,
  cardCls,
  inputCls,
  dateInputCls,
  DateInput,
  textareaCls,
  labelCls,
  primaryBtn,
  secondaryBtn,
  dangerBtn,
} from './ui';
import { MyListings } from './MyListings';
import { InvitationsList } from './InvitationsList';
import { ArrowLeft, BadgeCheck, Ban, Bell, Pencil, Trash2 } from 'lucide-react';

interface ProfilePageProps {
  user: OwnProfile;
  onUserChange: (user: OwnProfile) => void;
  onBack: () => void;
  onLogout: () => Promise<void>;
  /** Krátká výzva nad formulářem (např. po přihlášení bez jména a oborů). */
  hint?: string;
  /** Po změně vlastního inzerátu, aby si nástěnka obnovila data. */
  onListingsChanged?: () => void;
  /** Počet nepřečtených upozornění; upozornění jsou součástí profilu (bez samostatného tlačítka v hlavičce). */
  unreadCount: number;
  onOpenNotifications: () => void;
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

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUserChange,
  onBack,
  onLogout,
  hint,
  onListingsChanged,
  unreadCount,
  onOpenNotifications,
}) => {
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [companyName, setCompanyName] = useState(user.companyName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [waSame, setWaSame] = useState(
    !!user.whatsapp && !user.whatsapp.startsWith('@') && !!user.phone && user.whatsapp.replace(/\D/g, '') === phoneDigits(user.phone)
  );
  const [region, setRegion] = useState(user.region || 'Celá ČR');
  const [crafts, setCrafts] = useState<string[]>(user.crafts);
  const [experienceText, setExperienceText] = useState(user.experienceText);
  const [portfolioUrl, setPortfolioUrl] = useState(user.portfolioUrl ?? '');
  const [licenceNumber, setLicenceNumber] = useState(user.licenceNumber ?? '');
  const [acceptingJobs, setAcceptingJobs] = useState(user.acceptingJobs);
  const [emailDigest, setEmailDigest] = useState(user.emailDigest);
  const [group, setGroup] = useState<DirectoryGroup>(user.group);
  const [instagram, setInstagram] = useState(user.instagram ?? '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? '');
  const [facebook, setFacebook] = useState(user.facebook ?? '');
  const [directoryVisible, setDirectoryVisible] = useState(user.directoryVisible);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [blocks, setBlocks] = useState<UnavailabilityBlock[]>(user.blocks);
  const [booked, setBooked] = useState(user.booked);
  // D40: počet pozvánek; null = ještě se načítá (sekce se renderuje a načte sama, prázdná zmizí).
  const [invitationCount, setInvitationCount] = useState<number | null>(null);
  const [blockFrom, setBlockFrom] = useState('');
  const [blockTo, setBlockTo] = useState('');
  const [blockNote, setBlockNote] = useState('');
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [blockFieldErrors, setBlockFieldErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string>>({});
  const [licBusy, setLicBusy] = useState(false);
  const [licError, setLicError] = useState('');
  const [themeError, setThemeError] = useState('');
  const [themeBusy, setThemeBusy] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockSavedMsg, setBlockSavedMsg] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const blockFormRef = useRef<HTMLFormElement | null>(null);

  const today = todayIso();

  const chooseTheme = async (pref: ThemePreference) => {
    if (themeBusy || pref === user.themePreference) return;
    setThemeError('');
    setThemeBusy(true);
    applyTheme(pref);
    try {
      const data = await api<{ profile: OwnProfile }>('/api/profile', {
        method: 'PUT',
        body: { themePreference: pref },
      });
      onUserChange(data.profile);
    } catch (err) {
      applyTheme(user.themePreference);
      setThemeError(err instanceof ApiError ? err.message : 'Vzhled se nepodařilo uložit.');
    } finally {
      setThemeBusy(false);
    }
  };

  const recheckLicence = async () => {
    if (licBusy) return;
    setLicError('');
    setLicBusy(true);
    try {
      const data = await api<{ profile: OwnProfile }>('/api/profile/licence-check', { method: 'POST' });
      onUserChange(data.profile);
    } catch (err) {
      setLicError(err instanceof ApiError ? err.message : 'Povolení se nepodařilo ověřit.');
    } finally {
      setLicBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwBusy) return;
    setPwError('');
    setPwSaved(false);
    setPwFieldErrors({});
    setPwBusy(true);
    try {
      const data = await api<{ user: OwnProfile }>('/api/auth/password', {
        method: 'POST',
        body: user.hasPassword ? { currentPassword, newPassword } : { newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setPwSaved(true);
      onUserChange(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setPwError(err.message);
        setPwFieldErrors(err.fieldErrors ?? {});
      } else {
        setPwError('Heslo se nepodařilo uložit.');
      }
    } finally {
      setPwBusy(false);
    }
  };

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

  // Po uložení termínu ho krátce zvýrazníme a doscrollujeme na něj (jinak by zůstal mimo obrazovku).
  useEffect(() => {
    if (!highlightId) return;
    rowRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightId]);

  const toggleCraft = (id: string) =>
    setCrafts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaved(false);
    setSaveError('');
    setFieldErrors({});
    // Rozepsaný termín v "Kdy nemůžu" se uloží společně s profilem, ať se nic neztratí.
    if ((blockFrom || blockTo) && !(blockFrom && blockTo)) {
      setBlockFieldErrors({ [blockFrom ? 'dateTo' : 'dateFrom']: 'Vyplň obě data, nebo termín vymaž.' });
      setSaveError('Rozepsaný termín v sekci „Kdy nemůžu“ nemá obě data. Doplň je, nebo je vymaž.');
      blockFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    try {
      if (blockFrom && blockTo && !(await submitBlock())) {
        setSaveError('Rozepsaný termín se nepodařilo uložit, oprav ho v sekci „Kdy nemůžu“.');
        return;
      }
      const data = await api<{ profile: OwnProfile }>('/api/profile', {
        method: 'PUT',
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
          phone: phone.trim(),
          region,
          crafts,
          experienceText: experienceText.trim(),
          portfolioUrl: portfolioUrl.trim(),
          licenceNumber: licenceNumber.trim(),
          acceptingJobs,
          emailDigest,
          group,
          instagram: instagram.trim(),
          whatsapp: waSame && phone.trim() ? phone.trim() : whatsapp.trim(),
          facebook: facebook.trim(),
          directoryVisible,
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

  const resetBlockForm = () => {
    setEditingBlockId(null);
    setBlockFrom('');
    setBlockTo('');
    setBlockNote('');
    setBlockError('');
    setBlockFieldErrors({});
  };

  /** Uloží termín z formuláře (nový, nebo úprava). Vrací true při úspěchu. */
  const submitBlock = async (): Promise<boolean> => {
    if (blockBusy) return false;
    setBlockBusy(true);
    setBlockError('');
    setBlockFieldErrors({});
    setBlockSavedMsg('');
    try {
      const payload = { dateFrom: blockFrom, dateTo: blockTo, note: blockNote.trim() || undefined };
      const data = editingBlockId
        ? await api<{ block: UnavailabilityBlock }>(`/api/availability/${encodeURIComponent(editingBlockId)}`, {
            method: 'PUT',
            body: payload,
          })
        : await api<{ block: UnavailabilityBlock }>('/api/availability', { method: 'POST', body: payload });
      setBlocks((prev) =>
        [...prev.filter((b) => b.id !== data.block.id), data.block].sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
      );
      resetBlockForm();
      setBlockSavedMsg('Termín uložen.');
      setHighlightId(data.block.id);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setBlockError(err.message);
        setBlockFieldErrors(err.fieldErrors ?? {});
      } else {
        setBlockError('Termín se nepodařilo uložit.');
      }
      return false;
    } finally {
      setBlockBusy(false);
    }
  };

  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitBlock();
  };

  const startEditBlock = (b: UnavailabilityBlock) => {
    setEditingBlockId(b.id);
    setBlockFrom(b.dateFrom);
    setBlockTo(b.dateTo);
    setBlockNote(b.note ?? '');
    setBlockError('');
    setBlockFieldErrors({});
    setBlockSavedMsg('');
    blockFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const removeBlock = async (id: string) => {
    setBlockError('');
    try {
      await api(`/api/availability/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (editingBlockId === id) resetBlockForm();
    } catch (err) {
      setBlockError(err instanceof ApiError ? err.message : 'Termín se nepodařilo smazat.');
    }
  };

  const sectionTitle = 'font-serif text-lg font-bold text-[#111111] dark:text-white mb-3';

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* D39: jen ikona, text je v aria-label / title */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Zpět na nástěnku"
            title="Zpět na nástěnku"
            className={`${secondaryBtn} w-10 !px-0`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <button type="button" onClick={() => void onLogout()} className={dangerBtn}>
          Odhlásit
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenNotifications}
        className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-[#111111] dark:border-stone-500 text-left text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] ${
          unreadCount > 0
            ? 'bg-[#FFE4DE] dark:bg-[#4A180D] shadow-[3px_3px_0px_#111111] hover:shadow-[2px_2px_0px_#111111]'
            : 'bg-white dark:bg-[#1C1E26] shadow-[2px_2px_0px_#111111] hover:shadow-[1px_1px_0px_#111111]'
        }`}
      >
        <span className="flex items-center gap-3">
          <span
            className={`w-9 h-9 rounded-xl border-2 border-[#111111] flex items-center justify-center shrink-0 ${
              unreadCount > 0 ? 'bg-[#FF5733] text-white' : 'bg-[#FEF08A] text-[#111111]'
            }`}
          >
            <Bell className="w-4 h-4" />
          </span>
          <span>{unreadCount > 0 ? `Máš ${unreadLabel(unreadCount)}` : 'Upozornění'}</span>
        </span>
        <span className="underline underline-offset-4 decoration-2 shrink-0">{unreadCount > 0 ? 'Zobrazit' : 'Otevřít'}</span>
      </button>

      {hint && (
        <div role="status" className="p-4 rounded-2xl bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-500 shadow-[3px_3px_0px_#111111] text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white">
          {hint}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-[#FEF08A]/70 dark:bg-[#FEF08A]/15 border-2 border-[#111111] dark:border-[#FEF08A]/50 text-xs sm:text-sm font-extrabold text-[#111111] dark:text-[#FEF08A]">
        Zakázky ti chodí vždy, kromě termínů, které máš obsazené nebo označené jako nedostupné.
      </div>

      {loadError && <ErrorBox message={loadError} onRetry={() => void refresh()} />}

      {invitationCount !== 0 && (
        <section className={`${cardCls} p-5 sm:p-6`} id="poptavky-pro-me">
          <h2 className={sectionTitle}>Poptávky pro mě</h2>
          <InvitationsList onChanged={() => onListingsChanged?.()} onLoaded={setInvitationCount} />
        </section>
      )}

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Moje inzeráty</h2>
        <MyListings onChanged={() => onListingsChanged?.()} />
      </section>

      <form onSubmit={save} className={`${cardCls} p-5 sm:p-6 space-y-4`}>
        <h2 className={sectionTitle}>Můj profil</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="pf-first-name" className={labelCls}>
              Jméno
            </label>
            <input
              id="pf-first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.firstName} />
          </div>
          <div>
            <label htmlFor="pf-last-name" className={labelCls}>
              Příjmení
            </label>
            <input
              id="pf-last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.lastName} />
          </div>
          <div>
            <label htmlFor="pf-company-name" className={labelCls}>
              Název firmy (nepovinné)
            </label>
            <input
              id="pf-company-name"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs font-medium text-stone-600 dark:text-stone-400">Vyplň jméno a příjmení, nebo název firmy. Firma se zobrazí místo jména.</p>
            <FieldError message={fieldErrors.companyName} />
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
              placeholder="+420 777 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs font-medium text-stone-600 dark:text-stone-400">Bez předvolby doplníme +420.</p>
            <FieldError message={fieldErrors.phone} />
            <div className={`mt-2 ${phone.trim() === '' ? 'opacity-50' : ''}`}>
              <label className="flex items-center gap-3 text-sm font-bold text-[#111111] dark:text-stone-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waSame && phone.trim() !== ''}
                  disabled={phone.trim() === ''}
                  onChange={(e) => setWaSame(e.target.checked)}
                  className="w-5 h-5 shrink-0 accent-[#111111] dark:accent-[#FEF08A] cursor-pointer"
                />
                <span>Na tomto čísle mám i WhatsApp</span>
              </label>
            </div>
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
          <label htmlFor="pf-group" className={labelCls}>
            Kdo jsem
          </label>
          <SelectBox id="pf-group" value={group} onChange={(e) => setGroup(e.target.value as DirectoryGroup)}>
            <option value="unlicensed">Bez licence</option>
            <option value="licensed">Licencovaný restaurátor (povolení MK ČR)</option>
            <option value="firm">Firma</option>
          </SelectBox>
          <FieldError message={fieldErrors.group} />
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
              Web / portfolio
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
              Číslo povolení MK ČR
            </label>
            <input
              id="pf-licence"
              type="text"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              Ověříme ho v Rejstříku restaurátorů MK ČR (číslo a jméno).
            </p>
            <FieldError message={fieldErrors.licenceNumber} />
            {user.licenceNumber && user.licenceCheck && (
              <div className="mt-2 text-sm font-semibold text-[#111111] dark:text-white" aria-live="polite">
                {user.licenceCheck.result === 'verified' ? (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold">
                      <BadgeCheck className="w-4 h-4 shrink-0" />
                      Nalezeno v rejstříku MK ČR
                    </span>
                    {user.licenceCheck.registryUrl && (
                      <div>
                        <a
                          href={user.licenceCheck.registryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-bold text-[#111111] dark:text-white"
                        >
                          Záznam v rejstříku
                        </a>
                      </div>
                    )}
                    {user.licenceCheck.scope && user.licenceCheck.scope.length > 0 && (
                      <ul className="list-disc pl-5 text-xs font-medium text-stone-700 dark:text-stone-300 break-words">
                        {user.licenceCheck.scope.map((sc) => (
                          <li key={sc}>{sc}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <span>
                    {user.licenceCheck.result === 'not_found' && 'Číslo jsme v rejstříku nenašli.'}
                    {user.licenceCheck.result === 'name_mismatch' &&
                      (!user.firstName?.trim() || !user.lastName?.trim()
                        ? 'Pro ověření vyplň jméno a příjmení restaurátora, na kterého je povolení vydané.'
                        : 'Číslo v rejstříku je, ale jméno nesouhlasí s profilem.')}
                    {user.licenceCheck.result === 'ambiguous' && 'Zadej celé číslo povolení (č.j.).'}
                    {user.licenceCheck.result === 'unavailable' && 'Rejstřík teď neodpovídá, zkus to později.'}
                  </span>
                )}
              </div>
            )}
            {user.licenceNumber && user.licenceCheck?.result !== 'verified' && (
              <div className="mt-2">
                <button type="button" onClick={recheckLicence} disabled={licBusy} className={secondaryBtn}>
                  {licBusy ? 'Ověřuji…' : 'Ověřit znovu'}
                </button>
                {licError && <p className="mt-1 text-xs font-bold text-red-700 dark:text-red-400">{licError}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label htmlFor="pf-instagram" className={labelCls}>
              Instagram
            </label>
            <input
              id="pf-instagram"
              type="text"
              placeholder="uzivatel nebo odkaz"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.instagram} />
          </div>
          <div>
            {waSame && phone.trim() !== '' ? (
              <p className="text-sm font-bold text-[#111111] dark:text-stone-100 sm:pt-7">WhatsApp: stejné číslo jako telefon</p>
            ) : (
              <>
                <label htmlFor="pf-whatsapp" className={labelCls}>
                  WhatsApp (jiné číslo nebo @uživatel)
                </label>
                <input
                  id="pf-whatsapp"
                  type="text"
                  inputMode="text"
                  placeholder="+420 … nebo @jmeno"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={inputCls}
                />
              </>
            )}
            <FieldError message={fieldErrors.whatsapp} />
          </div>
          <div>
            <label htmlFor="pf-facebook" className={labelCls}>
              Facebook
            </label>
            <input
              id="pf-facebook"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className={inputCls}
            />
            <FieldError message={fieldErrors.facebook} />
          </div>
        </div>
        <p className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
          E-mail, telefon a odkazy vidí každý přihlášený uživatel. Anonymní návštěvník je nevidí.
        </p>

        <div className="space-y-2.5 pt-1">
          <Toggle checked={directoryVisible} onChange={setDirectoryVisible} label="Zobrazit mě v Adresáři" />
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
                ref={(el) => {
                  rowRefs.current[b.id] = el;
                }}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 transition-colors ${
                  highlightId === b.id ? 'bg-[#FEF08A] dark:bg-[#FEF08A]/30' : 'bg-red-100 dark:bg-red-950/40'
                }`}
              >
                <div className="min-w-0 text-xs font-bold text-[#111111] dark:text-stone-100">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{formatRange(b.dateFrom, b.dateTo)}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white border border-[#111111] text-[10px] font-extrabold uppercase tracking-wide">
                      <Ban className="w-3 h-3" />
                      Blokováno
                    </span>
                  </div>
                  {b.note && <div className="font-medium text-stone-600 dark:text-stone-400 break-words">{b.note}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => startEditBlock(b)} className={secondaryBtn}>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Upravit</span>
                  </button>
                  <button type="button" onClick={() => void removeBlock(b.id)} aria-label="Smazat termín" className={dangerBtn}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {blockSavedMsg && (
          <p role="status" className="mb-3 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
            {blockSavedMsg}
          </p>
        )}

        <form ref={blockFormRef} onSubmit={addBlock} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="blk-from" className={labelCls}>
              Od
            </label>
            <DateInput
              id="blk-from"
              required
              min={editingBlockId ? undefined : today}
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
            <DateInput
              id="blk-to"
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
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={blockBusy} className={primaryBtn}>
                {blockBusy ? 'Ukládám…' : editingBlockId ? 'Uložit změnu' : 'Přidat termín'}
              </button>
              {editingBlockId && (
                <button type="button" onClick={resetBlockForm} className={secondaryBtn}>
                  Zrušit
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className={`${cardCls} p-5 sm:p-6 space-y-3`}>
        <h2 className={sectionTitle}>Vzhled</h2>
        <div
          role="group"
          aria-label="Vzhled aplikace"
          className="inline-flex flex-wrap items-center gap-1 p-1.5 bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-500 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000]"
        >
          {(
            [
              ['system', 'Podle systému'],
              ['light', 'Světlý'],
              ['dark', 'Tmavý'],
            ] as const
          ).map(([value, label]) => {
            const active = user.themePreference === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                disabled={themeBusy}
                onClick={() => chooseTheme(value)}
                className={`px-3.5 py-2 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all cursor-pointer disabled:opacity-60 ${
                  active
                    ? 'bg-[#FEF08A] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111]'
                    : 'border-transparent text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#262933]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
          Bez přihlášení se řídí nastavením systému, jinak je tmavý.
        </p>
        {themeError && <ErrorBox message={themeError} />}
      </section>

      <form onSubmit={savePassword} className={`${cardCls} p-5 sm:p-6 space-y-3.5`}>
        <h2 className={sectionTitle}>Heslo</h2>
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
          {user.hasPassword
            ? 'Heslo máš nastavené. Kód z e-mailu funguje dál.'
            : 'Nastav si heslo, ať se příště přihlásíš bez kódu z e-mailu. Jde to do 30 minut po přihlášení kódem.'}
        </p>
        {user.hasPassword && (
          <div>
            <label htmlFor="pw-current" className={labelCls}>
              Současné heslo
            </label>
            <input
              id="pw-current"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
            />
            <FieldError message={pwFieldErrors.currentPassword} />
          </div>
        )}
        <div>
          <label htmlFor="pw-new" className={labelCls}>
            Nové heslo
          </label>
          <input
            id="pw-new"
            type="password"
            required
            minLength={10}
            maxLength={200}
            autoComplete="new-password"
            placeholder="Alespoň 10 znaků"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
          />
          <FieldError message={pwFieldErrors.newPassword} />
        </div>
        {pwError && Object.keys(pwFieldErrors).length === 0 && <ErrorBox message={pwError} />}
        {pwSaved && (
          <div role="status" className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
            Heslo je uložené.
          </div>
        )}
        <button type="submit" disabled={pwBusy || newPassword.length < 10} className={primaryBtn}>
          {pwBusy ? 'Ukládám…' : user.hasPassword ? 'Změnit heslo' : 'Nastavit heslo'}
        </button>
      </form>

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
                <ContactBox title="Zadavatel" contact={b.posterContact} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
