# Restaurion – B2B platforma pro památkovou péči a umělecká řemesla

**Produkční URL:** https://restaurion.pages.dev

Restaurion propojuje licencované restaurátory (držitele povolení Ministerstva kultury ČR dle § 14a zákona č. 20/1987 Sb.) se zručnými uměleckými řemeslníky, absolventy a ateliéry napříč obory (kámen, štuk, dřevo, nástěnné malby, kovy, zlacení).

---

## 1. Admin rozhraní & Správa zakázek, vazeb a textů webu

Přímo v aplikaci (tlačítko **„Admin & Správa“** v horní liště nástěnky, v zápatí webu nebo tlačítko **„Spravovat / Ukončit“** na každé kartě zakázky) je integrované administrační rozhraní ([`src/components/ManageJobsModal.tsx`](src/components/ManageJobsModal.tsx)) napojené na Cloudflare D1:

### A) Záložka „Zakázky & Recenze“ (`GET/POST /api/jobs/manage`)
1. **Úprava textů inzerátu:** Kdykoliv můžete upravit název zakázky (`title`), lokalitu (`city`), název památky (`monumentName`), popis/rozsah prací (`description`) a odměnu (`budgetNote`).
2. **Přehled doručených nabídek (`job_responses`):** U každé zakázky vidíte seznam zájemců, kteří odpověděli přes tlačítko *„Mám zájem“*, včetně jejich e-mailu, telefonu a průvodní zprávy.
3. **Životní cyklus a vazba Poptávka ↔ Nabídka (`status: 'completed'`):**
   - Přepnutím stavu na **„Ukončeno / Realizováno“** zakázku archivujete.
   - Jedním kliknutím u doručené reakce (**„Vybrat jako realizátora“**) nebo výběrem profilu propojíte zadavatele (**Poptával**) s vybraným kolegou (**Realizoval / Zaštítil**).
4. **Kolegiální recenze (`review`):**
   - Na základě uskutečněné spolupráce (**Poptávka ↔ Nabídka**) lze v detailu zakázky udělit hvězdičkové hodnocení (`1–5 ★`) a slovní recenzi.
   - Recenze se zobrazuje jak v kompaktním archivu zakázek, tak přímo v detailu profilu daného restaurátora/řemeslníka ([`src/components/UserProfileModal.tsx`](src/components/UserProfileModal.tsx)).

### B) Kompaktní archiv neaktuálních zakázek ([`src/components/CompactArchivedJobRow.tsx`](src/components/CompactArchivedJobRow.tsx))
- Ve výchozím stavu (**„Jen aktivní nabídky“**) se na hlavní nástěnce zobrazují pouze aktuální zakázky, takže ukončené inzeráty **nezabírají žádné místo**.
- Při přepnutí filtru stavu na **„Ukončené & realizované (archiv & recenze)“** nebo **„Vše (aktivní + kompaktní archiv)“** se neaktuální zakázky vykreslí jako **úsporné jednořádkové pruhy**, které zdůrazňují vazbu **`Poptával ↔ Realizoval`** a udělenou recenzi.

### C) Záložka „Texty webu (CMS)“ (`GET/PUT /api/settings`)
- Přímo z prohlížeče lze měnit texty v tabulce `site_settings` v Cloudflare D1:
  - **Hlavní nadpis v Hero sekci** (`heroTitle` – výchozí *„Najdi práci nebo parťáka“*)
  - **Podtitulek v Hero sekci** (`heroSubtitle`)
  - **3 zvýrazněné štítky výhod** (`heroBadge1`, `heroBadge2`, `heroBadge3`)
  - **Horní informační lišta / banner** (`announcementBanner` – zobrazí se jen pokud je vyplněn)
  - **Text v patičce webu** (`footerText`)

