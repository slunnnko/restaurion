-- ==============================================================================
-- RESTAURION: Cloudflare D1 (SQLite) Databázové schéma a počáteční seed data
-- Spuštění lokálně: npx wrangler d1 execute restaurion-db --local --file=./migrations/0001_initial.sql
-- Spuštění v produkci: npx wrangler d1 execute restaurion-db --remote --file=./migrations/0001_initial.sql
-- ==============================================================================

-- 1. TABULKA: Uživatelské profily (profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    role TEXT NOT NULL DEFAULT 'unlicensed_craftsman'
        CHECK (role IN ('licensed_restorer', 'unlicensed_craftsman', 'student_graduate', 'atelier_firm')),
    avatar_url TEXT,
    region TEXT NOT NULL DEFAULT 'Jihomoravský kraj',
    city TEXT NOT NULL,
    phone TEXT,
    bio TEXT NOT NULL DEFAULT '',
    specializations_json TEXT NOT NULL DEFAULT '[]',     -- JSON pole stringů
    mk_license_number TEXT,
    mk_license_fields_json TEXT NOT NULL DEFAULT '[]',   -- JSON pole stringů
    verification_status TEXT NOT NULL DEFAULT 'not_applicable'
        CHECK (verification_status IN ('not_applicable', 'verified_auto', 'verified_manual', 'manual_review_needed', 'unverified')),
    verified_at TEXT,
    availability TEXT NOT NULL DEFAULT 'available_now'
        CHECK (availability IN ('available_now', 'available_soon', 'busy')),
    available_from TEXT,
    completed_jobs_count INTEGER NOT NULL DEFAULT 0,
    colleague_endorsements_count INTEGER NOT NULL DEFAULT 0,
    school_or_background TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);

