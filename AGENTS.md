<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Restaurion – Agent Instructions (Codex / Claude / Antigravity)

Tento repozitář obsahuje MVP platformy **Restaurion** (`https://restaurion.pages.dev`): zadavatel vloží zakázku s termínem a obory, každý odpovídající řemeslník (celá ČR) dostane upozornění, odpoví „Mám zájem“ a zadavatel ho přijme. Přehled pro lidi je v [`README.md`](README.md).

## 1. ZÁVAZNÝ DESIGN CONTRACT – NEROZBÍT UI!

Před jakoukoliv úpravou komponent v `src/components/` nebo `src/app/` si **vždy přečti [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md)**.

### Hlavní pravidla, která žádný agent NESMÍ porušit:
1. **Vizuální styl (17. Neo-Brutalism & Bold Pop Studio):**
   - Zachovej `2px solid #111111` rámečky (`border-2 border-[#111111] dark:border-stone-500`) a tvrdé posunuté stíny (`shadow-[5px_5px_0px_#111111]`, `shadow-[3px_3px_0px_#111111]`). Nepoužívej měkké stíny (`shadow-md`, `shadow-lg`).
   - Světlý režim: krémové pozadí `#FAF6EB` s jemnou tečkovanou mřížkou a máslově žlutá Hero sekce `#FEF08A`. Žádný šablonový vzor ani vlys (odstraněny).
   - Tmavý režim (`dark:`): třída `.dark` na `<html>` (D32: bez přepínače v hlavičce; volba „Vzhled“ je v `ProfilePage`, ukládá se do `profiles.theme_preference`; anonym a „Podle systému“ = systémové schéma, tmavý, pokud systém nežádá světlý; `src/lib/theme.ts`, skript v `layout.tsx` proti bliknutí). Nové prvky vždy dostanou odpovídající `dark:` třídy.
2. **Barvy a ikony typů zakázek (`src/components/JobCard.tsx`, `src/components/CreateJobModal.tsx`):**
   - `subcontract_needed` (**Hledám subdodavatele**): ikona kladívka (`HammerLogo`), smaragdově zelená (`bg-emerald-600`).
   - `guarantor_needed` (**Hledám zaštítění licencí MK ČR**): ikona štítu (`ShieldCheck`), korálová (`bg-[#FF5733]`).
   - `craftsman_available` (**Nabízím se**): ikona človíčka (`UserCheck`), elektrická modř (`bg-[#2563EB]`), tlačítko **„Poptat spolupráci“**; termín se zobrazuje jako „Volno“.
   - **Památkový odznak:** jen štítek **„Kulturní památka“** (nebo *Národní kulturní památka*) s ikonou `Church`; nikdy štítek *„Běžný objekt / bez licence“*.
3. **Texty a rozložení:** Hero nadpis **„Najdi práci nebo parťáka“**, jediné tlačítko přidání je v Hero (D32/D33: široké popisné tlačítko „Přidat inzerát“ stylem jako ostatní tlačítka, jen ikona „+“ ve smaragdovém čtverečku, `aria-label="Přidat inzerát"`, od `sm`) a na mobilu uprostřed spodní lišty `Nástěnka | Přidat | Profil` (Adresář je na mobilu ikona v hlavičce); v hlavičce ani v prázdném stavu není. Na kartě tlačítko **„Mám zájem“**. Odměna (strukturovaná `job.reward`, u starých řádků `job.budgetNote`) se na kartě nikdy nezkracuje, včetně textu „Co se za odměnu očekává“ (`break-words`, žádné `truncate`). Texty jsou napevno v kódu (žádné CMS).
4. **Safari `<select>`:** každý `<select>` má `appearance-none`, výšku `h-11`, `pl-10 pr-9` (s ikonou vlevo) a vlastní `<ChevronDown className="... pointer-events-none" />` vpravo.
5. **Fonty v `src/app/layout.tsx`:** `Plus Jakarta Sans` (text) a `Space Grotesk` (nadpisy, `font-serif`) přes `<link>` v `<head>`, ne přes `next/font/google` (build musí projít i bez internetu).

## 2. Soukromí a pravidla dat (nesmí se porušit)

