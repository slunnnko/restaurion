import test from 'node:test';
import assert from 'node:assert/strict';
import { placeLabel, rewardScopeItems } from '../src/lib/format.ts';

test('placeLabel: city already in the monument name is not repeated', () => {
  assert.equal(placeLabel('Zámek Litomyšl, sgrafita', 'Litomyšl'), 'Zámek Litomyšl, sgrafita');
  assert.equal(placeLabel('Zamek LITOMYSL', 'Litomyšl'), 'Zamek LITOMYSL');
});

test('placeLabel: city is appended otherwise; no monument gives the city', () => {
  assert.equal(placeLabel('Kaple sv. Jana', 'Olomouc'), 'Kaple sv. Jana, Olomouc');
  assert.equal(placeLabel(undefined, 'Brno'), 'Brno');
  assert.equal(placeLabel('  ', 'Brno'), 'Brno');
  assert.equal(placeLabel('Kaple', ''), 'Kaple');
});

test('rewardScopeItems: one item per line, trimmed, empty dropped', () => {
  assert.deepEqual(rewardScopeItems(' A \n\n B\r\nC '), ['A', 'B', 'C']);
});

test('rewardScopeItems: a single line is split by semicolons', () => {
  assert.deepEqual(rewardScopeItems('A; B ;; C'), ['A', 'B', 'C']);
  assert.deepEqual(rewardScopeItems('A; B\nC'), ['A; B', 'C']);
});

test('rewardScopeItems: empty input gives no items', () => {
  assert.deepEqual(rewardScopeItems(undefined), []);
  assert.deepEqual(rewardScopeItems(' \n '), []);
});
