import { PagesContext, isRequestAdminAuthorized, jsonResponse } from './_shared';

export interface SiteSettingsMap {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge1: string;
  heroBadge2: string;
  heroBadge3: string;
  announcementBanner: string;
  footerText: string;
  featureFlagsJson: string;
}

const DEFAULT_SETTINGS: SiteSettingsMap = {
  heroTitle: 'Najdi práci nebo parťáka',
  heroSubtitle:
    'Licencovaní restaurátoři zde poptávají zručné subdodavatele, řemeslníci nacházejí odborné zaštítění dle památkového zákona. Propojujeme restaurátory napříč obory.',
  heroBadge1: 'Poptávky subdodávek a zaštítění',
  heroBadge2: 'Ověřování licencí MK ČR',
  heroBadge3: 'Přímý kontakt',
  announcementBanner: '',
  footerText: 'Restaurion – Najdi práci nebo parťáka v památkové péči',
  featureFlagsJson: '',
};

export const onRequestGet = async (context: PagesContext) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ settings: DEFAULT_SETTINGS });
  }

  try {
    const { results } = await db
      .prepare('SELECT key, value FROM site_settings')
      .all<{ key: string; value: string }>();

    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of results) {
      if (row.key in settings) {
        settings[row.key] = row.value;
      }
    }

    return jsonResponse({ settings });
  } catch {
    return jsonResponse({ settings: DEFAULT_SETTINGS });
  }
};

export const onRequestPut = async (context: PagesContext) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'Databáze D1 není připojena.' }, 503);
  }

  const authorized = await isRequestAdminAuthorized(context.request, context.env);
  if (!authorized) {
    return jsonResponse(
      { error: 'Pro úpravu textů webu je nutné odemknout administrátorský režim heslem.' },
      401
    );
  }

  try {
    const body = (await context.request.json()) as {
      settings?: Partial<SiteSettingsMap>;
    };

    if (!body.settings || typeof body.settings !== 'object') {
      return jsonResponse({ error: 'Chybí objekt settings.' }, 400);
    }

    const allowedKeys: (keyof SiteSettingsMap)[] = [
      'heroTitle',
      'heroSubtitle',
      'heroBadge1',
      'heroBadge2',
      'heroBadge3',
      'announcementBanner',
      'footerText',
      'featureFlagsJson',
    ];

    const statements = [];
    for (const key of allowedKeys) {
      if (typeof body.settings[key] === 'string') {
        statements.push(
          db
            .prepare(
              `INSERT INTO site_settings (key, value, updated_at)
               VALUES (?, ?, datetime('now'))
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
            )
            .bind(key, body.settings[key]!.trim())
        );
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    const { results } = await db
      .prepare('SELECT key, value FROM site_settings')
      .all<{ key: string; value: string }>();

    const updated: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of results) {
      if (row.key in updated) {
        updated[row.key] = row.value;
      }
    }

    return jsonResponse({ ok: true, settings: updated });
  } catch (err) {
    console.error('Chyba při ukládání textů webu do D1:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit nastavení do D1.' }, 500);
  }
};

