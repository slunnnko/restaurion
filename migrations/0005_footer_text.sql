-- ==============================================================================
-- RESTAURION: Migrace 0005 – Nový výchozí text patičky (footerText v site_settings)
-- Přepíše pouze původní výchozí hodnotu; ručně upravený text z administrace zůstane.
-- ==============================================================================

UPDATE site_settings SET value = 'Restaurion – platforma pro památková řemesla', updated_at = datetime('now') WHERE key = 'footerText' AND value = 'Restaurion – Najdi práci nebo parťáka v památkové péči';
