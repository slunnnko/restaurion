import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyOwnership,
  checkLicence,
  licenceRecheckNeeded,
  nameMatches,
  normalizeLicenceNumber,
  parseDetail,
  parseListIds,
} from '../functions/api/_lib/rrkp.ts';
import { stripTitles } from '../src/lib/names.ts';
import { validateNameParts } from '../functions/api/_lib/validate.ts';

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const LIST_ONE = fx('rrkp-list-one.html');
const LIST_NONE = fx('rrkp-list-none.html');
const DETAIL = fx('rrkp-detail.html');
const DETAIL_TITLES = fx('rrkp-detail-titles.html');
const BASE = 'http://rrkp.test';

const page = (body: string, status = 200) => new Response(body, { status });
function fakeFetch(list: string, detail: string = DETAIL): { fn: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fn = (async (url: string | URL | Request) => {
    const u = String(url);
    calls.push(u);
    return u.includes('/rejstrik?') ? page(list) : page(detail);
  }) as typeof fetch;
  return { fn, calls };
}
const run = (fn: typeof fetch, first = 'Čajka', last = 'Abadžieva', number = '15.077/91') =>
  checkLicence({ number, firstName: first, lastName: last, fetchFn: fn, baseUrl: BASE });

test('parseListIds: one hit, none, unique ids', () => {
  assert.deepEqual(parseListIds(LIST_ONE), ['bCShJ3Y']);
  assert.deepEqual(parseListIds(LIST_NONE), []);
  assert.deepEqual(parseListIds('<a href="/rejstrik/abc">x</a><a href="/rejstrik/abc">y</a><a href="/rejstrik/">z</a>'), ['abc']);
});

test('parseDetail: name and permits', () => {
  const d = parseDetail(DETAIL);
  assert.equal(d.name, 'Abadžieva Čajka, Ak. mal.');
  assert.equal(d.permits.length, 1);
  assert.equal(d.permits[0].number, '15.077/91');
  assert.equal(d.permits[0].validFrom, '24.12.91');
  assert.equal(d.permits[0].scope, 'Restaurování malířských uměleckých děl, polychromovaných děl a sgrafit');
});

test('nameMatches: diacritics, titles, order, double surname, empty names', () => {
  assert.equal(nameMatches('Abadžieva Čajka, Ak. mal.', 'Cajka', 'Abadzieva'), true);
  assert.equal(nameMatches('Novák Jan, Mgr.', 'Jan', 'Novák'), true);
  assert.equal(nameMatches('Novák Jan', 'Novák', 'Jan'), true);
  assert.equal(nameMatches('Nováková-Svobodová Eva', 'Eva', 'Svobodová Nováková'), true);
  assert.equal(nameMatches('Novák Jan, Mgr.', 'Jan', 'Svoboda'), false);
  assert.equal(nameMatches('Mgr. Novák Jan', 'Mgr', 'Novák'), false, 'only the part before the first comma counts, and both names needed');
  assert.equal(nameMatches('Novák Jan', '', 'Novák'), false);
  assert.equal(nameMatches('Novák Jan', 'Jan', ''), false);
  assert.equal(nameMatches('Firma s.r.o.', '', ''), false);
});

test('normalizeLicenceNumber: prefix, whitespace, case', () => {
  assert.equal(normalizeLicenceNumber(' č.j. 15.077/91 '), '15.077/91');
  assert.equal(normalizeLicenceNumber('MK ČR: 100/2020'), '100/2020');
  assert.equal(normalizeLicenceNumber('MK-100/2020'), '100/2020');
  assert.equal(normalizeLicenceNumber('ČJ 5 / 91'), '5/91');
});

test('checkLicence: verified', async () => {
  const { fn, calls } = fakeFetch(LIST_ONE);
  const r = await run(fn);
  assert.equal(r.result, 'verified');
  assert.equal(r.registryId, 'bCShJ3Y');
  assert.deepEqual(r.scope, ['Restaurování malířských uměleckých děl, polychromovaných děl a sgrafit']);
  assert.ok(calls[0].startsWith(`${BASE}/rejstrik?form[cisloJednaci]=15.077%2F91`));
});

test('checkLicence: number differing only by dots matches', async () => {
  assert.equal((await run(fakeFetch(LIST_ONE).fn, 'Čajka', 'Abadžieva', '15077/91')).result, 'verified');
});

