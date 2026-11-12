-- ==============================================================================
-- RESTAURION round 9 (D35): first / last name parts (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0012_name_parts.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote.
-- `name` stays the display column everywhere; it is derived from first_name + last_name on every profile write.
-- Backfill: a firm (directory_group = 'firm') keeps the whole name as first_name; others: first_name = text before the first space (or the whole name), last_name = the rest.
-- ==============================================================================

ALTER TABLE profiles ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN last_name TEXT NOT NULL DEFAULT '';

UPDATE profiles SET
  first_name = CASE WHEN directory_group <> 'firm' AND instr(trim(name), ' ') > 0 THEN substr(trim(name), 1, instr(trim(name), ' ') - 1) ELSE trim(name) END,
  last_name  = CASE WHEN directory_group <> 'firm' AND instr(trim(name), ' ') > 0 THEN trim(substr(trim(name), instr(trim(name), ' ') + 1)) ELSE '' END;
