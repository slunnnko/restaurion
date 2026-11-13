-- ==============================================================================
-- RESTAURION round 14 (D49): automatic licence check against the MK ČR restorer registry (rrkp.mkcr.cz)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0017_licence_check.sql
-- ALTER TABLE ADD COLUMN is not idempotent: this file runs ONCE as a whole (never apply it twice).
-- Take a D1 backup first when running --remote, and apply it BEFORE the Pages deploy.
-- licence_verified (0006) is reused: 1 only when the registry has the number AND the name matches.
-- ==============================================================================
ALTER TABLE profiles ADD COLUMN licence_checked_at TEXT;
-- 'verified' | 'not_found' | 'name_mismatch' | 'ambiguous' | 'unavailable'
ALTER TABLE profiles ADD COLUMN licence_check_result TEXT;
-- JSON array of permit scopes (only when verified)
ALTER TABLE profiles ADD COLUMN licence_scope TEXT;
-- id in the registry URL /rejstrik/<id> (only when verified)
ALTER TABLE profiles ADD COLUMN licence_registry_id TEXT;
