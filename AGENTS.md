<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Restaurion – Agent Instructions (Codex / Claude / Antigravity)

Tento repozitář obsahuje B2B platformu **Restaurion** (`https://restaurion.pages.dev`) propojující licencované restaurátory (držitele povolení MK ČR) a umělecké řemeslníky v ČR.

## 1. ZÁVAZNÝ DESIGN CONTRACT – NEROZBÍT UI!

Před jakoukoliv úpravou komponent v `src/components/` nebo `src/app/` si **vždy přečti [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md)**.

### Hlavní pravidla, která žádný agent NESMÍ porušit:
1. **Vizuální styl (17. Neo-Brutalism & Bold Pop Studio):**
   - Zachovej `2px solid #111111` rámečky (`border-2 border-[#111111] dark:border-stone-500`) a tvrdé posunuté stíny (`shadow-[5px_5px_0px_#111111]`, `shadow-[3px_3px_0px_#111111]`). Nepoužívej měkké stíny (`shadow-md`, `shadow-lg`).
   - Světlý režim: krémové pozadí `#FFFDF7` s jemnou tečkovanou mřížkou a máslově žlutá Hero sekce `#FEF08A`.
   - Tmavý režim (`dark:`): přepínaný třídou `.dark` na `<html>` (tlačítko **„Tmavý / Světlý“** v `src/components/Header.tsx` + synchronizace s `prefers-color-scheme: dark` v `src/app/page.tsx`). Při přidávání nových prvků vždy přidej odpovídající `dark:` třídy.
2. **Závazné barvy a ikony 3 typů inzerátů (`src/components/JobCard.tsx`, `src/components/CreateJobModal.tsx`):**
   - `subcontract_needed` (**Hledám subdodavatele**): ikona kladívka (`HammerLogo`), **smaragdově zelená** (`bg-emerald-600`).
   - `guarantor_needed` (**Hledám zaštítění licencí MK ČR**): ikona štítu (`ShieldCheck`), **korálová** (`bg-[#FF5733]`).
   - `craftsman_available` (**Nabízím se**): ikona človíčka (`UserCheck`), **elektrická modř** (`bg-[#2563EB]`).
   - **Památkový odznak:** Zobrazuj **POUZE** štítek **„Kulturní památka“** (nebo *Národní kulturní památka*) s ikonou `Church`. **Nikdy** nezobrazuj šedý štítek *„Běžný objekt / bez licence“*.
3. **Závazné texty a rozložení karet:**
   - Hero nadpis: **„Najdi práci nebo parťáka“**.
   - Tlačítko přidání inzerátu: **„+ Přidat“** (nikoliv „Přidat inzerát“).
   - Karta zakázky (`JobCard.tsx`) zobrazuje všechny informace rovnou v přehledu + tlačítko **„Mám zájem“** (resp. *„Poptat spolupráci“*).
   - **Odměna (`job.budgetNote`)** v `JobCard.tsx` se **NIKDY nesmí zkracovat** (žádné `truncate` – má vlastní celošířkový box s `break-words`).
   - Fotografie zakázky (`job.imageUrl`) i profilová fotka (`user.avatarUrl`) jsou volitelné; pokud zakázka fotku nemá, nezobrazuj prázdný placeholder.
4. **Safari `<select>` kompatibilita (`JobFilters.tsx`, `CreateJobModal.tsx`, `globals.css`):**
   - Každý `<select>` musí mít `appearance-none` (`-webkit-appearance: none`), explicitní výšku `h-11`, `pl-10 pr-9` (pokud má ikonu vlevo) a vlastní ikonu `<ChevronDown className="... pointer-events-none" />` vpravo. Bez toho Safari na macOS/iOS rozbije výšku a překryje text s ikonou.
5. **Fonty v `src/app/layout.tsx`:**
   - Fonty `Plus Jakarta Sans` a `Space Grotesk` načítáme přes standardní `<link>` tagy v `<head>`, nikoliv přes `next/font/google`, aby `npm run build` prošel i v prostředí bez přístupu k internetu.

---

## 2. Struktura projektu

