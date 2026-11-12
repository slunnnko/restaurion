import assert from 'node:assert/strict';
import test from 'node:test';
import { detectPhotoType, photoKeyFromUrl } from '../functions/api/_lib/photo.ts';

const bytes = (...head: number[]) => Uint8Array.from([...head, ...new Array(16).fill(0)]);
const ascii = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));

test('detectPhotoType: JPEG, PNG and WebP are recognised by magic bytes', () => {
  assert.equal(detectPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(detectPhotoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
  assert.equal(detectPhotoType(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'))), 'image/webp');
});

test('detectPhotoType: GIF, SVG, text, WAV and short input are rejected', () => {
  assert.equal(detectPhotoType(bytes(...ascii('GIF89a'))), null);
  assert.equal(detectPhotoType(bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg"/>'))), null);
  assert.equal(detectPhotoType(bytes(...ascii('hello world, not an image'))), null);
  assert.equal(detectPhotoType(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'))), null);
  assert.equal(detectPhotoType(new Uint8Array([0xff, 0xd8, 0xff])), null);
});

test('photoKeyFromUrl: only /api/photos/ URLs map to a key', () => {
  assert.equal(photoKeyFromUrl('/api/photos/jobs/j1/a.png'), 'jobs/j1/a.png');
  assert.equal(photoKeyFromUrl('https://example.com/x.png'), null);
  assert.equal(photoKeyFromUrl(null), null);
});
