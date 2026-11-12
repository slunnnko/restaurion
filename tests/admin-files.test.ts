import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdmin } from '../functions/api/_shared.ts';

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
