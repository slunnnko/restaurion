'use client';

import React from 'react';
import { UserProfile } from '@/types';
import {
  X,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !user) return null;

  const isLicensed = user.role === 'licensed_restorer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profilová hlavička */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-white flex items-center justify-center font-serif text-2xl font-bold shadow-md shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                {user.name}
              </h2>
              {isLicensed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Ověřená licence MK ČR
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              {user.title || 'Odborný řemeslník v památkové péči'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>{user.city} ({user.region})</span>
            </div>
          </div>
        </div>

        {/* Dostupnost */}
        <div className="mb-6 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-800">
              {user.availability === 'available_now' ? 'Volné kapacity ihned k dispozici' : 'Dostupný od data'}
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {user.completedJobsCount} realizovaných zakázek
          </span>
        </div>

        {/* Informace o licenci MK ČR */}
        {isLicensed && user.mkLicenseNumber && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <div className="flex items-center justify-between mb-1.5 font-semibold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Oficiální povolení k restaurování MK ČR
              </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
                {user.mkLicenseNumber}
              </span>
            </div>
            <p className="text-emerald-950/80 mb-2">
              Rozsah oprávnění: {user.mkLicenseFields?.join(', ')}
            </p>
            <div className="text-[11px] text-emerald-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Automaticky ověřeno ve veřejném seznamu MK ČR</span>
            </div>
          </div>
        )}

        {/* Vzdělání / Ateliér */}
        {user.schoolOrBackground && (
          <div className="mb-5 flex items-start gap-2.5 text-xs text-stone-700">
            <GraduationCap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block">Vzdělání a praxe</span>
              <span>{user.schoolOrBackground}</span>
            </div>
          </div>
        )}

        {/* O mně */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
            O mně & specializace
          </h4>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-3">
            {user.bio}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {user.specializations.map((spec, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Reference od kolegů */}
        <div className="mb-6 p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-900 mb-1">
            <Award className="w-4 h-4 text-amber-700" />
            <span>Kolegiální reference ({user.colleagueEndorsementsCount})</span>
          </div>
          <p className="text-stone-600 text-[11px]">
            Ověřeno a doporučeno {user.colleagueEndorsementsCount} kolegy z oboru (licencovanými restaurátory i spolupracujícími řemeslníky).
          </p>
        </div>

        {/* Kontakty */}
        <div className="pt-4 border-t border-stone-200 space-y-2">
          {user.phone && (
            <a
              href={`tel:${user.phone}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 transition-colors shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>Zavolat ({user.phone})</span>
            </a>
          )}
          <a
            href={`mailto:${user.email}`}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs sm:text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            <Mail className="w-4 h-4 text-stone-500" />
            <span>Napsat e-mail ({user.email})</span>
          </a>
        </div>
      </div>
    </div>
  );
};
