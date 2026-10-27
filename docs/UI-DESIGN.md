# Restaurion – UI Design System & Visual Contract (`docs/UI-DESIGN.md`)

> **STOP & READ BEFORE EDITING ANY UI COMPONENT:**
> Tento dokument je závazným zdrojem pravdy (Single Source of Truth) pro vizuální styl, rozložení, barevnost a texty aplikace **Restaurion** (`restaurion.pages.dev`). Žádný agent (Codex, Claude, Antigravity) **NESMÍ** při implementaci backendu, databáze nebo autentizace měnit tento design systém, barvy, stíny, texty tlačítek ani rozložení karet bez výslovného pokynu uživatele.

---

## 1. Základní vizuální směr: Neo-Brutalism & Bold Pop Studio (Varianta 17)

Design kombinuje moderní, odvážný **Neo-Brutalismus** s prvky **B2B katalogu**:
- **Ohraničení (Borders):** Všechny karty, modály, tlačítka, filtry a odznaky mají výrazný `2px` rámeček (`border-2 border-[#111111] dark:border-stone-500`).
- **Tvrdé offsetové stíny (Hard Offset Shadows):** Žádné rozmazané šedé stíny (`shadow-md`, `shadow-lg` jsou zakázané). Používají se výhradně ostré černé posunuté stíny:
  - Karty a panely: `shadow-[5px_5px_0px_#111111] dark:shadow-[5px_5px_0px_#000000]` (hover: `hover:shadow-[7px_7px_0px_#111111]`)
  - Modály: `shadow-[8px_8px_0px_#111111]`
  - Tlačítka a taby: `shadow-[3px_3px_0px_#111111]` nebo `shadow-[2px_2px_0px_#111111]`
- **Typografie (`src/app/layout.tsx` & `src/app/globals.css`):**
  - Nadpisy (`font-serif` / `font-display`): **`Space Grotesk`** (tučné, moderní)
  - Běžný text a UI (`font-sans`): **`Plus Jakarta Sans`**
  - Fonty se načítají přes `<link>` v `src/app/layout.tsx` (nepoužívat `next/font/google`, aby statický build fungoval i offline v sandboxu).

---

## 2. Barevná paleta & Tmavý režim (Light / Dark Mode)

Aplikace plně podporuje **Světlý (výchozí)** i **Tmavý režim** přes třídu `.dark` na `<html>` (`@custom-variant dark (&:where(.dark, .dark *));` v `src/app/globals.css`):

| Prvek | Světlý režim (Light) | Tmavý režim (Dark) |
| :--- | :--- | :--- |
| **Pozadí stránky (`body`)** | Teplá krémová `#FFFDF7` + jemná tečkovaná mřížka | Hluboký antracit `#111318` + světlá tečkovaná mřížka |
| **Hero sekce** | Jemná máslově žlutá `bg-[#FEF08A]` s černým textem `#111111` | Tmavý panel `dark:bg-[#191B22]` se žlutým nadpisem `dark:text-[#FEF08A]` |
| **Karty a modály** | Čistě bílá `bg-white` | Tmavě břidlicová `dark:bg-[#1C1E26]` |
| **Inputy a `<select>`** | Krémová `bg-[#FFFDF7]` | Tmavá `dark:bg-[#121318]` |
| **Přepínač v hlavičce** | Tlačítko **„Tmavý“ / „Světlý“** v `Header.tsx` + automatická synchronizace s `prefers-color-scheme: dark` (Safari/macOS/iOS) |

---

## 3. Závazné barvy a ikony typů inzerátů (`JobCard.tsx`, `CreateJobModal.tsx`)

Tyto 3 typy inzerátů mají pevně dané barvy a ikony – **nikdy je neměň**:

1. **Hledám subdodavatele (`subcontract_needed`):**
   - **Ikona:** Kladívko (`<HammerLogo />` ze `src/components/HammerLogo.tsx`)
   - **Barva dlaždice ikony:** Smaragdově zelená `bg-emerald-600 text-white`
   - **Barva odznaku (pill):** `bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200`
   - **Horní proužek karty:** `bg-emerald-500`

2. **Hledám zaštítění (`guarantor_needed`):**
   - **Text odznaku:** `Hledám zaštítění licencí MK ČR` (ve formuláři zkráceně `Hledám zaštítění`)
   - **Ikona:** Štít s fajfkou (`<ShieldCheck />` z `lucide-react`)
   - **Barva dlaždice ikony:** Korálová `bg-[#FF5733] text-white`
   - **Barva odznaku (pill):** `bg-[#FFE4DE] dark:bg-[#4A180D] text-[#7C1D0B] dark:text-[#FFB4A2]`
   - **Horní proužek karty:** `bg-[#FF5733]`

