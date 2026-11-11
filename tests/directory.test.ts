import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupLicenceError,
  isDirectoryGroup,
  isHttpUrl,
  normalizeFacebook,
  normalizeInstagram,
  normalizeWhatsapp,
  validateNewJob,
} from '../functions/api/_lib/validate.ts';
import { mapContact, mapPublicPerson } from '../functions/api/_shared.ts';
import type { ProfileRow } from '../functions/api/_shared.ts';

test('instagram: handle, @handle and profile URL all normalise to a bare handle', () => {
  assert.equal(normalizeInstagram('restaurion'), 'restaurion');
  assert.equal(normalizeInstagram('@rest.aurion_1'), 'rest.aurion_1');
  assert.equal(normalizeInstagram('https://www.instagram.com/restaurion/?hl=cs'), 'restaurion');
  assert.equal(normalizeInstagram('instagram.com/restaurion'), 'restaurion');
  assert.equal(normalizeInstagram('  '), '');
});

test('instagram: rejects other sites, bad characters and over-long handles', () => {
  assert.equal(normalizeInstagram('https://evil.example/restaurion'), null);
  assert.equal(normalizeInstagram('javascript:alert(1)'), null);
  assert.equal(normalizeInstagram('has space'), null);
  assert.equal(normalizeInstagram('a'.repeat(61)), null);
  assert.equal(normalizeInstagram('a'.repeat(60)), 'a'.repeat(60));
});

test('instagram: reserved first path segments are rejected', () => {
  for (const seg of ['accounts', 'p', 'reel', 'reels', 'explore', 'stories', 'tv']) {
    assert.equal(normalizeInstagram(`https://www.instagram.com/${seg}/abc/`), null);
  }
  assert.equal(normalizeInstagram('https://instagram.com/restaurion/p/abc'), 'restaurion');
});

test('facebook: http(s) on facebook.com / fb.com hosts only', () => {
  assert.equal(normalizeFacebook(''), '');
  assert.equal(normalizeFacebook('https://www.facebook.com/restaurion'), 'https://www.facebook.com/restaurion');
  assert.equal(normalizeFacebook('http://m.facebook.com/x'), 'http://m.facebook.com/x');
  assert.equal(normalizeFacebook('https://fb.com/x'), 'https://fb.com/x');
  assert.equal(normalizeFacebook('https://facebook.com.evil.example/x'), null);
  assert.equal(normalizeFacebook('https://example.com/x'), null);
  assert.equal(normalizeFacebook('facebook.com/x'), null);
  assert.equal(normalizeFacebook('javascript:alert(1)'), null);
});

test('whatsapp: digits only, 9 digits get 420, 11–15 digits required', () => {
  assert.equal(normalizeWhatsapp('+420 777 111 222'), '420777111222');
  assert.equal(normalizeWhatsapp('777 111 222'), '420777111222');
  assert.equal(normalizeWhatsapp('00420777111222'), '00420777111222');
  assert.equal(normalizeWhatsapp(''), '');
  assert.equal(normalizeWhatsapp('abc'), null);
  assert.equal(normalizeWhatsapp('123'), null);
  assert.equal(normalizeWhatsapp('1234567890'), null);
  assert.equal(normalizeWhatsapp('+1234567890123456'), null);
});

test('facebook / web: only http(s) URLs up to 300 chars', () => {
  assert.equal(isHttpUrl('https://facebook.com/restaurion'), true);
  assert.equal(isHttpUrl('javascript:alert(1)'), false);
  assert.equal(isHttpUrl(''), false);
  assert.equal(isHttpUrl(`https://a.cz/${'x'.repeat(300)}`), false);
});

test('directory group: only firm, licensed, unlicensed', () => {
  assert.equal(isDirectoryGroup('firm'), true);
  assert.equal(isDirectoryGroup('licensed'), true);
  assert.equal(isDirectoryGroup('unlicensed'), true);
  assert.equal(isDirectoryGroup('admin'), false);
  assert.equal(isDirectoryGroup(undefined), false);
});

test('group licensed needs a licence number', () => {
  assert.notEqual(groupLicenceError('licensed', ''), null);
  assert.notEqual(groupLicenceError('licensed', null), null);
  assert.notEqual(groupLicenceError('licensed', '   '), null);
  assert.equal(groupLicenceError('licensed', 'MK-100'), null);
  assert.equal(groupLicenceError('firm', ''), null);
  assert.equal(groupLicenceError('unlicensed', undefined), null);
});

const row: ProfileRow = {
  id: 'u-1',
  email: 'a@b.cz',
  name: 'Jan Novák',
  region: 'Praha',
  phone: '+420 777 111 222',
  crafts: '["kámen"]',
  experience_text: '10 let',
  portfolio_url: 'https://novak.cz',
  licence_number: null,
  licence_verified: 0,
  email_digest: 1,
  accepting_jobs: 1,
  directory_group: 'licensed',
  directory_visible: 1,
  instagram: 'novak',
  whatsapp: '+420 777 111 222',
  facebook: null,
};

test('public person carries group and region but never contacts', () => {
  const json = JSON.stringify(mapPublicPerson(row));
  assert.match(json, /"group":"licensed"/);
  assert.match(json, /"region":"Praha"/);
  assert.doesNotMatch(json, /@|777|novak\.cz|instagram/);
});

test('contact mapping carries all channels and omits empty ones', () => {
  const c = mapContact(row);
  assert.equal(c.email, 'a@b.cz');
  assert.equal(c.website, 'https://novak.cz');
  assert.equal(c.instagram, 'novak');
  assert.equal(c.whatsapp, '+420 777 111 222');
  assert.equal('facebook' in c, false);
});

test('new job: an offer needs no monument status and ignores one', () => {
  const body = {
    title: 'Volný kameník',
    jobType: 'craftsman_available',
    crafts: ['kámen'],
    region: 'Praha',
    city: 'Praha',
    dateFrom: '2099-01-01',
    dateTo: '2099-01-10',
    monumentName: 'Hrad',
  };
  const { errors, values } = validateNewJob(body);
  assert.deepEqual(errors, {});
  assert.equal(values.monumentStatus, 'craft_work');
  assert.equal(values.monumentName, '');
  const job = validateNewJob({ ...body, jobType: 'subcontract_needed' });
  assert.notEqual(job.errors.monumentStatus, undefined);
});

test('plural: Czech 1 / 2–4 / 5+', async () => {
  const { plural } = await import('../src/lib/format.ts');
  assert.equal(plural(1, 'den', 'dny', 'dní'), 'den');
  assert.equal(plural(3, 'den', 'dny', 'dní'), 'dny');
  assert.equal(plural(0, 'den', 'dny', 'dní'), 'dní');
  assert.equal(plural(5, 'den', 'dny', 'dní'), 'dní');
});
