'use client';

import React, { useState } from 'react';
import { Job, JobType, MonumentStatus } from '@/types';
import { X, Info, Check } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newJob: Partial<Job>) => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState<JobType>('subcontract_needed');
  const [monumentStatus, setMonumentStatus] = useState<MonumentStatus>('cultural_monument');
  const [monumentName, setMonumentName] = useState('');
  const [monumentRegNumber, setMonumentRegNumber] = useState('');
  const [region, setRegion] = useState<'Jihomoravský kraj' | 'Pardubický kraj (Litomyšl / Svitavy)' | 'Vysočina' | 'Celá ČR'>('Jihomoravský kraj');
  const [city, setCity] = useState('');
  const [crafts, setCrafts] = useState<string[]>([]);
  const [craftInput, setCraftInput] = useState('');
  const [budgetNote, setBudgetNote] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleAddCraft = () => {
    if (craftInput.trim() && !crafts.includes(craftInput.trim())) {
      setCrafts([...crafts, craftInput.trim()]);
      setCraftInput('');
    }
  };

  const handleRemoveCraft = (craftToRemove: string) => {
    setCrafts(crafts.filter((c) => c !== craftToRemove));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !city) return;

    onSubmit({
      title,
      jobType,
      monumentStatus,
      monumentName: monumentName || undefined,
      monumentRegNumber: monumentRegNumber || undefined,
      region,
      city,
      requiredCrafts: crafts.length > 0 ? crafts : ['Odborné restaurátorské práce'],
      budgetNote: budgetNote || 'Dle dohody',
      startDate: startDate || 'Dle dohody',
      description,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-stone-900 mb-2">
              Poptávka byla úspěšně zveřejněna!
            </h3>
            <p className="text-sm text-stone-600">
              Kolegové v regionu vás nyní mohou oslovit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitForm} className="space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Nová poptávka / nabídka
              </span>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Zadat poptávku práce nebo subdodávky
              </h2>
            </div>

            {/* Právní poučení / edukativní okno */}
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Právní rámec spolupráce na kulturních památkách:
                </strong>
                Na kulturní památce může legálně pracovat i řemeslník bez licence MK ČR, pokud za výsledek formálně odpovídá licencovaný restaurátor (dohlíží a podepisuje zprávu).
              </div>
            </div>

            {/* Typ poptávky */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Typ inzerátu
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setJobType('subcontract_needed')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    jobType === 'subcontract_needed'
                      ? 'border-amber-700 bg-amber-50/50 text-amber-950 font-semibold ring-2 ring-amber-100'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <span className="block font-medium">Hledám subdodavatele</span>
                  <span className="text-[11px] text-stone-500 font-normal">Mám licenci, potřebuji šikovné ruce</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJobType('guarantor_needed')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    jobType === 'guarantor_needed'
                      ? 'border-amber-700 bg-amber-50/50 text-amber-950 font-semibold ring-2 ring-amber-100'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <span className="block font-medium">Hledám garanta s licencí</span>
                  <span className="text-[11px] text-stone-500 font-normal">Mám práci na památce, potřebuji zaštítit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJobType('craftsman_available')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    jobType === 'craftsman_available'
                      ? 'border-amber-700 bg-amber-50/50 text-amber-950 font-semibold ring-2 ring-amber-100'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <span className="block font-medium">Nabízím se</span>
                  <span className="text-[11px] text-stone-500 font-normal">Mám volné ruce pro ateliéry</span>
                </button>
              </div>
            </div>

            {/* Název */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Název poptávky *
              </label>
              <input
                type="text"
                required
                placeholder="např. Výpomoc s čištěním a spárováním kamenného portálu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden"
              />
            </div>

            {/* Památkový status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Je objekt kulturní památkou?
                </label>
                <select
                  value={monumentStatus}
                  onChange={(e) => setMonumentStatus(e.target.value as MonumentStatus)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                >
                  <option value="cultural_monument">Ano – Zapsaná kulturní památka (vyžaduje licenci MK)</option>
                  <option value="national_monument">Ano – Národní kulturní památka</option>
                  <option value="historic_unregistered">Ne – Historický objekt / soukromá sbírka (bez licence)</option>
                  <option value="craft_work">Ne – Běžná řemeslná zakázka / replika</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Název objektu / památky (volitelné)
                </label>
                <input
                  type="text"
                  placeholder="např. Zámek Mikulov, Kostel sv. Vavřince"
                  value={monumentName}
                  onChange={(e) => setMonumentName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
            </div>

            {/* Lokalita */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                >
                  <option value="Jihomoravský kraj">Jihomoravský kraj (Brno, Znojmo, Mikulov...)</option>
                  <option value="Pardubický kraj (Litomyšl / Svitavy)">Pardubický kraj (Litomyšl, Svitavy, Polička...)</option>
                  <option value="Vysočina">Kraj Vysočina</option>
                  <option value="Celá ČR">Celá ČR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Město / Obec *
                </label>
                <input
                  type="text"
                  required
                  placeholder="např. Mikulov, Litomyšl, Znojmo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
            </div>

            {/* Hledaná řemesla */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hledaná řemesla / dovednosti
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="např. Štukatér, Pozlacovač, Kameník"
                  value={craftInput}
                  onChange={(e) => setCraftInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCraft();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddCraft}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200"
                >
                  Přidat
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {crafts.map((craft, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-100 text-amber-900 border border-amber-200"
                  >
                    {craft}
                    <button
                      type="button"
                      onClick={() => handleRemoveCraft(craft)}
                      className="hover:text-amber-950 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Odměna a termín */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Odměna / Rozpočet
                </label>
                <input
                  type="text"
                  placeholder="např. 400 Kč/hod nebo 50 000 Kč úkolem"
                  value={budgetNote}
                  onChange={(e) => setBudgetNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Termín realizace
                </label>
                <input
                  type="text"
                  placeholder="např. Ihned / říjen 2026"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
            </div>

            {/* Podrobný popis */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Podrobný popis prací a požadavků *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Popište stav díla, požadovanou technologii, potřebné nástroje nebo lešení..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
              />
            </div>

            {/* Tlačítka */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-sm active:scale-98 transition-all"
              >
                Zveřejnit inzerát
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
