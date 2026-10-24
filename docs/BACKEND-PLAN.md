# Restaurion – Backend & Storage Architecture (`docs/BACKEND-PLAN.md`)

> **DŮLEŽITÉ PRO AGENTY (Codex / Claude / Antigravity):**
> Při jakékoliv úpravě backendu nebo frontendu **NESMÍŠ změnit vizuální styl, barvy, stíny, texty ani rozložení komponent** definované v [`docs/UI-DESIGN.md`](UI-DESIGN.md). Frontend zůstává statickým exportem Next.js (`output: 'export'` → `./out`) a s backendem komunikuje přes Cloudflare Pages Functions (`functions/api/*`).

---

## 1. Nasazený 0 Kč / měsíc Stack (100% Cloudflare + Resend)

| Vrstva | Technologie | Binding / Konfigurace | Free Tier limity |
| :--- | :--- | :--- | :--- |
| **Hosting & API** | **Cloudflare Pages + Pages Functions** (`functions/api/*`) | Projekt `restaurion` (`https://restaurion.pages.dev`) | Neomezený statický provoz + 100 000 API volání / den |
| **Databáze** | **Cloudflare D1** (Serverless SQLite na edge) | Binding `DB` (`restaurion-db`, ID `4aab6ba2-9391-49b4-8f52-d57792274bb9`) | 5 000 000 čtení / den, 100 000 zápisů / den, 5 GB, **nikdy se neuspává** |
| **Úložiště fotek** | **Cloudflare R2** + klientská WebP komprese | Binding `MEDIA` (`bucket_name = "restaurion-media"`) | 10 GB zdarma, **0 Kč za přenos dat (egress)** |
| **Foto Cache** | **Cloudflare Edge CDN Cache** | Hlavička `Cache-Control: public, max-age=31536000, immutable` | Neomezená CDN cache na edge uzlech (vč. PRG) |
| **E-maily & Auth** | **Resend API** (notifikace + budoucí Magic Code) | Volitelný secret `RESEND_API_KEY` | 3 000 e-mailů / měsíc (100 / den) zdarma |

---

## 2. Databázové migrace (`migrations/`)

Všechny tři migrace jsou již aplikované v produkční D1 databázi `restaurion-db`:

1. **[`migrations/0001_initial.sql`](../migrations/0001_initial.sql)** – Základní tabulky:
   - `profiles` (profily restaurátorů a řemeslníků, číslo licence MK ČR, stav ověření, hodnocení, počet realizovaných zakázek)
   - `jobs` (inzeráty: `subcontract_needed`, `guarantor_needed`, `craftsman_available`)
   - `job_responses` (doručené odpovědi přes tlačítko „Mám zájem“)
   - `mk_licenses_cache` (registr povolení MK ČR pro automatické ověřování)
   - `auth_codes` & `auth_sessions` (tabulky připravené pro bezheslové přihlašování e-mailem)
2. **[`migrations/0002_lifecycle_and_reviews.sql`](../migrations/0002_lifecycle_and_reviews.sql)** – Životní cyklus zakázek a vazba **Poptávka ↔ Nabídka**:
   - Rozšíření `jobs` o sloupce `matched_user_id`, `matched_user_name`, `matched_user_role`, `matched_user_license`, `matched_at`, `completed_at`
   - Tabulka `job_reviews` (recenze a hvězdičková hodnocení 1–5 navázaná na konkrétní zrealizovanou zakázku `job_id`)
3. **[`migrations/0003_site_settings.sql`](../migrations/0003_site_settings.sql)** – Redakční systém (CMS):
   - Tabulka `site_settings` pro úpravu textů webu (Hero štítek, hlavní nadpis, podnadpis, uvítací tip na nástěnce, kontaktní e-mail v patičce) přímo z administrace.

Spuštění migrací (lokálně / v produkci):
```bash
npx wrangler d1 execute restaurion-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute restaurion-db --remote --file=./migrations/0001_initial.sql
```

