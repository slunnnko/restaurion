import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countBusyDays, daysInRange, evaluateMatch, offerFitsJob } from '../src/lib/matching.ts';
import type { MatchJob, MatchWorker } from '../src/lib/matching.ts';

const TODAY = '2026-06-01';
const job: MatchJob = {
  id: 'j1',
  posterId: 'poster',
  status: 'active',
  expiresAt: '2026-07-30',
  dateFrom: '2026-06-10',
  dateTo: '2026-06-14', // 5 days
  crafts: ['kámen'],
};
const worker = (over: Partial<MatchWorker> = {}): MatchWorker => ({
  id: 'w1',
  acceptingJobs: true,
  crafts: ['kámen', 'dřevo'],
  blocks: [],
  engagements: [],
  ...over,
});

test('daysInRange is inclusive', () => {
  assert.equal(daysInRange('2026-06-10', '2026-06-14'), 5);
  assert.equal(daysInRange('2026-06-10', '2026-06-10'), 1);
});

test('no blocks: matches with 0 busy days', () => {
  const r = evaluateMatch(job, worker(), TODAY);
  assert.deepEqual([r.matches, r.busyDays, r.totalDays], [true, 0, 5]);
});

test('block outside range does not matter', () => {
  const r = evaluateMatch(job, worker({ blocks: [{ dateFrom: '2026-06-01', dateTo: '2026-06-09' }] }), TODAY);
  assert.equal(r.matches, true);
  assert.equal(r.busyDays, 0);
});

test('block partially overlapping: matches, busyDays > 0', () => {
  const r = evaluateMatch(job, worker({ blocks: [{ dateFrom: '2026-06-12', dateTo: '2026-06-20' }] }), TODAY);
  assert.equal(r.matches, true);
  assert.equal(r.busyDays, 3);
});

test('block covering whole range: no match', () => {
  const r = evaluateMatch(job, worker({ blocks: [{ dateFrom: '2026-06-01', dateTo: '2026-06-30' }] }), TODAY);
  assert.equal(r.matches, false);
  assert.equal(r.reason, 'fully_busy');
});

test('accepted engagement covering whole range: no match', () => {
  const r = evaluateMatch(
    job,
    worker({ engagements: [{ jobId: 'other', status: 'accepted', dateFrom: '2026-06-09', dateTo: '2026-06-15' }] }),
    TODAY
  );
  assert.equal(r.matches, false);
  assert.equal(r.reason, 'fully_busy');
});

test('accepted engagement partially overlapping: matches with busyDays', () => {
  const r = evaluateMatch(
    job,
    worker({ engagements: [{ jobId: 'other', status: 'accepted', dateFrom: '2026-06-13', dateTo: '2026-06-30' }] }),
    TODAY
  );
  assert.equal(r.matches, true);
  assert.equal(r.busyDays, 2);
});

test('withdrawn and pending engagements are not busy', () => {
  const slot = { jobId: 'other', dateFrom: '2026-06-01', dateTo: '2026-06-30' };
  const r = evaluateMatch(
    job,
    worker({ engagements: [{ ...slot, status: 'withdrawn' }, { ...slot, jobId: 'o2', status: 'pending' }] }),
    TODAY
  );
  assert.equal(r.matches, true);
  assert.equal(r.busyDays, 0);
});

test('overlapping blocks and engagements count each day once', () => {
  const n = countBusyDays(
    { dateFrom: '2026-06-10', dateTo: '2026-06-14' },
    [{ dateFrom: '2026-06-10', dateTo: '2026-06-12' }],
    [{ jobId: 'x', status: 'accepted', dateFrom: '2026-06-11', dateTo: '2026-06-13' }]
  );
  assert.equal(n, 4);
});

test('craft mismatch: no match', () => {
  const r = evaluateMatch(job, worker({ crafts: ['kov'] }), TODAY);
  assert.deepEqual([r.matches, r.reason], [false, 'craft_mismatch']);
});

test('accepting_jobs = 0: no match', () => {
  const r = evaluateMatch(job, worker({ acceptingJobs: false }), TODAY);
  assert.deepEqual([r.matches, r.reason], [false, 'not_accepting']);
});

test('poster is never matched to own job', () => {
  const r = evaluateMatch(job, worker({ id: 'poster' }), TODAY);
  assert.deepEqual([r.matches, r.reason], [false, 'own_job']);
});

test('single-day job: free matches', () => {
  const r = evaluateMatch({ ...job, dateFrom: '2026-06-10', dateTo: '2026-06-10' }, worker(), TODAY);
  assert.deepEqual([r.matches, r.totalDays], [true, 1]);
});

test('single-day job: blocked does not match', () => {
  const r = evaluateMatch(
    { ...job, dateFrom: '2026-06-10', dateTo: '2026-06-10' },
    worker({ blocks: [{ dateFrom: '2026-06-10', dateTo: '2026-06-10' }] }),
    TODAY
  );
  assert.deepEqual([r.matches, r.reason], [false, 'fully_busy']);
});

test('expired job: no match', () => {
  const r = evaluateMatch({ ...job, expiresAt: '2026-05-31' }, worker(), TODAY);
  assert.deepEqual([r.matches, r.reason], [false, 'expired']);
});

test('closed job: no match', () => {
  const r = evaluateMatch({ ...job, status: 'archived' }, worker(), TODAY);
  assert.deepEqual([r.matches, r.reason], [false, 'inactive']);
});

test('job own engagement is not counted as busy for that job', () => {
  const r = evaluateMatch(
    job,
    worker({ engagements: [{ jobId: 'j1', status: 'accepted', dateFrom: '2026-06-10', dateTo: '2026-06-14' }] }),
    TODAY
  );
  assert.equal(r.busyDays, 0);
});

const offer = { authorId: 'O', dateFrom: '2026-06-08', dateTo: '2026-06-12', crafts: ['kámen'] };
const fitJob = { authorId: 'V', jobType: 'subcontract_needed', status: 'active', expiresAt: '2026-07-30', dateFrom: '2026-06-10', dateTo: '2026-06-14', crafts: ['kámen', 'dřevo'] };

test('offerFitsJob: fitting job', () => {
  assert.deepEqual(offerFitsJob(offer, fitJob, TODAY), { fits: true });
});

test('offerFitsJob: craft mismatch', () => {
  assert.equal(offerFitsJob(offer, { ...fitJob, crafts: ['dřevo'] }, TODAY).reason, 'craft_mismatch');
});

test('offerFitsJob: no date overlap, touching edge still overlaps', () => {
  assert.equal(offerFitsJob(offer, { ...fitJob, dateFrom: '2026-06-13', dateTo: '2026-06-20' }, TODAY).reason, 'no_overlap');
  assert.equal(offerFitsJob(offer, { ...fitJob, dateFrom: '2026-06-12', dateTo: '2026-06-20' }, TODAY).fits, true);
});

test('offerFitsJob: expired or inactive job', () => {
  assert.equal(offerFitsJob(offer, { ...fitJob, expiresAt: '2026-05-31' }, TODAY).reason, 'expired');
  assert.equal(offerFitsJob(offer, { ...fitJob, status: 'archived' }, TODAY).reason, 'inactive');
});

test('offerFitsJob: an offer is not a job, own job does not fit', () => {
  assert.equal(offerFitsJob(offer, { ...fitJob, jobType: 'craftsman_available' }, TODAY).reason, 'not_a_job');
  assert.equal(offerFitsJob(offer, { ...fitJob, authorId: 'O' }, TODAY).reason, 'own');
});
