'use client';

import React from 'react';
import { Briefcase, UserCheck, Plus, ShieldCheck, FileText } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'jobs' | 'available' | 'vop';
  setActiveTab: (tab: 'jobs' | 'available' | 'vop') => void;
  onOpenCreateJob: () => void;
  onOpenVerificationModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateJob,
  onOpenVerificationModal,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#181A20] border-t-2 border-[#111111] dark:border-stone-600 px-2 py-1.5 safe-bottom transition-colors">
      <div className="flex items-center justify-around">
        {/* Zakázky */}
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'jobs'
              ? 'bg-[#FEF08A] text-[#111111] font-extrabold border border-[#111111]'
              : 'text-stone-600 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white font-semibold'
          }`}
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Zakázky</span>
        </button>

        {/* Nabízím se */}
        <button
          onClick={() => setActiveTab('available')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'available'
              ? 'bg-[#2563EB] text-white font-extrabold border border-[#111111]'
              : 'text-stone-600 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white font-semibold'
          }`}
        >
          <UserCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Nabízím se</span>
        </button>

        {/* Středové akční tlačítko + Přidat */}
        <button
          onClick={onOpenCreateJob}
          className="flex flex-col items-center -mt-4 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FEF08A] text-[#111111] flex items-center justify-center border-2 border-[#111111] shadow-[2px_2px_0px_#111111] group-active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-extrabold text-[#111111] dark:text-[#FEF08A] mt-0.5">Přidat</span>
        </button>

        {/* Ověření MK */}
        <button
          onClick={onOpenVerificationModal}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white font-semibold transition-colors"
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px]">Ověření MK</span>
        </button>

        {/* Podmínky / VOP */}
        <button
          onClick={() => setActiveTab('vop')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'vop'
              ? 'bg-[#FEF08A] text-[#111111] font-extrabold border border-[#111111]'
              : 'text-stone-600 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white font-semibold'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Právo & VOP</span>
        </button>
      </div>
    </nav>
  );
};
