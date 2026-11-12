import assert from 'node:assert/strict';
import { test } from 'node:test';

import { phoneDigits } from '../src/lib/phone.ts';

test('phoneDigits: 420 default, 00 = +, country code required', () => {
  assert.equal(phoneDigits('777 111 222'), '420777111222');
  assert.equal(phoneDigits('+421 905 123 456'), '421905123456');
  assert.equal(phoneDigits('0049 151 1234 5678'), '4915112345678');
  assert.equal(phoneDigits('00420777111222'), '420777111222');
  assert.equal(phoneDigits('123'), null);
  assert.equal(phoneDigits('1234567890'), null);
  assert.equal(phoneDigits('abc'), null);
});
