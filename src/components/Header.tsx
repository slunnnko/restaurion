'use client';

import React from 'react';
import { HammerLogo } from './HammerLogo';
import { FeatureFlags, UserProfile } from '@/types';
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
  featureFlags?: FeatureFlags;
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
  featureFlags,
}) => {
  const ffWhiteShadows = Boolean(featureFlags?.darkWhiteShadows);
  const ffHeaderAdmin = Boolean(featureFlags?.headerAdministration);
  const ffMobileCompact = Boolean(featureFlags?.mobileCompactUi);

  const shadowSm = ffWhiteShadows
    ? 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#F8FAFC]'
    : 'shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]';
  const hoverShadowSm = ffWhiteShadows
    ? 'hover:shadow-[1px_1px_0px_#111111] dark:hover:shadow-[1px_1px_0px_#F8FAFC]'
    : 'hover:shadow-[1px_1px_0px_#111111]';

  return (
    <header
      className={`sticky top-0 z-30 bg-white dark:bg-[#181A20] border-b-2 border-[#111111] ${
        ffWhiteShadows ? 'dark:border-stone-300' : 'dark:border-[#E2E8F0]/30'
      } transition-colors`}
    >
      <div className={`max-w-7xl mx-auto ${ffMobileCompact ? 'px-3 sm:px-6 lg:px-8' : 'px-4 sm:px-6 lg:px-8'}`}>
        <div
          className={
            ffMobileCompact
              ? 'flex flex-wrap items-center justify-between min-h-14 sm:min-h-16 py-2 gap-1.5 sm:gap-3'
              : 'flex items-center justify-between h-16 gap-2 sm:gap-3'
          }
        >
          {/* Logo & Brand vlevo */}
          <div className={`flex items-center ${ffMobileCompact ? 'gap-2 sm:gap-3 min-w-0' : 'gap-2.5 sm:gap-3'}`}>
            <div
              className={`${
                ffMobileCompact ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-10 h-10'
              } rounded-xl bg-[#FEF08A] border-2 border-[#111111] ${
                ffWhiteShadows ? 'dark:border-stone-200' : ''
              } ${shadowSm} flex items-center justify-center text-[#111111] shrink-0`}
            >
              <HammerLogo className={ffMobileCompact ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-5 h-5'} />
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                className={`font-serif font-bold ${
                  ffMobileCompact ? 'text-lg sm:text-2xl truncate' : 'text-xl sm:text-2xl'
                } tracking-tight text-[#111111] dark:text-white`}
              >
                Restaurion
              </span>
              <span className="hidden lg:inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-[#262933] border border-[#111111] dark:border-stone-500 text-[#111111] dark:text-stone-200">
                Památková řemesla
              </span>
            </div>
          </div>

          {/* Pravá strana: Přepínač Dark Mode + Ověření licence MK ČR + (volitelně Administrace) + Můj profil */}
          <div
            className={
              ffMobileCompact
                ? 'flex flex-wrap items-center justify-end gap-1.5 sm:gap-2.5'
                : 'flex items-center gap-2 sm:gap-3'
            }
          >
            {onToggleDark && (
              <button
                onClick={onToggleDark}
                className={`inline-flex items-center gap-1.5 ${
                  ffMobileCompact ? 'px-2.5 sm:px-3' : 'px-3'
                } py-1.5 rounded-xl bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-[#FEF08A] border-2 border-[#111111] ${
                  ffWhiteShadows ? 'dark:border-stone-300' : 'dark:border-stone-400'
                } ${shadowSm} hover:translate-x-[1px] hover:translate-y-[1px] ${hoverShadowSm} transition-all text-xs font-extrabold cursor-pointer`}
                title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-[#FEF08A] shrink-0" />
                    <span className={ffMobileCompact ? 'hidden md:inline' : ''}>Světlý</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#111111] shrink-0" />
                    <span className={ffMobileCompact ? 'hidden md:inline' : ''}>Tmavý</span>
                  </>
                )}
              </button>
            )}

            {onOpenVerificationModal && (
              <button
                onClick={onOpenVerificationModal}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/90 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-950 dark:text-emerald-200 border-2 border-[#111111] dark:border-emerald-500/70 ${shadowSm} hover:translate-x-[1px] hover:translate-y-[1px] ${hoverShadowSm} transition-all text-xs font-extrabold cursor-pointer`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>Ověřit licenci MK ČR</span>
              </button>
            )}

            {ffHeaderAdmin && onOpenAdministration && (
              <button
                onClick={onOpenAdministration}
                className={`inline-flex items-center gap-1 sm:gap-1.5 ${
                  ffMobileCompact ? 'px-2.5 sm:px-3 text-[11px] sm:text-xs' : 'px-3 text-xs'
                } py-1.5 rounded-xl bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[#111111] dark:text-white border-2 border-[#111111] ${
                  ffWhiteShadows ? 'dark:border-stone-300' : 'dark:border-stone-400'
                } ${shadowSm} hover:translate-x-[1px] hover:translate-y-[1px] ${hoverShadowSm} transition-all font-extrabold cursor-pointer`}
                title="Správa vlastních zadaných poptávek, nabídek a reakcí"
              >
                <Settings2 className="w-4 h-4 text-[#111111] dark:text-[#FEF08A] shrink-0" />
                <span>Administrace</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 rounded bg-[#FF5733] text-white text-[9px] font-extrabold uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </button>
            )}

            {currentUser && onOpenCurrentUserProfile && (
              <button
                onClick={onOpenCurrentUserProfile}
                className={`relative inline-flex items-center gap-2 ${
                  ffMobileCompact ? 'pl-1 pr-1.5 sm:pl-1.5 sm:pr-3' : 'pl-1.5 pr-2.5 sm:pr-3'
                } py-1 rounded-xl bg-[#FFFDF7] dark:bg-[#262933] hover:bg-[#FEF08A] dark:hover:bg-[#323644] border-2 border-[#111111] ${
                  ffWhiteShadows ? 'dark:border-stone-300' : 'dark:border-stone-400'
                } ${shadowSm} hover:translate-x-[1px] hover:translate-y-[1px] ${hoverShadowSm} transition-all cursor-pointer`}
                title="Zobrazit profil, správu a nastavení"
              >
                <div
                  className={`relative ${
                    ffMobileCompact ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8'
                  } rounded-full border-2 border-[#111111] dark:border-stone-300 overflow-hidden bg-stone-200 shrink-0`}
                >
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
                  <div className="text-xs font-extrabold text-[#111111] dark:text-white leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                    {ffHeaderAdmin && unreadNotificationsCount > 0 ? (
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
                {ffHeaderAdmin && unreadNotificationsCount > 0 && (
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
