// Čistá logika párování zakázek a řemeslníků (bez závislostí; používá ji backend i testy).

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export interface EngagementSlot extends DateRange {
  jobId: string;
  status: string;
}

export interface MatchJob extends DateRange {
  id: string;
  posterId: string;
  status: string;
  expiresAt: string | null;
  crafts: string[];
}

export interface MatchWorker {
  id: string;
  acceptingJobs: boolean;
  crafts: string[];
  blocks: DateRange[];
  engagements: EngagementSlot[];
}

export interface MatchResult {
  matches: boolean;
  busyDays: number;
  totalDays: number;
  reason?: 'inactive' | 'expired' | 'not_accepting' | 'own_job' | 'craft_mismatch' | 'fully_busy';
}

const DAY_MS = 86_400_000;

function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/** Počet kalendářních dnů v rozsahu včetně obou krajů (0, pokud je rozsah obrácený). */
export function daysInRange(from: string, to: string): number {
  return Math.max(0, dayNumber(to) - dayNumber(from) + 1);
}

/** Počet různých dnů rozsahu, které kryje blok nebo přijatá zakázka (kromě excludeJobId). */
export function countBusyDays(
  range: DateRange,
  blocks: DateRange[],
  engagements: EngagementSlot[],
  excludeJobId?: string
): number {
  const start = dayNumber(range.dateFrom);
  const end = dayNumber(range.dateTo);
  const busy = new Set<number>();
  const add = (r: DateRange) => {
    const from = Math.max(start, dayNumber(r.dateFrom));
    const to = Math.min(end, dayNumber(r.dateTo));
    for (let d = from; d <= to; d++) busy.add(d);
  };
  blocks.forEach(add);
  engagements.filter((e) => e.status === 'accepted' && e.jobId !== excludeJobId).forEach(add);
  return busy.size;
}

export function evaluateMatch(job: MatchJob, worker: MatchWorker, today: string): MatchResult {
  const totalDays = daysInRange(job.dateFrom, job.dateTo);
  const busyDays = countBusyDays(job, worker.blocks, worker.engagements, job.id);
  const fail = (reason: MatchResult['reason']): MatchResult => ({ matches: false, busyDays, totalDays, reason });

  if (job.status !== 'active') return fail('inactive');
  if (!job.expiresAt || job.expiresAt < today) return fail('expired');
  if (!worker.acceptingJobs) return fail('not_accepting');
  if (worker.id === job.posterId) return fail('own_job');
  if (!job.crafts.some((c) => worker.crafts.includes(c))) return fail('craft_mismatch');
  if (busyDays >= totalDays) return fail('fully_busy');
  return { matches: true, busyDays, totalDays };
}

/** Poptat spolupráci: zadavatel má 3 dny na potvrzení pozvánky (API i UI berou číslo odsud). */
export const INVITE_RESPOND_DAYS = 3;

export interface OfferForFit extends DateRange {
  authorId: string;
  crafts: string[];
}

export interface JobForFit extends DateRange {
  authorId: string;
  jobType: string;
  status: string;
  expiresAt: string | null;
  crafts: string[];
}

export interface OfferFitResult {
  fits: boolean;
  reason?: 'not_a_job' | 'inactive' | 'expired' | 'own' | 'craft_mismatch' | 'no_overlap';
}

/** Hodí se zakázka zadavatele k nabídce „Nabízím se“ (obor, termín, aktivní, ne vlastní)? */
export function offerFitsJob(offer: OfferForFit, job: JobForFit, today: string): OfferFitResult {
  const fail = (reason: OfferFitResult['reason']): OfferFitResult => ({ fits: false, reason });
  if (job.jobType === 'craftsman_available') return fail('not_a_job');
  if (job.status !== 'active') return fail('inactive');
  if (!job.expiresAt || job.expiresAt < today) return fail('expired');
  if (job.authorId === offer.authorId) return fail('own');
  if (!job.crafts.some((c) => offer.crafts.includes(c))) return fail('craft_mismatch');
  if (job.dateFrom > offer.dateTo || job.dateTo < offer.dateFrom) return fail('no_overlap');
  return { fits: true };
}
