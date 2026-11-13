-- ==============================================================================
-- RESTAURION round 12 (D41): optional step "Kontakt navázán" between pending and accepted
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0015_contact_step.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote, and apply it BEFORE the Pages deploy.
-- engagements.contacted_at / contacted_by: set when either side confirms that contact was established
-- (contacted_by = profile id). Derived state, no new status: contacted = status 'pending' AND contacted_at IS NOT NULL.
-- notifications: the table is rebuilt (rows, order by rowid and both indexes are kept) WITHOUT any CHECK on `type`.
-- Types are validated in code by the NotificationType union (src/types/api.ts), so further types ('contacted',
-- 'no_deal', ...) never need another rebuild.
-- ==============================================================================

ALTER TABLE engagements ADD COLUMN contacted_at TEXT;
ALTER TABLE engagements ADD COLUMN contacted_by TEXT REFERENCES profiles(id);

CREATE TABLE notifications_new (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    job_id TEXT,
    engagement_id TEXT,
    read_at TEXT,
    emailed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT
);
INSERT INTO notifications_new (id, profile_id, type, job_id, engagement_id, read_at, emailed_at, created_at, reason)
    SELECT id, profile_id, type, job_id, engagement_id, read_at, emailed_at, created_at, reason FROM notifications ORDER BY rowid;
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;
CREATE INDEX IF NOT EXISTS idx_notifications_profile_read ON notifications(profile_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_emailed ON notifications(emailed_at);
