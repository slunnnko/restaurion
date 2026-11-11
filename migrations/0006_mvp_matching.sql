-- ==============================================================================
-- RESTAURION MVP: matching, engagements, notifications, login codes (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0006_mvp_matching.sql
-- (NOT `wrangler d1 migrations apply`: earlier migrations were applied with `execute`,
-- there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not idempotent: run ONCE.
-- ==============================================================================

-- profiles: worker profile fields (region and phone already exist)
ALTER TABLE profiles ADD COLUMN crafts TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN experience_text TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN portfolio_url TEXT;
ALTER TABLE profiles ADD COLUMN licence_number TEXT;
ALTER TABLE profiles ADD COLUMN licence_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN email_digest INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN accepting_jobs INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN consent_at TEXT;

-- Non-destructive backfill (copies only)
UPDATE profiles SET crafts = specializations_json WHERE crafts = '[]';
UPDATE profiles SET licence_number = mk_license_number WHERE licence_number IS NULL;
-- licence_verified is NOT backfilled from verification_status: the old unauthenticated endpoint allowed self-set values.

-- jobs: date range, visibility, expiry
ALTER TABLE jobs ADD COLUMN date_from TEXT;
ALTER TABLE jobs ADD COLUMN date_to TEXT;
ALTER TABLE jobs ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE jobs ADD COLUMN expires_at TEXT;

CREATE TABLE IF NOT EXISTS unavailability_blocks (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (date_from <= date_to)
);
CREATE INDEX IF NOT EXISTS idx_blocks_profile_to ON unavailability_blocks(profile_id, date_to);

CREATE TABLE IF NOT EXISTS engagements (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    initiated_by TEXT NOT NULL DEFAULT 'worker' CHECK (initiated_by IN ('worker', 'poster')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at TEXT,
    UNIQUE (job_id, worker_id)
);
CREATE INDEX IF NOT EXISTS idx_engagements_worker_status ON engagements(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_engagements_job ON engagements(job_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('job_match', 'interest', 'accepted', 'declined', 'withdrawn', 'job_closed')),
    job_id TEXT,
    engagement_id TEXT,
    read_at TEXT,
    emailed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_profile_read ON notifications(profile_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_emailed ON notifications(emailed_at);

CREATE TABLE IF NOT EXISTS login_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email);

CREATE TABLE IF NOT EXISTS rate_limit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_events(bucket, key_hash, created_at);

CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('login_code', 'digest')),
    profile_id TEXT,
    sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_log_sent ON email_log(sent_at);
