import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_EMAIL_BUDGET, NEW_EMAIL_LOGIN_BUDGET, loginCodeAllowed, resendConfigured } from '../functions/api/_shared.ts';
import { cityError, craftsError, profileNameMissing, regionError } from '../functions/api/_lib/validate.ts';

test('login code: total budget blocks everyone', () => {
  assert.equal(loginCodeAllowed(DAILY_EMAIL_BUDGET, 0, true), false);
  assert.equal(loginCodeAllowed(DAILY_EMAIL_BUDGET - 1, 0, true), true);
});

test('login code: e-mails without a profile have a smaller sub-budget', () => {
  assert.equal(loginCodeAllowed(60, NEW_EMAIL_LOGIN_BUDGET, false), false);
  assert.equal(loginCodeAllowed(60, NEW_EMAIL_LOGIN_BUDGET - 1, false), true);
  assert.equal(loginCodeAllowed(60, NEW_EMAIL_LOGIN_BUDGET, true), true);
});

test('resend needs both key and from address', () => {
  assert.equal(resendConfigured({ RESEND_API_KEY: 'k' }), false);
  assert.equal(resendConfigured({ RESEND_FROM: 'a@b.c' }), false);
  assert.equal(resendConfigured({ RESEND_API_KEY: 'k', RESEND_FROM: 'a@b.c' }), true);
});

test('profile name needs 3+ visible characters', () => {
  assert.equal(profileNameMissing(''), true);
  assert.equal(profileNameMissing('  ab '), true);
  assert.equal(profileNameMissing(null), true);
  assert.equal(profileNameMissing('Jan'), false);
});

test('job field rules shared by create and edit', () => {
  assert.equal(craftsError([]) !== null, true);
  assert.equal(craftsError(['kámen']), null);
  assert.equal(regionError('') !== null, true);
  assert.equal(regionError('Praha'), null);
  assert.equal(cityError('B') !== null, true);
  assert.equal(cityError('x'.repeat(61)) !== null, true);
  assert.equal(cityError('Brno'), null);
});
