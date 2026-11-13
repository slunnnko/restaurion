'use client';

import React, { useState } from 'react';
import { ModalShell, ErrorBox, FieldError, dangerBtn, secondaryBtn, textareaCls, labelCls } from './ui';

const MIN_REASON = 3;
const MAX_REASON = 500;

interface DeleteJobModalProps {
  title: string;
  onClose: () => void;
  /** Smaže inzerát; důvod dostane autor v upozornění (D46). Při chybě vyhodí výjimku se zprávou. */
  onConfirm: (reason: string) => Promise<void>;
}

/** Správce maže inzerát: povinný důvod pro autora (D46). Vzor `WithdrawModal`. */
export const DeleteJobModal: React.FC<DeleteJobModalProps> = ({ title, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const length = [...reason.trim()].length; // code points, same as the API
  const tooShort = length < MIN_REASON;
  const tooLong = length > MAX_REASON;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Inzerát se nepodařilo smazat.');
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md" labelledBy="delete-job-title">
      <h2 id="delete-job-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white mb-2 pr-10">
        Smazat inzerát
      </h2>
      <p className="text-sm font-medium text-stone-800 dark:text-stone-300 mb-4 break-words">
        Inzerát „{title}“ zmizí a zájemci i autor dostanou upozornění. Autor v něm uvidí důvod.
      </p>
      <div className="space-y-3">
        {error && <ErrorBox message={error} />}
        <div>
          <label htmlFor="delete-job-reason" className={labelCls}>
            Důvod pro autora
          </label>
          <textarea
            id="delete-job-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={textareaCls}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <FieldError message={tooLong ? 'Nejvýše 500 znaků.' : undefined} />
            <span className="ml-auto text-[11px] font-bold text-stone-600 dark:text-stone-400">
              {length}/{MAX_REASON}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={busy || tooShort || tooLong} onClick={() => void submit()} className={dangerBtn}>
            Smazat
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={secondaryBtn}>
            Zpět
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
