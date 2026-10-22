-- ==============================================================================
-- RESTAURÁTOŘI & ŘEMESLA: Databázové schéma (Supabase / PostgreSQL)
-- ==============================================================================

-- Povolení UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM TYPY
CREATE TYPE user_role AS ENUM (
    'licensed_restorer',        -- Restaurátor s povolením MK ČR
    'unlicensed_craftsman',     -- Restaurátor bez licence / umělecký řemeslník
    'student',                  -- Student / absolvent (např. Fakulta restaurování UPCE Litomyšl)
    'atelier_company'           -- Ateliér / firma
);

CREATE TYPE verification_status AS ENUM (
    'not_applicable',           -- Nelicencovaný řemeslník (neověřuje se)
    'pending_auto',             -- Čeká na automatické ověření v rejstříku MK ČR
    'verified_auto',            -- Úspěšně automaticky ověřeno proti rejstříku MK ČR
    'manual_review_needed',     -- Shoda nenalezena nebo pochybnost -> čeká na ruční schválení adminem
    'verified_manual',          -- Ručně ověřeno a schváleno administrátorem
    'rejected'                  -- Zamítnuto
);

CREATE TYPE job_type AS ENUM (
    'subcontract_needed',       -- Licencovaný restaurátor hledá subdodavatele / výpomoc
    'guarantor_needed',         -- Řemeslník má zakázku na památce a hledá garanta s licencí
    'direct_commission',        -- Poptávka práce obecně
    'craftsman_available'       -- "Nabízím se" - řemeslník/restaurátor má volné ruce
);

CREATE TYPE monument_status AS ENUM (
    'cultural_monument',        -- Zapsaná kulturní památka (vyžaduje licenci MK ČR)
    'national_monument',        -- Národní kulturní památka (vyžaduje licenci MK ČR)
    'unregistered_heritage',    -- Historický objekt / soukromá sbírka (bez licence)
    'not_monument'              -- Běžná zakázka / replika / volná tvorba
);

CREATE TYPE availability_state AS ENUM (
    'available_now',            -- Volný ihned
    'available_soon',           -- Volný od data
    'busy'                      -- Aktuálně vytížen
);

-- 2. TABULKA: Uživatelské profily (propojeno s auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'unlicensed_craftsman',
    
    -- Geografie (priorita: Jižní Morava, Litomyšl, Svitavy)
    region TEXT NOT NULL DEFAULT 'Jihomoravský kraj',
    city TEXT NOT NULL,
    willing_to_travel_km INTEGER DEFAULT 50,

    -- Ověření licence Ministerstva kultury ČR
    mk_license_number TEXT,                      -- Číslo rozhodnutí / povolení MK ČR
    mk_license_fields TEXT[],                    -- Obory dle vyhlášky (např. 'kámen', 'nástěnná malba')
    verification_status verification_status NOT NULL DEFAULT 'not_applicable',
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,

    -- Dovednosti a řemesla
    specializations TEXT[] NOT NULL DEFAULT '{}',-- např. štuk, zlacení, kovařina, řezbářství
    bio TEXT,
    portfolio_urls TEXT[] DEFAULT '{}',
    avatar_url TEXT,

    -- Dostupnost
    availability availability_state NOT NULL DEFAULT 'available_now',
    available_from DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABULKA: Rejstřík licencí MK ČR (lokální cache pro bleskové ověření)
CREATE TABLE mk_licenses_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_number TEXT UNIQUE NOT NULL,         -- Např. 1234/2018
    holder_name TEXT NOT NULL,                  -- Jméno a příjmení
    field_specification TEXT NOT NULL,          -- Rozsah oprávnění dle MK ČR
    status TEXT NOT NULL DEFAULT 'active',      -- platné / pozastavené
    verified_from DATE,
    source_url TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mk_cache_license ON mk_licenses_cache(license_number);
CREATE INDEX idx_mk_cache_name ON mk_licenses_cache(holder_name);

-- 4. TABULKA: Zakázky a poptávky práce (Nástěnka)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    job_type job_type NOT NULL DEFAULT 'subcontract_needed',
    
    -- Památkový status
    monument_status monument_status NOT NULL DEFAULT 'cultural_monument',
    monument_name TEXT,                         -- např. "Zámek Mikulov - západní křídlo"
    monument_reg_number TEXT,                   -- Rejstříkové číslo ÚSKP (volitelné)

    -- Obory / specializace
    required_crafts TEXT[] NOT NULL DEFAULT '{}', -- např. {'kameník', 'pozlacovač', 'štukatér'}
    
    -- Lokalita
    region TEXT NOT NULL,                       -- 'Jihomoravský kraj', 'Pardubický kraj (Litomyšl/Svitavy)'
    city TEXT NOT NULL,                         -- 'Brno', 'Litomyšl', 'Znojmo'...
    exact_address_hidden BOOLEAN DEFAULT TRUE,  -- Přesnou adresu odkrýt až po dohodě
    
    -- Termíny a rozpočet
    start_date DATE,
    deadline DATE,
    budget_note TEXT,                           -- 'Dle sazebníku / dohodou', '150 000 Kč'

    status TEXT NOT NULL DEFAULT 'active',      -- 'active', 'in_progress', 'completed', 'archived'
    views_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_region ON jobs(region);
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_jobs_monument ON jobs(monument_status);
CREATE INDEX idx_jobs_status ON jobs(status);

-- 5. TABULKA: Reakce na zakázku (přihlášky zájemců)
CREATE TABLE job_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    phone_contact TEXT,
    status TEXT NOT NULL DEFAULT 'pending',     -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABULKA: Důvěra a kolegiální reference
CREATE TABLE endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    collaboration_role TEXT NOT NULL,           -- např. "Spolupráce na obnově fasády v Litomyšli"
    is_licensed_reviewer BOOLEAN DEFAULT FALSE, -- Byla reference udělena licencovaným restaurátorem?
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. UKÁZKOVÁ DATA (Seed data pro Jižní Moravu a Litomyšl/Svitavy)
-- Pomůže okamžitě otestovat filtraci a zobrazení reálných scénářů.
