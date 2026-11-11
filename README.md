# Restaurion – dostupnost a zakázky pro památková řemesla

**Produkční URL:** https://restaurion.pages.dev

Restaurion propojuje licencované restaurátory (držitele povolení MK ČR) a umělecké řemeslníky. Zadavatel vloží zakázku s termínem a obory a **každý odpovídající řemeslník (celá ČR) dostane upozornění**, pokud má v termínu čas. Veřejný **Adresář** ukazuje firmy, licencované restaurátory a řemeslníky bez licence.

## 1. Co aplikace dělá (hlavní smyčka)

1. Řemeslník se přihlásí e-mailem a 6místným kódem (bez hesla, povinný souhlas s VOP) a vyplní profil: jméno, obory, zkušenosti. Ve výchozím stavu je k dispozici.
2. Může přidat bloky nedostupnosti (od–do). Přijaté zakázky se počítají jako obsazené dny.
3. Zadavatel vloží veřejnou zakázku s rozsahem dat a obory (typy: *Hledám subdodavatele*, *Hledám zaštítění licencí MK ČR*). Kdokoli se také může nabídnout inzerátem *Nabízím se* (rozsah dat = „Volno od / do“).
4. Každý odpovídající řemeslník dostane upozornění v aplikaci (a e-mailem v denním souhrnu). Zakázka je na veřejné nástěnce. Nabídka *Nabízím se* žádná upozornění nespouští.
5. Kdokoli přihlášený klikne na **Mám zájem** (u nabídky **Poptat spolupráci**), zadavatel nebo nabízející dostane upozornění.
6. **Kontakty** (e-mail, telefon, web, Instagram, WhatsApp, Facebook) vidí každý přihlášený uživatel u inzerátů, zájemců i v Adresáři. Anonymní návštěvník je nikdy nevidí.
7. U zakázky zadavatel zájemce **přijme** nebo odmítne. Přijetí je signál: termín je pro řemeslníka obsazený a dostane upozornění. Řemeslník může **odstoupit**, termín se uvolní. U nabídky se nepřijímá a nic se neobsazuje.
8. Ukončení zakázky uvolní termíny a upozorní řemeslníky se zájmem nebo přijetím (`job_closed`).

**Adresář:** profil je vidět, pokud má jméno (3+ znaky), souhlas a zapnutý přepínač „Zobrazit mě v Adresáři“ (výchozí zapnuto, jde vypnout při přihlášení i v profilu). Skupiny: Firmy, Licencovaní restaurátoři (odznak „Licence ověřena“ jen po ručním ověření v D1), Bez licence. Bloky nedostupnosti a obsazené dny jsou soukromé a v Adresáři nejsou. Pravidlo párování je jen v `src/lib/matching.ts`.

## 2. Lokální vývoj

```bash
npm install --registry https://registry.npmjs.org/   # jen pokud je npm nastavené na jiný registr
npm run dev                  # Next.js (UI), API tu neběží
npm test                     # unit testy (node --test tests/*.test.ts)
bash scripts/e2e-local.sh    # end-to-end test API: lokální D1 + wrangler pages dev, vyžaduje jq a curl
```

`scripts/e2e-local.sh` maže lokální stav D1 (`.wrangler/state`), aplikuje migrace 0001–0007 a spustí `wrangler pages dev` na portu 8788. Nic nenasazuje a nepoužívá `--remote`.

Celé UI + API lokálně: `npm run build`, potom `npx wrangler pages dev out --d1 DB=<id>` (id je ve `wrangler.json`). Bez nastaveného Resendu se přihlašovací kód vypíše do konzole wrangleru.

## 3. Migrace

Starší migrace se aplikovaly příkazem `execute`, tabulka `d1_migrations` neexistuje, proto **ne** `migrations apply`:

```bash
npx wrangler d1 execute restaurion-db --remote --file=./migrations/0006_mvp_matching.sql
npx wrangler d1 execute restaurion-db --remote --file=./migrations/0007_directory.sql
```

