-- ==============================================================================
-- RESTAURION: Migrace 0002 – Správa stavu zakázek, vazba Poptávka ↔ Nabídka a recenze
-- Spuštění lokálně: npx wrangler d1 execute restaurion-db --local --file=./migrations/0002_lifecycle_and_reviews.sql
-- Spuštění v produkci: npx wrangler d1 execute restaurion-db --remote --file=./migrations/0002_lifecycle_and_reviews.sql
-- ==============================================================================

-- 1. Rozšíření tabulky jobs o vazbu na vybraného parťáka (nabídku) a kolegiální recenzi
ALTER TABLE jobs ADD COLUMN matched_partner_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN matched_partner_name TEXT;
ALTER TABLE jobs ADD COLUMN matched_partner_role TEXT;
ALTER TABLE jobs ADD COLUMN completed_at TEXT;
ALTER TABLE jobs ADD COLUMN review_rating INTEGER;
ALTER TABLE jobs ADD COLUMN review_text TEXT;
ALTER TABLE jobs ADD COLUMN review_author_name TEXT;
ALTER TABLE jobs ADD COLUMN review_created_at TEXT;

-- 2. Samostatná tabulka kolegiálních recenzí navázaných na uskutečněnou zakázku
CREATE TABLE IF NOT EXISTS job_reviews (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    reviewee_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    reviewee_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_reviews_job ON job_reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_reviewee ON job_reviews(reviewee_id);

-- 3. Ukázkové příchozí reakce zájemců k aktivním zakázkám (pro okamžité vyzkoušení správy zakázek)
INSERT OR IGNORE INTO job_responses (
    id, job_id, applicant_id, sender_name, sender_email, sender_phone, message, attach_profile, status, created_at
) VALUES
(
    'resp-seed-1',
    'job-1',
    'user-svoboda',
    'Petr Svoboda',
    'svoboda.stuky@gmail.com',
    '+420 774 998 877',
    'Zdravím pane Nováku, mám v říjnu volné dva týdny a zkušenosti s mikulovským vápencem i vápennými maltami. Můžeme nastoupit hned příští týden.',
    1,
    'pending',
    datetime('now', '-1 hour')
),
(
    'resp-seed-2',
    'job-1',
    'user-prochazka',
    'Marek Procházka',
    'kovar.prochazka@post.cz',
    '+420 721 889 001',
    'Dobrý den, pokud budete u portálu řešit i kované kotvy, čepy nebo mříže, jsem přímo z Mikulova a rád vypomohu.',
    1,
    'pending',
    datetime('now', '-30 minutes')
),
(
    'resp-seed-3',
    'job-2',
    'user-novak',
    'Akad. soch. Jan Novák',
    'novak.restaurovani@seznam.cz',
    '+420 608 112 233',
    'Kolego, pokud byste potřeboval konzultaci k návaznosti stropu na štukové fabiony v Litomyšli, rád se zastavím.',
    1,
    'pending',
    datetime('now', '-12 hours')
);

-- 4. Ukázkové již ukončené (realizované) zakázky s vazbou Poptávka ↔ Nabídka a recenzí
INSERT OR REPLACE INTO jobs (
    id, author_id, title, description, job_type, monument_status, monument_name, monument_reg_number,
    image_url, required_crafts_json, region, city, start_date, deadline, budget_note,
    responses_count, urgent, status, created_at,
    matched_partner_id, matched_partner_name, matched_partner_role, completed_at,
    review_rating, review_text, review_author_name, review_created_at
) VALUES
(
    'job-arch-1',
    'user-novak',
    'Obnova štukové klenby a tažených říms v kapli (Valtice)',
    'Subdodávka štukatérských prací při restaurování barokní kaple pod dozorem držitele licence MK ČR.',
    'subcontract_needed',
    'cultural_monument',
    'Zámecká kaple Valtice',
    'ÚSKP 11940/7-1021',
    NULL,
    '["Štukatér","Tažené římsy","Vápenné malty"]',
    'Jihomoravský kraj',
    'Valtice / Mikulov',
    'Srpen 2026',
    'Září 2026',
    '75 000 Kč (fakturace IČO)',
    3,
    0,
    'completed',
    datetime('now', '-35 days'),
    'user-svoboda',
    'Petr Svoboda',
    'Umělecký štukatér a fasádník (Znojmo)',
    'Září 2026',
    5,
    'Perfektní řemeslná práce s vápennou maltou a přesné dotažení profilů říms. Spolehlivá domluva a čisté předání stavby.',
    'Akad. soch. Jan Novák',
    datetime('now', '-14 days')
),
(
    'job-arch-2',
    'user-kolar',
    'Stratigrafický průzkum a sondáže renesančních omítek (Polička)',
    'Poptávka sondážního průzkumu a dokumentace barevných vrstev před restaurováním dřevěného stropu a ostění.',
    'subcontract_needed',
    'cultural_monument',
    'Měšťanský dům č.p. 48, Polička',
    'ÚSKP 29410/6-3105',
    NULL,
    '["Sondáže","Nástěnná malba","Průzkumy omítek"]',
    'Pardubický kraj (Litomyšl / Svitavy)',
    'Polička',
    'Červenec 2026',
    'Srpen 2026',
    '28 000 Kč za sondážní zprávu a fotodokumentaci',
    2,
    0,
    'completed',
    datetime('now', '-50 days'),
    'user-dvorakova',
    'Mgr. art. Eliška Dvořáková',
    'Restaurátorka nástěnných maleb a sgrafit (Litomyšl)',
    'Srpen 2026',
    5,
    'Pečlivě zpracovaná stratigrafie i fotodokumentace pro NPÚ. Eliška dodržela termín na den přesně, doporučuji dalším kolegům.',
    'MgA. Tomáš Kolář',
    datetime('now', '-25 days')
),
(
    'job-arch-3',
    'user-cerna',
    'Odborné zaštítění licencí MK ČR: Restaurování zlaceného rámu epitafu (Brno)',
    'Hledala jsem držitele povolení MK ČR pro garanci a metodické vedení při obnově barokního zlaceného rámu.',
    'guarantor_needed',
    'cultural_monument',
    'Kostel sv. Jakuba, Brno',
    'ÚSKP 38211/7-54',
    NULL,
    '["Restaurátor s licencí MK ČR","Polychromie","Zlacení na poliment"]',
    'Jihomoravský kraj',
    'Brno',
    'Červen 2026',
    'Srpen 2026',
    'Odměna za garanci a metodický dohled: 32 000 Kč',
    2,
    0,
    'completed',
    datetime('now', '-60 days'),
    'user-novak',
    'Akad. soch. Jan Novák',
    'Akademický sochař a restaurátor (MK 2451/2008)',
    'Srpen 2026',
    5,
    'Skvělá a věcná spolupráce při jednání s NPÚ v Brně. Pan Novák pomohl s restaurátorským záměrem i závěrečnou komisí.',
    'Bc. Veronika Černá',
    datetime('now', '-30 days')
);

INSERT OR REPLACE INTO job_reviews (
    id, job_id, reviewer_id, reviewer_name, reviewee_id, reviewee_name, rating, review_text, created_at
) VALUES
(
    'rev-seed-1',
    'job-arch-1',
    'user-novak',
    'Akad. soch. Jan Novák',
    'user-svoboda',
    'Petr Svoboda',
    5,
    'Perfektní řemeslná práce s vápennou maltou a přesné dotažení profilů říms. Spolehlivá domluva a čisté předání stavby.',
    datetime('now', '-14 days')
),
(
    'rev-seed-2',
    'job-arch-2',
    'user-kolar',
    'MgA. Tomáš Kolář',
    'user-dvorakova',
    'Mgr. art. Eliška Dvořáková',
    5,
    'Pečlivě zpracovaná stratigrafie i fotodokumentace pro NPÚ. Eliška dodržela termín na den přesně, doporučuji dalším kolegům.',
    datetime('now', '-25 days')
),
(
    'rev-seed-3',
    'job-arch-3',
    'user-cerna',
    'Bc. Veronika Černá',
    'user-novak',
    'Akad. soch. Jan Novák',
    5,
    'Skvělá a věcná spolupráce při jednání s NPÚ v Brně. Pan Novák pomohl s restaurátorským záměrem i závěrečnou komisí.',
    datetime('now', '-30 days')
);
