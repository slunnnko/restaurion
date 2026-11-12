'use client';

import React, { useEffect, useRef, useState } from 'react';

export const iconBtn =
  'inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-[#111111] dark:border-stone-400 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

export interface MenuAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  actions: MenuAction[];
  triggerIcon: React.ComponentType<{ className?: string }>;
  triggerLabel: string;
}

const yellowCls = 'bg-[#FEF08A] hover:bg-[#FDE047] text-[#111111]';
const dangerCls = 'bg-[#DC2626] hover:bg-[#B91C1C] text-white';

/** Akce vlastníka / správce: jedna ikona. Jedna akce se spustí rovnou, dvě a více otevřou menu (klik, stejně na dotyku i myši). */
export const ActionMenu: React.FC<ActionMenuProps> = ({ actions, triggerIcon: TriggerIcon, triggerLabel }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = menuItems();
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next].focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    menuItems()[0]?.focus();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (actions.length === 0) return null;

  if (actions.length === 1) {
    const a = actions[0];
    const Icon = a.icon;
    return (
      <button
        type="button"
        disabled={a.disabled}
        onClick={a.onSelect}
        aria-label={a.label}
        title={a.label}
        className={`${iconBtn} ${a.danger ? dangerCls : yellowCls}`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onBlur={(e) => {
        if (open && !wrapRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${iconBtn} ${yellowCls}`}
      >
        <TriggerIcon className="w-4 h-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
          role="menu"
          aria-label={triggerLabel}
          className="absolute right-0 top-full mt-2 z-20 min-w-44 p-1.5 rounded-xl bg-white dark:bg-[#1C1E26] border-2 border-[#111111] dark:border-stone-400 shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#000000] space-y-1"
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onClick={() => {
                  setOpen(false);
                  a.onSelect();
                }}
                className={`w-full flex items-center gap-2 min-h-10 px-3 py-2 rounded-lg text-left text-xs sm:text-sm font-extrabold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  a.danger
                    ? 'text-[#B91C1C] dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60'
                    : 'text-[#111111] dark:text-white hover:bg-[#FEF08A] dark:hover:bg-[#323644]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
