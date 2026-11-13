-- ==============================================================================
-- RESTAURION round 13 (D43, D45): ended engagements stay visible and can be reopened; photos per listing
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0016_history_and_photos.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote, and apply it BEFORE the Pages deploy.
-- engagements.ended_by (D43): profile id of the person who ended the engagement (declined / withdrawn / no deal).
-- NULL for active rows and for legacy rows; for those the side is derived in code (src/lib/engagementEnd.ts).
-- ==============================================================================

ALTER TABLE engagements ADD COLUMN ended_by TEXT;
