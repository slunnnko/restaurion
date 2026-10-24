-- ==============================================================================
-- RESTAURION: Migrace 0003 – Admin CMS tabulka pro editaci textů webu (site_settings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES
('heroTitle', 'Najdi práci nebo parťáka'),
('heroSubtitle', 'Licencovaní restaurátoři zde poptávají zručné subdodavatele, řemeslníci nacházejí odborné zaštítění dle památkového zákona. Propojujeme restaurátory napříč obory.'),
('heroBadge1', 'Poptávky subdodávek a zaštítění'),
('heroBadge2', 'Ověřování licencí MK ČR'),
('heroBadge3', 'Přímý kontakt'),
('announcementBanner', ''),
('footerText', 'Restaurion – Najdi práci nebo parťáka v památkové péči');

