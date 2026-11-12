import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from '../src/lib/theme.ts';

test('explicit preference wins over the system scheme', () => {
  assert.equal(resolveTheme('light', false), 'light');
  assert.equal(resolveTheme('dark', true), 'dark');
});

test('system and anonymous follow the system, dark unless light is asked for', () => {
  assert.equal(resolveTheme('system', true), 'light');
  assert.equal(resolveTheme('system', false), 'dark');
  assert.equal(resolveTheme(null, false), 'dark');
  assert.equal(resolveTheme(undefined, true), 'light');
});
