import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCraftIds } from '../src/lib/crafts.ts';

test('ids pass through', () => {
  assert.deepEqual(toCraftIds(['kámen', 'dřevo']), ['kámen', 'dřevo']);
});

test('legacy free text maps via stems', () => {
  assert.deepEqual(toCraftIds(['Kameník', 'Restaurátor dřeva']).sort(), ['dřevo', 'kámen']);
  assert.deepEqual(toCraftIds(['Štuk', 'Pískovec', 'Vápenné omítky']), ['kámen']);
});

test('unknown text maps to nothing, duplicates removed', () => {
  assert.deepEqual(toCraftIds(['Účetnictví']), []);
  assert.deepEqual(toCraftIds(['kámen', 'Kameník']), ['kámen']);
});