### D) Přímá správa tabulek v Cloudflare Dashboardu
Kromě vestavěného Admin rozhraní v aplikaci můžete data kdykoliv prohlížet a upravovat přímo ve webovém rozhraní Cloudflare:
1. Otevřete [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **D1 SQL Database** → **`restaurion-db`**.
2. V záložce **Tables** najdete tabulky `jobs`, `job_responses`, `job_reviews`, `profiles`, `mk_licenses_cache` a `site_settings`, kde lze řádky kliknutím upravovat nebo mazat.

---

## 2. Pokračování implementace: E-mailové notifikace (Resend) a produkční nasazení

Backend pro ukládání reakcí (**„Mám zájem“** v [`functions/api/jobs/respond.ts`](functions/api/jobs/respond.ts)) již každou odpověď spolehlivě ukládá do D1 tabulky `job_responses` a zároveň obsahuje připravené napojení na **Resend API** (3 000 e-mailů měsíčně zdarma).

Pokud není nastaven klíč `RESEND_API_KEY`, aplikace funguje bez chyby a reakce najdete v **Admin & Správa → Doručené nabídky a zájemci**. Pro zapnutí reálného rozesílání e-mailů postupujte takto:

### Krok 1: Vytvoření účtu a ověření domény v Resend (0 Kč)
1. Založte si bezplatný účet na [https://resend.com](https://resend.com).
2. V sekci **Domains** klikněte na **Add Domain** a zadejte svou doménu (např. `notifikace.vase-domena.cz` nebo `restaurion.cz`).
3. Resend vám nabídne přihlášení přes Cloudflare (**Configure automatically with Cloudflare**) nebo ruční zkopírování 3 DNS záznamů (`DKIM TXT`, `SPF MX/TXT`), které jedním klikem potvrdíte.
4. V sekci **API Keys** klikněte na **Create API Key** a zkopírujte klíč začínající na `re_...`.

### Krok 2: Nastavení proměnných v Cloudflare Pages
Spusťte z terminálu (nebo nastavte v Cloudflare Dashboard → **Workers & Pages** → **`restaurion`** → **Settings** → **Variables and Secrets**):

```bash
# 1. Uložení API klíče pro Resend (terminál se zeptá na hodnotu re_...)
npx wrangler pages secret put RESEND_API_KEY --project-name=restaurion

# 2. Volitelně: záložní e-mail administrátora, kam mají chodit kopie poptávek
npx wrangler pages secret put ADMIN_EMAIL --project-name=restaurion
```

> **Poznámka k adrese odesílatele (`from`):** V souboru [`functions/api/jobs/respond.ts`](functions/api/jobs/respond.ts) upravte pole `from: 'Restaurion <notifikace@restaurion.cz>'` tak, aby doména odpovídala doméně ověřené ve vašem účtu Resend.

### Další volitelné kroky (Roadmap)
- **Přihlášení e-mailovým kódem (Magic Code) + ochrana Admin rozhraní:** Tabulky `auth_codes` a `auth_sessions` jsou již v D1 vytvořené ([`migrations/0001_initial.sql`](migrations/0001_initial.sql)). Po aktivaci Resend lze zapnout přihlašování 6místným kódem do e-mailu a omezit úpravu zakázek pouze na přihlášeného autora inzerátu nebo administrátora.
- **Automatický import rejstříku MK ČR do `mk_licenses_cache`:** Doplnění kompletního exportu držitelů povolení MK ČR do tabulky `mk_licenses_cache` pomocí D1 SQL skriptu.

---

## 3. Dokumentace pro vývojáře a AI agenty (Codex / Claude / Antigravity)

- **[`AGENTS.md`](AGENTS.md)** – Instrukce pro AI agenty, architektura projektu a kritická pravidla, která se nesmí porušit.
- **[`docs/UI-DESIGN.md`](docs/UI-DESIGN.md)** – Závazná specifikace design systému (**17. Neo-Brutalism & Bold Pop Studio**, Light/Dark mode, barevné odznaky, typografie, Safari kompatibilita).
- **[`docs/BACKEND-PLAN.md`](docs/BACKEND-PLAN.md)** – Architektura a přehled 100% serverless backendu za 0 Kč/měsíc (Cloudflare D1 + Cloudflare R2 + Edge CDN Cache + Pages Functions + Resend).
- **Databázové migrace (Cloudflare D1):**
  - [`migrations/0001_initial.sql`](migrations/0001_initial.sql) – Základní tabulky (`profiles`, `mk_licenses_cache`, `jobs`, `job_responses`, `auth_codes`, `auth_sessions`).
  - [`migrations/0002_lifecycle_and_reviews.sql`](migrations/0002_lifecycle_and_reviews.sql) – Vazba `Poptávka ↔ Nabídka` (`matched_partner_*`), stav `completed`, recenze (`job_reviews`) a ukázkové realizované zakázky.
  - [`migrations/0003_site_settings.sql`](migrations/0003_site_settings.sql) – Tabulka `site_settings` pro Admin CMS úpravu textů webu.

---

## 4. Lokální vývoj a nasazení

```bash
# Spuštění vývojového serveru
npm run dev

# Statický produkční build (do složky ./out)
npm run build

# Nasazení na Cloudflare Pages (včetně Pages Functions v ./functions)
npx wrangler pages deploy out --project-name=restaurion --branch=main
```
