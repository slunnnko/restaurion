'use client';

import React from 'react';
import { HammerLogo } from './HammerLogo';

interface HeaderProps {
  onOpenCreateJob?: () => void;
  onOpenVerificationModal?: () => void;
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="sticky top-0 z-30 bg-[#140e0a]/95 backdrop-blur-xl border-b border-amber-900/40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand vlevo (viditelné i na mobilní verzi) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
              <HammerLogo className="w-6 h-6" />
            </div>
            <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-stone-100">
              Restaurion
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
