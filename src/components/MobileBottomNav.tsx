'use client';

import React from 'react';
import { unreadLabel } from '@/lib/format';
import { Briefcase, Plus, LogIn } from 'lucide-react';
import { UnreadBadge } from './ui';

interface MobileBottomNavProps {
  active: 'board' | 'none' | 'profile';
  isLoggedIn: boolean;
  unreadCount: number;
  /** Iniciály přihlášeného (avatar u položky Profil). */
  avatarText: string;
  onBoard: () => void;
  onCreate: () => void;
  onProfile: () => void;
}

const itemBase = 'flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer';
const itemIdle = 'text-stone-600 dark:text-stone-300 hover:text-[#111111] dark:hover:text-white font-semibold';
const itemActive = 'bg-[#FEF08A] text-[#111111] font-extrabold border border-[#111111]';

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  active,
  isLoggedIn,
  unreadCount,
  avatarText,
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
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center border-2 border-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] group-active:scale-95 transition-transform">
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-extrabold text-[#111111] dark:text-[#FEF08A] mt-0.5">Přidat</span>
      </button>

      <button
        onClick={onProfile}
        aria-label={isLoggedIn && unreadCount > 0 ? `Profil, ${unreadLabel(unreadCount)}` : undefined}
        className={`relative ${itemBase} ${
          active === 'profile' ? itemActive : itemIdle
        }`}
      >
        {isLoggedIn ? (
          <span className="relative w-6 h-6 rounded-full border-2 border-[#111111] dark:border-stone-300 bg-[#FEF08A] text-[#111111] text-[9px] font-bold flex items-center justify-center mb-0.5">
            {avatarText}
            <UnreadBadge count={unreadCount} />
          </span>
        ) : (
          <LogIn className="w-5 h-5 mb-0.5" />
        )}
        <span className="text-[10px]">{isLoggedIn ? 'Profil' : 'Přihlásit'}</span>
      </button>
    </div>
  </nav>
);
