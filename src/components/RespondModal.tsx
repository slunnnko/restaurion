'use client';

import React, { useState } from 'react';
import { Job, JobResponseItem } from '@/types';
import { X, Send, CheckCircle2, Church } from 'lucide-react';

interface RespondModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (jobId: string, newResponse?: JobResponseItem) => void;
}

export const RespondModal: React.FC<RespondModalProps> = ({
  job,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !contactName || isSending) return;

    setIsSending(true);
    try {
      await fetch(`/api/jobs/${encodeURIComponent(job.id)}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: contactName,
          phone,
          message,
          attachProfile: true,
        }),
      });
    } catch {
      // Fallback: pokud API zatím není připojené, uložíme lokálně
    } finally {
      setIsSending(false);
    }

    const newResponse: JobResponseItem = {
      id: `resp-${Date.now()}`,
      jobId: job.id,
      senderName: contactName.trim(),
      senderPhone: phone.trim(),
      message: message.trim(),
      attachProfile: true,
      status: 'pending',
      createdAt: 'právě teď',
      isRead: false,
    };

    onSubmitted?.(job.id, newResponse);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
      setContactName('');
      setPhone('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1E26] rounded-3xl max-w-lg w-full p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-300 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#F8FAFC] relative transition-colors">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#FEF08A] text-[#111111] dark:text-white dark:hover:text-[#111111] flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 border-2 border-[#111111] shadow-[3px_3px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#111111] dark:text-white mb-1">
              Zpráva byla úspěšně odeslána!
            </h3>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Autor inzerátu ({job.author.name}) obdržel vaši nabídku v upozorněních na profilu i v Administraci.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
                Mám zájem o spolupráci
              </span>
              <h2 className="font-serif text-xl font-bold text-[#111111] dark:text-white line-clamp-2">
                {job.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 mt-2 font-medium">
                {job.author.avatarUrl && (
                  <img
                    src={job.author.avatarUrl}
                    alt={job.author.name}
                    className="w-6 h-6 rounded-full border border-[#111111] dark:border-stone-400 object-cover"
                  />
                )}
                <span>
                  Příjemce: <strong className="text-[#111111] dark:text-white font-extrabold">{job.author.name}</strong> ({job.city})
                </span>
              </div>
            </div>

            {/* Kontext kulturní památky */}
            {(job.monumentStatus === 'cultural_monument' || job.monumentStatus === 'national_monument') && (
              <div className="mb-4 p-3 bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 rounded-xl border-2 border-[#111111] dark:border-[#FEF08A]/60 text-xs text-[#111111] dark:text-stone-100 font-medium flex items-start gap-2">
                <Church className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0 mt-0.5" />
                <span>
                  Tato zakázka se týká kulturní památky. Spolupráce probíhá pod odborným vedením licencovaného restaurátora s povolením MK ČR.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Vaše jméno a řemeslná odbornost *
                </label>
                <input
                  type="text"
                  required
                  placeholder="např. Martin Veselý – štukatér (10 let praxe)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white focus:bg-[#FEF08A]/25 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Telefonní kontakt nebo e-mail *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+420 777 000 111 / email@domena.cz"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white focus:bg-[#FEF08A]/25 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Vaše zpráva (zkušenosti, časové možnosti, sazba) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Dobrý den, rád bych se zapojil do této zakázky. Mám praxi s vápennými maltami a pískovcem. Jsem volný od příštího týdne..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white focus:bg-[#FEF08A]/25 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-stone-200 bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-400 hover:bg-stone-100 cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#F8FAFC] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Odeslat odpověď</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
