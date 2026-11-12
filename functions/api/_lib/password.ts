// Password hashing with WebCrypto only (Cloudflare Workers and Node 20+).
// PBKDF2-SHA256, 100 000 iterations = the Workers maximum (more throws). The iteration count is stored in the hash string.

export const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const PREFIX = 'pbkdf2-sha256';

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array | null {
  try {
    const s = atob(value);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `${PREFIX}$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

const DUMMY_SALT = new Uint8Array(SALT_BYTES);

/** Constant-time check. With no stored hash it still runs one PBKDF2, so unknown e-mails take the same time. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    await derive(password, DUMMY_SALT, PBKDF2_ITERATIONS);
    return false;
  }
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
  const salt = fromB64(parts[2]);
  const expected = fromB64(parts[3]);
  if (!salt || !expected || salt.length === 0 || expected.length !== KEY_BYTES) return false;
  const actual = await derive(password, salt, iterations);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

/** Czech error message, or null when the password is acceptable. */
export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
    return 'Heslo musí mít 10 až 200 znaků.';
  }
  return null;
}
