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
  const [result, setResult] = useState<VerificationResult | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyMkLicense(licenseNumber, personName);
    setResult(res);
  };

  const handleTestAuto = () => {
    setLicenseNumber('MK 2451/2008');
    setPersonName('Jan Novák');
    const res = verifyMkLicense('MK 2451/2008', 'Jan Novák');
    setResult(res);
  };

  const handleTestManual = () => {
    setLicenseNumber('MK 9912/2019');
    setPersonName('František Kovář');
    const res = verifyMkLicense('MK 9912/2019', 'František Kovář');
    setResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Ministerstvo kultury ČR
            </span>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Ověření licence restaurátora
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 mb-5 leading-relaxed">
          Platforma automaticky porovnává číslo povolení a jméno s veřejným <strong>Seznamem osob s povolením k restaurování</strong> vedeným MK ČR (§ 14a zákona č. 20/1987 Sb.). V případě nejasností nebo nestandardního zápisu přechází profil do ručního ověření administrátorem.
        </p>

        {/* Rychlé ukázkové testy */}
        <div className="mb-5 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
          <span className="text-xs font-medium text-stone-500 block mb-2">
            Vyzkoušet testovací případy:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTestAuto}
              className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-emerald-500 text-stone-700 font-medium transition-colors"
            >
              Příklad 1: Automatická shoda (Jan Novák)
            </button>
            <button
              type="button"
              onClick={handleTestManual}
              className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-amber-500 text-stone-700 font-medium transition-colors"
            >
              Příklad 2: Ruční ověření adminem (František Kovář)
            </button>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Číslo rozhodnutí / licence MK ČR *
            </label>
            <input
              type="text"
              required
              placeholder="např. MK 2451/2008 nebo 5189/2015"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-hidden font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Jméno a příjmení držitele *
            </label>
            <input
              type="text"
              required
              placeholder="např. Jan Novák"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm active:scale-98 transition-all"
          >
            Ověřit v registru MK ČR
          </button>
        </form>

        {/* Výsledek ověření */}
        {result && (
          <div className="mt-5 pt-4 border-t border-stone-200">
            {result.status === 'verified_auto' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Automaticky ověřeno ve veřejném rejstříku MK ČR</span>
                </div>
                <p className="text-xs mb-2">{result.message}</p>
                <div className="text-[11px] font-mono text-emerald-800 bg-white/70 p-2 rounded-lg">
                  Držitel: {result.holderName} | Číslo: {result.licenseNumber}
                </div>
              </div>
            )}

            {result.status === 'manual_review_needed' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-amber-900">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Vyžaduje ruční zpracování administrátorem</span>
                </div>
                <p className="text-xs mb-2 leading-relaxed">{result.message}</p>
                <span className="text-[11px] text-amber-800">
                  Po registraci administrátor do 24 hodin porovná záznam s věstníkem MK ČR a přidělí odznak.
                </span>
              </div>
            )}

            {result.status === 'unverified' && (
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-rose-700">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Licence nebyla nalezena</span>
                </div>
                <p className="text-xs">{result.message}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span>Zdroj dat: Ministerstvo kultury ČR (§ 14a odst. 8)</span>
          <a
            href="https://mk.gov.cz/seznam-osob-s-povolenim-k-restaurovani-cs-608"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-800 hover:underline"
          >
            <span>Oficiální portál MK ČR</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
