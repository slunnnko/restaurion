import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupLicenceError,
  isDirectoryGroup,
  isHttpUrl,
  normalizeFacebook,
  normalizeInstagram,
  normalizePhone,
  normalizeWhatsapp,
  validateNameParts,
  formatBudgetNote,
  validateNewJob,
  validateReward,
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
  assert.equal(normalizeWhatsapp('00420777111222'), '420777111222');
  assert.equal(normalizeWhatsapp(''), '');
  assert.equal(normalizeWhatsapp('@Jan.Novak'), '@jan.novak');
  assert.equal(normalizeWhatsapp('jan_n'), '@jan_n');
  assert.equal(normalizeWhatsapp('12345'), null);
  assert.equal(normalizeWhatsapp('.jan'), null);
  assert.equal(normalizeWhatsapp('ab'), null);
  assert.equal(normalizeWhatsapp('777111222x'), null);
  assert.equal(normalizeWhatsapp('jan.novak'), '@jan.novak');
  assert.equal(normalizeWhatsapp('@777abc'), '@777abc');
  assert.equal(normalizeWhatsapp('123'), null);
  assert.equal(normalizeWhatsapp('1234567890'), null);
  assert.equal(normalizeWhatsapp('+1234567890123456'), null);
});

test('phone: normalised to display form, country code required', () => {
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone('777111222'), '+420 777 111 222');
  assert.equal(normalizePhone('+421 905 123 456'), '+421 905 123 456');
  assert.equal(normalizePhone('0049 151 1234 5678'), '+4915112345678');
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone('abc'), null);
});

test('name parts: person needs a last name, firm does not', () => {
  assert.deepEqual(validateNameParts('Jan', 'Novák', 'unlicensed'), {});
  assert.equal(validateNameParts('Jan', '', 'licensed').lastName, 'Vyplň příjmení.');
  assert.equal(validateNameParts('', 'Novák', 'unlicensed').firstName, 'Vyplň jméno.');
  assert.deepEqual(validateNameParts('Kámen s.r.o.', '', 'firm'), {});
  assert.equal(validateNameParts('AB', '', 'firm').firstName, 'Název firmy musí mít aspoň 3 znaky.');
  assert.equal(validateNameParts('x'.repeat(41), 'Novák', 'unlicensed').firstName, 'Nejvýše 40 znaků.');
  assert.equal(validateNameParts('x'.repeat(40), 'y'.repeat(39), 'unlicensed').name, undefined);
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

test('reward: negotiable is the default and ignores amount, currency and scope', () => {
  const errors: Record<string, string> = {};
  const r = validateReward({ rewardAmount: 500, rewardCurrency: 'EUR', rewardScope: 'x'.repeat(30) }, errors);
  assert.deepEqual(errors, {});
  assert.deepEqual(r, { type: 'negotiable', amount: null, currency: null, scope: null });
  assert.equal(formatBudgetNote(r), 'Dohodou');
});

test('reward: fixed without a scope is an error, with a scope it passes', () => {
  const e1: Record<string, string> = {};
  validateReward({ rewardType: 'fixed', rewardAmount: 25000 }, e1);
  assert.notEqual(e1.rewardScope, undefined);
  const e2: Record<string, string> = {};
  validateReward({ rewardType: 'fixed', rewardAmount: 25000, rewardScope: 'Oprava fasády do 40 m2, materiál v ceně' }, e2);
  assert.deepEqual(e2, {});
});

test('reward: hourly needs a positive whole amount and a known currency; scope is optional', () => {
  for (const amount of [undefined, 0, -5, 1.5, '450', 10_000_001]) {
    const e: Record<string, string> = {};
    validateReward({ rewardType: 'hourly', rewardAmount: amount }, e);
    assert.notEqual(e.rewardAmount, undefined, `amount ${String(amount)}`);
  }
  const e1: Record<string, string> = {};
  validateReward({ rewardType: 'hourly', rewardAmount: 450, rewardCurrency: 'USD' }, e1);
  assert.notEqual(e1.rewardCurrency, undefined);
  const e2: Record<string, string> = {};
  const r = validateReward({ rewardType: 'hourly', rewardAmount: 450 }, e2);
  assert.deepEqual(e2, {});
  assert.equal(r.currency, 'CZK');
  const e3: Record<string, string> = {};
  validateReward({ rewardType: 'bogus' }, e3);
  assert.notEqual(e3.rewardType, undefined);
});

test('budget_note formatter: hourly, fixed, EUR, thousands grouping', () => {
  assert.equal(formatBudgetNote({ type: 'hourly', amount: 450, currency: 'CZK', scope: null }), '450 Kč/hod');
  assert.equal(formatBudgetNote({ type: 'fixed', amount: 25000, currency: 'CZK', scope: 'x' }), '25\u00a0000 Kč za celou práci');
  assert.equal(formatBudgetNote({ type: 'fixed', amount: 1234567, currency: 'EUR', scope: 'x' }), '1\u00a0234\u00a0567 € za celou práci');
});

test('new job: a fixed reward without a scope is a field error; budgetNote is derived', () => {
  const base = {
    title: 'Oprava fasády',
    jobType: 'subcontract_needed',
    monumentStatus: 'cultural_monument',
    crafts: ['kámen'],
    region: 'Praha',
    city: 'Praha',
    dateFrom: '2099-01-01',
    dateTo: '2099-01-10',
  };
  assert.notEqual(validateNewJob({ ...base, rewardType: 'fixed', rewardAmount: 1000 }).errors.rewardScope, undefined);
  const ok = validateNewJob({ ...base, rewardType: 'hourly', rewardAmount: 450 });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.values.budgetNote, '450 Kč/hod');
});

test('rewardDisplay shares the server formatter and keeps the hourly scope', async () => {
  const { rewardDisplay } = await import('../src/lib/format.ts');
  const r = rewardDisplay({ budgetNote: 'x', reward: { type: 'hourly', amount: 1234567, currency: 'EUR', scope: 'Jen fasáda' } });
  assert.equal(r.headline, '1\u00a0234\u00a0567 €/hod');
  assert.equal(r.scope, 'Jen fasáda');
  assert.equal(r.headline, formatBudgetNote({ type: 'hourly', amount: 1234567, currency: 'EUR', scope: null }));
  assert.deepEqual(rewardDisplay({ budgetNote: 'Dle domluvy 500', reward: undefined }), { headline: 'Dle domluvy 500' });
});
