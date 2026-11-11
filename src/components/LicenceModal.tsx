'use client';

import React, { useState } from 'react';
import { OwnProfile } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { ModalShell, ErrorBox, FieldError, inputCls, labelCls, primaryBtn, secondaryBtn } from './ui';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LicenceModalProps {
  user: OwnProfile;
  onClose: () => void;
  onUserChange: (user: OwnProfile) => void;
}

export const LicenceModal: React.FC<LicenceModalProps> = ({ user, onClose, onUserChange }) => {
  const [licenceNumber, setLicenceNumber] = useState(user.licenceNumber ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setError('');
    setFieldErrors({});
    try {
      const number = licenceNumber.trim();
      const data = await api<{ profile: OwnProfile }>('/api/profile', {
        method: 'PUT',
        body: {
          licenceNumber: number,
          // Skupina „Licencovaný restaurátor“ vyžaduje číslo povolení; ostatní skupiny se nemění.
          ...(number && user.group === 'unlicensed' ? { group: 'licensed' } : {}),
        },
      });
      onUserChange(data.profile);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldErrors && Object.keys(err.fieldErrors).length > 0 ? 'Zkontroluj zvýrazněná pole.' : err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Číslo povolení se nepodařilo uložit.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} labelledBy="licence-title">
      <div className="mb-4 pr-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/90 border border-[#111111] dark:border-emerald-500/70 text-xs font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-200 mb-1.5">
          Licence MK ČR
        </span>
        <h2 id="licence-title" className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
          Ověřit licenci MK ČR
        </h2>
      </div>

      <p className="text-sm font-semibold text-stone-800 dark:text-stone-300 leading-relaxed mb-4">
        Seznam osob s povolením k restaurování vede Ministerstvo kultury a není veřejně ke stažení. Povolení proto ověřujeme ručně podle rozhodnutí MK ČR. Odznak „Licence ověřena“ přidá správce.
      </p>

      <div className="mb-4">
        {user.licenceVerified ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 text-xs font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Licence ověřena
          </span>
        ) : user.licenceNumber ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF08A] text-[#111111] border-2 border-[#111111] text-xs font-extrabold">
            Čeká na ověření
          </span>
        ) : (
          <span className="text-xs font-bold text-stone-600 dark:text-stone-400">Číslo povolení zatím není vyplněno.</span>
        )}
        {user.licenceNumber && (
          <span className="ml-2 text-xs font-extrabold text-[#111111] dark:text-white">Číslo: {user.licenceNumber}</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="licence-number" className={labelCls}>
            Číslo povolení MK ČR
          </label>
          <input
            id="licence-number"
            type="text"
            maxLength={40}
            value={licenceNumber}
            onChange={(e) => setLicenceNumber(e.target.value)}
            className={inputCls}
          />
          <FieldError message={fieldErrors.licenceNumber ?? fieldErrors.group} />
        </div>

        {error && <ErrorBox message={error} />}
        {saved && (
          <div role="status" className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            Uloženo. Ověření proběhne ručně.
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Zavřít
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Ukládám…' : 'Uložit číslo'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
