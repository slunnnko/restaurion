import { UserRole } from '@/types';

export interface JobValidationInput {
  title: string;
  city: string;
  region: string;
  crafts: string[];
  budgetNote: string;
  startDate?: string;
  monumentName?: string;
  monumentRegNumber?: string;
  description: string;
}

export interface ProfileValidationInput {
  name: string;
  title: string;
  role: UserRole;
  email: string;
  phone: string;
  city: string;
  region: string;
  bio: string;
  specializations: string[];
  mkLicenseNumber?: string;
  schoolOrBackground?: string;
}

export function validateJobInput(input: JobValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = (input.title || '').trim();
  if (!title) {
    errors.title = 'Vyplňte prosím název inzerátu.';
  } else if (title.length < 5) {
    errors.title = 'Název musí mít alespoň 5 znaků.';
  } else if (title.length > 120) {
    errors.title = 'Název může mít maximálně 120 znaků.';
  }

  const city = (input.city || '').trim();
  if (!city) {
    errors.city = 'Vyplňte prosím město nebo obec.';
  } else if (city.length < 2) {
    errors.city = 'Název města musí mít alespoň 2 znaky.';
  } else if (city.length > 60) {
    errors.city = 'Název města může mít maximálně 60 znaků.';
  }

  const region = (input.region || '').trim();
  if (!region) {
    errors.region = 'Vyberte prosím kraj.';
  }

  const validCrafts = (input.crafts || []).map((c) => c.trim()).filter((c) => c.length >= 2);
  if (validCrafts.length === 0) {
    errors.crafts = 'Zadejte alespoň 1 požadované nebo nabízené řemeslo / techniku.';
  } else if (validCrafts.some((c) => c.length > 50)) {
    errors.crafts = 'Jednotlivý obor může mít maximálně 50 znaků.';
  }

  const budgetNote = (input.budgetNote || '').trim();
  if (!budgetNote) {
    errors.budgetNote = 'Vyplňte prosím orientační odměnu nebo sazbu (např. 450 Kč/hod nebo Dle dohody).';
  } else if (budgetNote.length < 2) {
    errors.budgetNote = 'Odměna musí mít alespoň 2 znaky.';
  } else if (budgetNote.length > 120) {
    errors.budgetNote = 'Odměna může mít maximálně 120 znaků.';
  }

  const startDate = (input.startDate || '').trim();
  if (startDate.length > 60) {
    errors.startDate = 'Termín realizace může mít maximálně 60 znaků.';
  }

  const monumentName = (input.monumentName || '').trim();
  if (monumentName && monumentName.length < 2) {
    errors.monumentName = 'Název objektu musí mít alespoň 2 znaky.';
  } else if (monumentName.length > 120) {
    errors.monumentName = 'Název objektu může mít maximálně 120 znaků.';
  }

  const monumentRegNumber = (input.monumentRegNumber || '').trim();
  if (monumentRegNumber && !/^[0-9A-Za-z/\-\s.]{2,30}$/.test(monumentRegNumber)) {
    errors.monumentRegNumber =
      'Rejstříkové číslo ÚSKP má neplatný formát (povolena čísla, lomítka a pomlčky, 2–30 znaků).';
  }

  const description = (input.description || '').trim();
  if (!description) {
    errors.description = 'Vyplňte prosím popis inzerátu.';
  } else if (description.length < 20) {
    errors.description = 'Popis je příliš stručný (uveďte alespoň 20 znaků).';
  } else if (description.length > 2000) {
    errors.description = 'Popis může mít maximálně 2000 znaků.';
  }

  return errors;
}

export function validateProfileInput(input: ProfileValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = (input.name || '').trim();
  if (!name) {
    errors.name = 'Vyplňte prosím celé jméno (včetně případných titulů).';
  } else if (name.length < 3) {
    errors.name = 'Jméno musí mít alespoň 3 znaky.';
  } else if (name.length > 80) {
    errors.name = 'Jméno může mít maximálně 80 znaků.';
  }

  const title = (input.title || '').trim();
  if (!title) {
    errors.title = 'Vyplňte prosím profesní označení / zaměření (např. Umělecký štukatér).';
  } else if (title.length < 3) {
    errors.title = 'Profesní označení musí mít alespoň 3 znaky.';
  } else if (title.length > 100) {
    errors.title = 'Profesní označení může mít maximálně 100 znaků.';
  }

  const email = (input.email || '').trim();
  if (!email) {
    errors.email = 'Vyplňte prosím kontaktní e-mail.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'Zadejte platnou e-mailovou adresu (např. jmeno@domena.cz).';
  }

  const phone = (input.phone || '').trim();
  const digitsOnly = phone.replace(/\D/g, '');
  if (!phone) {
    errors.phone = 'Vyplňte prosím kontaktní telefonní číslo.';
  } else if (!/^\+?[0-9\s\-()]{9,18}$/.test(phone) || digitsOnly.length < 9 || digitsOnly.length > 15) {
    errors.phone = 'Zadejte platné telefonní číslo (např. +420 777 123 456).';
  }

  const city = (input.city || '').trim();
  if (!city) {
    errors.city = 'Vyplňte prosím město působení.';
  } else if (city.length < 2) {
    errors.city = 'Název města musí mít alespoň 2 znaky.';
  } else if (city.length > 60) {
    errors.city = 'Název města může mít maximálně 60 znaků.';
  }

  const region = (input.region || '').trim();
  if (!region) {
    errors.region = 'Vyberte prosím hlavní kraj působení.';
  }

  const bio = (input.bio || '').trim();
  if (!bio) {
    errors.bio = 'Vyplňte prosím stručné představení a praxi.';
  } else if (bio.length < 15) {
    errors.bio = 'Představení musí mít alespoň 15 znaků.';
  } else if (bio.length > 1000) {
    errors.bio = 'Představení může mít maximálně 1000 znaků.';
  }

  const validSpecs = (input.specializations || [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  if (validSpecs.length === 0) {
    errors.specializations = 'Uveďte alespoň 1 specializaci nebo řemeslo.';
  } else if (validSpecs.some((s) => s.length > 50)) {
    errors.specializations = 'Jednotlivá specializace může mít maximálně 50 znaků.';
  }

  if (input.role === 'licensed_restorer') {
    const mk = (input.mkLicenseNumber || '').trim();
    if (!mk) {
      errors.mkLicenseNumber = 'U licencovaného restaurátora vyplňte číslo povolení MK ČR (nebo č.j.).';
    } else if (mk.length < 2 || mk.length > 40) {
      errors.mkLicenseNumber = 'Číslo povolení MK ČR musí mít 2 až 40 znaků.';
    }
  }

  const school = (input.schoolOrBackground || '').trim();
  if (school.length > 140) {
    errors.schoolOrBackground = 'Vzdělání / praxe může mít maximálně 140 znaků.';
  }

  return errors;
}
