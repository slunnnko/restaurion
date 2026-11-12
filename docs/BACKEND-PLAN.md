# Restaurion – Backend architektura (`docs/BACKEND-PLAN.md`)

> **DŮLEŽITÉ PRO AGENTY (Codex / Claude / Antigravity):**
> Při úpravě backendu nebo frontendu **NESMÍŠ změnit vizuální styl, barvy, stíny, texty ani rozložení komponent** definované v [`docs/UI-DESIGN.md`](UI-DESIGN.md). Frontend je statický export Next.js (`output: 'export'` → `./out`) a s backendem komunikuje přes Cloudflare Pages Functions (`functions/api/*`). Kontrakt API je v [`src/types/api.ts`](../src/types/api.ts).

---

## 1. Stack (0 Kč / měsíc)

| Vrstva | Technologie | Konfigurace |
| :--- | :--- | :--- |
| Hosting a API | Cloudflare Pages + Pages Functions | projekt `restaurion`, `functions/api/*` |
| Databáze | Cloudflare D1 | binding `DB` (`restaurion-db`) |
| E-maily | Resend | secrets `RESEND_API_KEY`, `RESEND_FROM` |
| Denní souhrn a úklid | samostatný Worker s Cron Triggerem | `workers/digest` (Pages Functions cron neumí) |

Žádné R2 ani nahrávání fotek (mimo MVP).

## 2. Migrace (`migrations/`)

Aplikují se příkazem `wrangler d1 execute ... --file`, ne `migrations apply`.

- `0001`–`0005`: původní schéma (profily, zakázky, `auth_sessions`, starší tabulky). Už aplikované v produkci.
- `0006_mvp_matching.sql`: **pustit jednou** (`ALTER TABLE ADD COLUMN`). Přidává:
  - `profiles`: `crafts`, `experience_text`, `portfolio_url`, `licence_number`, `licence_verified`, `email_digest`, `accepting_jobs`, `consent_at`
  - `jobs`: `date_from`, `date_to`, `visibility`, `expires_at`
  - `unavailability_blocks`, `engagements` (`pending` / `accepted` / `declined` / `withdrawn`), `notifications` (typy `job_match`, `interest`, `accepted`, `declined`, `withdrawn`, `job_closed`)
  - `login_codes` (hash kódu, pokusy), `rate_limit_events`, `email_log`
- `0007_directory.sql`: **pustit jednou**, jen přidává. `profiles`: `directory_group` (`firm` / `licensed` / `unlicensed`), `directory_visible` (výchozí 1), `instagram`, `whatsapp`, `facebook`. Backfill skupiny: `licensed` při vyplněném čísle povolení, `firm` pro `role = 'atelier_firm'`. `portfolio_url` je „Web / portfolio“.

API stav `closed` odpovídá `jobs.status = 'archived'`. Nástěnka ukazuje jen zakázky s `date_from`, `status = 'active'`, `visibility = 'public'` a `expires_at >= dnes`.

## 3. Endpointy (`functions/api/`)