Migrace 0006 a 0007 se pouští **jen jednou** (`ALTER TABLE ADD COLUMN` není idempotentní). Migrace 0007 přidává `profiles.directory_group`, `directory_visible`, `instagram`, `whatsapp`, `facebook` a z existujících dat nastaví skupinu `licensed` (je vyplněné číslo povolení) nebo `firm` (role `atelier_firm`); nic nemaže a `licence_verified` se nemění. Přidává sloupce profilů a zakázek a tabulky `unavailability_blocks`, `engagements`, `notifications`, `login_codes`, `rate_limit_events`, `email_log`. Nic nemaže. Pole `licence_verified` se ze starých dat nepřebírá.

## 4. Nasazení

- **Pages (UI + API):** `npm run deploy` (build a `wrangler pages deploy out --project-name restaurion`). Funkce v `functions/api/` běží jako Pages Functions s D1 bindingem `DB`.
- **Denní souhrn e-mailem:** samostatný Worker `workers/digest` s Cron Triggerem (06:00 UTC), protože Pages Functions cron neumí: `npx wrangler deploy -c workers/digest/wrangler.json`. Worker také maže staré záznamy (`rate_limit_events`, prošlé `login_codes`).

### Secrets a proměnné (jen názvy, hodnoty se nikdy necommitují)

| Název | Kde | Poznámka |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Pages + digest worker | bez něj se e-maily neposílají |
| `RESEND_FROM` | Pages + digest worker | adresa odesílatele na ověřené doméně v Resendu |
| `APP_URL` | volitelné | odkazy v e-mailech, výchozí `https://restaurion.pages.dev` |
| `ADMIN_EMAILS` | Pages (secret) | e-maily správců oddělené čárkou, bez ohledu na velikost písmen. Správce smí smazat jakýkoli inzerát a rozhoduje o ověření licencí. |
| `LICENCE_DOCS` | Pages (R2 binding, `wrangler.json`) | soukromý bucket `restaurion-licence-docs` se scany rozhodnutí MK ČR; musí se vytvořit (`npx wrangler r2 bucket create restaurion-licence-docs`), dokument se po rozhodnutí smaže |
| `TEST_LOGIN_ECHO` | **jen test** | `1` a zároveň nenastavený Resend: `request-code` vrátí kód v odpovědi (`testCode`). Před ostrým spuštěním smazat. |

Secret se nastavuje příkazem `npx wrangler pages secret put <NÁZEV> --project-name restaurion` (digest worker: `npx wrangler secret put <NÁZEV> -c workers/digest/wrangler.json`).

Limity e-mailů: 100 za den celkem, přihlašovací kódy na adresy bez profilu max. 50 za den, denní souhrn nechává rezervu 10 e-mailů na kódy.

## 5. Moderace

Bez admin rozhraní. Data se spravují v Cloudflare Dashboardu: **Workers & Pages → D1 → `restaurion-db` → Tables**. Odznak ověřené licence se nastaví ručně (`profiles.licence_verified = 1`); změna čísla licence v profilu ho sama vrátí na 0. Zakázku lze skrýt změnou `jobs.visibility` nebo `jobs.status`.

## 6. Mimo rozsah MVP a fáze 2

Mimo rozsah: administrační UI, CMS textů, recenze, nahrávání fotek, automatické ověřování licencí MK ČR, archiv zakázek v UI.

Fáze 2: pozvání zadavatelem z Adresáře, ověřování licencí proti rejstříku MK ČR, recenze po spolupráci, push notifikace.

Další dokumenty: [`docs/STATUS.md`](docs/STATUS.md) (stav a další kroky), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (architektura), [`docs/DECISIONS.md`](docs/DECISIONS.md) (rozhodnutí), [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md) (závazný design), [`docs/BACKEND-PLAN.md`](docs/BACKEND-PLAN.md) (architektura backendu), [`AGENTS.md`](AGENTS.md) (pravidla pro agenty).
