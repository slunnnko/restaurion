-- ==============================================================================
-- RESTAURION round 4: public directory (Adresar), contact links (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0007_directory.sql
-- (NOT `wrangler d1 migrations apply`: earlier migrations were applied with `execute`,
-- there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not idempotent: run ONCE.
-- ==============================================================================

-- profiles: directory group, opt-out flag and extra contact links (portfolio_url = "Web / portfolio")
ALTER TABLE profiles ADD COLUMN directory_group TEXT NOT NULL DEFAULT 'unlicensed'
    CHECK (directory_group IN ('firm', 'licensed', 'unlicensed'));
ALTER TABLE profiles ADD COLUMN directory_visible INTEGER NOT NULL DEFAULT 1;
-- Profiles that existed before this migration gave consent under the old terms (contacts only after
-- acceptance), so they are NOT listed until they opt in via the profile toggle. New profiles keep DEFAULT 1.
UPDATE profiles SET directory_visible = 0;
ALTER TABLE profiles ADD COLUMN instagram TEXT;
ALTER TABLE profiles ADD COLUMN whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN facebook TEXT;

-- Non-destructive backfill (group only; licence_verified is never touched)
UPDATE profiles SET directory_group = 'licensed' WHERE licence_number IS NOT NULL AND licence_number <> '';
UPDATE profiles SET directory_group = 'firm' WHERE role = 'atelier_firm';
