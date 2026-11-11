// Detekce typu nahrávaného dokumentu podle prvních bajtů (hlavičce Content-Type se nevěří).

export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export type DocType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/heic';

const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.slice(from, to));
}

/** Returns the real type of a PDF / JPEG / PNG / HEIC file from its magic bytes, or null. */
export function detectDocType(bytes: Uint8Array): DocType | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 5) === '%PDF-') return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (ascii(bytes, 4, 8) === 'ftyp' && HEIC_BRANDS.includes(ascii(bytes, 8, 12))) return 'image/heic';
  return null;
}