test('checkLicence: name mismatch, not found, ambiguous', async () => {
  assert.equal((await run(fakeFetch(LIST_ONE).fn, 'Jan', 'Novák')).result, 'name_mismatch');
  assert.equal((await run(fakeFetch(LIST_NONE).fn)).result, 'not_found');
  // list hit, but the permit number on the detail differs from the input
  assert.equal((await run(fakeFetch(LIST_ONE).fn, 'Čajka', 'Abadžieva', '99.999/99')).result, 'not_found');
  const six = Array.from({ length: 6 }, (_, i) => `<a href="/rejstrik/id${i}">Otevřít</a>`).join('');
  assert.equal((await run(fakeFetch(six).fn)).result, 'ambiguous');
});

test('checkLicence: unavailable on a network error and on 503', async () => {
  const throwing = (async () => {
    throw new Error('boom');
  }) as typeof fetch;
  assert.equal((await run(throwing)).result, 'unavailable');
  const down = (async () => page('x', 503)) as typeof fetch;
  assert.equal((await run(down)).result, 'unavailable');
});

test('checkLicence: a too short number is not_found without fetching', async () => {
  const { fn, calls } = fakeFetch(LIST_ONE);
  assert.equal((await run(fn, 'Čajka', 'Abadžieva', 'MK-1')).result, 'not_found');
  assert.equal(calls.length, 0);
});

test('checkLicence: a garbage 200 list page (markup drift) is unavailable, not not_found', async () => {
  assert.equal((await run(fakeFetch('<html><body>Něco jiného</body></html>').fn)).result, 'unavailable');
});

test('checkLicence: a detail page without name or permits is unavailable', async () => {
  const { fn } = fakeFetch(LIST_ONE, '<html><body>garbage</body></html>');
  assert.equal((await run(fn)).result, 'unavailable');
});

test('licenceRecheckNeeded: number, name and no-op saves', () => {
  const before = { licenceNumber: '15.077/91', firstName: 'Čajka', lastName: 'Abadžieva' };
  assert.equal(licenceRecheckNeeded(before, { ...before, licenceNumber: '1/2020' }), true, 'number changed');
  assert.equal(licenceRecheckNeeded(before, { ...before, licenceNumber: null }), true, 'number cleared');
  assert.equal(licenceRecheckNeeded(before, { ...before, firstName: 'Jan' }), true, 'name changed with number');
  const noNumber = { ...before, licenceNumber: null };
  assert.equal(licenceRecheckNeeded(noNumber, { ...noNumber, lastName: 'Novák' }), false, 'name changed without number');
  assert.equal(licenceRecheckNeeded(before, { ...before }), false, 'nothing changed');
});

test('applyOwnership: a verified record held by another profile becomes taken', () => {
  const ok = { result: 'verified' as const, registryId: '1', registryName: 'X', scope: ['a'] };
  assert.deepEqual(applyOwnership(ok, true), { result: 'taken' });
  assert.equal(applyOwnership(ok, false), ok);
  const nf = { result: 'not_found' as const };
  assert.equal(applyOwnership(nf, true), nf);
});

test('stripTitles: dotted tokens, dot-less list, commas, whitespace', () => {
  assert.equal(stripTitles('Mgr. Radomír'), 'Radomír');
  assert.equal(stripTitles('Surma, Ak. mal.'), 'Surma');
  assert.equal(stripTitles('  Jan   Novák Ph.D., MBA '), 'Jan Novák');
  assert.equal(stripTitles('Eva Nováková CSc'), 'Eva Nováková');
  assert.equal(stripTitles('Ing.'), '');
  assert.equal(stripTitles('Ma Ba DiS'), 'Ma Ba'); // case-sensitive: Ma / Ba can be surnames
  assert.equal(stripTitles('Marie Anna'), 'Marie Anna');
});

test('nameMatches: titles typed into the profile name (D52, registry h1 with titles)', () => {
  assert.equal(parseDetail(DETAIL_TITLES).name, 'Surma Radomír, Mgr., Ak. mal.');
  const h1 = parseDetail(DETAIL_TITLES).name;
  assert.equal(nameMatches(h1, 'Radomír', 'Surma'), true);
  assert.equal(nameMatches(h1, 'Mgr. Radomír', 'Surma'), true);
  assert.equal(nameMatches(h1, 'Radomír', 'Surma, Ak. mal.'), true);
  assert.equal(nameMatches(h1, 'Radomír Ak. mal.', 'Surma'), true);
  assert.equal(nameMatches(h1, 'Jan', 'Surma'), false);
});

test('validateNameParts: titles are ignored for length, a title-only part is refused', () => {
  assert.deepEqual(validateNameParts('Mgr. Jan', 'Novák', ''), {});
  assert.equal(validateNameParts('Ing.', 'Novák', '').firstName, 'Jméno bez titulů.');
  assert.equal(validateNameParts('Jan', 'Ph.D.', '').lastName, 'Jméno bez titulů.');
});
