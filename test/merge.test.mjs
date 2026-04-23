import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFetchResults } from '../scripts/merge.mjs';

const appMeta = {
  id: 100,
  name: 'Sample',
  identity: '샘플',
  package: 'com.example',
  landing: 'https://example.com',
  repo: 'owner/repo',
};

test('ok result overwrites previous entry entirely', () => {
  const previous = {
    apps: [{ ...appMeta, fetch_status: 'ok', overview_html: '<p>old</p>', updates: [] }],
  };
  const fresh = [{
    meta: appMeta,
    status: 'ok',
    overview_html: '<p>new</p>',
    updates: [{ version: 'v1.0.0', date: '2026-01-01', items_html: '<ul></ul>' }],
  }];
  const now = '2026-04-23T00:00:00+09:00';
  const merged = mergeFetchResults({ previous, fresh, builtAt: now });

  assert.equal(merged.apps[0].fetch_status, 'ok');
  assert.equal(merged.apps[0].overview_html, '<p>new</p>');
  assert.equal(merged.apps[0].latest_version, 'v1.0.0');
  assert.equal(merged.apps[0].latest_update_date, '2026-01-01');
  assert.equal(merged.apps[0].last_successful_fetch, now);
  assert.equal(merged.stats.succeeded, 1);
  assert.equal(merged.stats.failed, 0);
});

test('fetch_failed keeps previous data but updates status', () => {
  const previous = {
    apps: [{
      ...appMeta,
      fetch_status: 'ok',
      overview_html: '<p>old</p>',
      updates: [],
      last_successful_fetch: '2026-04-20T00:00:00+09:00',
    }],
  };
  const fresh = [{ meta: appMeta, status: 'fetch_failed' }];
  const now = '2026-04-23T00:00:00+09:00';
  const merged = mergeFetchResults({ previous, fresh, builtAt: now });

  assert.equal(merged.apps[0].fetch_status, 'fetch_failed');
  assert.equal(merged.apps[0].overview_html, '<p>old</p>');
  assert.equal(merged.apps[0].last_successful_fetch, '2026-04-20T00:00:00+09:00');
  assert.equal(merged.stats.failed, 1);
});

test('no_docs status records app with null doc fields', () => {
  const previous = { apps: [] };
  const fresh = [{ meta: appMeta, status: 'no_docs' }];
  const merged = mergeFetchResults({ previous, fresh, builtAt: '2026-04-23T00:00:00+09:00' });

  assert.equal(merged.apps[0].fetch_status, 'no_docs');
  assert.equal(merged.apps[0].overview_html, null);
  assert.deepEqual(merged.apps[0].updates, []);
  assert.equal(merged.apps[0].last_successful_fetch, null);
});

test('throws when all apps fail (prevents overwriting previous data)', () => {
  const fresh = [
    { meta: appMeta, status: 'fetch_failed' },
    { meta: { ...appMeta, id: 200 }, status: 'fetch_failed' },
  ];
  assert.throws(
    () => mergeFetchResults({ previous: { apps: [] }, fresh, builtAt: '2026-04-23T00:00:00+09:00' }),
    /all apps failed/i
  );
});

test('computes stats correctly', () => {
  const fresh = [
    { meta: { ...appMeta, id: 1 }, status: 'ok', overview_html: '<p>a</p>', updates: [] },
    { meta: { ...appMeta, id: 2 }, status: 'no_docs' },
    { meta: { ...appMeta, id: 3 }, status: 'fetch_failed' },
  ];
  const merged = mergeFetchResults({
    previous: { apps: [] },
    fresh,
    builtAt: '2026-04-23T00:00:00+09:00',
  });
  assert.equal(merged.stats.total, 3);
  assert.equal(merged.stats.succeeded, 1);
  assert.equal(merged.stats.no_docs, 1);
  assert.equal(merged.stats.failed, 1);
});
