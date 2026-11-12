-- ==============================================================================
-- RESTAURION round 11 (D40): "Poptat spolupráci" = invitation from the poster to the offerer
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0014_invitations.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote, and apply it BEFORE the Pages deploy.
-- engagements.respond_by: YYYY-MM-DD, set only for poster-initiated invitations (today + 3 days).
-- jobs.direct_to: the invited person of a direct listing (jobs.visibility = 'direct').
-- notifications: the CHECK on `type` cannot be altered in SQLite, so the table is rebuilt with the new types
-- ('invited', 'invite_accepted', 'invite_declined', 'invite_cancelled'); rows, order (rowid) and indexes are kept.
-- ==============================================================================

ALTER TABLE engagements ADD COLUMN respond_by TEXT;
ALTER TABLE jobs ADD COLUMN direct_to TEXT REFERENCES profiles(id);

CREATE TABLE notifications_new (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('job_match', 'interest', 'accepted', 'declined', 'withdrawn', 'job_closed',
                                       'invited', 'invite_accepted', 'invite_declined', 'invite_cancelled')),
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
