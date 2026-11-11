-- ==============================================================================
-- RESTAURION round 5: licence verification by document (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0008_licence_requests.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) Take a D1 backup first when running --remote.
-- Admin soft delete of listings needs NO migration: it uses the existing jobs.visibility column ('deleted').
-- The documents themselves live in the private R2 bucket (binding LICENCE_DOCS), not in D1.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS licence_requests (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    licence_number TEXT NOT NULL,
    object_key TEXT, -- NULL once the R2 object is deleted (kept on the row only while a delete failed)
    content_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'replaced')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_licence_requests_profile ON licence_requests(profile_id, created_at);
CREATE INDEX IF NOT EXISTS idx_licence_requests_status ON licence_requests(status, created_at);
