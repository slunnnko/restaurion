// Detekce typu fotky inzerátu podle prvních bajtů (hlavičce Content-Type se nevěří).

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_PREFIX = '/api/photos/';

export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp';

export const PHOTO_EXT: Record<PhotoType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.slice(from, to));
}

/** Returns the real type of a JPEG / PNG / WebP file from its magic bytes, or null (GIF, SVG, text, …). */
export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** R2 key behind an `/api/photos/…` URL, or null when the URL is anything else (legacy / external). */
export function photoKeyFromUrl(url: string | null | undefined): string | null {
  return url && url.startsWith(PHOTO_PREFIX) ? url.slice(PHOTO_PREFIX.length) : null;
}
