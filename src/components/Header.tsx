'use client';

import React from 'react';
import { HammerLogo } from './HammerLogo';
import { UserProfile } from '@/types';
import { ShieldCheck, Camera, Moon, Sun, Settings2, Bell } from 'lucide-react';

interface HeaderProps {
  onOpenCreateJob?: () => void;
  onOpenVerificationModal?: () => void;
  onOpenAdministration?: () => void;
  currentUser?: UserProfile;
  onOpenCurrentUserProfile?: () => void;
  unreadNotificationsCount?: number;
  isAdmin?: boolean;
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVerificationModal,
  onOpenAdministration,
  currentUser,
  onOpenCurrentUserProfile,
  unreadNotificationsCount = 0,
  isAdmin = false,
  isDark = false,
  onToggleDark,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#181A20] border-b-2 border-[#111111] dark:border-stone-300 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between min-h-14 sm:min-h-16 py-2 gap-1.5 sm:gap-3">
          {/* Logo & Brand vlevo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FEF08A] border-2 border-[#111111] dark:border-stone-200 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] flex items-center justify-center text-[#111111] shrink-0">
              <HammerLogo className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-serif font-bold text-lg sm:text-2xl tracking-tight text-[#111111] dark:text-white truncate">
                Restaurion
              </span>
              <span className="hidden lg:inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-[#262933] border border-[#111111] dark:border-stone-400 text-[#111111] dark:text-stone-200">
                Památková řemesla
              </span>
            </div>
          </div>

          {/* Pravá strana: Přepínač Dark Mode + Ověření licence MK ČR + Administrace + Můj profil s notifikacemi */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2.5">
            {onToggleDark && (
              <button
                onClick={onToggleDark}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-[#FEF08A] border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] dark:hover:shadow-[1px_1px_0px_#F8FAFC] transition-all text-xs font-extrabold cursor-pointer"
                title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-[#FEF08A] shrink-0" />
                    <span className="hidden md:inline">Světlý</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#111111] shrink-0" />
                    <span className="hidden md:inline">Tmavý</span>
                  </>
                )}
              </button>
            )}

            {onOpenVerificationModal && (
              <button
                onClick={onOpenVerificationModal}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/90 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-400 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] dark:hover:shadow-[1px_1px_0px_#F8FAFC] transition-all text-xs font-extrabold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>Ověřit licenci MK ČR</span>
              </button>
            )}

            {onOpenAdministration && (
              <button
                onClick={onOpenAdministration}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] dark:hover:shadow-[1px_1px_0px_#F8FAFC] transition-all text-[11px] sm:text-xs font-extrabold cursor-pointer"
                title="Správa vlastních zadaných poptávek, nabídek a reakcí"
              >
                <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#111111] dark:text-[#FEF08A] shrink-0" />
                <span>Administrace</span>
                {isAdmin && (
                  <span className="hidden xs:inline-block sm:inline-block px-1.5 py-0.2 rounded bg-[#FF5733] text-white text-[9px] font-extrabold uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </button>
            )}

            {currentUser && onOpenCurrentUserProfile && (
              <button
                onClick={onOpenCurrentUserProfile}
                className="relative inline-flex items-center gap-2 pl-1 pr-1.5 sm:pl-1.5 sm:pr-3 py-1 rounded-xl bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] border-2 border-[#111111] dark:border-stone-300 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] dark:hover:shadow-[1px_1px_0px_#F8FAFC] transition-all cursor-pointer"
                title="Můj profil, upozornění na reakce a hodnocení"
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#111111] dark:border-stone-200 overflow-hidden bg-stone-200 shrink-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-bold text-xs text-[#111111]">
                      {currentUser.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-extrabold text-[#111111] dark:text-white leading-tight flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                  </div>
                  <div className="text-[10px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                    {unreadNotificationsCount > 0 ? (
                      <>
                        <Bell className="w-2.5 h-2.5 text-[#FF5733] fill-[#FF5733]" />
                        <span className="text-[#FF5733] dark:text-[#FF7F66] font-extrabold">
                          Můj profil ({unreadNotificationsCount} {unreadNotificationsCount === 1 ? 'nová reakce' : 'nové reakce'})
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-2.5 h-2.5" />
                        <span>Můj profil</span>
                      </>
                    )}
                  </div>
                </div>
                {unreadNotificationsCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-[#FF5733] text-white border-2 border-[#111111] dark:border-white text-[10px] font-extrabold flex items-center justify-center shadow-[1px_1px_0px_#111111]"
                    title={`${unreadNotificationsCount} nepřečtených upozornění na vaše zakázky`}
                  >
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
