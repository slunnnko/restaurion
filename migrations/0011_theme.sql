-- ==============================================================================
-- RESTAURION round 8: theme preference per profile (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0011_theme.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote.
-- theme_preference: 'system' (follow the OS scheme), 'light' or 'dark'.
-- ==============================================================================

ALTER TABLE profiles ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('system','light','dark'));
