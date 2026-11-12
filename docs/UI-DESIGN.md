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
  - Nadpisy (`font-serif` / `font-display`): **`Space Grotesk`**
  - Běžný text a UI (`font-sans`): **`Plus Jakarta Sans`**
  - Fonty se načítají přes `<link>` v `src/app/layout.tsx` (nepoužívat `next/font/google`, aby statický build fungoval i offline v sandboxu).
- **Pozadí (`src/app/globals.css`):** jednolitá krémová `#FAF6EB` (Dark Mode `#111318`) s jemnou tečkovanou mřížkou (`radial-gradient`, 24 px). Žádný šablonový vzor ani vlys pod Hero sekcí (odstraněno 2026-11 jako příliš „historizující"); Hero sekce má jen `2px` spodní rámeček.

---

## 2. Barevná paleta & Tmavý režim (Light / Dark Mode)

Aplikace plně podporuje **Světlý (výchozí)** i **Tmavý režim** přes třídu `.dark` na `<html>` (`@custom-variant dark (&:where(.dark, .dark *));` v `src/app/globals.css`):

| Prvek | Světlý režim (Light) | Tmavý režim (Dark) |
| :--- | :--- | :--- |
| **Pozadí stránky (`body`)** | Vápenná krémová `#FAF6EB` + jemná tečkovaná mřížka | Hluboký antracit `#111318` + světlá tečkovaná mřížka |
| **Hero sekce** | Jemná máslově žlutá `bg-[#FEF08A]` s černým textem `#111111` | Tmavý panel `dark:bg-[#191B22]` se žlutým nadpisem `dark:text-[#FEF08A]` |
| **Karty a modály** | Čistě bílá `bg-white` | Tmavě břidlicová `dark:bg-[#1C1E26]` |
| **Inputy a `<select>`** | Krémová `bg-[#FFFDF7]` | Tmavá `dark:bg-[#121318]` |
| **Volba vzhledu (D32)** | Bez přepínače v hlavičce. Karta **„Vzhled“** v `ProfilePage` (`Podle systému` / `Světlý` / `Tmavý`, ukládá se do `profiles.theme_preference`). Anonym a „Podle systému“: světlý jen když `prefers-color-scheme: light`, jinak tmavý (`resolveTheme` v `src/lib/theme.ts`; skript v `layout.tsx` nastaví třídu před vykreslením) |

---

## 3. Závazné barvy a ikony typů inzerátů (`JobCard.tsx`, `CreateJobModal.tsx`)

Tyto tři typy inzerátů (zakládá je kdokoli přihlášený) mají pevně dané barvy a ikony – **nikdy je neměň**:

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
- **Podnadpis v Hero sekci:** `Licencovaní restaurátoři zde poptávají zručné subdodavatele, řemeslníci nacházejí odborné zaštítění dle památkového zákona. Propojujeme restaurátory napříč obory.` – ve výchozím stavu **skrytý**, rozbalí se odkazem `Co je Restaurion?`.
- **Tlačítko pro vytvoření inzerátu (D27, přepisuje dřívější pravidlo `+ Přidat`):** jediné je v Hero na `page.tsx`: (D32, D33) široké popisné tlačítko `h-14 px-7`, `text-base font-extrabold`, stylem jako ostatní tlačítka (`bg-white dark:bg-[#252834]`, `border-2 border-[#111111] dark:border-stone-400`, stín `4px` `#111111` / `#000000`, hover `bg-stone-100 dark:hover:bg-[#323644]` + posun o 1 px, `focus-visible` kroužek) a textem „Přidat inzerát“ (`aria-label` a `title` stejné); jediný zelený prvek je ikona `Plus` (`w-5 h-5 stroke-[3]`) ve čtverečku `w-8 h-8 rounded-lg bg-emerald-600 text-white border-2 border-[#111111]`; od `sm`. Na mobilu (`< sm`) je jediné přidání prostřední tlačítko `MobileBottomNav` (D33: `w-14 h-14`, ikona `w-7 h-7`, `-mt-5`, žluté). V hlavičce ani v prázdném stavu nástěnky tlačítko není. `Právní rámec & VOP` je jen v patičce.
- **Hlavní přepínače (Taby):**
  - `Nástěnka zakázek` (s počtem)
  - `Nabízím se` (s počtem)
  - **`Adresář` není tab** (D28): je to samostatná sekce, otevírá se tlačítkem `Adresář` v hlavičce (D33: na všech šířkách, pod `md` jen ikona `BookUser` s `aria-label`, min. 40 px; od `md` s textem). `MobileBottomNav` má jen `Nástěnka` · `Přidat` (uprostřed) · `Profil`. V sekci je místo tabů nadpis `Adresář` a vlastní řádek filtrů: hledání, region, návrhy oborů, pilulky skupin `Vše · Firmy · Licencovaní · Bez licence`.
  - Taby řeší i typ inzerátu (poptávka vs. nabídka) – samostatný filtr typu ani stavu (Nové / Archivované) už na nástěnce není.
- **Filtry (`JobFilters.tsx`, logika v `src/lib/jobSearch.ts`, D30):** jedno vyhledávací pole `Hledat zakázku, město, kraj, obor nebo zadavatele…` a přepínač `Moje inzeráty` (jen moje položky v aktuálním tabu, včetně archivovaných). **Select `Všechny regiony` není**: kraje se vybírají přes vyhledávání.
  - Návrhy se skládají ze zakázek aktuálního tabu a jsou po druzích `Obory · Kraje · Města · Zadavatelé`, každý s počtem zakázek. Při psaní do 5 na druh (shoda na začátku slova, bez diakritiky; obory přes kmeny), s prázdným polem a fokusem přehled. Město se stejným názvem jako kraj (Praha) je jen jako kraj. Šipky + Enter vybírají, Backspace v prázdném poli smaže poslední štítek.
  - Vybraný návrh je štítek s `×` v řádku pod polem (multiselect). Štítky stejného druhu se sčítají (Praha NEBO Brno), různé druhy se kombinují (kraj A obor). Volný text zároveň hledá v názvu, popisu, městě, kraji, památce, oborech a jménu zadavatele.
  - Obory (`Kámen & štuk`, `Dřevo & nábytek`, `Nástěnné malby & sgrafita`, `Kovářství & kovy`, `Zlacení & polychromie`) se nabízejí jen když k nim existuje zakázka.
- **Karta Adresáře (`DirectoryCard.tsx`):** jméno, odznak skupiny (`Firma` modrá, `Licencovaný restaurátor` zelená, `Bez licence` bílá), obory, region, zkušenosti, číslo povolení s dovětkem `(uvádí sám)`; žádný odznak ověření (D25). Řádek kontaktů (ikona + popisek: telefon, e-mail, web, Instagram, WhatsApp, Facebook) vidí jen přihlášený; anonym má tlačítko **`Kontakty uvidíš po přihlášení`**. Žádná informace o dostupnosti.
- **Kontakty u inzerátu:** stejný řádek kontaktů zadavatele na `JobCard` pro každého přihlášeného. U nabídky `Nabízím se` je termín popsán jako `Volno` a vlastník vidí `Zájemci (N)` bez tlačítek přijmout / odmítnout.
- **Formulář inzerátu:** třetí typ `Nabízím se` (modrá, `UserCheck`); štítky termínu `Volno od` / `Volno do`, úspěch `Nabídka je venku.`
- **Přihlášení:** druhé zaškrtávátko (výchozí zaškrtnuto) `Můj profil bude vidět v Adresáři (můžeš změnit v profilu)`.
- **Patička:** vlevo `Restaurion – platforma pro památková řemesla` (pevný text), vpravo `Všeobecné obchodní podmínky (VOP)`.
- **Pole „Fotka (nepovinné)“ (`CreateJobModal.tsx`, D34):** před tlačítky; náhled 96×64 px s 2px rámečkem, `Vybrat fotku` / `Vybrat jinou` (`secondaryBtn`, skrytý `input[type=file]` s `accept="image/jpeg,image/png,image/webp"`) a `Odebrat` (`dangerBtn`). Soubor se v prohlížeči zmenší (`src/lib/image.ts`). Při vytvoření se fotka nahraje až po uložení inzerátu; když selže, inzerát zůstane a v potvrzení se ukáže chyba.
- **Formulář inzerátu (`CreateJobModal.tsx`):** bez ukázkových fotek a bez pole „Podrobný popis“; odměna je strukturovaná (D26): pilulky `Dohodou` (výchozí) / `Hodinová sazba` / `Za celou práci`, částka, měna `Kč`/`€` (select podle Safari pravidel), u `Za celou práci` povinné pole `Co se za odměnu očekává` (20–1000 znaků); u nabídky se pole jmenuje `Moje sazba`. Datumová pole bez hodnoty ukazují překryv `Nevyplněno` (nativní text je průhledný, výchozí hodnota se nenastavuje); stejně formulář bloku v profilu.
- **Hlavička (`Header.tsx`):** logo + `Restaurion` + odznak `Památková řemesla`, bez přepínače vzhledu (D32, je v profilu), bez tlačítka `Administrace` (odstraněno, D22; správa vlastních inzerátů je v profilu a ve filtru nástěnky `Moje inzeráty`), tlačítko `Adresář` (D33: vždy; pod `md` jen ikona, od `md` s textem, při otevřeném Adresáři žluté), jen přihlášený: profil (kruh s iniciálou, jméno + `Můj profil`, text od `sm`). **Samostatný zvonek není (D28):** nepřečtená upozornění jsou součást profilového tlačítka – korálový odznak s počtem na avataru, korálové pozadí a řádek `N nových upozornění` místo `Můj profil`. Totéž u položky `Profil` v `MobileBottomNav` (položka `Upozornění` zde není). Upozornění se otevírají z karty `Máš N nových upozornění` / `Upozornění` nahoře v `ProfilePage`. Anonym má `Přihlásit`; v hlavičce není tlačítko přidání. Řádek se zalamuje (`flex-wrap`), aby se na 375 px nepřetékalo.
- **Moje inzeráty (`MyListings.tsx`, sekce nahoře v `ProfilePage`):** skupiny `Aktivní` a `Ukončené`. Řádek: typ s barvou a ikonou podle kontraktu v §3, název, termín (`Volno` u nabídky), obec, počet zájemců. Aktivní: `Upravit`, `Zájemci (N)`, `Ukončit` (confirm). Ukončené jsou jen ke čtení a zešedlé. Na mobilu se správa otevírá z profilu (do `MobileBottomNav` nepřibývá nic).
- **Prvky správce (`user.isAdmin`):** na každé `JobCard` včetně cizích inzerátů ikona koše (`Trash2`, `bg-[#DC2626]`, `aria-label` „Smazat inzerát“) vpravo nahoře, confirm „Smazat inzerát? Zájemci dostanou upozornění.“ (D29).
- **Kdy nemůžu (`ProfilePage`):** řádek je světle červený (`bg-red-100 dark:bg-red-950/40`, 2px tmavý rámeček) se štítkem `Blokováno` (ikona `Ban`); zvýrazněný (právě upravovaný) řádek zůstává žlutý. Řádek termínu má `Upravit` (načte ho do formuláře Od/Do/poznámka, tlačítko `Uložit změnu` + `Zrušit`) a smazání. Po uložení se zobrazí `Termín uložen.`, řádek se krátce zvýrazní (`#FEF08A`) a doscrolluje se na něj. `Uložit profil` uloží i rozepsaný termín; je-li vyplněno jen jedno datum, ukáže chybu u formuláře termínu.
- **Úprava inzerátu (`CreateJobModal.tsx`, prop `editJob`):** nadpis `Upravit inzerát`, tlačítko `Uložit změny`, typ inzerátu je vidět, ale neměnný; status a název objektu jsou jen ke čtení. Posílá se jen změněná pole.
- **Karta (`JobCard.tsx`), akce vlastníka (D29):** dole jen tlačítko `Zájemci (N)`. `Upravit`, `Ukončit` a `Smazat` jsou ikony vpravo nahoře na kartě (32 px, neo-brutalistický rámeček a stín), v pořadí tužka (žlutá), křížek `X` (bílá, při hoveru červená; confirm „Opravdu chceš inzerát ukončit? Zmizí z nástěnky.“), koš (červená, jen správce). Každá má `aria-label` a `title`; řádek odznaků má vpravo odsazení, aby ikony nepřekrývaly odznaky.
- **Hlavní akční tlačítko na kartě (`JobCard.tsx`):**
  - U zakázek: **`Mám zájem`**
  - U záložky „Nabízím se“ (`craftsman_available`): **`Poptat spolupráci`**

---

## 5. Kritická pravidla pro komponenty a Safari kompatibilitu

1. **Odměna (`job.reward`, u starých řádků `job.budgetNote`) se na kartě NIKDY nezkracuje (`JobCard.tsx`):** řádek se sumou (`Intl.NumberFormat('cs-CZ')`, `Kč`/`€`, `/hod` nebo `za celou práci`), pod ním celý text rozsahu.
   - Box s odměnou musí být na vlastním řádku přes celou šířku (`break-words`), **bez třídy `truncate`**, aby byla celá částka a poznámka vždy 100% čitelná už v přehledu karet.
2. **Všechny informace přímo na kartě (`JobCard.tsx`):**
   - Karta zobrazuje kompletní přehled ihned (bez nutnosti rozklikávat master-detail panel): odznaky, volitelnou fotku zakázky, ikonu + nadpis, památkový objekt, celý popis, oborové štítky, lokalitu + termín, nezkrácenou odměnu, profil autora s avatarem a tlačítko **„Mám zájem“**.
3. **Volitelné fotografie (`job.imageUrl` a `user.avatarUrl`):**
   - Fotografie ze zakázky (`job.imageUrl`, D34) je volitelná a je úplně nahoře na kartě pod barevným proužkem: `<img>` `aspect-[16/9] w-full object-cover`, `loading="lazy"`, `alt` = název inzerátu, spodní rámeček 2px (`border-[#111111] dark:border-stone-500`), karta ji ořízne zaoblením. Pokud u inzerátu není, karta nezobrazuje prázdný šedý placeholder, ale plynule začíná textem.
   - Profilová fotka (`user.avatarUrl`) má fallback na iniciály uživatele ve žlutém neo-brutalistickém čtverci (`bg-[#FEF08A]`).
4. **Safari `<select>` fix (`JobFilters.tsx`, `CreateJobModal.tsx`, `globals.css`):**
   - Každý `<select>` v aplikaci **MUSÍ** mít `appearance-none` (`-webkit-appearance: none`), pevnou výšku `h-11` (ve filtrech a formulářích), dostatečný pravý padding `pr-9` (a `pl-10` pokud má vlevo ikonu) a vlastní šipku `<ChevronDown className="... pointer-events-none" />`.
   - Bez `appearance-none` Safari na macOS/iOS přepne `<select>` do nativního systémového vzhledu, který ignoruje `padding-left` i výšku a způsobí překrytí textu s ikonou.

