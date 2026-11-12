import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSuggestions, jobMatchesText, jobMatchesTokens } from '../src/lib/jobSearch.ts';
import type { PublicJob } from '../src/types/api.ts';

function job(over: Partial<PublicJob> & { city: string; region: string; poster: string }): PublicJob {
  const { poster, ...rest } = over;
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Oprava fasády',
    description: '',
    jobType: 'subcontract_needed',
    monumentStatus: 'cultural_monument',
    crafts: ['Kameník'],
    dateFrom: '2026-12-01',
    dateTo: '2026-12-10',
    budgetNote: '',
    status: 'active',
    createdAt: '2026-11-01',
    poster: { id: poster, name: poster, group: 'company' },
    interestedCount: 0,
    ...rest,
  } as PublicJob;
}

const jobs = [
  job({ city: 'Praha', region: 'Praha', poster: 'Alfa s.r.o.' }),
  job({ city: 'Praha', region: 'Praha', poster: 'Beta', crafts: ['Truhlář'] }),
  job({ city: 'Kutná Hora', region: 'Středočeský kraj', poster: 'Alfa s.r.o.' }),
  job({ city: 'Brno', region: 'Jihomoravský kraj', poster: 'Gama' }),
];

test('typing a prefix suggests existing cities and regions only', () => {
  const s = buildSuggestions(jobs, 'ku', []);
  assert.deepEqual(
    s.map((x) => [x.kind, x.value]),
    [['city', 'Kutná Hora']]
  );
});

test('region and city with the same name are suggested once, as region', () => {
  const s = buildSuggestions(jobs, 'pra', []);
  assert.deepEqual(
    s.filter((x) => x.value === 'Praha').map((x) => x.kind),
    ['region']
  );
  assert.equal(s.find((x) => x.value === 'Praha')?.count, 2);
});

test('accents are ignored and posters are searchable', () => {
  assert.deepEqual(buildSuggestions(jobs, 'stredo', []).map((x) => x.value), ['Středočeský kraj']);
  assert.deepEqual(buildSuggestions(jobs, 'alf', []).map((x) => [x.kind, x.count]), [['poster', 2]]);
});

test('crafts without any job are not suggested; selected tokens are hidden', () => {
  const empty = buildSuggestions(jobs, '', []);
  assert.deepEqual(empty.filter((x) => x.kind === 'craft').map((x) => x.value).sort(), ['dřevo', 'kámen']);
  const after = buildSuggestions(jobs, '', [{ kind: 'region', value: 'Praha' }]);
  assert.ok(!after.some((x) => x.kind === 'region' && x.value === 'Praha'));
});

test('tokens of one kind are OR, different kinds are AND', () => {
  const multi = [
    { kind: 'region' as const, value: 'Praha' },
    { kind: 'region' as const, value: 'Jihomoravský kraj' },
  ];
  assert.equal(jobs.filter((j) => jobMatchesTokens(j, multi)).length, 3);
  const both = [...multi, { kind: 'craft' as const, value: 'dřevo' }];
  assert.equal(jobs.filter((j) => jobMatchesTokens(j, both)).length, 1);
  assert.equal(jobs.filter((j) => jobMatchesTokens(j, [])).length, 4);
});

test('free text searches city, region, poster and title', () => {
  assert.equal(jobs.filter((j) => jobMatchesText(j, 'stredocesky')).length, 1);
  assert.equal(jobs.filter((j) => jobMatchesText(j, 'gama')).length, 1);
  assert.equal(jobs.filter((j) => jobMatchesText(j, 'fasady')).length, 4);
  assert.equal(jobs.filter((j) => jobMatchesText(j, '')).length, 4);
});
