-- ==============================================================================
-- RESTAURION round 10 (D38): optional reason on the 'withdrawn' notification (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0013_withdraw_reason.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote.
-- Set when a worker withdraws with a reason (max 500 code points, validated in the API); it lives on the
-- notification, so later events on the engagement never rewrite it.
-- ==============================================================================

ALTER TABLE notifications ADD COLUMN reason TEXT;
