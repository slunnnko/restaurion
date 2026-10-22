'use client';

import React, { useState } from 'react';
import { Job } from '@/types';
import { X, Send, CheckCircle2, ShieldCheck, Church } from 'lucide-react';

interface RespondModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RespondModal: React.FC<RespondModalProps> = ({
  job,
  isOpen,
  onClose,
}) => {
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !contactName) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">
              Zpráva byla úspěšně odeslána!
            </h3>
            <p className="text-xs text-stone-600">
              Autor zakázky ({job.author.name}) obdržel vaši nabídku i kontakt.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Odpověď na nabídku
              </span>
              <h2 className="font-serif text-xl font-bold text-stone-900 line-clamp-1">
                {job.title}
              </h2>
              <div className="text-xs text-stone-500 mt-0.5">
                Příjemce: <strong className="text-stone-700">{job.author.name}</strong> ({job.city})
              </div>
            </div>

            {/* Kontext kulturní památky */}
            {job.monumentStatus === 'cultural_monument' && (
              <div className="mb-4 p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
                <Church className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Tato zakázka se týká kulturní památky. Spolupráce bude probíhat pod odborným dohledem zadavatele s licencí MK ČR.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Vaše jméno a řemeslná odbornost *
                </label>
                <input
                  type="text"
                  required
                  placeholder="např. Martin Veselý – štukatér (10 let praxe)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Telefonní kontakt nebo e-mail *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+420 777 000 111 / email@domena.cz"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Vaše zpráva (zkušenosti, časové možnosti, sazba) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Dobrý den, rád bych se zapojil do této zakázky. Mám praxi s vápennými maltami a pískovcem. Jsem volný od příštího týdne..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-sm active:scale-98 transition-all"
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
