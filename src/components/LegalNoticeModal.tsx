'use client';

import React from 'react';
import { X, ShieldAlert, CheckCircle, FileText, Scale } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Právní rámec & VOP
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Všeobecné obchodní podmínky (VOP)
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Box s neprůstřelným vyvázáním z odpovědnosti */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
              <span>Naše (ne)odpovědnost: Jsme pouze inzertní nástěnka</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              Platforma slouží výhradně jako informační a inzertní prostor pro přímé propojení odborníků. Provozovatel <strong>zcela a bez výjimek vylučuje svou odpovědnost</strong> za:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-amber-950">
              <li><strong>Kvalitu a odbornost práce:</strong> Neručíme za to, jak je práce odvedena. Odpovědnost za výběr partnera a kontrolu jeho výstupů nesou sami uživatelé.</li>
              <li><strong>Finanční vyrovnání a smlouvy:</strong> Platforma nevstupuje do platebních vztahů, smluv o dílo ani subdodávkách. Spory neřešíme.</li>
              <li><strong>Dodržování památkového zákona:</strong> Za to, kdo, kde a za jakých podmínek fyzicky pracuje na kulturní památce, odpovídá výhradně licencovaný restaurátor.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
              1. Kdo jsme a co děláme
            </h3>
            <p>
              Jsme moderní B2B platforma usnadňující legální spolupráci mezi licencovanými restaurátory (s povolením MK ČR) a nelicencovanými odborníky či řemeslníky (štukatéry, kameníky, pozlacovači apod.). Nejsme personální agentura ani zprostředkovatel zaměstnání.
            </p>
          </div>

          <div>
            <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
              2. Pravidla hry pro uživatele
            </h3>
            <div className="space-y-2 text-stone-600">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Licencovaní restaurátoři:</strong> Pokud přes platformu najdete nelicencovaného odborníka na kulturní památku, je vaší plnou odpovědností zajistit legální průběh (práce pod vaším přímým dohledem, restaurátorská zpráva a ošetření vůči památkářům).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Nelicencovaní odborníci:</strong> Zavazujete se uvádět pravdivé informace o svých dovednostech a respektovat pokyny a dohled licencovaného restaurátora na památkově chráněných objektech.
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
              3. Závěrečná ustanovení
            </h3>
            <p className="text-stone-500 text-xs">
              Tyto VOP se řídí právem České republiky. Využíváním platformy potvrzujete, že těmto srozumitelným pravidlům rozumíte a bez výhrad s nimi souhlasíte.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors"
          >
            Rozumím a souhlasím
          </button>
        </div>
      </div>
    </div>
  );
};
