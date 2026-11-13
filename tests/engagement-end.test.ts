import test from 'node:test';
import assert from 'node:assert/strict';
import { endedFields, endedSide } from '../src/lib/engagementEnd.ts';
import type { EndedRow } from '../src/lib/engagementEnd.ts';
import { engagementBadge } from '../src/components/engagementStatus.ts';

const row = (over: Partial<EndedRow>): EndedRow => ({
  status: 'declined',
  initiated_by: 'worker',
  ended_by: null,
  worker_id: 'w',
  author_id: 'a',
  contacted_at: null,
  ...over,
});

test('running engagements have no end side', () => {
  assert.equal(endedSide(row({ status: 'pending' })), null);
  assert.equal(endedSide(row({ status: 'accepted' })), null);
  assert.deepEqual(endedFields(row({ status: 'pending' }), 'a', true), {});
});

test('a stored ended_by wins over the legacy derivation', () => {
  assert.equal(endedSide(row({ ended_by: 'w' })), 'worker');
  assert.equal(endedSide(row({ status: 'withdrawn', ended_by: 'a' })), 'poster');
  assert.equal(endedSide(row({ initiated_by: 'poster', ended_by: 'a' })), 'poster');
});

test('legacy rows: the side is derived from status and initiator', () => {
  assert.equal(endedSide(row({ status: 'declined' })), 'poster');
  assert.equal(endedSide(row({ status: 'withdrawn' })), 'worker');
  assert.equal(endedSide(row({ status: 'declined', initiated_by: 'poster' })), 'worker');
  assert.equal(endedSide(row({ status: 'withdrawn', initiated_by: 'poster' })), 'poster');
});

test('legacy no-deal row (contact confirmed, nobody recorded) can be reopened by either side', () => {
  const r = row({ contacted_at: '2026-11-01 10:00:00' });
  assert.equal(endedSide(r), 'either');
  assert.deepEqual(endedFields(r, 'a', true), { canReopen: true });
  assert.deepEqual(endedFields(r, 'w', true), { canReopen: true });
});

test('only the ending side gets canReopen, and only while the job is open', () => {
  const r = row({ ended_by: 'a' });
  assert.deepEqual(endedFields(r, 'a', true), { endedBy: 'poster', canReopen: true });
  assert.deepEqual(endedFields(r, 'w', true), { endedBy: 'poster' });
  assert.deepEqual(endedFields(r, 'a', false), { endedBy: 'poster' });
  assert.deepEqual(endedFields(r, 'stranger', true), { endedBy: 'poster' });
});

test('badge labels of ended rows', () => {
  assert.equal(engagementBadge({ status: 'declined', initiatedBy: 'worker' }).label, 'Odmítnut');
  assert.equal(engagementBadge({ status: 'withdrawn', initiatedBy: 'worker' }).label, 'Odstoupil');
  assert.equal(engagementBadge({ status: 'declined', initiatedBy: 'poster' }).label, 'Odmítl pozvánku');
  assert.equal(engagementBadge({ status: 'withdrawn', initiatedBy: 'poster' }).label, 'Zrušeno');
  assert.equal(engagementBadge({ status: 'declined', initiatedBy: 'worker', contactedAt: 'x' }).label, 'Nedohodli jsme se');
  assert.equal(engagementBadge({ status: 'withdrawn', initiatedBy: 'poster', contactedAt: 'x' }).label, 'Nedohodli jsme se');
  assert.equal(engagementBadge({ status: 'pending', contactedAt: 'x' }).label, 'Kontakt navázán');
});