- `src/app/page.tsx` – Hlavní stránka (state, filtrace, Dark Mode přepínač, modály, Hero sekce, nástěnka).
- `src/app/globals.css` – Tailwind v4 konfigurace (`@custom-variant dark`), globální proměnné, tečkované pozadí, Safari `select` reset.
- `src/components/Header.tsx` – Hlavička s logem, přepínačem regionu, přepínačem `Tmavý / Světlý`, ověřením licence MK ČR, tlačítkem `+ Přidat` a profilem s avatarem.
- `src/components/JobFilters.tsx` – Vyhledávání, `<select>` filtry (region, typ poptávky, památkový status, filtr aktivních vs. ukončených zakázek) a pilulky oborů.
- `src/components/JobCard.tsx` – Karta aktivní zakázky / řemeslníka s plným výpisem, nezkrácenou odměnou, volitelnou fotkou, tlačítkem `Mám zájem` a tlačítkem `Spravovat / Ukončit`.
- `src/components/CompactArchivedJobRow.tsx` – Úsporný jednořádkový náhled pro neaktuální / realizované zakázky (nezabírá místo na hlavní nástěnce, zobrazuje vazbu `Poptával ↔ Realizoval` a udělenou recenzi).
- `src/components/ManageJobsModal.tsx` – Admin & Správa (2 záložky: 1. Správa zakázek, doručených reakcí, propojení `Poptávka ↔ Nabídka` a recenzí; 2. Úprava textů webu / CMS v tabulce `site_settings`).
- `src/components/CreateJobModal.tsx` – Formulář pro vložení inzerátu včetně klientského nahrání fotky do R2.
- `src/components/UserProfileModal.tsx` – Detail profilu s možností změny profilové fotky (`avatarUrl`) a přehledem realizovaných spoluprací s recenzemi.
- `src/components/LicenseVerificationModal.tsx` & `src/lib/mkVerification.ts` – Ověřování povolení MK ČR.
- `src/types/index.ts` – TypeScript definice (`Job`, `UserProfile`, `JobType`, `MonumentStatus`, `FilterState`, `MatchedPartner`, `JobReview`, `SiteSettings`).
- `functions/api/` – Cloudflare Pages Functions (`jobs.ts`, `jobs/respond.ts`, `jobs/manage.ts`, `settings.ts`, `upload.ts`, `media/[[key]].ts`, `profile.ts`, `licenses/verify.ts`).
- `migrations/` – Cloudflare D1 (SQLite) migrace (`0001_initial.sql`, `0002_lifecycle_and_reviews.sql`, `0003_site_settings.sql`).
- `docs/UI-DESIGN.md` – Detailní specifikace design systému (ZÁKAZ MĚNIT UI BEZ POKYNU).
- `docs/BACKEND-PLAN.md` – Architektura a přehled 100% serverless backendu za 0 Kč/měsíc (Cloudflare D1 + Cloudflare R2 + CDN Cache + Pages Functions + Resend).

---

## 3. Plán oživení backendu (Cloudflare D1 + R2 + Resend)

Při implementaci backendu postupuj podle **[`docs/BACKEND-PLAN.md`](docs/BACKEND-PLAN.md)**:
1. **Fáze 1:** Napojení nástěnky na Cloudflare D1 (`functions/api/jobs.ts` + migrace `migrations/0001_initial.sql`).
2. **Fáze 2:** Nahrávání fotek do Cloudflare R2 + klientská WebP komprese (`src/lib/imageCompression.ts`) + Edge CDN cache (`Cache-Control: public, max-age=31536000, immutable`).
3. **Fáze 3:** Bezheslové přihlašování (6místný kód e-mailem přes Resend) a úprava vlastního profilu.
4. **Fáze 4:** Odesílání reakcí **„Mám zájem“** (`POST /api/jobs/[id]/respond`) s e-mailovou notifikací zadavateli.
5. **Fáze 5:** Reálné ověřování licencí MK ČR proti tabulce `mk_licenses_cache` v D1.

---

## 4. Build & Deployment

- Lokální vývoj: `npm run dev`
- Produkční build: `npm run build` (generuje statický export do `./out`)
- Nasazení na Cloudflare Pages (`restaurion.pages.dev`):
  ```bash
  npx wrangler pages deploy out --project-name=restaurion --branch=main
  ```