-- 2. TABULKA: Lokální cache rejstříku povolení MK ČR (mk_licenses_cache)
CREATE TABLE IF NOT EXISTS mk_licenses_cache (
    id TEXT PRIMARY KEY,
    license_number TEXT UNIQUE NOT NULL,
    holder_name TEXT NOT NULL,
    fields_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    last_synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mk_cache_license ON mk_licenses_cache(license_number);

-- 3. TABULKA: Zakázky a nabídky kapacit (jobs)
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    job_type TEXT NOT NULL DEFAULT 'subcontract_needed'
        CHECK (job_type IN ('subcontract_needed', 'guarantor_needed', 'craftsman_available', 'general_commission')),
    monument_status TEXT NOT NULL DEFAULT 'cultural_monument'
        CHECK (monument_status IN ('cultural_monument', 'national_monument', 'historic_unregistered', 'craft_work')),
    monument_name TEXT,
    monument_reg_number TEXT,
    image_url TEXT,
    required_crafts_json TEXT NOT NULL DEFAULT '[]',     -- JSON pole stringů
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    start_date TEXT,
    deadline TEXT,
    budget_note TEXT NOT NULL,
    responses_count INTEGER NOT NULL DEFAULT 0,
    urgent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'in_progress', 'completed', 'archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_region ON jobs(region);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_monument ON jobs(monument_status);

-- 4. TABULKA: Reakce na zakázky („Mám zájem“ / job_responses)
CREATE TABLE IF NOT EXISTS job_responses (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    sender_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    attach_profile INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_responses_job ON job_responses(job_id);

-- 5. TABULKA: Bezheslové přihlašování (OTP kódy a relace)
CREATE TABLE IF NOT EXISTS auth_codes (
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_email ON auth_codes(email);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. TABULKA: Úložiště komprimovaných WebP fotek (fallback, pokud není připojen R2 bucket)
CREATE TABLE IF NOT EXISTS photos (
    key TEXT PRIMARY KEY,
    content_type TEXT NOT NULL DEFAULT 'image/webp',
    data_base64 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==============================================================================
-- SEED DATA (Výchozí profily, licence MK ČR a ukázkové inzeráty)
-- ==============================================================================

INSERT OR IGNORE INTO mk_licenses_cache (id, license_number, holder_name, fields_json, active) VALUES
('mk-1', 'MK 2451/2008', 'Jan Novák', '["sochařská díla z kamene","architektonické články ze štuku a sádry"]', 1),
('mk-2', 'MK 5189/2015', 'Tomáš Kolář', '["uměleckořemeslná díla ze dřeva a nábytek"]', 1),
('mk-3', 'MK 8920/2020', 'Radim Malý', '["malířská díla na plátně, dřevěných deskách a nástěnné malby"]', 1);

INSERT OR IGNORE INTO profiles (
    id, email, name, title, role, avatar_url, region, city, phone, bio,
    specializations_json, mk_license_number, mk_license_fields_json,
    verification_status, verified_at, availability, available_from,
    completed_jobs_count, colleague_endorsements_count, school_or_background
) VALUES
(
    'user-novak', 'novak.restaurovani@seznam.cz', 'Akad. soch. Jan Novák',
    'Akademický sochař a restaurátor', 'licensed_restorer', '/images/avatar-novak.jpg',
    'Jihomoravský kraj', 'Brno / Mikulov', '+420 608 112 233',
    'Povolení MK ČR pro restaurování děl z kamene a štuku od roku 2008. Specializace na barokní a renesanční architekturu na jižní Moravě.',
    '["Kámen","Štuk","Pískovec","Vápenné omítky"]', 'MK 2451/2008',
    '["sochařská díla z kamene","architektonické články ze štuku a sádry"]',
    'verified_auto', '2024-01-15', 'available_now', NULL,
    42, 18, 'AVU Praha, Ateliér restaurování výtvarných děl sochařských'
),
(
    'user-svoboda', 'svoboda.stuky@gmail.com', 'Petr Svoboda',
    'Umělecký štukatér a fasádník', 'unlicensed_craftsman', '/images/avatar-svoboda.jpg',
    'Jihomoravský kraj', 'Znojmo', '+420 774 998 877',
    '14 let praxe s tradičními vápennými maltami, taženými římsami a štukovými dekory. Nemám licenci MK ČR, proto rád spolupracuji jako subdodavatel pod dohledem restaurátora.',
    '["Štukatérství","Tažené římsy","Tradiční vápenné technologie","Opravy fasád"]', NULL, '[]',
    'not_applicable', NULL, 'available_now', NULL,
    29, 12, 'SOU stavební a umělecká řemesla Brno'
),
(
    'user-dvorakova', 'eliska.dvorakova.rest@email.cz', 'Mgr. art. Eliška Dvořáková',
    'Restaurátorka nástěnných maleb a sgrafit', 'student_graduate', '/images/avatar-dvorakova.jpg',
    'Pardubický kraj (Litomyšl / Svitavy)', 'Litomyšl', '+420 732 445 566',
    'Čerstvá absolventka magisterského studia na Fakultě restaurování v Litomyšli. Praxe na renesančních sgrafitech v Litomyšli a freskách na východních Čechách. Připravuji žádost o licenci MK ČR.',
    '["Nástěnná malba","Sgrafitová výzdoba","Průzkumy omítek a maleb","Retuše"]', NULL, '[]',
    'manual_review_needed', NULL, 'available_now', NULL,
    9, 7, 'Fakulta restaurování Univerzita Pardubice (Litomyšl)'
),
(
    'user-kolar', 'kolar.antiqua@centrum.cz', 'MgA. Tomáš Kolář',
    'Licencovaný restaurátor nábytku a dřeva', 'licensed_restorer', '/images/avatar-kolar.jpg',
    'Pardubický kraj (Litomyšl / Svitavy)', 'Svitavy / Litomyšl', '+420 603 554 433',
    'Držitel licence MK ČR na umělecko-řemeslná díla ze dřeva, intarzie a polychromovanou plastiku. Hledám truhláře na hrubou tesařskou/truhlářskou přípravu.',
    '["Dřevo","Polychromie","Historický nábytek","Šelakové politury"]', 'MK 5189/2015',
    '["uměleckořemeslná díla ze dřeva a nábytek"]',
    'verified_auto', '2023-11-20', 'available_soon', '2026-10-15',
    31, 15, 'Vyšší odborná škola uměleckořemeslná Praha'
),
(
    'user-prochazka', 'kovar.prochazka@post.cz', 'Marek Procházka',
    'Umělecký kovář a zámečník', 'unlicensed_craftsman', NULL,
    'Jihomoravský kraj', 'Mikulov / Břeclav', '+420 721 889 001',
    'Vlastní kovářská dílna, 20 let zkušeností s kovanými mřížemi, panty, klikami a historickými zámky. Realizace na vinných sklepech i panských sídlech.',
    '["Umělecké kovářství","Historické zámečnictví","Restaurování kovu","Kované mříže"]', NULL, '[]',
    'not_applicable', NULL, 'available_now', NULL,
    38, 14, 'Uměleckořemeslná škola Turnov'
),
(
    'user-cerna', 'veronika.cerna.gold@seznam.cz', 'Bc. Veronika Černá',
    'Pozlacovačka a restaurátorka polychromie', 'unlicensed_craftsman', '/images/avatar-cerna.jpg',
    'Jihomoravský kraj', 'Brno / Tišnov', '+420 776 123 987',
    'Zlacení plátkovým zlatem na poliment i mixtion, stříbření, doplňování křídových podkladů barokních rámů a oltářů. Hledám zakázky i subdodávky.',
    '["Zlacení na poliment","Zlacení na mixtion","Oltářní architektura","Obrazové rámy"]', NULL, '[]',
    'not_applicable', NULL, 'available_now', NULL,
    16, 8, 'SUPŠ Brno'
);

INSERT OR IGNORE INTO jobs (
    id, author_id, title, description, job_type, monument_status,
    monument_name, monument_reg_number, image_url, required_crafts_json,
    region, city, start_date, deadline, budget_note, responses_count, urgent
) VALUES
(
    'job-1', 'user-novak',
    'Výpomoc při čištění a injektáži barokního portálu (Zámek Mikulov)',
    'Pro probíhající etapu obnovy západního křídla zámku v Mikulově hledám 1–2 šikovné kameníky nebo štukatéry na mechanické a chemické čištění vápencových článků, odsolování a přípravu spárování. Práce probíhají pod mým přímým restaurátorským dohledem a licencí MK ČR.',
    'subcontract_needed', 'cultural_monument',
    'Zámek Mikulov - západní portál', 'ÚSKP 15482/7-1234', '/images/job-stone.jpg',
    '["Kameník","Štukatér","Čištění kamene"]',
    'Jihomoravský kraj', 'Mikulov', 'Ihned / říjen 2026', '30. 11. 2026',
    '350 – 450 Kč/hod dle zkušeností (IČO fakturace)', 3, 1
),
(
    'job-2', 'user-kolar',
    'Hledám zaštítění licencovaným restaurátorem: Renesanční trámový strop (Litomyšl)',
    'Majitel měšťanského domu na Smetanově náměstí v Litomyšli mě oslovil s obnovou původního renesančního kazetového stropu (čištění, zpevnění dřeva, doplnění chybějících profilů). Jedná se o kulturní památku, proto hledám licencovaného kolegu z okolí (Litomyšl / Svitavy / Pardubice), který by převzal odbornou garanci, zpracoval restaurátorský záměr a závěrečnou zprávu. Fyzickou truhlářskou práci provedu sám.',
    'guarantor_needed', 'cultural_monument',
    'Měšťanský dům, Smetanovo náměstí Litomyšl', 'ÚSKP 22319/6-4120', '/images/job-wood.jpg',
    '["Restaurátor dřeva s licencí MK ČR","Garant záměru NPÚ"]',
    'Pardubický kraj (Litomyšl / Svitavy)', 'Litomyšl', 'Listopad 2026', 'Březen 2027',
    'Odměna za garanci a zprávu: 45 000 – 60 000 Kč dle dohody', 2, 0
),
(
    'job-3', 'user-novak',
    'Hledám pozlacovače na barokní boční oltář (kostel u Znojma)',
    'Jako držitel licence MK ČR realizuji celkovou obnovu bočního oltáře sv. Jana Nepomuckého. Hledám zručného pozlacovače/pozlacovačku pro položení plátkového zlata na poliment na vyřezávaných akantových rozvilinách a rámu obrazu. Podklady a křídování jsou hotové.',
    'subcontract_needed', 'cultural_monument',
    'Farní kostel sv. Vavřince (Znojemsko)', NULL, '/images/job-gold.jpg',
    '["Pozlacovač","Zlacení na poliment","Polychromie"]',
    'Jihomoravský kraj', 'Znojmo a okolí', '10. 10. 2026', '15. 12. 2026',
    'Rozpočet na subdodávku zlacení: 80 000 Kč', 4, 0
),
(
    'job-4', 'user-kolar',
    'Kované mříže a kování hradební brány – subdodávka (Polička / Svitavy)',
    'Hledáme zkušeného uměleckého kováře pro opravu a vykování chybějících dílů kování a mříží pro historický hradební okruh v Poličce. Historické železo, nutnost tradičních kovářských spojů (nýtování, spony). Objekt není zapsanou památkou v přímé gesci MK licence na kovy, jde o stavební obnovu schválenou památkovým úřadem.',
    'subcontract_needed', 'historic_unregistered',
    'Městské opevnění Polička', NULL, NULL,
    '["Umělecký kovář","Historické zámečnictví"]',
    'Pardubický kraj (Litomyšl / Svitavy)', 'Polička / Svitavy', 'Listopad 2026', 'Leden 2027',
    'Dohodou / úkolová mzda (cca 65 000 Kč)', 1, 0
),
(
    'job-5', 'user-dvorakova',
    'Nabízím se: Restaurátorské a sondážní práce na malbách a sgrafitech',
    'Mám volnou kapacitu pro podzimní a zimní sezónu na jižní Moravě nebo ve východních Čechách. Nabízím stratigrafické průzkumy omítek, sondáže, čištění a retuše nástěnných maleb a omítek pod vedením licencovaného restaurátora nebo na nepamátkových objektech. Vlastní vybavení a lešení.',
    'craftsman_available', 'historic_unregistered',
    NULL, NULL, NULL,
    '["Nástěnná malba","Sgrafitová výzdoba","Sondáže","Retuše"]',
    'Pardubický kraj (Litomyšl / Svitavy)', 'Litomyšl (mobilní po ČR)', 'Volná ihned', NULL,
    'Hodinová sazba 300 – 400 Kč / úkolem', 5, 0
),
(
    'job-6', 'user-svoboda',
    'Nabízím volné štukatérské kapacity: Tradiční vápenné omítky a římsy',
    'Dva vyučení štukatéři se zkušenostmi s vápennými maltami a taháním profilů na historických fasádách nabízejí volné ruce od listopadu pro ateliéry na jižní Moravě (Brno, Znojmo, Mikulov). Rychlá domluva, spolehlivost.',
    'craftsman_available', 'craft_work',
    NULL, NULL, '/images/job-stucco.jpg',
    '["Štukatér","Fasádník","Tažené římsy"]',
    'Jihomoravský kraj', 'Brno / Znojmo', 'Volný od 1. 11. 2026', NULL,
    'Dle rozsahu prací / fakturace', 2, 0
);

