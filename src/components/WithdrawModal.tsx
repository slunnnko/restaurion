'use client';

import React, { useState } from 'react';
import { ModalShell, ErrorBox, FieldError, dangerBtn, secondaryBtn, textareaCls, labelCls } from './ui';

const MAX_REASON = 500;

interface WithdrawModalProps {
  isOffer: boolean;
  onClose: () => void;
  /** Odešle odstoupení; prázdný důvod se neposílá. Při chybě vyhodí výjimku se zprávou. */
  onConfirm: (reason: string) => Promise<void>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOffer, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const text = isOffer
    ? 'Opravdu chceš zrušit zájem o nabídku? Nabízející dostane upozornění.'
    : 'Opravdu chceš odstoupit od zakázky? Termín se uvolní a zadavatel dostane upozornění.';

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Odstoupení se nepodařilo.');
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md" labelledBy="withdraw-title">
      <h2 id="withdraw-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white mb-2 pr-10">
        {isOffer ? 'Zrušit zájem o nabídku' : 'Odstoupit od zakázky'}
      </h2>
      <p className="text-sm font-medium text-stone-800 dark:text-stone-300 mb-4">{text}</p>
      <div className="space-y-3">
        {error && <ErrorBox message={error} />}
        <div>
          <label htmlFor="withdraw-reason" className={labelCls}>
            Důvod (nepovinné)
          </label>
          <textarea
            id="withdraw-reason"
            rows={3}
            maxLength={MAX_REASON}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={textareaCls}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <FieldError message={reason.length >= MAX_REASON ? 'Nejvýše 500 znaků.' : undefined} />
            <span className="ml-auto text-[11px] font-bold text-stone-600 dark:text-stone-400">
              {reason.length}/{MAX_REASON}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => void submit()} className={dangerBtn}>
            {isOffer ? 'Zrušit zájem' : 'Odstoupit'}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={secondaryBtn}>
            Zpět
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
