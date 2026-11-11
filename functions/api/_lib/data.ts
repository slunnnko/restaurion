// Načítání dat pro párování (nikdy nevrací e-mail ani telefon).

import { toCraftIds } from '../../../src/lib/crafts.ts';
import type { DateRange, EngagementSlot, MatchWorker } from '../../../src/lib/matching.ts';
import { safeJsonParse } from '../_shared.ts';
import type { D1Database } from '../_shared.ts';

/** Busy data of ONE user: all blocks and accepted engagements ending today or later. */
export async function loadBusySlots(
  db: D1Database,
  userId: string,
  today: string
): Promise<{ blocks: DateRange[]; engagements: EngagementSlot[] }> {
  const [blocks, engagements] = await Promise.all([
    db
      .prepare(`SELECT date_from, date_to FROM unavailability_blocks WHERE profile_id = ? AND date_to >= ?`)
      .bind(userId, today)
      .all<{ date_from: string; date_to: string }>(),
    db
      .prepare(
        `SELECT e.job_id, e.status, j.date_from, j.date_to FROM engagements e JOIN jobs j ON j.id = e.job_id
         WHERE e.worker_id = ? AND e.status = 'accepted' AND j.status = 'active' AND j.date_to >= ?
           AND j.job_type IN ('subcontract_needed', 'guarantor_needed')`
      )
      .bind(userId, today)
      .all<{ job_id: string; status: string; date_from: string; date_to: string }>(),
  ]);
  return {
    blocks: blocks.results.map((b) => ({ dateFrom: b.date_from, dateTo: b.date_to })),
    engagements: engagements.results.map((e) => ({
      jobId: e.job_id,
      status: e.status,
      dateFrom: e.date_from,
      dateTo: e.date_to,
    })),
  };
}

/** All workers accepting jobs (except the poster) with only the busy data overlapping the range. */
export async function loadMatchCandidates(
  db: D1Database,
  posterId: string,
  range: DateRange
): Promise<MatchWorker[]> {
  const [workers, blocks, engagements] = await Promise.all([
    db
      .prepare(`SELECT id, crafts FROM profiles WHERE accepting_jobs = 1 AND consent_at IS NOT NULL AND id != ?`)
      .bind(posterId)
      .all<{ id: string; crafts: string }>(),
    db
      .prepare(
        `SELECT profile_id, date_from, date_to FROM unavailability_blocks WHERE date_to >= ? AND date_from <= ?`
      )
      .bind(range.dateFrom, range.dateTo)
      .all<{ profile_id: string; date_from: string; date_to: string }>(),
    db
      .prepare(
        `SELECT e.worker_id, e.job_id, e.status, j.date_from, j.date_to
         FROM engagements e JOIN jobs j ON j.id = e.job_id
         WHERE e.status = 'accepted' AND j.status = 'active' AND j.date_to >= ? AND j.date_from <= ?
           AND j.job_type IN ('subcontract_needed', 'guarantor_needed')`
      )
      .bind(range.dateFrom, range.dateTo)
      .all<{ worker_id: string; job_id: string; status: string; date_from: string; date_to: string }>(),
  ]);

  const blocksBy = new Map<string, DateRange[]>();
  for (const b of blocks.results) {
    const list = blocksBy.get(b.profile_id) ?? [];
    list.push({ dateFrom: b.date_from, dateTo: b.date_to });
    blocksBy.set(b.profile_id, list);
  }
  const engBy = new Map<string, EngagementSlot[]>();
  for (const e of engagements.results) {
    const list = engBy.get(e.worker_id) ?? [];
    list.push({ jobId: e.job_id, status: e.status, dateFrom: e.date_from, dateTo: e.date_to });
    engBy.set(e.worker_id, list);
  }
  return workers.results.map((w) => ({
    id: w.id,
    acceptingJobs: true,
    crafts: toCraftIds(safeJsonParse<string[]>(w.crafts, [])),
    blocks: blocksBy.get(w.id) ?? [],
    engagements: engBy.get(w.id) ?? [],
  }));
}
