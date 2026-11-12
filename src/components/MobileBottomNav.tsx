'use client';

import React from 'react';
import { unreadLabel } from '@/lib/format';
import { Briefcase, Plus, UserRound, LogIn } from 'lucide-react';

interface MobileBottomNavProps {
  active: 'board' | 'none' | 'profile';
  isLoggedIn: boolean;
  unreadCount: number;
  onBoard: () => void;
  onCreate: () => void;
  onProfile: () => void;
}

const itemBase = 'flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer';
const itemIdle = 'text-stone-600 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white font-semibold';
const itemAlert = 'bg-[#FFE4DE] dark:bg-[#4A180D] text-[#7C1D0B] dark:text-[#FFB4A2] font-extrabold border border-[#111111]';
const itemActive = 'bg-[#FEF08A] text-[#111111] font-extrabold border border-[#111111]';

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  active,
  isLoggedIn,
  unreadCount,
  onBoard,
  onCreate,
  onProfile,
}) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#181A20] border-t-2 border-[#111111] dark:border-stone-600 px-2 py-1.5 safe-bottom transition-colors">
    <div className="flex items-center justify-around">
      <button onClick={onBoard} className={`${itemBase} ${active === 'board' ? itemActive : itemIdle}`}>
        <Briefcase className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Nástěnka</span>
      </button>

      <button onClick={onCreate} className="flex flex-col items-center -mt-5 group cursor-pointer">
        <div className="w-14 h-14 rounded-2xl bg-[#FEF08A] text-[#111111] flex items-center justify-center border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] group-active:scale-95 transition-transform">
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-extrabold text-[#111111] dark:text-[#FEF08A] mt-0.5">Přidat</span>
      </button>

      <button
        onClick={onProfile}
        aria-label={isLoggedIn && unreadCount > 0 ? `Profil, ${unreadLabel(unreadCount)}` : undefined}
        className={`relative ${itemBase} ${
          active === 'profile' ? itemActive : isLoggedIn && unreadCount > 0 ? itemAlert : itemIdle
        }`}
      >
        {isLoggedIn ? <UserRound className="w-5 h-5 mb-0.5" /> : <LogIn className="w-5 h-5 mb-0.5" />}
        <span className="text-[10px]">{isLoggedIn ? 'Profil' : 'Přihlásit'}</span>
        {isLoggedIn && unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 right-0 min-w-4 h-4 px-1 rounded-full bg-[#FF5733] text-white border border-[#111111] text-[9px] font-extrabold flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  </nav>
);
