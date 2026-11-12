// Shared phone digit rule (server validation and the profile form must agree).

export const PHONE_RE = /^[+()\d\s.-]{7,25}$/;

/** Digits of a phone with country code (11–15), or null. 00 prefix = +; 9 digits without + / 00 get 420. */
export function phoneDigits(value: string): string | null {
  const v = value.trim();
  if (!PHONE_RE.test(v)) return null;
  let digits = v.replace(/\D/g, '');
  if (v.startsWith('00')) digits = digits.slice(2);
  else if (digits.length === 9 && !v.startsWith('+')) digits = `420${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}
