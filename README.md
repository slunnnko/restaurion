# Restaurion – dostupnost a zakázky pro památková řemesla

**Produkční URL:** https://restaurion.pages.dev

Restaurion propojuje licencované restaurátory (držitele povolení MK ČR) a umělecké řemeslníky. MVP řeší jednu věc: zadavatel vloží zakázku s termínem a obory a **každý odpovídající řemeslník (celá ČR) dostane upozornění**, pokud má v termínu čas.

## 1. Co aplikace dělá (hlavní smyčka)

1. Řemeslník se přihlásí e-mailem a 6místným kódem (bez hesla, povinný souhlas s VOP) a vyplní profil: jméno, obory, zkušenosti. Ve výchozím stavu je k dispozici.
2. Může přidat bloky nedostupnosti (od–do). Přijaté zakázky se počítají jako obsazené dny.
3. Zadavatel vloží veřejnou zakázku s rozsahem dat a obory (typy: *Hledám subdodavatele*, *Hledám zaštítění licencí MK ČR*).
4. Každý odpovídající řemeslník dostane upozornění v aplikaci (a e-mailem v denním souhrnu). Zakázka je na veřejné nástěnce.
5. Řemeslník klikne na **Mám zájem**, zadavatel dostane upozornění.
6. Zadavatel vidí zájemce jen u **své** zakázky (bez kontaktů) a přijme nebo odmítne.
7. Po přijetí vidí obě strany e-mail a telefon druhé strany. Termín je pro řemeslníka obsazený. Řemeslník může **odstoupit**, termín se uvolní a zadavatel dostane upozornění.
8. Ukončení zakázky uvolní termíny a upozorní řemeslníky se zájmem nebo přijetím (`job_closed`).

Zadavatel nemůže procházet ani zvát řemeslníky, žádný endpoint je nevypisuje. Pravidlo párování je jen v `src/lib/matching.ts`.

## 2. Lokální vývoj

```bash
npm install --registry https://registry.npmjs.org/   # jen pokud je npm nastavené na jiný registr
npm run dev                  # Next.js (UI), API tu neběží
npm test                     # unit testy (node --test tests/*.test.ts)
bash scripts/e2e-local.sh    # end-to-end test API: lokální D1 + wrangler pages dev, vyžaduje jq a curl
```

`scripts/e2e-local.sh` maže lokální stav D1 (`.wrangler/state`), aplikuje migrace 0001–0006 a spustí `wrangler pages dev` na portu 8788. Nic nenasazuje a nepoužívá `--remote`.

Celé UI + API lokálně: `npm run build`, potom `npx wrangler pages dev out --d1 DB=<id>` (id je ve `wrangler.json`). Bez nastaveného Resendu se přihlašovací kód vypíše do konzole wrangleru.

## 3. Migrace

Starší migrace se aplikovaly příkazem `execute`, tabulka `d1_migrations` neexistuje, proto **ne** `migrations apply`:

```bash
npx wrangler d1 execute restaurion-db --remote --file=./migrations/0006_mvp_matching.sql
```

Migrace 0006 se pouští **jen jednou** (`ALTER TABLE ADD COLUMN` není idempotentní). Přidává sloupce profilů a zakázek a tabulky `unavailability_blocks`, `engagements`, `notifications`, `login_codes`, `rate_limit_events`, `email_log`. Nic nemaže. Pole `licence_verified` se ze starých dat nepřebírá.

## 4. Nasazení

- **Pages (UI + API):** `npm run deploy` (build a `wrangler pages deploy out --project-name restaurion`). Funkce v `functions/api/` běží jako Pages Functions s D1 bindingem `DB`.
- **Denní souhrn e-mailem:** samostatný Worker `workers/digest` s Cron Triggerem (06:00 UTC), protože Pages Functions cron neumí: `npx wrangler deploy -c workers/digest/wrangler.json`. Worker také maže staré záznamy (`rate_limit_events`, prošlé `login_codes`).

### Secrets a proměnné (jen názvy, hodnoty se nikdy necommitují)

| Název | Kde | Poznámka |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Pages + digest worker | bez něj se e-maily neposílají |
| `RESEND_FROM` | Pages + digest worker | adresa odesílatele na ověřené doméně v Resendu |
| `APP_URL` | volitelné | odkazy v e-mailech, výchozí `https://restaurion.pages.dev` |
| `TEST_LOGIN_ECHO` | **jen test** | `1` a zároveň nenastavený Resend: `request-code` vrátí kód v odpovědi (`testCode`). Před ostrým spuštěním smazat. |

Secret se nastavuje příkazem `npx wrangler pages secret put <NÁZEV> --project-name restaurion` (digest worker: `npx wrangler secret put <NÁZEV> -c workers/digest/wrangler.json`).

Limity e-mailů: 100 za den celkem, přihlašovací kódy na adresy bez profilu max. 50 za den, denní souhrn nechává rezervu 10 e-mailů na kódy.

## 5. Moderace

Bez admin rozhraní. Data se spravují v Cloudflare Dashboardu: **Workers & Pages → D1 → `restaurion-db` → Tables**. Odznak ověřené licence se nastaví ručně (`profiles.licence_verified = 1`); změna čísla licence v profilu ho sama vrátí na 0. Zakázku lze skrýt změnou `jobs.visibility` nebo `jobs.status`.

## 6. Mimo rozsah MVP a fáze 2

Mimo MVP: administrační UI, CMS textů, recenze, nahrávání fotek, automatické ověřování licencí MK ČR, archiv zakázek v UI, inzeráty „Nabízím se“.

Fáze 2: procházení řemeslníků a pozvání zadavatelem, inzeráty „Nabízím se“, ověřování licencí proti rejstříku MK ČR, recenze po spolupráci, push notifikace.

Další dokumenty: [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md) (závazný design), [`docs/BACKEND-PLAN.md`](docs/BACKEND-PLAN.md) (architektura backendu), [`AGENTS.md`](AGENTS.md) (pravidla pro agenty).
