# Restaurion – Status and handoff

State on 2026-11-11. Read this first in a new session, then [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DECISIONS.md`](DECISIONS.md).
Update this file in place when the state changes. Do not append a history.

Provenance tags: `[measured <date>: <how>]`, `[inferred]`, `[decided by <who>]`.

## 1. Where things are

| Item | State |
| :--- | :--- |
| Branch | `mvp-core`, pushed. PR [#1](https://github.com/slunnnko/restaurion/pull/1) into `main` is open and mergeable. `[measured 2026-11-11: gh pr view 1]` |
| Production | https://restaurion.pages.dev = Pages deployment `790da313`, built from commit `1810c32` on `mvp-core`. `[measured 2026-11-11: wrangler pages deployment list]` |
| Digest worker | `restaurion-digest` deployed, cron `0 6 * * *`. It only cleans up rows until Resend is configured. `[measured 2026-11-11: wrangler deploy output]` |
| D1 | Migrations `0001`–`0007` applied remotely. `0006` and `0007` were each run once after a backup; row counts of existing tables were unchanged. `[measured 2026-11-11]` |
| Pages secrets | `TEST_LOGIN_ECHO=1` is set. `RESEND_API_KEY` and `RESEND_FROM` are not set. `[measured 2026-11-11]` |
| Tests | `npm test` 40/40, `scripts/e2e-local.sh` all PASS, tsc and build clean at `1810c32`. `[measured 2026-11-11]` |
| Directory content | 0 of 8 existing profiles are visible (pre-0007 profiles start hidden by design, D14). `[measured 2026-11-11: D1 query]` |

D1 backups (local, not in git): `~/Personal/workspace/restaurion/backups/backup-pre-mvp-2026-11-11-063902.sql` (before 0006), `~/Personal/workspace/restaurion/backups/backup-pre-0007-2026-11-11-093913.sql` (before 0007).

## 2. Open risks

1. `TEST_LOGIN_ECHO=1` lets anyone log in as any email. It must go before real users (step 3 below).
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
| 3 | Set up Resend: verify a sending domain, then `wrangler pages secret put RESEND_API_KEY` / `RESEND_FROM` and the same two with `wrangler secret put … -c workers/digest/wrangler.json`. Then delete `TEST_LOGIN_ECHO` (`wrangler pages secret delete TEST_LOGIN_ECHO --project-name restaurion`) and redeploy. | owner (needs a domain) | request-code sends an email; response has no `testCode` | email does not arrive – keep `TEST_LOGIN_ECHO` until it does |
| 4 | Test on an iPhone (Safari): login, selects, modals, dark mode. | owner | no layout breaks | – |
| 5 | Phase 2 candidates: directory pagination, transactional accept, admin view for `licence_verified`. | next session | a plan in `docs/`, agreed with the owner before code | – |

## 4. How to resume in a new session

- Repo: `~/Personal/workspace/restaurion/eelgrass` (a git worktree), branch `mvp-core`.
- GitHub: the active `gh` account may be a work account without access. Use `GH_TOKEN=$(gh auth token --user slunnnko) gh …` and the same prefix for `git push`.
- Cloudflare: `npx wrangler whoami` must show the personal account. If logged out, the owner runs `npx wrangler login`.
- npm: always pass `--registry https://registry.npmjs.org/`.
- Local loop: `npm run dev` for the UI, `bash scripts/e2e-local.sh` for the API (needs `jq`, `curl`).
- Merging: the local PR gate blocks `gh pr merge` in this repo (no CI checks). Leave the merge to the owner.
- Any D1 change: back up with a timestamped file name, apply locally, then remote, then compare row counts (ARCHITECTURE §8).
