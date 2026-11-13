import assert from 'node:assert/strict';
import test from 'node:test';
import { jobRowPhotos, mapJobRow } from '../functions/api/_shared.ts';
import type { JobRow } from '../functions/api/_shared.ts';
import { MAX_JOB_PHOTOS } from '../functions/api/_lib/photo.ts';
import { MAX_DESCRIPTION } from '../src/lib/limits.ts';

test('limits: 6 photos and 5000 characters (D45)', () => {
  assert.equal(MAX_JOB_PHOTOS, 6);
  assert.equal(MAX_DESCRIPTION, 5000);
});

test('jobRowPhotos: parses the subquery JSON and tolerates null / garbage', () => {
  assert.deepEqual(jobRowPhotos({ photos_json: '[{"id":"a","url":"/api/photos/jobs/j/a.png"}]' }), [{ id: 'a', url: '/api/photos/jobs/j/a.png' }]);
  assert.deepEqual(jobRowPhotos({ photos_json: null }), []);
  assert.deepEqual(jobRowPhotos({ photos_json: 'not json' }), []);
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
  const two = mapJobRow({ ...baseRow, image_url: '/api/photos/jobs/j1/old.png', photos_json: '[{"id":"a","url":"/p/a"},{"id":"b","url":"/p/b"}]' });
  assert.equal(two.imageUrl, '/p/a');
  assert.deepEqual(two.photos?.map((p) => p.id), ['a', 'b']);
  const legacy = mapJobRow({ ...baseRow, image_url: '/api/photos/jobs/j1/old.png' });
  assert.equal(legacy.imageUrl, '/api/photos/jobs/j1/old.png');
  assert.equal(legacy.photos, undefined);
  const none = mapJobRow(baseRow);
  assert.equal(none.imageUrl, undefined);
  assert.equal(none.photos, undefined);
});
