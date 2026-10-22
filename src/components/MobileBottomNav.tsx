'use client';

import React from 'react';
import { Briefcase, UserCheck, PlusCircle, ShieldCheck, FileText } from 'lucide-react';

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#140e0a]/95 backdrop-blur-md border-t border-amber-900/40 px-2 py-1.5 shadow-2xl safe-bottom">
      <div className="flex items-center justify-around">
        {/* Zakázky */}
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'jobs' ? 'text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Zakázky</span>
        </button>

        {/* Nabízím se */}
        <button
          onClick={() => setActiveTab('available')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'available' ? 'text-blue-400 font-bold' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          <UserCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Nabízím se</span>
        </button>

        {/* Středové akční tlačítko +Přidat */}
        <button
          onClick={onOpenCreateJob}
          className="flex flex-col items-center -mt-4 group"
        >
          <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg group-active:scale-95 transition-transform border-2 border-[#140e0a]">
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-bold text-amber-400 mt-0.5">Přidat</span>
        </button>

        {/* Ověření MK */}
        <button
          onClick={onOpenVerificationModal}
          className="flex flex-col items-center py-1 px-2 rounded-lg text-stone-400 hover:text-stone-100 transition-colors"
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 text-emerald-400" />
          <span className="text-[10px]">Ověření MK</span>
        </button>

        {/* Podmínky / VOP */}
        <button
          onClick={() => setActiveTab('vop')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'vop' ? 'text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Právo & VOP</span>
        </button>
      </div>
    </nav>
  );
};
