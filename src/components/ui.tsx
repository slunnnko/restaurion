'use client';

import React from 'react';
import { X, ChevronDown } from 'lucide-react';

// Sdílené třídy podle docs/UI-DESIGN.md (2px #111111 rámečky, tvrdé stíny, dark: varianty).
export const inputCls =
  'w-full h-11 px-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:bg-[#FEF08A]/25 dark:focus:border-[#FEF08A] outline-hidden transition-all';
export const dateInputCls = `${inputCls} block min-w-0`;
export const textareaCls =
  'w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:bg-[#FEF08A]/25 dark:focus:border-[#FEF08A] outline-hidden transition-all';
export const labelCls = 'block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1';
export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const secondaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-stone-100 bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-400 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:bg-stone-100 dark:hover:bg-[#323644] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const dangerBtn =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-[#111111] dark:text-white bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 border-2 border-[#111111] dark:border-rose-400/70 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const cardCls =
  'bg-white dark:bg-[#1C1E26] rounded-2xl border-2 border-[#111111] dark:border-stone-500 shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000]';

/** Chybový box s volitelným „Zkusit znovu“. */
export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div
    role="alert"
    className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 border-2 border-[#111111] dark:border-rose-400/70 text-xs font-bold text-rose-950 dark:text-rose-100 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000]"
  >
    <span>{message}</span>
    {onRetry && (
      <button type="button" onClick={onRetry} className={secondaryBtn}>
        Zkusit znovu
      </button>
    )}
  </div>
);

export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p className="mt-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300">{message}</p> : null;

/** Select s vlastní šipkou (Safari: appearance-none, h-11). */
export const SelectBox: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
> = ({ children, className, ...rest }) => (
  <div className="relative">
    <select
      {...rest}
      className={`w-full h-11 pl-3.5 pr-9 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-bold text-[#111111] dark:text-white focus:bg-[#FEF08A]/30 dark:focus:border-[#FEF08A] outline-hidden transition-all cursor-pointer appearance-none ${className ?? ''}`}
    >
      {children}
    </select>
    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
  </div>
);

/** Checkbox „pilulka“ pro obory. */
export const Pill: React.FC<{ checked: boolean; onChange: () => void; children: React.ReactNode }> = ({
  checked,
  onChange,
  children,
}) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={onChange}
    className={`px-3 py-1.5 rounded-lg border-2 border-[#111111] dark:border-stone-500 text-xs font-extrabold transition-all cursor-pointer ${
      checked
        ? 'bg-[#FEF08A] text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000]'
        : 'bg-[#FFFDF7] dark:bg-[#121318] text-[#111111] dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#262933]'
    }`}
  >
    {children}
  </button>
);

/** Společný rám modálu. */
export const ModalShell: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  labelledBy?: string;
}> = ({ onClose, children, maxWidth = 'max-w-lg', labelledBy }) => (
  <div
    className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-xs overflow-y-auto"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className={`bg-white dark:bg-[#1C1E26] rounded-3xl ${maxWidth} w-full my-auto p-6 sm:p-8 border-2 border-[#111111] dark:border-stone-300 shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_#000000] relative transition-colors`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Zavřít"
        className="absolute top-4 right-4 w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-stone-400 bg-[#FFFDF7] dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#FEF08A] text-[#111111] dark:text-white dark:hover:text-[#111111] flex items-center justify-center shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      {children}
    </div>
  </div>
);

export const ContactBox: React.FC<{ name: string; email: string; phone?: string; title?: string }> = ({
  name,
  email,
  phone,
  title = 'Kontakt',
}) => (
  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#111111] dark:border-emerald-500/60 text-xs font-bold text-emerald-950 dark:text-emerald-100 space-y-0.5 break-words">
    <div className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-800 dark:text-emerald-300">{title}</div>
    <div className="font-extrabold">{name}</div>
    <div>
      <a href={`mailto:${email}`} className="underline underline-offset-2">
        {email}
      </a>
    </div>
    {phone && (
      <div>
        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="underline underline-offset-2">
          {phone}
        </a>
      </div>
    )}
  </div>
);
