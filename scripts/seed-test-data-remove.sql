-- Removes everything created by scripts/seed-test-data.mjs (ids seed-j-*, seed-e-*, seed-u-*).
-- Run: npx wrangler d1 execute restaurion-db --local --file=scripts/seed-test-data-remove.sql
-- (add --remote only with the owner's go). The owner profile is never touched.
DELETE FROM notifications WHERE job_id LIKE 'seed-j-%' OR engagement_id LIKE 'seed-e-%';
DELETE FROM engagements WHERE job_id LIKE 'seed-j-%' OR id LIKE 'seed-e-%';
DELETE FROM jobs WHERE id LIKE 'seed-j-%';
DELETE FROM profiles WHERE id LIKE 'seed-u-%'
  AND NOT EXISTS (SELECT 1 FROM jobs WHERE jobs.author_id = profiles.id);
