'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HammerLogo } from './HammerLogo';
import { OwnProfile } from '@/types/api';
import { initials, unreadLabel } from '@/lib/format';
import { UnreadBadge } from './ui';
import { LogIn, Camera, BookUser, UserRound } from 'lucide-react';

interface HeaderProps {
  user: OwnProfile | null;
  unreadCount: number;
  onOpenDirectory: () => void;
  /** Adresář je právě otevřený (zvýrazní tlačítko / položku menu). */
  directoryActive: boolean;
  onOpenProfile: () => void;
  onLogin: () => void;
}

const shadowSm = 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';
const btnBase = `inline-flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 rounded-xl border-2 border-[#111111] dark:border-stone-400 ${shadowSm} hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] transition-all text-xs sm:text-sm font-extrabold cursor-pointer`;
const menuItem =
  'w-full flex items-center gap-2 min-h-10 px-3 py-2 rounded-lg text-left text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white cursor-pointer transition-colors';

export const Header: React.FC<HeaderProps> = ({
  user,
  unreadCount,
  onOpenDirectory,
  directoryActive,
  onOpenProfile,
  onLogin,
}) => {
  // D36: přihlášený má Adresář v menu, které se otevře najetím myší (nebo klávesnicí) na profil.
  // Klik / ťuknutí vede rovnou na profil; na dotyku je Adresář v profilu vedle „Zpět na nástěnku“.
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openMenu = () => {
    cancelClose();
    setMenuOpen(true);
  };
  const closeMenuSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
  };
  useEffect(() => cancelClose, []);
  const pick = (action: () => void) => {
    cancelClose();
    setMenuOpen(false);
    action();
  };

  return (
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
            {user ? (
              <div
                className="relative hidden md:block"
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') openMenu();
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse') closeMenuSoon();
                }}
                onFocus={(e) => {
                  if (e.target.matches(':focus-visible')) openMenu();
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeMenuSoon();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuOpen(false);
                }}
              >
                <button
                  onClick={() => pick(onOpenProfile)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`relative ${btnBase} !pl-1.5 !py-1 bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-white`}
                  title={unreadCount > 0 ? `Můj profil – ${unreadLabel(unreadCount)}` : 'Můj profil'}
                  aria-label={unreadCount > 0 ? `Můj profil, ${unreadLabel(unreadCount)}` : 'Můj profil'}
                >
                  <span className="relative shrink-0">
                    <span className="w-8 h-8 rounded-full border-2 border-[#111111] dark:border-stone-300 bg-[#FEF08A] text-[#111111] flex items-center justify-center font-bold text-xs">
                      {initials(user.name || user.email)}
                    </span>
                    <UnreadBadge count={unreadCount} />
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

                {menuOpen && (
                  <div className="absolute right-0 top-full pt-2 z-40">
                    <div
                      role="menu"
                      aria-label="Profil a Adresář"
                      className="min-w-48 p-1.5 rounded-xl bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-400 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-1"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => pick(onOpenProfile)}
                        className={`${menuItem} hover:bg-[#FEF08A] dark:hover:bg-[#323644]`}
                      >
                        <UserRound className="w-4 h-4 shrink-0" />
                        <span>Můj profil</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        aria-current={directoryActive ? 'page' : undefined}
                        onClick={() => pick(onOpenDirectory)}
                        className={`${menuItem} ${
                          directoryActive ? 'bg-[#FEF08A] dark:bg-[#FEF08A] dark:text-[#111111]' : 'hover:bg-[#FEF08A] dark:hover:bg-[#323644]'
                        }`}
                      >
                        <BookUser className="w-4 h-4 shrink-0" />
                        <span>Adresář</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenDirectory}
                  aria-pressed={directoryActive}
                  className={`${btnBase} ${
                    directoryActive
                      ? 'bg-[#FEF08A] text-[#111111]'
                      : 'bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-white'
                  }`}
                >
                  <BookUser className="w-4 h-4 shrink-0" />
                  <span>Adresář</span>
                </button>
                <button onClick={onLogin} className={`${btnBase} hidden md:inline-flex bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111]`}>
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Přihlásit</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
