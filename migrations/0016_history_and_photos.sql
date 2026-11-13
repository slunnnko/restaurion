-- ==============================================================================
-- RESTAURION round 13 (D43, D45): ended engagements stay visible and can be reopened; photos per listing
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0016_history_and_photos.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote, and apply it BEFORE the Pages deploy.
-- engagements.ended_by (D43): profile id of the person who ended the engagement (declined / withdrawn / no deal).
-- NULL for active rows and for legacy rows; for those the side is derived in code (src/lib/engagementEnd.ts).
-- ==============================================================================

ALTER TABLE engagements ADD COLUMN ended_by TEXT;

-- job_photos (D45): up to 6 photos per listing (limit enforced in code, MAX_JOB_PHOTOS). `url` is '/api/photos/<r2 key>'.
-- jobs.image_url stays for compatibility but is no longer written; the backfill copies it as photo position 0.
-- CREATE ... IF NOT EXISTS makes the table part safe to repeat; the backfill only inserts for jobs with no photo row yet.
CREATE TABLE IF NOT EXISTS job_photos (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_job_photos_job ON job_photos(job_id, position);

INSERT INTO job_photos (id, job_id, url, position)
SELECT lower(hex(randomblob(16))), j.id, j.image_url, 0
FROM jobs j
WHERE j.image_url IS NOT NULL AND j.image_url <> ''
  AND NOT EXISTS (SELECT 1 FROM job_photos p WHERE p.job_id = j.id);
