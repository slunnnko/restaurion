'use client';

import React, { useState } from 'react';
import { X, ChevronDown, Phone, Mail, Globe, AtSign, MessageCircle, Link2, Lock, Handshake } from 'lucide-react';
import { ContactInfo } from '@/types/api';

// Sdílené třídy podle docs/UI-DESIGN.md (2px #111111 rámečky, tvrdé stíny, dark: varianty).
export const inputCls =
  'w-full h-11 px-3.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:bg-[#FEF08A]/25 dark:focus:border-[#FEF08A] outline-hidden transition-all';
export const dateInputCls = `${inputCls} block min-w-0`;

/** Drops text colour classes (text-[#…], text-white, text-stone-…, dark: variants) but keeps sizes such as text-sm. */
const stripTextColour = (cls: string): string =>
  cls
    .split(/\s+/)
    .filter((c) => !/^(dark:)?text-(\[#?[0-9a-fA-F]+\]|white|black|transparent|(stone|gray|slate|zinc|neutral|red|emerald|blue|yellow)-\d+)$/.test(c))
    .join(' ');

/**
 * Date input that never looks prefilled: Safari shows an empty date as today's date in grey, so while the
 * value is empty the native text is made transparent and "Nevyplněno" is overlaid. No default value is set.
 */
export const DateInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { value: string }> = ({
  className,
  value,
  ...rest
}) => (
  <div className="relative">
    <input
      {...rest}
      type="date"
      value={value}
      className={value ? (className ?? dateInputCls) : `${stripTextColour(className ?? dateInputCls)} text-transparent`}
    />
    {!value && (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500 dark:text-stone-400"
      >
        Nevyplněno
      </span>
    )}
  </div>
);

export const textareaCls =
  'w-full px-3.5 py-2.5 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] text-sm font-semibold text-[#111111] dark:text-white placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:bg-[#FEF08A]/25 dark:focus:border-[#FEF08A] outline-hidden transition-all';
export const labelCls = 'block text-xs font-extrabold text-[#111111] dark:text-stone-200 mb-1';
/** Tlačítka mají jednotnou velikost (D36): min. 40 px, `px-4 py-2`, `text-xs sm:text-sm`. */
export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const secondaryBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-stone-100 bg-white dark:bg-[#252834] border-2 border-[#111111] dark:border-stone-400 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:bg-stone-100 dark:hover:bg-[#323644] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const dangerBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-[#111111] dark:text-white bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 border-2 border-[#111111] dark:border-rose-400/70 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
/** D41: „Kontakt navázán“ – jedno kliknutí, bez potvrzování. */
export const ContactButton: React.FC<{ onClick: () => void; disabled?: boolean; small?: boolean }> = ({ onClick, disabled, small }) => (
  <button type="button" disabled={disabled} onClick={onClick} className={`${secondaryBtn} ${small ? '!min-h-8 !px-2.5 !py-1' : ''}`}>
    <Handshake className="w-3.5 h-3.5" />
    <span>Kontakt navázán</span>
  </button>
);

/** D41: „Nedohodli jsme se“ s krátkým potvrzením přímo v místě (bez window.confirm). */
export const NoDealButton: React.FC<{ onConfirm: () => void; disabled?: boolean; small?: boolean }> = ({ onConfirm, disabled, small }) => {
  const [asking, setAsking] = useState(false);
  const size = small ? '!min-h-8 !px-2.5 !py-1' : '';
  if (!asking) {
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className={`${dangerBtn} ${size}`}>
        Nedohodli jsme se
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs font-extrabold text-[#111111] dark:text-stone-100">Opravdu ukončit?</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={`${dangerBtn} ${size}`}
      >
        Ano, nedohodli jsme se
      </button>
      <button type="button" disabled={disabled} onClick={() => setAsking(false)} className={`${secondaryBtn} ${size}`}>
        Zpět
      </button>
    </span>
  );
};

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

/** Pouze http(s) odkaz; jinak null (ochrana proti javascript: apod.). */
export function safeHttpUrl(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

const contactLinkCls =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-[#111111] dark:border-stone-400 bg-white dark:bg-[#252834] hover:bg-[#FEF08A] dark:hover:bg-[#323644] text-[11px] font-extrabold text-[#111111] dark:text-stone-100 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] transition-all break-all';

/** Řádek odkazů na kontakty (jen pro přihlášené). Každý odkaz je ikona + popisek. */
export const ContactLinks: React.FC<{ contact: ContactInfo }> = ({ contact }) => {
  const website = contact.website ? safeHttpUrl(contact.website) : null;
  const facebook = contact.facebook ? safeHttpUrl(contact.facebook) : null;
  const [copied, setCopied] = useState(false);
  const waHandle = !!contact.whatsapp && contact.whatsapp.startsWith('@');
  const waDigits = contact.whatsapp && !waHandle ? contact.whatsapp.replace(/\D/g, '') : '';
  return (
    <div className="flex flex-wrap gap-1.5">
      {contact.phone && (
        <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className={contactLinkCls}>
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{contact.phone}</span>
        </a>
      )}
      <a href={`mailto:${contact.email}`} className={contactLinkCls}>
        <Mail className="w-3.5 h-3.5 shrink-0" />
        <span>{contact.email}</span>
      </a>
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" className={contactLinkCls}>
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>Web</span>
        </a>
      )}
      {contact.instagram && (
        <a
          href={`https://instagram.com/${encodeURIComponent(contact.instagram)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={contactLinkCls}
        >
          <AtSign className="w-3.5 h-3.5 shrink-0" />
          <span>Instagram</span>
        </a>
      )}
      {waHandle && (
        <button
          type="button"
          title="Zkopírovat uživatelské jméno"
          className={contactLinkCls}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(contact.whatsapp ?? '');
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard unavailable: ignore */
            }
          }}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{copied ? 'Zkopírováno' : `WhatsApp ${contact.whatsapp}`}</span>
        </button>
      )}
      {waDigits && (
        <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" className={contactLinkCls}>
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>WhatsApp</span>
        </a>
      )}
      {facebook && (
        <a href={facebook} target="_blank" rel="noopener noreferrer" className={contactLinkCls}>
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span>Facebook</span>
        </a>
      )}
    </div>
  );
};

/** Kontakty pro přihlášeného; anonym dostane tlačítko pro přihlášení. */
export const ContactsOrLogin: React.FC<{ contact?: ContactInfo; onLogin: () => void }> = ({ contact, onLogin }) =>
  contact ? (
    <ContactLinks contact={contact} />
  ) : (
    <button type="button" onClick={onLogin} className={`${contactLinkCls} cursor-pointer`}>
      <Lock className="w-3.5 h-3.5 shrink-0" />
      <span>Kontakty uvidíš po přihlášení</span>
    </button>
  );

export const ContactBox: React.FC<{ contact: ContactInfo; title?: string }> = ({ contact, title = 'Kontakt' }) => (
  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#111111] dark:border-emerald-500/60 text-xs font-bold text-emerald-950 dark:text-emerald-100 space-y-1.5 break-words">
    <div className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-800 dark:text-emerald-300">{title}</div>
    <div className="font-extrabold">{contact.name}</div>
    <ContactLinks contact={contact} />
  </div>
);

/** Číslo nepřečtených upozornění (jako na Facebooku). Rodič musí být `relative`. */
export const UnreadBadge: React.FC<{ count: number }> = ({ count }) =>
  count <= 0 ? null : (
    <span
      aria-hidden="true"
      className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 rounded-full bg-[#FF5733] text-white border-2 border-[#111111] dark:border-white text-[10px] font-extrabold flex items-center justify-center shadow-[1px_1px_0px_#111111]"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
