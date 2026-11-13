import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDigestHtml, pickDigestRecipients } from '../functions/api/_lib/digest.ts';

const rows = [
  { profileId: 'c', oldestUnread: '2026-06-03 10:00:00' },
  { profileId: 'a', oldestUnread: '2026-06-01 08:00:00' },
  { profileId: 'b', oldestUnread: '2026-06-02 09:00:00' },
];

test('oldest unread first, limited by budget', () => {
  assert.deepEqual(pickDigestRecipients(rows, 2).map((r) => r.profileId), ['a', 'b']);
});

test('zero or negative budget picks nobody', () => {
  assert.deepEqual(pickDigestRecipients(rows, 0), []);
  assert.deepEqual(pickDigestRecipients(rows, -5), []);
});

test('budget larger than rows returns all, input not mutated', () => {
  assert.equal(pickDigestRecipients(rows, 99).length, 3);
  assert.equal(rows[0].profileId, 'c');
});

test('digest html escapes user text', () => {
  const html = buildDigestHtml([{ id: '1', type: 'job_match', title: '<script>alert(1)</script>' }], 'https://x.test');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('https://x.test/?profil=1'));
});

test('buildDigestHtml: job_removed shows the title and the escaped reason (D46)', () => {
  const html = buildDigestHtml([{ id: '1', type: 'job_removed', title: 'Okna', reason: 'Spam <b>x</b>' }], 'https://x.test');
  assert.match(html, /Správce odstranil tvůj inzerát<\/b> „Okna“\. Důvod: Spam &lt;b&gt;x&lt;\/b&gt;/);
});
