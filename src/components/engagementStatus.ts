import { EngagementStatus } from '@/types/api';

export const STATUS_LABEL: Record<EngagementStatus, string> = {
  pending: 'Čeká na rozhodnutí',
  accepted: 'Přijat',
  declined: 'Odmítnut',
  withdrawn: 'Odstoupil',
};
export const STATUS_CLS: Record<EngagementStatus, string> = {
  pending: 'bg-[#FEF08A] text-[#111111]',
  accepted: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200',
  declined: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
  withdrawn: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
};

const CONTACTED_CLS = 'bg-sky-100 dark:bg-sky-950 text-sky-950 dark:text-sky-200';

/** Label and colour of an engagement's status pill (D41: contact established, D40: invitation states). */
export function engagementBadge(e: {
  status: EngagementStatus;
  unconfirmed?: boolean;
  contactedAt?: string;
  initiatedBy?: 'worker' | 'poster';
}): { label: string; cls: string } {
  if (e.status === 'pending') {
    if (e.contactedAt) return { label: 'Kontakt navázán', cls: CONTACTED_CLS };
    if (e.unconfirmed) return { label: 'Nepotvrzeno', cls: STATUS_CLS.declined };
    if (e.initiatedBy === 'poster') return { label: 'Čeká na potvrzení', cls: STATUS_CLS.pending };
  }
  return { label: STATUS_LABEL[e.status], cls: STATUS_CLS[e.status] };
}
