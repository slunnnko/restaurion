// Mapování žádosti o ověření licence na veřejný typ (bez object_key a dokumentu).

import type { D1Database, Env } from '../_shared.ts';
import type { LicenceRequestStatus, OwnLicenceRequest } from '../../../src/types/api.ts';

export interface RequestRow {
  id: string;
  status: LicenceRequestStatus;
  licence_number: string;
  note: string | null;
  created_at: string;
  decided_at: string | null;
}

export function mapLicenceRequest(row: RequestRow): OwnLicenceRequest {
  return {
    id: row.id,
    status: row.status,
    licenceNumber: row.licence_number,
    ...(row.note ? { note: row.note } : {}),
    createdAt: row.created_at,
    ...(row.decided_at ? { decidedAt: row.decided_at } : {}),
  };
}

/**
 * Deletes the R2 object of a decided/replaced request, then clears object_key on the row.
 * If the delete fails the key stays on the row and the admin list sweeps it later. Returns true when the object is gone.
 */
export async function purgeDocument(db: D1Database, bucket: Env['LICENCE_DOCS'], id: string, key: string | null): Promise<boolean> {
  if (!key) return true;
  if (!bucket) return false;
  try {
    await bucket.delete(key);
    await db.prepare(`UPDATE licence_requests SET object_key = NULL WHERE id = ?`).bind(id).run();
    return true;
  } catch (err) {
    console.error('R2 delete failed, keeping object_key for the sweep:', key, err);
    return false;
  }
}
