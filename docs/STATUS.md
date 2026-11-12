# Restaurion – Status and handoff

State on 2026-11-11. Read this first in a new session, then [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DECISIONS.md`](DECISIONS.md).
Update this file in place when the state changes. Do not append a history.

Provenance tags: `[measured <date>: <how>]`, `[inferred]`, `[decided by <who>]`.

## 1. Where things are

| Item | State |
| :--- | :--- |
| Branch | `mvp-core`, pushed. PR [#1](https://github.com/slunnnko/restaurion/pull/1) into `main` is open and mergeable. `[measured 2026-11-11: gh pr view 1]` |
| Production | https://restaurion.pages.dev = Pages deployment `5e6ef195`, built from commit `00e6493` on `mvp-core`, with Resend secrets. Smoke test: `/`, `/api/jobs`, `/api/directory` 200. `[measured 2026-11-12]` |
| Digest worker | `restaurion-digest` version `23038dda`, cron `0 6 * * *`; `RESEND_API_KEY` and `RESEND_FROM` set 2026-11-12, so the daily digest now sends mail. `[measured 2026-11-12]` |
| D1 | Migrations `0001`–`0007` applied remotely. `0006` and `0007` were each run once after a backup; row counts of existing tables were unchanged. `[measured 2026-11-11]` |
| Mail | Resend domain `echo.sunhaze.dev` (eu-west-1) verified; DNS records (DKIM, SPF TXT, MX, CNAME) in the `sunhaze.dev` zone, cf-scan baseline updated. Sender `Restaurion <noreply@echo.sunhaze.dev>`. Test mail and a real login-code mail reached `delivered`. Secrets: `RESEND_API_KEY` (sending-only key), `RESEND_FROM`, `ADMIN_EMAILS`, and still `TEST_LOGIN_ECHO=1`. `[measured 2026-11-12]` |
| Tests | `npm test` 45/45, `scripts/e2e-local.sh` all PASS, tsc and build clean after the owner-management commit. `[measured 2026-11-11]` |
| D1 migration 0009 | Applied remotely 2026-11-12 after a backup; row counts unchanged (jobs 10, profiles 8, engagements 0, notifications 0, blocks 1); 0008 was never applied. `[measured 2026-11-12]` |
| Directory content | 0 of 8 existing profiles are visible (pre-0007 profiles start hidden by design, D14). `[measured 2026-11-11: D1 query]` |

D1 backups (local, not in git): `~/Personal/workspace/restaurion/backups/backup-pre-mvp-2026-11-11-063902.sql` (before 0006), `~/Personal/workspace/restaurion/backups/backup-pre-0007-2026-11-11-093913.sql` (before 0007). `~/Personal/workspace/restaurion/backups/backup-pre-0009-2026-11-12-102955.sql` (before 0009).

## 2. Open risks

1. `TEST_LOGIN_ECHO=1` is still set. With Resend configured the code is no longer echoed (`request-code.ts:66` returns `testCode` only without Resend), but the secret should go: owner runs `npx wrangler pages secret delete TEST_LOGIN_ECHO --project-name restaurion` and redeploys.
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
| 3 | Delete `TEST_LOGIN_ECHO` and redeploy (Resend itself is done, see Mail above). | owner | request-code still returns `{ok:true}` and the mail arrives | mail stops arriving – check Resend logs |
| 4 | Test on an iPhone (Safari): login, selects, modals, dark mode. | owner | no layout breaks | – |
| 5 | Phase 2 candidates: directory pagination, transactional accept, an admin view for reported listings. | next session | a plan in `docs/`, agreed with the owner before code | – |

## 4. How to resume in a new session

- Repo: `~/Personal/workspace/restaurion/eelgrass` (a git worktree), branch `mvp-core`.
- GitHub: the active `gh` account may be a work account without access. Use `GH_TOKEN=$(gh auth token --user slunnnko) gh …` and the same prefix for `git push`.
- Cloudflare: `npx wrangler whoami` must show the personal account. If logged out, the owner runs `npx wrangler login`.
- npm: always pass `--registry https://registry.npmjs.org/`.
- Local loop: `npm run dev` for the UI, `bash scripts/e2e-local.sh` for the API (needs `jq`, `curl`).
- Merging: the local PR gate blocks `gh pr merge` in this repo (no CI checks). Leave the merge to the owner.
- Any D1 change: back up with a timestamped file name, apply locally, then remote, then compare row counts (ARCHITECTURE §8).
