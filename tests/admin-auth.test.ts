import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRequestAdminAuthorized } from '../functions/api/_shared.ts';

test('admin auth fails closed without ADMIN_PASSWORD', async () => {
  const req = new Request('http://x/', { headers: { 'X-Admin-Password': 'restaurion-admin' } });
  assert.equal(await isRequestAdminAuthorized(req, {}), false);
  assert.equal(await isRequestAdminAuthorized(req, {}, 'restaurion-admin'), false);
});

test('admin auth works with configured password only', async () => {
  const good = new Request('http://x/', { headers: { 'X-Admin-Password': 's3cret' } });
  const bad = new Request('http://x/', { headers: { 'X-Admin-Password': 'nope' } });
  assert.equal(await isRequestAdminAuthorized(good, { ADMIN_PASSWORD: 's3cret' }), true);
  assert.equal(await isRequestAdminAuthorized(bad, { ADMIN_PASSWORD: 's3cret' }), false);
});
