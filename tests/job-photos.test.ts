import assert from 'node:assert/strict';
import test from 'node:test';
import { jobRowPhotos, mapJobRow } from '../functions/api/_shared.ts';
import type { JobRow } from '../functions/api/_shared.ts';
import { MAX_JOB_PHOTOS } from '../functions/api/_lib/photo.ts';
import { MAX_DESCRIPTION, MAX_PHOTO_CAPTION } from '../src/lib/limits.ts';
import { LEGACY_PHOTO_ID, jobPhotoList } from '../src/lib/photos.ts';

test('limits: 6 photos and 5000 characters (D45)', () => {
  assert.equal(MAX_JOB_PHOTOS, 6);
  assert.equal(MAX_DESCRIPTION, 5000);
});

test('jobRowPhotos: sorts by position, created_at, id in JS and tolerates null / garbage', () => {
  const json = JSON.stringify([
    { id: 'c', url: '/p/c', position: 1, created_at: '2030-01-01 00:00:02' },
    { id: 'b', url: '/p/b', position: 1, created_at: '2030-01-01 00:00:01' },
    { id: 'a', url: '/p/a', position: 0, created_at: '2030-01-01 00:00:09' },
  ]);
  assert.deepEqual(jobRowPhotos({ photos_json: json }), [{ id: 'a', url: '/p/a' }, { id: 'b', url: '/p/b' }, { id: 'c', url: '/p/c' }]);
  assert.deepEqual(jobRowPhotos({ photos_json: null }), []);
  assert.deepEqual(jobRowPhotos({ photos_json: 'not json' }), []);
});

test('jobPhotoList: a legacy imageUrl alone becomes one photo with the shared fake id', () => {
  assert.deepEqual(jobPhotoList({ imageUrl: '/x.png' }), [{ id: LEGACY_PHOTO_ID, url: '/x.png' }]);
  assert.deepEqual(jobPhotoList({ photos: [{ id: 'a', url: '/a' }], imageUrl: '/a' }), [{ id: 'a', url: '/a' }]);
  assert.deepEqual(jobPhotoList({}), []);
});

const baseRow = {
  id: 'j1', author_id: 'u1', title: 'T', description: '', job_type: 'subcontract_needed', monument_status: 'craft_work',
  monument_name: null, image_url: null, photos_json: null, required_crafts_json: '[]', region: 'Praha', city: 'Praha',
  date_from: '2030-01-01', date_to: '2030-01-02', budget_note: '', reward_type: null, reward_amount: null, reward_currency: null,
  reward_scope: null, status: 'active', visibility: 'public', direct_to: null, direct_to_name: null, di_id: null, di_status: null,
  di_respond_by: null, di_contacted_at: null, created_at: '2030-01-01 00:00:00', expires_at: null, a_name: 'A', a_group: 'company',
  a_email: 'a@b.cz', a_phone: null, a_portfolio_url: null, a_instagram: null, a_whatsapp: null, a_facebook: null, interested_count: 0,
} as unknown as JobRow;

test('mapJobRow: imageUrl is the first photo, photos keep order; legacy image_url is the fallback', () => {
  const two = mapJobRow({ ...baseRow, image_url: '/api/photos/jobs/j1/old.png', photos_json: '[{"id":"b","url":"/p/b","position":1,"created_at":"x"},{"id":"a","url":"/p/a","position":0,"created_at":"x"}]' });
  assert.equal(two.imageUrl, '/p/a');
  assert.deepEqual(two.photos?.map((p) => p.id), ['a', 'b']);
  const legacy = mapJobRow({ ...baseRow, image_url: '/api/photos/jobs/j1/old.png' });
  assert.equal(legacy.imageUrl, '/api/photos/jobs/j1/old.png');
  assert.equal(legacy.photos, undefined);
  const none = mapJobRow(baseRow);
  assert.equal(none.imageUrl, undefined);
  assert.equal(none.photos, undefined);
});

test('captions (D47): limit 200, carried by jobRowPhotos, omitted when null or blank', () => {
  assert.equal(MAX_PHOTO_CAPTION, 200);
  const json = JSON.stringify([
    { id: 'a', url: '/p/a', position: 0, created_at: 'x', caption: 'Oltář po restaurování' },
    { id: 'b', url: '/p/b', position: 1, created_at: 'x', caption: null },
    { id: 'c', url: '/p/c', position: 2, created_at: 'x', caption: '  ' },
    { id: 'd', url: '/p/d', position: 3, created_at: 'x' },
  ]);
  assert.deepEqual(jobRowPhotos({ photos_json: json }), [
    { id: 'a', url: '/p/a', caption: 'Oltář po restaurování' },
    { id: 'b', url: '/p/b' },
    { id: 'c', url: '/p/c' },
    { id: 'd', url: '/p/d' },
  ]);
  const job = mapJobRow({ ...baseRow, photos_json: json });
  assert.equal(job.photos?.[0].caption, 'Oltář po restaurování');
  assert.equal('caption' in (job.photos?.[1] ?? {}), false);
});
