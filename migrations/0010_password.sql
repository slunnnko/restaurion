-- ==============================================================================
-- RESTAURION round 7: optional password login (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0010_password.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote.
-- password_hash is `pbkdf2-sha256$<iterations>$<saltB64>$<hashB64>`; NULL = no password set (code login only).
-- ==============================================================================

ALTER TABLE profiles ADD COLUMN password_hash TEXT;
ALTER TABLE profiles ADD COLUMN password_set_at TEXT;
