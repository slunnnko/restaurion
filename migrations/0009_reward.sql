-- ==============================================================================
-- RESTAURION round 6: structured reward of jobs and offers (ADDITIVE ONLY)
-- Apply with: npx wrangler d1 execute restaurion-db --local|--remote --file=./migrations/0009_reward.sql
-- (NOT `wrangler d1 migrations apply`: there is no d1_migrations table.) ALTER TABLE ADD COLUMN is not
-- idempotent: run ONCE. Take a D1 backup first when running --remote.
-- Existing rows keep NULL here and keep showing jobs.budget_note. New rows also get budget_note
-- as a derived human string ("450 Kč/hod"), so the digest, e-mails and old clients keep working.
-- ==============================================================================

ALTER TABLE jobs ADD COLUMN reward_type TEXT CHECK (reward_type IN ('negotiable', 'hourly', 'fixed'));
ALTER TABLE jobs ADD COLUMN reward_amount INTEGER;
ALTER TABLE jobs ADD COLUMN reward_currency TEXT CHECK (reward_currency IN ('CZK', 'EUR'));
ALTER TABLE jobs ADD COLUMN reward_scope TEXT;