---

## 3. Přehled API Endpointů (`functions/api/`)

| Endpoint | Metody | Popis |
| :--- | :--- | :--- |
| [`/api/jobs`](../functions/api/jobs.ts) | `GET`, `POST` | Načtení všech zakázek (vč. autora z `profiles`, vybraného realizátora a recenze z `job_reviews`) a vytvoření nového inzerátu. |
| [`/api/jobs/respond`](../functions/api/jobs/respond.ts) | `POST` | Uložení odpovědi „Mám zájem“ do `job_responses`, navýšení počítadla `responses_count` a volitelné odeslání e-mailu přes Resend (`RESEND_API_KEY`). |
| [`/api/jobs/manage`](../functions/api/jobs/manage.ts) | `GET`, `PATCH`, `POST` | Správa zakázky: načtení doručených odpovědí (`GET`), změna stavu `open` / `matched` / `closed` a propojení s realizátorem (`PATCH`), udělení recenze a přepočet hodnocení profilu (`POST`). |
| [`/api/settings`](../functions/api/settings.ts) | `GET`, `PUT` | Načtení a uložení textů webu (CMS) v tabulce `site_settings`. |
| [`/api/upload`](../functions/api/upload.ts) | `POST` | Nahrání klientsky zkomprimované WebP fotky (`src/lib/imageCompression.ts`) do R2 bucketu `restaurion-media`. |
| [`/api/media/[[key]]`](../functions/api/media/[[key]].ts) | `GET` | Servírování fotek z R2 s agresivní Cloudflare Edge CDN cache (`Cache-Control: public, max-age=31536000, immutable`). |
| [`/api/profile`](../functions/api/profile.ts) | `PUT` | Úprava profilu uživatele (jméno, bio, město, telefon, profilová fotka `avatarUrl`). |
| [`/api/licenses/verify`](../functions/api/licenses/verify.ts) | `POST` | Ověření povolení MK ČR proti tabulce `mk_licenses_cache` v D1 a uložení výsledku k profilu. |
| [`/api/admin/verify`](../functions/api/admin/verify.ts) | `GET`, `POST`, `DELETE` | Ověření administrátorského hesla proti Cloudflare secretu `ADMIN_PASSWORD` a správa `HttpOnly; Secure; SameSite=Lax` cookie `restaurion_admin`. |

---

## 4. Administrátorská práva a autentizace (`ADMIN_PASSWORD`)

- Ve výchozím stavu se web všem návštěvníkům načítá v **pohledu běžného uživatele** (`isAdmin = false`), kde vidí tlačítko **„Upravit“** pouze u vlastních inzerátů.
- Po otevření okna **„Admin & Správa“** ([`src/components/ManageJobsModal.tsx`](../src/components/ManageJobsModal.tsx)) lze v horní liště zadat **Admin heslo** a kliknout na **„Odemknout administraci“**.
- Endpoint [`POST /api/admin/verify`](../functions/api/admin/verify.ts) ověří heslo proti Cloudflare Pages secretu `ADMIN_PASSWORD` (v macOS Keychain uloženému jako `secret://keychain/restaurion-admin-password/~`) a nastaví podepsanou `HttpOnly; Secure; SameSite=Lax` cookie `restaurion_admin` s platností 30 dní.
- Po odemknutí administrace vidí administrátor tlačítko **„Upravit“** u všech nabídek i poptávek napříč celým webem a má plný přístup k úpravě textů webu (`PUT /api/settings`). Tlačítkem **„Uzamknout (pohled běžného uživatele)“** lze administrátorskou session kdykoliv ukončit.

Aktualizace hesla z macOS Keychain do Cloudflare Pages:
```bash
security find-generic-password -s "restaurion-admin-password" -w | npx wrangler pages secret put ADMIN_PASSWORD --project-name=restaurion
```
