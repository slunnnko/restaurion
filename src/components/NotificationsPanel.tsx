'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { NotificationItem } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { pluralDays } from '@/lib/format';
import { ModalShell, ErrorBox } from './ui';
import { Bell } from 'lucide-react';

interface NotificationsPanelProps {
  onClose: () => void;
  /** Aktualizace počtu nepřečtených po načtení / označení za přečtené. */
  onUnreadChange: (unread: number) => void;
  /** Kliknutí na upozornění s jobId; panel se předtím zavře. */
  onOpenJob: (jobId: string) => void;
  /** D40: upozornění na poptávky (přímé inzeráty nejsou na nástěnce) otevře profil. */
  onOpenProfile: () => void;
}

const INVITE_TYPES: NotificationItem['type'][] = ['invited', 'invite_accepted', 'invite_declined', 'invite_cancelled'];

export function notificationText(n: NotificationItem): string {
  const title = n.jobTitle ?? 'zakázka';
  switch (n.type) {
    case 'job_match':
      return `Nová zakázka ve tvém oboru: ${title}`;
    case 'interest':
      return `Nový zájemce o inzerát ${title}`;
    case 'accepted':
      return `Zadavatel tě přijal na zakázku ${title}`;
    case 'declined':
      return `Zadavatel u zakázky ${title} vybral jinak`;
    case 'withdrawn':
      return `Řemeslník odstoupil od zakázky ${title}`;
    case 'job_closed':
      return `Zakázka ${title} byla ukončena`;
    case 'invited':
      return n.posterName ? `${n.posterName} ti poslal poptávku: ${title}` : `Nová poptávka pro tebe: ${title}`;
    case 'invite_accepted':
      return `Poptávku ${title} potvrdil řemeslník`;
    case 'invite_declined':
      return `Poptávku ${title} řemeslník odmítl`;
    case 'invite_cancelled':
      return `Poptávka ${title} byla zrušena`;
    default:
      return title;
  }
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose, onUnreadChange, onOpenJob, onOpenProfile }) => {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setItems(null);
    try {
      const data = await api<{ items: NotificationItem[]; unread: number }>('/api/notifications');
      setItems(data.items);
      onUnreadChange(data.unread);
      if (data.unread > 0) {
        try {
          const read = await api<{ unread: number }>('/api/notifications/read', { method: 'POST', body: {} });
          onUnreadChange(read.unread);
        } catch {
          // zůstane nepřečtené, příště se označí znovu
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upozornění se nepodařilo načíst.');
    }
  }, [onUnreadChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // načíst jen při otevření
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalShell onClose={onClose} labelledBy="notif-title">
      <div className="flex items-center gap-3 mb-4 pr-10">
        <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center">
          <Bell className="w-5 h-5" />
        </div>
        <h2 id="notif-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white">
          Upozornění
        </h2>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={() => void load()} />
      ) : items === null ? (
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Načítám…</p>
      ) : items.length === 0 ? (
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Zatím tu nic není.</p>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                disabled={!n.jobId && !INVITE_TYPES.includes(n.type)}
                onClick={() => (INVITE_TYPES.includes(n.type) ? onOpenProfile() : n.jobId && onOpenJob(n.jobId))}
                className={`w-full text-left p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 text-xs font-bold text-[#111111] dark:text-stone-100 transition-all ${
                  n.read ? 'bg-[#FFFDF7] dark:bg-[#121318]' : 'bg-[#FEF08A]/60 dark:bg-[#FEF08A]/15'
                } ${n.jobId || INVITE_TYPES.includes(n.type) ? 'hover:bg-[#FEF08A] dark:hover:bg-[#323644] cursor-pointer' : 'cursor-default'}`}
              >
                <div className="break-words">{notificationText(n)}</div>
                {n.type === 'job_match' && n.busyDays !== undefined && n.busyDays > 0 && (
                  <div className="mt-1 text-[11px] text-stone-700 dark:text-stone-300">
                    V tomto termínu máš {pluralDays(n.busyDays)} obsazeno
                  </div>
                )}
                {n.type === 'withdrawn' && n.reason && (
                  <div className="mt-1 text-xs font-semibold text-stone-700 dark:text-stone-300 break-words whitespace-pre-line">
                    Důvod: {n.reason}
                  </div>
                )}
                <div className="mt-1 text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                  {n.createdAt.slice(0, 16).replace('T', ' ')}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
};