3. **Nabízím se (`craftsman_available`):**
   - **Ikona:** Človíček s fajfkou (`<UserCheck />` z `lucide-react`)
   - **Barva dlaždice ikony:** Elektrická modř `bg-[#2563EB] text-white`
   - **Barva odznaku (pill):** `bg-[#DBEAFE] dark:bg-[#172554] text-[#1E3A8A] dark:text-[#93C5FD]`
   - **Horní proužek karty:** `bg-[#2563EB]`

4. **Odznak památky (`monumentStatus`):**
   - Zobrazuje se **POUZE** tehdy, když jde o kulturní památku (`cultural_monument` → **„Kulturní památka“** s ikonou `<Church />`) nebo národní kulturní památku (`national_monument` → **„Národní kulturní památka“**).
   - **ZÁKAZ:** U běžných objektů / zakázek bez licence (`historic_unregistered`, `craft_work`) se **NIKDY nezobrazuje** žádný šedý štítek *„Běžný objekt / bez licence“*.

---

## 4. Závazné texty (Copywriting)

- **Hlavní nadpis v Hero sekci:** `Najdi práci nebo parťáka`
- **Podnadpis v Hero sekci:** `Licencovaní restaurátoři zde poptávají zručné subdodavatele, řemeslníci nacházejí odborné zaštítění dle památkového zákona. Propojujeme restaurátory napříč obory.`
- **Tlačítko pro vytvoření inzerátu (v hlavičce i nad filtry):** `+ Přidat` (nikoliv „Přidat inzerát“)
- **Hlavní přepínače (Taby):**
  - `Nástěnka zakázek` (s počtem)
  - `Nabízím se` (s počtem)
- **Filtry (`JobFilters.tsx`):**
  - Selecty: `Všechny regiony`, `Všechny typy poptávek`, `Všechny objekty`
  - Pilulky oborů: `Všechny obory`, `Kámen & štuk`, `Dřevo & nábytek`, `Nástěnné malby & sgrafita`, `Kovářství & kovy`, `Zlacení & polychromie`
- **Hlavní akční tlačítko na kartě (`JobCard.tsx`):**
  - U zakázek: **`Mám zájem`**
  - U záložky „Nabízím se“ (`craftsman_available`): **`Poptat spolupráci`**

---

## 5. Kritická pravidla pro komponenty a Safari kompatibilitu

1. **Odměna (`job.budgetNote`) se na kartě NIKDY nezkracuje (`JobCard.tsx`):**
   - Box s odměnou musí být na vlastním řádku přes celou šířku (`break-words`), **bez třídy `truncate`**, aby byla celá částka a poznámka vždy 100% čitelná už v přehledu karet.
2. **Všechny informace přímo na kartě (`JobCard.tsx`):**
   - Karta zobrazuje kompletní přehled ihned (bez nutnosti rozklikávat master-detail panel): odznaky, volitelnou fotku zakázky, ikonu + nadpis, památkový objekt, celý popis, oborové štítky, lokalitu + termín, nezkrácenou odměnu, profil autora s avatarem a tlačítko **„Mám zájem“**.
3. **Volitelné fotografie (`job.imageUrl` a `user.avatarUrl`):**
   - Fotografie ze zakázky (`job.imageUrl`) je volitelná. Pokud u inzerátu není, karta nezobrazuje prázdný šedý placeholder, ale plynule začíná textem.
   - Profilová fotka (`user.avatarUrl`) má fallback na iniciály uživatele ve žlutém neo-brutalistickém čtverci (`bg-[#FEF08A]`).
4. **Safari `<select>` fix (`JobFilters.tsx`, `CreateJobModal.tsx`, `globals.css`):**
   - Každý `<select>` v aplikaci **MUSÍ** mít `appearance-none` (`-webkit-appearance: none`), pevnou výšku `h-11` (ve filtrech a formulářích), dostatečný pravý padding `pr-9` (a `pl-10` pokud má vlevo ikonu) a vlastní šipku `<ChevronDown className="... pointer-events-none" />`.
   - Bez `appearance-none` Safari na macOS/iOS přepne `<select>` do nativního systémového vzhledu, který ignoruje `padding-left` i výšku a způsobí překrytí textu s ikonou.

