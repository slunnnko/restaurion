// D43: who ended an engagement and who may reopen it. Pure logic shared by the API and the tests.

import type { EngagementStatus } from '../types/api.ts';

export type EndSide = 'worker' | 'poster';

export interface EndedRow {
  status: string;
  initiated_by: string;
  ended_by: string | null;
  worker_id: string;
  author_id: string;
  contacted_at: string | null;
}

export function isEndedStatus(status: string): status is Extract<EngagementStatus, 'declined' | 'withdrawn'> {
  return status === 'declined' || status === 'withdrawn';
}

/**
 * Side that ended the engagement; 'either' = a legacy no-deal row (contact confirmed, nobody recorded); null = not ended.
 * Legacy rows (ended_by NULL): worker-initiated declined → poster, withdrawn → worker; invitation declined → worker, withdrawn → poster.
 */
export function endedSide(e: EndedRow): EndSide | 'either' | null {
  if (!isEndedStatus(e.status)) return null;
  if (e.ended_by === e.worker_id) return 'worker';
  if (e.ended_by === e.author_id) return 'poster';
  if (e.contacted_at) return 'either';
  const invite = e.initiated_by === 'poster';
  if (e.status === 'declined') return invite ? 'worker' : 'poster';
  return invite ? 'poster' : 'worker';
}

/** Extra fields of an ended row for one viewer (`endedBy` only when the side is known, `canReopen` only for the ending side). */
export function endedFields(e: EndedRow, viewerId: string, jobOpen: boolean): { endedBy?: EndSide; canReopen?: true } {
  const side = endedSide(e);
  if (!side) return {};
  const viewerSide: EndSide | null = viewerId === e.worker_id ? 'worker' : viewerId === e.author_id ? 'poster' : null;
  const mayReopen = jobOpen && viewerSide !== null && (side === 'either' || side === viewerSide);
  return { ...(side !== 'either' ? { endedBy: side } : {}), ...(mayReopen ? { canReopen: true as const } : {}) };
}
