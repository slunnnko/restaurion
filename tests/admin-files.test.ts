import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdmin } from '../functions/api/_shared.ts';
import { detectDocType } from '../functions/api/_lib/files.ts';

test('isAdmin: matches case-insensitively and ignores spaces around entries', () => {
  const env = { ADMIN_EMAILS: ' Boss@Example.com , other@example.com' };
  assert.equal(isAdmin(env, 'boss@example.com'), true);
  assert.equal(isAdmin(env, 'OTHER@EXAMPLE.COM'), true);
  assert.equal(isAdmin(env, 'someone@example.com'), false);
});

test('isAdmin: no list, empty list or no e-mail is never admin', () => {
  assert.equal(isAdmin({}, 'boss@example.com'), false);
  assert.equal(isAdmin({ ADMIN_EMAILS: '' }, 'boss@example.com'), false);
  assert.equal(isAdmin({ ADMIN_EMAILS: ',,' }, ''), false);
  assert.equal(isAdmin({ ADMIN_EMAILS: 'a@b.cz' }, null), false);
});

const bytes = (...b: number[]) => Uint8Array.from([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);
const text = (s: string, pad = 8) => new TextEncoder().encode(s + ' '.repeat(pad));

test('detectDocType: recognises PDF, JPEG, PNG and HEIC by magic bytes', () => {
  assert.equal(detectDocType(text('%PDF-1.7\n')), 'application/pdf');
  assert.equal(detectDocType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(detectDocType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
  assert.equal(detectDocType(Uint8Array.from([0, 0, 0, 24, ...text('ftypheic', 8)])), 'image/heic');
});

test('detectDocType: rejects HTML, SVG, scripts, other ftyp brands and short input', () => {
  assert.equal(detectDocType(text('<html><script>alert(1)</script>')), null);
  assert.equal(detectDocType(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(detectDocType(Uint8Array.from([0, 0, 0, 24, ...text('ftypmp42', 8)])), null);
  assert.equal(detectDocType(text('%PDF-', 0)), null); // shorter than 12 bytes is not a document
  assert.equal(detectDocType(new Uint8Array(0)), null);
});
