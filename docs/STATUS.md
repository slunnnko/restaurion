# Restaurion – Status and handoff

State on 2026-11-12. Read this first in a new session, then [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DECISIONS.md`](DECISIONS.md).
Update this file in place when the state changes. Do not append a history.

Provenance tags: `[measured <date>: <how>]`, `[inferred]`, `[decided by <who>]`.

## 1. Where things are

| Item | State |
| :--- | :--- |
| Branch | `mvp-core`, pushed. PR [#1](https://github.com/slunnnko/restaurion/pull/1) into `main` is open and mergeable. `[measured 2026-11-11: gh pr view 1]` |
| Production | https://restaurion.pages.dev = Pages deployment `aa03d38c`, built from commit `14036ca` on `mvp-core`: D37 (owner actions in one pencil menu, inline interested list with detail and profile, green mobile add button, no duplicate profile/login in the mobile header, unread count as a badge on the avatar) on top of D35 and D36. D37 is in the live bundle; not yet clicked through in a browser. Smoke test: `/`, `/api/jobs`, `/api/directory`, `/api/auth/me` 200, `/api/profile` 401 without a session. `[measured 2026-11-12]` |
| D37 | Deployed 2026-11-12 (`aa03d38c`). `[decided by owner 2026-11-12]` |
| Digest worker | `restaurion-digest` version `23038dda`, cron `0 6 * * *`; `RESEND_API_KEY` and `RESEND_FROM` set 2026-11-12, so the daily digest now sends mail. `[measured 2026-11-12]` |
| D1 | Migrations `0001`–`0007` applied remotely. `0006` and `0007` were each run once after a backup; row counts of existing tables were unchanged. `[measured 2026-11-11]` |
| Mail | Resend domain `echo.sunhaze.dev` (eu-west-1) verified; DNS records (DKIM, SPF TXT, MX, CNAME) in the `sunhaze.dev` zone, cf-scan baseline updated. Sender `Restaurion <noreply@echo.sunhaze.dev>`. Test mail and a real login-code mail reached `delivered`. Secrets: `RESEND_API_KEY` (sending-only key), `RESEND_FROM`, `ADMIN_EMAILS`, plus an unused legacy `ADMIN_PASSWORD` (no code reads it). `TEST_LOGIN_ECHO` deleted 2026-11-12. `[measured 2026-11-12: wrangler pages secret list]` |
| Tests | `npm test` 68/68, `scripts/e2e-local.sh` ALL PASS, tsc and build clean at `dac4347`. `[measured 2026-11-12]` |
| D1 migration 0009 | Applied remotely 2026-11-12 after a backup; row counts unchanged (jobs 10, profiles 8, engagements 0, notifications 0, blocks 1); 0008 was never applied. `[measured 2026-11-12]` |
| D1 migration 0010 | Applied remotely 2026-11-12 after a backup (`profiles.password_hash`, `password_set_at`); row counts unchanged (profiles 8, jobs 10, engagements 0, sessions 1, notifications 0, blocks 1). `[measured 2026-11-12]` |
| D1 migration 0011 | Applied remotely 2026-11-12 (`profiles.theme_preference`, default `system`); row counts unchanged, all 8 profiles `system`. The pre-migration export failed with an auth error and was not retried before the run; the migration is additive, a backup was taken right after it. `[measured 2026-11-12]` |
| D1 migration 0012 | Applied remotely 2026-11-12 after a backup (`backups/backup-pre-0012-2026-11-12-151446.sql`): `first_name`, `last_name`, `company_name`. Row counts unchanged (profiles 9, jobs 24, engagements 3, notifications 0, blocks 1); 0 profiles without a name part, 0 where the derived name differs from `name`. `[measured 2026-11-12]` |
| Test listings | 14 jobs `seed-j-01`..`14` and 3 engagements `seed-e-*` in production D1 (7 under the owner's profile, 7 under the second test profile), images are R2 photos (see R2 row); `public/seed/*.svg` no longer referenced. Other jobs unchanged (10). Remove with `scripts/seed-test-data-remove.sql`. Backup before: `backups/backup-pre-seed-2026-11-12-133646.sql`. `[measured 2026-11-12]` |
| R2 (job photos) | Enabled 2026-11-12, bucket `restaurion-job-photos`, binding `JOB_PHOTOS` in all three `wrangler.json` scopes. Deployed (Pages `057e7d12`): `/api/photos/...` answers 404 for a missing key, 200 `image/jpeg` for existing ones. 12 test listings have CC0/PD photos (sources: `docs/CONTEXT-2026-11-12-test-photos.md`); seed-j-06 and seed-j-14 have none. Backup before: `backups/backup-pre-photos-2026-11-12-135754.sql`. Non-seed jobs unchanged (10). `[measured 2026-11-12]` |
| Directory content | 0 of 8 existing profiles are visible (pre-0007 profiles start hidden by design, D14). `[measured 2026-11-11: D1 query]` |

D1 backups (local, not in git): `~/Personal/workspace/restaurion/backups/backup-pre-mvp-2026-11-11-063902.sql` (before 0006), `~/Personal/workspace/restaurion/backups/backup-pre-0007-2026-11-11-093913.sql` (before 0007). `~/Personal/workspace/restaurion/backups/backup-pre-0009-2026-11-12-102955.sql` (before 0009), `~/Personal/workspace/restaurion/backups/backup-pre-0010-2026-11-12-121952.sql` (before 0010), `~/Personal/workspace/restaurion/backups/backup-post-0011-2026-11-12-124841.sql` (right after 0011).

## 2. Open risks

1. Anyone can block password login for an e-mail for an hour with 10 wrong attempts (`pw-email` limit). Code login still works, so this is an annoyance, not a lockout.
2. Any logged-in user can bulk-read all contacts (D12, owner decision). There is no pagination beyond 200 directory entries.
3. Two posters who accept the same worker at the same moment can double-book. The busy check and the update are not one transaction.
4. When the 50/day budget for new addresses runs out, the 503 differs for known and unknown emails (minor account enumeration).
5. Not tested on a real iOS device. Dark mode was checked only in code review.
6. Legacy seed jobs and profiles stay in D1. They are hidden (no dates, no consent).

## 3. Next steps

| # | Step | Who | Expected result | Stop if |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Try the app on https://restaurion.pages.dev: log in with the shown test code, fill the profile, turn on "Zobrazit mě v Adresáři", post a job and an offer. | owner | own profile appears in Adresář; job and offer appear in their tabs | any 5xx – read `wrangler pages deployment tail` |
| 2 | Merge PR [#1](https://github.com/slunnnko/restaurion/pull/1) in GitHub. | owner | `main` = `mvp-core`; the Actions run builds only, it does not deploy (ARCHITECTURE §10) | build fails on `main` |
| 3 | Log in by code, set a password in the profile, log out, log in with the password; then try "Zapomenuté heslo?". | owner | both logins work; after the reset the old password fails | any 5xx – read `wrangler pages deployment tail` |
| 4 | Test on an iPhone (Safari): login, selects, modals, dark mode. | owner | no layout breaks | – |
| 5 | Phase 2 candidates: Google / Apple sign-in, directory pagination, transactional accept, an admin view for reported listings. | next session | a plan in `docs/`, agreed with the owner before code | – |

## 4. How to resume in a new session

- Repo: `~/Personal/workspace/restaurion/eelgrass` (a git worktree), branch `mvp-core`.
- GitHub: the active `gh` account may be a work account without access. Use `GH_TOKEN=$(gh auth token --user slunnnko) gh …` and the same prefix for `git push`.
- Cloudflare: `npx wrangler whoami` must show the personal account. If logged out, the owner runs `npx wrangler login`.
- npm: always pass `--registry https://registry.npmjs.org/`.
- Local loop: `npm run dev` for the UI, `bash scripts/e2e-local.sh` for the API (needs `jq`, `curl`).
- Merging: the local PR gate blocks `gh pr merge` in this repo (no CI checks). Leave the merge to the owner.
- Any D1 change: back up with a timestamped file name, apply locally, then remote, then compare row counts (ARCHITECTURE §8).
