'use client';

import React, { useEffect, useState } from 'react';
import { OwnLicenceRequest, OwnProfile } from '@/types/api';
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
  const [file, setFile] = useState<File | null>(null);
  const [latest, setLatest] = useState<OwnLicenceRequest | null>(null);

  useEffect(() => {
    api<{ request: OwnLicenceRequest | null }>('/api/licence/request')
      .then((d) => setLatest(d.request))
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setError('');
    setFieldErrors({});
    try {
      const number = licenceNumber.trim();
      if (!file) {
        setFieldErrors({ file: 'Přilož sken nebo fotku rozhodnutí.' });
        return;
      }
      const form = new FormData();
      form.append('licenceNumber', number);
      form.append('file', file);
      const data = await api<{ request: OwnLicenceRequest }>('/api/licence/request', { method: 'POST', body: form });
      setLatest(data.request);
      setFile(null);
      // Číslo povolení se uložilo spolu s žádostí; skupinu „Licencovaný restaurátor“ nastaví až ověření.
      const me = await api<{ profile: OwnProfile }>('/api/profile');
      onUserChange(me.profile);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldErrors && Object.keys(err.fieldErrors).length > 0 ? 'Zkontroluj zvýrazněná pole.' : err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Žádost se nepodařilo odeslat.');
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
        Seznam osob s povolením k restaurování vede Ministerstvo kultury a není veřejně ke stažení. Povolení proto ověřujeme ručně podle rozhodnutí MK ČR. Nahraj sken nebo fotku rozhodnutí MK ČR o povolení k restaurování. Uvidí ho jen správce a po ověření ho smažeme.
      </p>

      <div className="mb-4">
        {user.licenceVerified ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 text-xs font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Licence ověřena
          </span>
        ) : latest?.status === 'pending' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF08A] text-[#111111] border-2 border-[#111111] text-xs font-extrabold">
            Čeká na ověření
          </span>
        ) : latest?.status === 'rejected' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4DE] text-[#7C1D0B] border-2 border-[#111111] text-xs font-extrabold">
            Zamítnuto{latest.note ? `: ${latest.note}` : ''}
          </span>
        ) : user.licenceNumber ? (
          <span className="text-xs font-bold text-stone-600 dark:text-stone-400">Dokument zatím nebyl nahrán.</span>
        ) : (
          <span className="text-xs font-bold text-stone-600 dark:text-stone-400">Číslo povolení zatím není vyplněno.</span>
        )}
        {latest?.status === 'pending' ? (
          <span className="ml-2 text-xs font-extrabold text-[#111111] dark:text-white">Číslo v žádosti: {latest.licenceNumber}</span>
        ) : (
          user.licenceNumber && (
            <span className="ml-2 text-xs font-extrabold text-[#111111] dark:text-white">Číslo: {user.licenceNumber}</span>
          )
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

        <div>
          <label htmlFor="licence-file" className={labelCls}>
            Rozhodnutí MK ČR (PDF, JPEG, PNG nebo HEIC, do 10 MB)
          </label>
          <input
            id="licence-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/heic,.pdf,.jpg,.jpeg,.png,.heic"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={`${inputCls} cursor-pointer`}
          />
          <FieldError message={fieldErrors.file} />
        </div>

        {error && <ErrorBox message={error} />}
        {saved && (
          <div role="status" className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            Odesláno. Správce dokument ověří a pak ho smaže.
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Zavřít
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Odesílám…' : 'Odeslat k ověření'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
