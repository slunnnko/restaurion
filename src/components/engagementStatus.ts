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
