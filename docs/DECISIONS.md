# Restaurion – Decisions

Short decision log. Each entry: what was decided, why, and who decided. Newest last.
Add an entry when a change reverses or extends one of these. Do not edit old entries, add a new one that supersedes them.

| # | Date | Decision | Why | Decided by |
| :--- | :--- | :--- | :--- | :--- |
| D1 | 2026-11-10 | MVP scope is the availability-based matching loop. Admin/CMS, reviews, photo upload, licence auto-verification and mock data are removed. | Ship the core loop first; the removed parts had no users and widened the attack surface. | owner (MVP spec) |
| D2 | 2026-11-10 | Every worker is available by default. Unavailability is optional blocks; accepted jobs count as busy. | Workers should not have to maintain a calendar to receive jobs. | owner (MVP spec) |
| D3 | 2026-11-10 | Matching is nationwide. A partial overlap still matches and shows the busy-day count to the worker only. | The craft pool is small; a partly busy worker can still take part of a job. | owner (MVP spec) |
| D4 | 2026-11-10 | The matching rule exists only in `src/lib/matching.ts`, with unit tests. | One rule, one place; the API and tests share it. | owner (MVP spec) |
| D5 | 2026-11-10 | Notifications are in-app plus one daily email digest, max 100 emails/day. | Resend free tier and no email spam. | owner (MVP spec) |
| D6 | 2026-11-10 | The digest runs in a separate Worker (`workers/digest`). | Pages Functions cannot run Cron Triggers. | implementation |
| D7 | 2026-11-10 | Login codes use a new `login_codes` table, not `auth_codes`. | The old table schema (`code`, no `id`, no hash) did not fit hashed codes with an attempt counter. | implementation |
| D8 | 2026-11-10 | Migrations run with `wrangler d1 execute --file`, additive only, after a backup and with a row-count check. | Production data must survive; earlier migrations were run the same way. | owner (MVP spec) |
| D9 | 2026-11-10 | Matching and the digest include only profiles with `consent_at`. The `licence_verified` backfill was dropped. | Seed profiles never consented. The old verification flag could be self-set through an unauthenticated endpoint. | review finding |
| D10 | 2026-11-11 | Lighter design: the stencil pattern, frieze and Fraunces serif from commit 899cdc6 are removed. Space Grotesk headings, cream background with dot grid. | The owner found the "historic" look too heavy. | owner |
| D11 | 2026-11-11 | `TEST_LOGIN_ECHO=1` returns the login code in the response while Resend is not configured. | Lets the owner test on restaurion.pages.dev without email. Must be removed before real users. | owner |
| D12 | 2026-11-11 | Contacts are visible to every logged-in user, not only after acceptance. Anonymous visitors never get them. | "Contact after confirmation" was unfriendly; the contact is reachable anyway through a personal website. | owner |
| D13 | 2026-11-11 | Public directory with three groups: Firmy (`firm`), Licencovaní (`licensed`), Bez licence (`unlicensed`). Listing is opt-out (`directory_visible`, default on), with a checkbox at login and a toggle in the profile. | Restorers want to be findable; opt-out keeps the directory full while letting people leave. | owner |
| D14 | 2026-11-11 | Profiles that existed before `0007` start hidden (`directory_visible = 0`). | They never saw the opt-out, so publishing them would be without consent. | review finding |
| D15 | 2026-11-11 | Everyone can post both jobs and offers ("Nabízím se"). Offers send no matching notifications, have no accept (409) and never book days. Interest on an offer notifies the offerer. | Offers are a listing, not a booking. | owner |
| D16 | 2026-11-11 | "Mám zájem → přijetí" stays for jobs as a signal: acceptance books the dates and notifies. | Keeps busy days accurate for matching. | owner |
| D17 | 2026-11-11 | Deploys run from the `mvp-core` branch with `wrangler pages deploy --branch=main`. PR merges are done by the owner. | The repo has no CI checks, so the local PR gate blocks an automated merge. | owner + PR gate |