| Metoda a cesta | Kdo | Účel |
| :--- | :--- | :--- |
| `GET /api/auth/me` | kdokoli | vlastní profil nebo `null` |
| `POST /api/auth/request-code` | kdokoli | pošle 6místný kód (platí 10 min); limity 5/h na e-mail, 20/h na IP |
| `POST /api/auth/verify-code` | kdokoli | ověří kód (max. 5 pokusů, 30/h na IP), vyžaduje `consent: true`, nastaví cookie; volitelné `newPassword` = obnova hesla (smaže všechny relace) |
| `POST /api/auth/login-password` | kdokoli | přihlášení e-mailem a heslem (30/h na IP, 10/h na e-mail), jedna chyba 401 pro všechny případy |
| `POST /api/auth/password` | relace | nastaví/změní heslo (změna vyžaduje současné; první heslo jen do 30 min po přihlášení kódem, jinak 403; smaže ostatní relace) |
| `POST /api/auth/logout` | relace | smaže relaci |
| `GET /api/jobs` | kdokoli | veřejná nástěnka (zakázky i nabídky `craftsman_available`); s relací přidá `isMine`, `myEngagement`, `myBusyDays`, `posterContact` (kontakty zadavatele pro každého přihlášeného) |
| `GET /api/directory?group=&craft=&region=&q=` | kdokoli | Adresář (max. 200, podle jména); `contact` jen s relací |
| `POST /api/jobs` | relace, jméno v profilu | vloží zakázku a upozorní odpovídající řemeslníky; nabídka `craftsman_available` nikoho neupozorní |
| `GET /api/jobs?mine=1` | relace | vlastní inzeráty (aktivní i ukončené, všechny typy, max 100); 401 bez relace |
| `PATCH /api/jobs/:id` | zadavatel | úprava (název, popis, odměna, termíny, obory, kraj, obec; typ je neměnný, ukončený inzerát 409, žádná nová párovací upozornění), `status: 'closed'` uvolní termíny a pošle `job_closed` |
| `POST /api/jobs/:id/respond` | relace, jméno v profilu | „Mám zájem“ / „Poptat spolupráci“ (engagement `pending`, upozornění `interest`) |
| `GET /api/jobs/:id/engagements` | zadavatel | zájemci včetně kontaktů |
| `POST /api/engagements/:id` | zadavatel / zájemce | `accept`, `decline` (zadavatel zakázky; u nabídky 409), `withdraw` (zájemce) |
| `GET`, `PUT /api/profile` | relace | vlastní profil (`firstName`, `lastName`, `companyName` nepovinný (migrace 0012; `name` se odvozuje: firma, jinak jméno + příjmení), `phone` (normalizuje se na `+420 777 111 222`), `group`, `directoryVisible`, `instagram`, `whatsapp`, `facebook`, `themePreference` = `system`/`light`/`dark`, migrace 0011); skupina `licensed` vyžaduje číslo povolení |
| `POST`, `DELETE /api/jobs/:id/photo` | zadavatel | jedna volitelná fotka (D34): `POST` surové bajty (JPEG/PNG/WebP podle prvních bajtů, max 5 MB → 413, jiný typ 400, ukončený inzerát 409, 30/h), uloží do R2 `JOB_PHOTOS` a pak `jobs.image_url`; `DELETE` fotku odebere. Bez bindingu 503. Ukončení a smazání správcem fotku nechá. |
| `GET /api/photos/jobs/...` | kdokoli | veřejná fotka z R2 (`nosniff`, `CSP: sandbox`, neměnná cache) |
| `DELETE /api/jobs/:id` | správce (`ADMIN_EMAILS`) | měkké smazání jakéhokoli inzerátu (`visibility = 'deleted'`, `status = 'archived'`, řádek zůstává v D1), zájemci dostanou `job_closed`; opakované volání 200; ostatním 403 |
| `POST /api/availability`, `PUT`, `DELETE /api/availability/:id` | relace | bloky nedostupnosti (upravit a mazat smí jen vlastník; cizí id u PUT 404) |
| `GET /api/notifications`, `POST /api/notifications/read` | relace | upozornění a označení za přečtená |

Kontakty (e-mail, telefon, web, Instagram, WhatsApp, Facebook) se vrací jen přihlášeným, vždy přes jednu funkci `mapContact` v `functions/api/_shared.ts`; odpověď bez relace je nikdy neobsahuje. Bloky nedostupnosti a obsazené dny nikdy neopouštějí vlastníka a v Adresáři nejsou.

## 4. Párování a obsazené dny

Pravidlo je jen v [`src/lib/matching.ts`](../src/lib/matching.ts): řemeslník odpovídá, pokud přijímá zakázky, má alespoň jeden z oborů zakázky a termín nemá celý obsazený (bloky + přijaté zakázky s `status = 'active'`). Částečný překryv se povoluje a ukáže se jako poznámka. Přijetí zájemce, který má celý termín obsazený, vrací 409. Obsazené dny počítají jen zakázky `subcontract_needed` a `guarantor_needed`; nabídky nic neobsazují.

## 5. E-maily

- Přihlašovací kód se posílá hned. Bez `RESEND_API_KEY` nebo `RESEND_FROM` se jen vypíše do konzole; s `TEST_LOGIN_ECHO=1` ho API vrátí jako `testCode` (jen test).
- Selhání odeslání: kód se smaže a API vrátí 502.
- Vše ostatní jde jen v denním souhrnu (`workers/digest`, 06:00 UTC), nejstarší nepřečtené první.
- Rozpočet 100 e-mailů za den (`DAILY_EMAIL_BUDGET`); kódy na adresy bez profilu max. 50 za den; souhrn nechává rezervu 10 pro kódy. Každé odeslání se zapisuje do `email_log`.
- Digest worker před odesláním maže `rate_limit_events` starší 2 dnů a `login_codes` prošlé déle než den.

## 6. Bezpečnostní poznámky

- Kódy jsou v D1 jen jako SHA-256 hash; pokus se započítá atomicky před porovnáním.
- Rate limit nejdřív zapíše událost a pak počítá (bez závodu mezi souběžnými požadavky).
- Relace: cookie `restaurion_session` (HttpOnly, Secure, SameSite=Lax, 30 dní), v D1 jen hash tokenu.