- **Kontakty** (e-mail, telefon, web, Instagram, WhatsApp, Facebook) vidí **každý přihlášený** uživatel (u inzerátů, v Adresáři, u zájemců). **Anonymní návštěvník je nikdy nedostane**: odpověď bez relace neobsahuje e-mail, telefon ani odkazy (UI ukáže „Kontakty uvidíš po přihlášení“). Mapování řádku na kontakt je jen v `mapContact` (`functions/api/_shared.ts`); každý endpoint ho volá jen pro přihlášeného. Pravidlo „kontakt až po přijetí“ neplatí.
- **Adresář** (`GET /api/directory`) je veřejný. Vypisuje profily s `directory_visible = 1`, souhlasem (`consent_at`) a jménem o 3+ znacích; zveřejnění je opt-out (přepínač v profilu, zaškrtávátko při přihlášení).
- **Bloky nedostupnosti a obsazené dny** vidí jen jejich vlastník; nikdy nejsou v Adresáři ani v jiné veřejné odpovědi. Zadavatel vidí zájemce jen u vlastního inzerátu.
- **Nabídky „Nabízím se“** nespouštějí párovací upozornění, nemají přijetí/odmítnutí (409) a nikdy neobsazují dny. Zájem o nabídku upozorní nabízejícího (`interest`).
- **Pravidlo párování** (obor, dostupnost, částečný překryv) existuje jen v `src/lib/matching.ts`. Nekopíruj ho jinam, volej `evaluateMatch` / `countBusyDays`.
- Obsazené dny počítají jen přijaté engagementy zakázek (`subcontract_needed`, `guarantor_needed`) se `status = 'active'`. Přijetí zakázky stále zablokuje termíny a pošle upozornění.
- Kontrakt API je `src/types/api.ts`; změna endpointu = změna kontraktu, testů a `scripts/e2e-local.sh`.
- Do gitu nepatří žádné secrets (jen názvy: `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`, `TEST_LOGIN_ECHO`, `ADMIN_EMAILS`).. Licence se neověřují (D25): číslo povolení uvádí uživatel sám.

## 3. Struktura projektu

- `src/app/page.tsx` – hlavní stránka (nástěnka, filtry, modály, přepnutí na profil); `src/app/globals.css`, `src/app/layout.tsx`.
- `src/components/` – `Header`, `MobileBottomNav`, `JobFilters`, `JobCard`, `DirectoryFilters`, `DirectoryCard`, `CreateJobModal`, `RespondModal`, `InterestedWorkersModal`, `LoginModal`, `NotificationsPanel`, `ProfilePage`, `LegalNoticeModal`, `HammerLogo`, `ui` (sdílené prvky).
- `src/lib/` – `api.ts` (fetch wrapper), `matching.ts` (párování), `crafts.ts` (obory), `regions.ts`, `format.ts`.
- `src/types/api.ts` – kontrakt API; `src/types/index.ts` – typy UI.
- `functions/api/` – Cloudflare Pages Functions: `auth/` (request-code, verify-code, login-password, password, me, logout), `directory.ts`, `jobs.ts`, `jobs/[id].ts`, `jobs/[id]/respond.ts`, `jobs/[id]/engagements.ts`, `engagements/[id].ts`, `profile.ts`, `availability/`, `notifications/`.
- `functions/api/_shared.ts` (mapování řádků, rate limit, e-mail), `functions/api/_lib/` (`data.ts`, `validate.ts`, `digest.ts`, `password.ts`, `photo.ts`).
- Fotka inzerátu (D34): `functions/api/jobs/[id]/photo.ts` (POST/DELETE, vlastník), `functions/api/photos/[[path]].ts` (veřejné čtení z R2, binding `JOB_PHOTOS`), `src/lib/image.ts` (zmenšení v prohlížeči). Binding je jen na nejvyšší úrovni `wrangler.json`; produkční se přidá po zapnutí R2.
- `workers/digest/` – plánovaný Worker (denní souhrn, úklid starých řádků).
- `migrations/` – D1 migrace `0001`–`0007`, `0009`–`0011` (0006, 0007, 0009, 0010 a 0011 se pouští jednou).
- `tests/` – unit testy (`npm test`); `scripts/e2e-local.sh` – end-to-end test API proti lokální D1.
- `docs/UI-DESIGN.md` (design, zákaz měnit UI bez pokynu), `docs/BACKEND-PLAN.md` (endpointy a migrace).
- **Nová session začíná v [`docs/STATUS.md`](docs/STATUS.md)** (co je nasazené, rizika, další kroky), pak [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) a [`docs/DECISIONS.md`](docs/DECISIONS.md). Při změně stavu aktualizuj `STATUS.md`, při novém rozhodnutí přidej řádek do `DECISIONS.md`.

## 4. Build, test a nasazení

- Vývoj: `npm run dev`. Kontroly: `npx tsc --noEmit -p .`, `npx eslint src`, `npm test`, `bash scripts/e2e-local.sh`.
- Build: `npm run build` (statický export do `./out`).
- Nasazení Pages: `npm run deploy`; digest worker: `npx wrangler deploy -c workers/digest/wrangler.json`. Nasazuje jen člověk, agent nikdy nespouští `wrangler --remote` ani deploy.
- Při instalaci balíčků použij `--registry https://registry.npmjs.org/`.
