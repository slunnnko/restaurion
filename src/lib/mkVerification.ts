import { VerificationStatus } from '@/types';

export interface VerificationResult {
  status: VerificationStatus;
  licenseNumber?: string;
  holderName?: string;
  fieldSummary?: string;
  confidence: 'automatic' | 'manual_review' | 'not_found';
  message: string;
}

// Simulovaná lokální cache rejstříku MK ČR (bude napojena na API/DB mk_licenses_cache)
const officialMkRegisterCache = [
  {
    licenseNumber: 'MK 2451/2008',
    holderName: 'Jan Novák',
    fields: ['sochařská díla z kamene', 'architektonické články ze štuku a sádry'],
    active: true,
  },
  {
    licenseNumber: 'MK 5189/2015',
    holderName: 'Tomáš Kolář',
    fields: ['uměleckořemeslná díla ze dřeva a nábytek'],
    active: true,
  },
  {
    licenseNumber: 'MK 8920/2020',
    holderName: 'Radim Malý',
    fields: ['malířská díla na plátně, dřevěných deskách a nástěnné malby'],
    active: true,
  },
];

/**
 * Ověření licence Ministerstva kultury ČR:
 * 1. Default: blesková kontrola proti veřejnému seznamu MK ČR (číslo rozhodnutí nebo jméno).
 * 2. V případě pochybností, neshody jména nebo starého formátu -> automatický přesun na 'manual_review_needed'
 *    pro ruční kontrolu administrátorem.
 */
export function verifyMkLicense(
  licenseNumberInput: string,
  personNameInput: string
): VerificationResult {
  const cleanLicense = licenseNumberInput.trim().toUpperCase();
  const cleanName = personNameInput.trim().toLowerCase();

  if (!cleanLicense) {
    return {
      status: 'not_applicable',
      confidence: 'not_found',
      message: 'Nebylo zadáno číslo licence MK ČR.',
    };
  }

  // 1. Zkouška přímé shody v oficiálním registru
  const match = officialMkRegisterCache.find(
    (item) => item.licenseNumber.toUpperCase() === cleanLicense
  );

  if (match) {
    // Kontrola, zda jméno držitele odpovídá zadanému jménu
    const nameMatches = cleanName.includes(match.holderName.toLowerCase()) ||
      match.holderName.toLowerCase().split(' ').some(part => cleanName.includes(part));

    if (nameMatches) {
      return {
        status: 'verified_auto',
        confidence: 'automatic',
        licenseNumber: match.licenseNumber,
        holderName: match.holderName,
        fieldSummary: match.fields.join(', '),
        message: `Licence úspěšně ověřena ve veřejném Rejstříku restaurátorů MK ČR pro: ${match.fields.join(', ')}.`,
      };
    } else {
      // Shoda čísla, ale jméno nesedí přesně -> přepnout na ruční zpracování administrátorem
      return {
        status: 'manual_review_needed',
        confidence: 'manual_review',
        licenseNumber: match.licenseNumber,
        message:
          'Číslo licence nalezeno, ale jméno držitele vyžaduje ruční kontrolu administrátorem (např. změna příjmení či zastupování ateliérem).',
      };
    }
  }

  // 2. Kontrola obecného formátu MK licence (např. "MK 1234/2021" nebo "1234/2021")
  const standardFormat = /^([A-Z]{2}\s*)?\d{3,5}\/\d{4}$/i;
  if (standardFormat.test(cleanLicense)) {
    // Formát je platný, ale záznam ještě není v lokální mezipaměti -> přesměrovat na ruční kontrolu adminem
    return {
      status: 'manual_review_needed',
      confidence: 'manual_review',
      licenseNumber: cleanLicense,
      message:
        'Číslo licence má platný formát MK ČR. Záznam byl předán administrátorovi k rychlému ručnímu ověření ve vyhlášce MK ČR.',
    };
  }

  return {
    status: 'unverified',
    confidence: 'not_found',
    message: 'Zadané číslo neodpovídá formátu platného povolení MK ČR.',
  };
}
