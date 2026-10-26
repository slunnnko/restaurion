'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { verifyMkLicense, VerificationResult } from '@/lib/mkVerification';

interface LicenseVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseVerificationModal: React.FC<LicenseVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [personName, setPersonName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  if (!isOpen) return null;

  const runVerification = async (lic: string, name: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseNumber: lic, personName: name }),
      });
      if (res.ok) {
        const data = (await res.json()) as VerificationResult;
        if (data && data.status) {
          setResult(data);
          return;
        }
      }
    } catch {
      // Fallback na klientskou verifikaci pokud D1 zatím neběží
    } finally {
      setIsVerifying(false);
    }
    setResult(verifyMkLicense(lic, name));
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    void runVerification(licenseNumber, personName);
  };

  const handleTestAuto = () => {
    setLicenseNumber('MK 2451/2008');
    setPersonName('Jan Novák');
    void runVerification('MK 2451/2008', 'Jan Novák');
  };

  const handleTestManual = () => {
    setLicenseNumber('MK 9912/2019');
    setPersonName('František Kovář');
    void runVerification('MK 9912/2019', 'František Kovář');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1E26] rounded-3xl max-w-xl w-full p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-300 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#F8FAFC] relative text-[#111111] dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] text-[#111111] dark:text-white flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Ministerstvo kultury ČR
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#111111] dark:text-white">
              Ověření licence restaurátora
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-medium mb-5 leading-relaxed">
          Platforma automaticky porovnává číslo povolení a jméno s veřejným <strong>Seznamem osob s povolením k restaurování</strong> vedeným MK ČR (§ 14a zákona č. 20/1987 Sb.). V případě nejasností přechází profil do ručního ověření administrátorem.
        </p>

        {/* Rychlé ukázkové testy */}
        <div className="mb-5 p-3.5 bg-[#FFFDF7] dark:bg-[#15171E] rounded-2xl border-2 border-[#111111] dark:border-stone-500">
          <span className="text-xs font-extrabold text-[#111111] dark:text-stone-200 block mb-2">
            Vyzkoušet testovací případy:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTestAuto}
              className="px-3 py-1.5 text-xs rounded-xl bg-emerald-100 hover:bg-emerald-200 border-2 border-[#111111] text-emerald-950 font-extrabold transition-colors cursor-pointer"
            >
              Příklad 1: Automatická shoda (Jan Novák)
            </button>
            <button
              type="button"
              onClick={handleTestManual}
              className="px-3 py-1.5 text-xs rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] text-[#111111] font-extrabold transition-colors cursor-pointer"
            >
              Příklad 2: Ruční ověření adminem (František Kovář)
            </button>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
              Číslo rozhodnutí / licence MK ČR *
            </label>
            <input
              type="text"
              required
              placeholder="např. MK 2451/2008 nebo 5189/2015"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm outline-hidden font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
              Jméno a příjmení držitele *
            </label>
            <input
              type="text"
              required
              placeholder="např. Jan Novák"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer disabled:opacity-60"
          >
            {isVerifying ? 'Ověřuji v registru MK ČR…' : 'Ověřit v registru MK ČR'}
          </button>
        </form>

        {/* Výsledek ověření */}
        {result && (
          <div className="mt-5 pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700">
            {result.status === 'verified_auto' && (
              <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-[#111111] dark:border-emerald-500 text-emerald-950 dark:text-emerald-100">
                <div className="flex items-center gap-2 font-extrabold text-sm mb-1 text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Automaticky ověřeno ve veřejném rejstříku MK ČR</span>
                </div>
                <p className="text-xs font-medium mb-2">{result.message}</p>
                <div className="text-[11px] font-mono font-bold text-[#111111] dark:text-emerald-200 bg-white dark:bg-[#121318] p-2 rounded-lg border border-[#111111] dark:border-emerald-500/70">
                  Držitel: {result.holderName} | Číslo: {result.licenseNumber}
                </div>
              </div>
            )}

            {result.status === 'manual_review_needed' && (
              <div className="p-4 rounded-2xl bg-[#FEF08A] text-[#111111] border-2 border-[#111111]">
                <div className="flex items-center gap-2 font-extrabold text-sm mb-1">
                  <Clock className="w-5 h-5 text-[#111111] shrink-0" />
                  <span>Vyžaduje ruční zpracování administrátorem</span>
                </div>
                <p className="text-xs font-medium mb-2 leading-relaxed">{result.message}</p>
                <span className="text-[11px] font-bold text-stone-800">
                  Po registraci administrátor do 24 hodin porovná záznam s věstníkem MK ČR a přidělí odznak.
                </span>
              </div>
            )}

            {result.status === 'unverified' && (
              <div className="p-4 rounded-2xl bg-rose-100 text-rose-950 border-2 border-[#111111]">
                <div className="flex items-center gap-2 font-extrabold text-sm mb-1 text-rose-800">
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
                  <span>Licence nebyla nalezena</span>
                </div>
                <p className="text-xs font-medium">{result.message}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700 flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-400">
          <span>Zdroj dat: Ministerstvo kultury ČR (§ 14a odst. 8)</span>
          <a
            href="https://mk.gov.cz/seznam-osob-s-povolenim-k-restaurovani-cs-608"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#111111] dark:text-[#FEF08A] hover:underline font-extrabold"
          >
            <span>Oficiální portál MK ČR</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
