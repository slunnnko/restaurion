import {
  PagesContext,
  jsonResponse,
  safeJsonParse,
  getAuthenticatedUserId,
  sendEmailViaResend,
} from '../_shared';

interface VerifyLicenseBody {
  licenseNumber?: string;
  personName?: string;
  userId?: string;
}

interface MkLicenseRow {
  license_number: string;
  holder_name: string;
  fields_json: string;
  active: number;
}

/**
 * POST /api/licenses/verify
 * Ověří povolení MK ČR proti tabulce mk_licenses_cache v Cloudflare D1.
 * Pokud jde o známou licenci a jméno sedí -> 'verified_auto' (propíše i na profil uživatele).
 * Pokud má platný formát, ale vyžaduje kontrolu -> 'manual_review_needed' + odešle notifikaci adminovi.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  let body: VerifyLicenseBody;
  try {
    body = (await request.json()) as VerifyLicenseBody;
  } catch {
    return jsonResponse({ error: 'Neplatný formát JSON požadavku.' }, 400);
  }

  const cleanLicense = body.licenseNumber?.trim().toUpperCase() || '';
  const cleanName = body.personName?.trim() || '';

  if (!cleanLicense) {
    return jsonResponse({
      status: 'not_applicable',
      confidence: 'not_found',
      message: 'Nebylo zadáno číslo licence MK ČR.',
    });
  }

  if (!env.DB) {
    return jsonResponse(
      { error: 'Databáze D1 zatím není připojená (binding DB).' },
      503
    );
  }

  try {
    const row = await env.DB.prepare(
      `SELECT license_number, holder_name, fields_json, active
       FROM mk_licenses_cache
       WHERE UPPER(license_number) = ? AND active = 1
       LIMIT 1`
    )
      .bind(cleanLicense)
      .first<MkLicenseRow>();

    const authUserId = (await getAuthenticatedUserId(request, env.DB)) || body.userId || null;

    if (row) {
      const fields = safeJsonParse<string[]>(row.fields_json, []);
      const cleanNameLower = cleanName.toLowerCase();
      const holderLower = row.holder_name.toLowerCase();

      const nameMatches =
        cleanNameLower.includes(holderLower) ||
        holderLower.split(' ').some((part) => part.length > 2 && cleanNameLower.includes(part));

      if (nameMatches) {
        if (authUserId) {
          await env.DB.prepare(
            `UPDATE profiles
             SET role = 'licensed_restorer',
                 mk_license_number = ?,
                 mk_license_fields = ?,
                 verification_status = 'verified_auto'
             WHERE id = ?`
          )
            .bind(row.license_number, JSON.stringify(fields), authUserId)
            .run();
        }

        return jsonResponse({
          status: 'verified_auto',
          confidence: 'automatic',
          licenseNumber: row.license_number,
          holderName: row.holder_name,
          fieldSummary: fields.join(', '),
          message: `Licence úspěšně ověřena ve veřejném Rejstříku restaurátorů MK ČR (D1) pro: ${fields.join(', ')}.`,
        });
      }

      // Číslo v registru existuje, ale jméno nesedí -> ruční kontrola
      if (authUserId) {
        await env.DB.prepare(
          `UPDATE profiles SET mk_license_number = ?, verification_status = 'manual_review_needed' WHERE id = ?`
        )
          .bind(row.license_number, authUserId)
          .run();
      }

      if (env.ADMIN_EMAIL) {
        context.waitUntil(
          sendEmailViaResend(env, {
            to: env.ADMIN_EMAIL,
            subject: `[Restaurion] Ruční kontrola licence MK ČR: ${cleanLicense} (${cleanName})`,
            html: `<p>Uživatel <strong>${cleanName}</strong> žádá o ověření licence <strong>${cleanLicense}</strong> (v registru vedeno na jméno <em>${row.holder_name}</em>).</p>`,
          })
        );
      }

      return jsonResponse({
        status: 'manual_review_needed',
        confidence: 'manual_review',
        licenseNumber: row.license_number,
        message:
          'Číslo licence nalezeno, ale jméno držitele vyžaduje ruční kontrolu administrátorem (např. změna příjmení či zastupování ateliérem).',
      });
    }

    // Kontrola obecného formátu MK licence (např. "MK 1234/2021" nebo "1234/2021")
    const standardFormat = /^([A-Z]{2}\s*)?\d{3,5}\/\d{4}$/i;
    if (standardFormat.test(cleanLicense)) {
      if (authUserId) {
        await env.DB.prepare(
          `UPDATE profiles SET mk_license_number = ?, verification_status = 'manual_review_needed' WHERE id = ?`
        )
          .bind(cleanLicense, authUserId)
          .run();
      }

      if (env.ADMIN_EMAIL) {
        context.waitUntil(
          sendEmailViaResend(env, {
            to: env.ADMIN_EMAIL,
            subject: `[Restaurion] Nová licence MK ČR k ručnímu ověření: ${cleanLicense}`,
            html: `<p>Uživatel <strong>${cleanName}</strong> zadal platný formát licence <strong>${cleanLicense}</strong>, který zatím není v lokální cache D1.</p>`,
          })
        );
      }

      return jsonResponse({
        status: 'manual_review_needed',
        confidence: 'manual_review',
        licenseNumber: cleanLicense,
        message:
          'Číslo licence má platný formát MK ČR. Záznam byl předán administrátorovi k rychlému ručnímu ověření ve vyhlášce MK ČR.',
      });
    }

    return jsonResponse({
      status: 'unverified',
      confidence: 'not_found',
      message: 'Zadané číslo neodpovídá formátu platného povolení MK ČR.',
    });
  } catch (err) {
    console.error('Chyba při POST /api/licenses/verify:', err);
    return jsonResponse({ error: 'Chyba při ověřování licence.' }, 500);
  }
}

