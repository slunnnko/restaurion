'use client';

import React, { useState } from 'react';
import { PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { ModalShell, FieldError, ErrorBox, textareaCls, labelCls, primaryBtn, secondaryBtn } from './ui';
import { Send, CheckCircle2, Church } from 'lucide-react';

interface RespondModalProps {
  job: PublicJob;
  onClose: () => void;
  onSubmitted: () => void;
  /** API vrátilo 400 profile=name: otevřít profil. */
  onNeedProfile: () => void;
}

export const RespondModal: React.FC<RespondModalProps> = ({ job, onClose, onSubmitted, onNeedProfile }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setError('');
    setFieldErrors({});
    setIsSending(true);
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}/respond`, {
        method: 'POST',
        body: message.trim() ? { message: message.trim() } : {},
      });
      setSent(true);
      onSubmitted();
      setTimeout(onClose, 1500);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.profile === 'name') {
        onNeedProfile();
        return;
      }
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Odeslání se nepodařilo.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const isMonument = job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument';

  return (
    <ModalShell onClose={onClose} labelledBy="respond-title">
      {sent ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 border-2 border-[#111111] shadow-[3px_3px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#111111] dark:text-white mb-1">Zájem odeslán</h3>
          <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Zadavatel ({job.poster.name}) dostal upozornění. Kontakty se ukážou po jeho přijetí.
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 pr-10">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
              Mám zájem o spolupráci
            </span>
            <h2 id="respond-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white line-clamp-2">
              {job.title}
            </h2>
            <div className="text-xs text-stone-700 dark:text-stone-300 mt-2 font-medium">
              Zadavatel: <strong className="text-[#111111] dark:text-white font-extrabold">{job.poster.name}</strong> ({job.city})
            </div>
          </div>

          {isMonument && (
            <div className="mb-4 p-3 bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/60 text-xs text-[#111111] dark:text-stone-100 font-medium flex items-start gap-2">
              <Church className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0 mt-0.5" />
              <span>
                Tato zakázka se týká kulturní památky. Spolupráce probíhá pod odborným vedením licencovaného restaurátora s povolením MK ČR.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="respond-message" className={labelCls}>
                Zpráva zadavateli (nepovinné)
              </label>
              <textarea
                id="respond-message"
                rows={4}
                maxLength={500}
                placeholder="Zkušenosti, časové možnosti, sazba…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={textareaCls}
              />
              <FieldError message={fieldErrors.message} />
            </div>

            <p className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
              Kontakty se zadavateli ukážou až po přijetí.
            </p>

            {error && <ErrorBox message={error} />}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button type="button" onClick={onClose} className={secondaryBtn}>
                Zrušit
              </button>
              <button type="submit" disabled={isSending} className={primaryBtn}>
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Odesílám…' : 'Mám zájem'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </ModalShell>
  );
};
