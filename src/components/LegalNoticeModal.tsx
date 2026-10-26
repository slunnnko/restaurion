'use client';

import React from 'react';
import { X, ShieldAlert, CheckCircle, Scale } from 'lucide-react';

interface LegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalNoticeModal: React.FC<LegalNoticeModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1E26] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-300 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#F8FAFC] relative my-8 max-h-[90vh] flex flex-col text-[#111111] dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] text-[#111111] dark:text-white flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Právní rámec & VOP
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
              Všeobecné obchodní podmínky (VOP)
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm text-stone-800 dark:text-stone-300 font-medium leading-relaxed">
          {/* Box s vyvázáním z odpovědnosti */}
          <div className="p-4 bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15 rounded-2xl border-2 border-[#111111] dark:border-[#FEF08A]/50 text-[#111111] dark:text-stone-100 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-[#111111] dark:text-[#FEF08A]">
              <ShieldAlert className="w-5 h-5 text-[#111111] dark:text-[#FEF08A] shrink-0" />
              <span>Naše (ne)odpovědnost: Jsme pouze inzertní nástěnka</span>
            </div>
            <p className="text-xs leading-relaxed">
              Platforma slouží výhradně jako informační a inzertní prostor pro přímé propojení odborníků. Provozovatel <strong>zcela a bez výjimek vylučuje svou odpovědnost</strong> za:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Kvalitu a odbornost práce:</strong> Neručíme za to, jak je práce odvedena. Odpovědnost za výběr partnera a kontrolu jeho výstupů nesou sami uživatelé.</li>
              <li><strong>Finanční vyrovnání a smlouvy:</strong> Platforma nevstupuje do platebních vztahů, smluv o dílo ani subdodávkách. Spory neřešíme.</li>
              <li><strong>Dodržování památkového zákona:</strong> Za to, kdo, kde a za jakých podmínek fyzicky pracuje na kulturní památce, odpovídá výhradně licencovaný restaurátor.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-bold text-base text-[#111111] dark:text-white mb-1">
              1. Kdo jsme a co děláme
            </h3>
            <p>
              Jsme moderní profesní platforma usnadňující legální spolupráci mezi licencovanými restaurátory (s povolením MK ČR) a nelicencovanými odborníky či řemeslníky (štukatéry, kameníky, pozlacovači apod.). Nejsme personální agentura ani zprostředkovatel zaměstnání.
            </p>
          </div>

          <div>
            <h3 className="font-serif font-bold text-base text-[#111111] dark:text-white mb-1">
              2. Pravidla hry pro uživatele
            </h3>
            <div className="space-y-2 text-stone-700 dark:text-stone-300">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Licencovaní restaurátoři:</strong> Pokud přes platformu najdete nelicencovaného odborníka na kulturní památku, je vaší plnou odpovědností zajistit legální průběh (práce pod vaším přímým dohledem, restaurátorská zpráva a ošetření vůči památkářům).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Nelicencovaní odborníci:</strong> Zavazujete se uvádět pravdivé informace o svých dovednostech a respektovat pokyny a dohled licencovaného restaurátora na památkově chráněných objektech.
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-serif font-bold text-base text-[#111111] dark:text-white mb-1">
              3. Závěrečná ustanovení
            </h3>
            <p className="text-stone-600 dark:text-stone-400 text-xs">
              Tyto VOP se řídí právem České republiky. Využíváním platformy potvrzujete, že těmto srozumitelným pravidlům rozumíte a bez výhrad s nimi souhlasíte.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-[#111111]/15 dark:border-stone-700 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
          >
            Rozumím a souhlasím
          </button>
        </div>
      </div>
    </div>
  );
};
