import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PBKDF2_ITERATIONS, hashPassword, validateNewPassword, verifyPassword } from '../functions/api/_lib/password.ts';

test('password: hash and verify roundtrip', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', hash), true);
});

test('password: wrong password is rejected', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse batterz', hash), false);
});

test('password: hash string carries the algorithm and iterations, salts differ', async () => {
  const a = await hashPassword('same password 1');
  const b = await hashPassword('same password 1');
  assert.ok(a.startsWith(`pbkdf2-sha256$${PBKDF2_ITERATIONS}$`));
  assert.equal(a.split('$').length, 4);
  assert.notEqual(a, b);
});

test('password: null and malformed stored values never verify', async () => {
  assert.equal(await verifyPassword('whatever1234', null), false);
  assert.equal(await verifyPassword('whatever1234', ''), false);
  assert.equal(await verifyPassword('whatever1234', 'garbage'), false);
  assert.equal(await verifyPassword('whatever1234', 'pbkdf2-sha256$abc$AAAA$AAAA'), false);
  assert.equal(await verifyPassword('whatever1234', 'pbkdf2-sha256$100000$!!!$!!!'), false);
});

test('password: validateNewPassword bounds 10..200', () => {
  assert.notEqual(validateNewPassword('a'.repeat(9)), null);
  assert.equal(validateNewPassword('a'.repeat(10)), null);
  assert.equal(validateNewPassword('a'.repeat(200)), null);
  assert.notEqual(validateNewPassword('a'.repeat(201)), null);
  assert.notEqual(validateNewPassword(undefined), null);
  assert.notEqual(validateNewPassword(12345678901), null);
});
