'use client';

import React from 'react';
import { HammerLogo } from './HammerLogo';
import { OwnProfile } from '@/types/api';
import { initials } from '@/lib/format';
import { Moon, Sun, Bell, LogIn, Camera } from 'lucide-react';

interface HeaderProps {
  user: OwnProfile | null;
  unreadCount: number;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onLogin: () => void;
}

const shadowSm = 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';
const btnBase = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#111111] dark:border-stone-400 ${shadowSm} hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] transition-all text-xs font-extrabold cursor-pointer`;

export const Header: React.FC<HeaderProps> = ({
  user,
  unreadCount,
  isDark,
  onToggleDark,
  onOpenNotifications,
  onOpenProfile,
  onLogin,
}) => (
  <header className="sticky top-0 z-30 bg-white dark:bg-[#181A20] border-b-2 border-[#111111] dark:border-[#E2E8F0]/30 transition-colors">
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between min-h-14 sm:min-h-16 py-2 gap-1.5 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FEF08A] border-2 border-[#111111] ${shadowSm} flex items-center justify-center text-[#111111] shrink-0`}>
            <HammerLogo className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-serif font-bold text-lg sm:text-2xl truncate tracking-tight text-[#111111] dark:text-white">
              Restaurion
            </span>
            <span className="hidden lg:inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-[#262933] border border-[#111111] dark:border-stone-500 text-[#111111] dark:text-stone-200">
              Památková řemesla
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2.5">
          <button
            onClick={onToggleDark}
            className={`${btnBase} bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-[#FEF08A]`}
            title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
          >
            {isDark ? <Sun className="w-4 h-4 text-[#FEF08A] shrink-0" /> : <Moon className="w-4 h-4 text-[#111111] shrink-0" />}
            <span className="hidden md:inline">{isDark ? 'Světlý' : 'Tmavý'}</span>
          </button>

          {user && (
            <button
              onClick={onOpenNotifications}
              aria-label="Upozornění"
              className={`relative ${btnBase} hidden md:inline-flex bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-white`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-[#FF5733] text-white border-2 border-[#111111] dark:border-white text-[10px] font-extrabold flex items-center justify-center shadow-[1px_1px_0px_#111111]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <button
              onClick={onOpenProfile}
              className={`${btnBase} !pl-1.5 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-white`}
              title="Můj profil"
            >
              <span className="w-8 h-8 rounded-full border-2 border-[#111111] dark:border-stone-300 bg-[#FEF08A] text-[#111111] flex items-center justify-center font-bold text-xs shrink-0">
                {initials(user.name || user.email)}
              </span>
              <span className="hidden sm:block text-left">
                <span className="block text-xs font-extrabold text-[#111111] dark:text-white leading-tight">
                  {user.name || user.email}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-stone-600 dark:text-stone-300">
                  <Camera className="w-2.5 h-2.5" />
                  <span>Můj profil</span>
                </span>
              </span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className={`${btnBase} bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111]`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Přihlásit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);
