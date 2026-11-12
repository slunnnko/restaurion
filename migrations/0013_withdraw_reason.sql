-- ==============================================================================
-- RESTAURION round 10 (D38): optional reason when a worker withdraws (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0013_withdraw_reason.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote.
-- Set on withdraw (max 500 chars, validated in the API), cleared when the worker re-opens the interest.
-- ==============================================================================

ALTER TABLE engagements ADD COLUMN withdraw_reason TEXT;
