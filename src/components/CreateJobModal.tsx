'use client';

import React, { useState, useRef } from 'react';
import { Job, JobType, MonumentStatus } from '@/types';
import { X, Info, Check, Camera, Trash2, ShieldCheck, UserCheck, Upload, ChevronDown } from 'lucide-react';
import { HammerLogo } from './HammerLogo';
import { uploadCompressedImage } from '@/lib/imageCompression';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newJob: Partial<Job>) => void;
}

const SAMPLE_JOB_PHOTOS = [
  { label: 'Kámen & pískovec', url: '/images/job-stone.jpg' },
  { label: 'Zlacení & polychromie', url: '/images/job-gold.jpg' },
  { label: 'Štuk & klenby', url: '/images/job-stucco.jpg' },
  { label: 'Dřevo & fládrování', url: '/images/job-wood.jpg' },
  { label: 'Umělecké kovářství', url: '/images/job-iron.jpg' },
];

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
  const [region, setRegion] = useState<string>('Jihomoravský kraj');
  const [city, setCity] = useState('');
  const [crafts, setCrafts] = useState<string[]>([]);
  const [craftInput, setCraftInput] = useState('');
  const [budgetNote, setBudgetNote] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadCompressedImage(file, 'jobs');
      setImageUrl(uploadedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
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
      imageUrl: imageUrl || undefined,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTitle('');
      setDescription('');
      setCity('');
      setImageUrl('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1E26] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-500 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#000000] relative my-8 max-h-[92vh] overflow-y-auto text-[#111111] dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] text-[#111111] dark:text-white flex items-center justify-center shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 border-2 border-[#111111] shadow-[3px_3px_0px_#111111] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#111111] dark:text-white mb-2">
              Inzerát byl úspěšně zveřejněn!
            </h3>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Kolegové v regionu vás nyní mohou oslovit přes tlačítko „Mám zájem“.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitForm} className="space-y-5">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
                + Přidat na nástěnku
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#111111] dark:text-white">
                Zadat poptávku práce nebo nabídnout kapacity
              </h2>
            </div>

            {/* Právní poučení / edukativní okno */}
            <div className="p-3.5 bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 rounded-2xl border-2 border-[#111111] dark:border-[#FEF08A]/50 flex items-start gap-3 text-xs text-[#111111] dark:text-stone-100">
              <Info className="w-5 h-5 text-[#111111] dark:text-[#FEF08A] shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block mb-0.5">
                  Právní rámec spolupráce na kulturních památkách:
                </strong>
                Na kulturní památce může legálně pracovat i řemeslník bez licence MK ČR, pokud za výsledek formálně odpovídá licencovaný restaurátor (dohlíží a podepisuje restaurátorskou zprávu).
              </div>
            </div>

            {/* Typ poptávky – s ikonkami a barvami dle zadání */}
            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1.5">
                Typ inzerátu *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setJobType('subcontract_needed')}
                  className={`p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-left text-xs transition-all cursor-pointer ${
                    jobType === 'subcontract_needed'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 shadow-[3px_3px_0px_#111111]'
                      : 'bg-[#FFFDF7] dark:bg-[#262933] hover:bg-stone-100 dark:hover:bg-[#323644] text-[#111111] dark:text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white border border-[#111111] flex items-center justify-center shrink-0">
                      <HammerLogo className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-extrabold">Hledám subdodavatele</span>
                  </div>
                  <span className="text-[11px] opacity-80 font-medium block">
                    Mám licenci, hledám šikovné ruce
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setJobType('guarantor_needed')}
                  className={`p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-left text-xs transition-all cursor-pointer ${
                    jobType === 'guarantor_needed'
                      ? 'bg-[#FFE4DE] dark:bg-[#4A180D] text-[#7C1D0B] dark:text-[#FFB4A2] shadow-[3px_3px_0px_#111111]'
                      : 'bg-[#FFFDF7] dark:bg-[#262933] hover:bg-stone-100 dark:hover:bg-[#323644] text-[#111111] dark:text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-lg bg-[#FF5733] text-white border border-[#111111] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-extrabold">Hledám zaštítění</span>
                  </div>
                  <span className="text-[11px] opacity-80 font-medium block">
                    Mám zakázku, potřebuji garanta s licencí
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setJobType('craftsman_available')}
                  className={`p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-left text-xs transition-all cursor-pointer ${
                    jobType === 'craftsman_available'
                      ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD] shadow-[3px_3px_0px_#111111]'
                      : 'bg-[#FFFDF7] dark:bg-[#262933] hover:bg-stone-100 dark:hover:bg-[#323644] text-[#111111] dark:text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-lg bg-[#2563EB] text-white border border-[#111111] flex items-center justify-center shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-extrabold">Nabízím se</span>
                  </div>
                  <span className="text-[11px] opacity-80 font-medium block">
                    Nabízím své řemeslo a kapacity
                  </span>
                </button>
              </div>
            </div>

            {/* Název */}
            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                Název inzerátu *
              </label>
              <input
                type="text"
                required
                placeholder="např. Výpomoc s čištěním a spárováním kamenného portálu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold focus:bg-[#FEF08A]/25 outline-hidden"
              />
            </div>

            {/* Volitelná fotografie ze zakázky (inspirováno variantou 13) */}
            <div className="p-3.5 rounded-2xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#15171E]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-extrabold text-[#111111] dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#111111] dark:text-[#FEF08A]" />
                  <span>Fotografie ze zakázky / detailu díla (volitelné)</span>
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Odebrat fotku</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {imageUrl ? (
                <div className="relative h-40 w-full rounded-xl border-2 border-[#111111] overflow-hidden mb-2 bg-stone-100">
                  <img
                    src={imageUrl}
                    alt="Náhled zakázky"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mb-2.5 font-medium">
                  Můžete nahrát fotku stavu památky či řemeslného detailu. Pokud fotku nepřiložíte, karta inzerátu se zobrazí čistě textově bez prázdného místa.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-extrabold cursor-pointer disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingImage ? 'Komprimuji WebP…' : 'Nahrát vlastní fotku'}</span>
                </button>

                <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">nebo ukázka:</span>
                {SAMPLE_JOB_PHOTOS.map((sample) => (
                  <button
                    key={sample.url}
                    type="button"
                    onClick={() => setImageUrl(sample.url)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      imageUrl === sample.url
                        ? 'bg-[#FEF08A] text-[#111111] border-[#111111]'
                        : 'bg-white dark:bg-[#262933] text-[#111111] dark:text-stone-200 border-[#111111] dark:border-stone-500 hover:bg-stone-100'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Památkový status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Je objekt kulturní památkou?
                </label>
                <div className="relative">
                  <select
                    value={monumentStatus}
                    onChange={(e) => setMonumentStatus(e.target.value as MonumentStatus)}
                    className="w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-sm font-bold bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-white cursor-pointer appearance-none"
                  >
                    <option value="cultural_monument">Ano – Kulturní památka (vyžaduje licenci MK)</option>
                    <option value="national_monument">Ano – Národní kulturní památka</option>
                    <option value="historic_unregistered">Ne – Běžný historický objekt (bez licence)</option>
                    <option value="craft_work">Ne – Běžná řemeslná zakázka / replika</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Název objektu / památky (volitelné)
                </label>
                <input
                  type="text"
                  placeholder="např. Zámek Mikulov, Kostel sv. Vavřince"
                  value={monumentName}
                  onChange={(e) => setMonumentName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold"
                />
              </div>
            </div>

            {/* Lokalita */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Region *
                </label>
                <div className="relative">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-sm font-bold bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-white cursor-pointer appearance-none"
                  >
                    <option value="Jihomoravský kraj">Jihomoravský kraj</option>
                    <option value="Praha">Praha</option>
                    <option value="Středočeský kraj">Středočeský kraj</option>
                    <option value="Jihočeský kraj">Jihočeský kraj</option>
                    <option value="Pardubický kraj">Pardubický kraj</option>
                    <option value="Kraj Vysočina">Kraj Vysočina</option>
                    <option value="Olomoucký kraj">Olomoucký kraj</option>
                    <option value="Celá ČR">Celá ČR</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Město / Obec *
                </label>
                <input
                  type="text"
                  required
                  placeholder="např. Mikulov, Litomyšl, Znojmo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold"
                />
              </div>
            </div>

            {/* Hledaná řemesla */}
            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
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
                  className="flex-1 px-3.5 py-2 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddCraft}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#262933] border-2 border-[#111111] dark:border-stone-500 shadow-[2px_2px_0px_#111111] text-[#111111] dark:text-white text-xs font-extrabold hover:bg-[#FEF08A] dark:hover:text-[#111111] cursor-pointer"
                >
                  + Přidat obor
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {crafts.map((craft, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#FEF08A] text-[#111111] border-2 border-[#111111]"
                  >
                    {craft}
                    <button
                      type="button"
                      onClick={() => handleRemoveCraft(craft)}
                      className="hover:text-rose-700 font-extrabold cursor-pointer"
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
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Odměna / Rozpočet
                </label>
                <input
                  type="text"
                  placeholder="např. 450 Kč/hod nebo 60 000 Kč za etapu"
                  value={budgetNote}
                  onChange={(e) => setBudgetNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                  Termín realizace
                </label>
                <input
                  type="text"
                  placeholder="např. Ihned / listopad 2026"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold"
                />
              </div>
            </div>

            {/* Podrobný popis */}
            <div>
              <label className="block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1">
                Podrobný popis prací a požadavků *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Popište stav díla, požadovanou technologii, potřebné nástroje nebo lešení..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold"
              />
            </div>

            {/* Tlačítka */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-stone-200 bg-white dark:bg-[#262933] border-2 border-[#111111] dark:border-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
              >
                Zveřejnit na nástěnku
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
