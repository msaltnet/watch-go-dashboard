import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPlayVersion, extractPlayInstalls, extractPlayRating, fetchPlayVersion } from '../scripts/play.mjs';
import { mergeFetchResults } from '../scripts/merge.mjs';
import { renderIndexPage } from '../scripts/render/index-page.mjs';

const html = 'x,"141":[[["8.2.0"]],[[[36]],[null,[]]]],null,y "2.0.0" ';

test('extractPlayVersion reads the version marker and ignores other version-like strings', () => {
  assert.equal(extractPlayVersion(html), '8.2.0');
  assert.equal(extractPlayVersion('"2.0.0"'), null);
  assert.equal(extractPlayVersion(null), null);
});

const full = html + ' ["10,000+",10000,17210,"10K+"] "aggregateRating":{"@type":"AggregateRating","ratingValue":"3.7142856121063232","ratingCount":"79"},"offers"';

test('extracts install bucket and rating; rating absent is not a failure', () => {
  assert.equal(extractPlayInstalls(full), '10K+');
  assert.equal(extractPlayInstalls(html), null);
  assert.deepEqual(extractPlayRating(full), { rating: 3.7, rating_count: 79 });
  assert.deepEqual(extractPlayRating(html), { rating: null, rating_count: null });
});

test('fetchPlayVersion maps ok / partial / 404 / failures', async () => {
  const ok = await fetchPlayVersion({ pkg: 'com.a', fetchFn: async () => ({ status: 200, ok: true, text: async () => full }) });
  assert.deepEqual(ok, { status: 'ok', version: '8.2.0', installs: '10K+', rating: 3.7, rating_count: 79 });
  const partial = await fetchPlayVersion({ pkg: 'com.a', fetchFn: async () => ({ status: 200, ok: true, text: async () => html }) });
  assert.equal(partial.status, 'partial');
  assert.equal(partial.version, '8.2.0');
  const nf = await fetchPlayVersion({ pkg: 'com.a', fetchFn: async () => ({ status: 404, ok: false }) });
  assert.equal(nf.status, 'not_found');
  const bad = await fetchPlayVersion({ pkg: 'com.a', fetchFn: async () => ({ status: 200, ok: true, text: async () => '<html/>' }) });
  assert.equal(bad.status, 'parse_failed');
  const thrown = await fetchPlayVersion({ pkg: 'com.a', fetchFn: async () => { throw new Error('net'); } });
  assert.equal(thrown.status, 'error');
});

const meta = { id: 100, name: 'A', identity: 'a', package: 'com.a', landing: 'l', repo: 'o/a' };
const prev = { built_at: 'x', stats: {}, apps: [{ ...meta, play_version: '1.0.0', play_checked_at: 'old' }] };

test('merge keeps previous play_version on error, clears on not_found, updates on ok', () => {
  const base = { meta, status: 'ok', overview_html: null, updates: [] };
  const run = play => mergeFetchResults({ previous: prev, fresh: [{ ...base, play }], builtAt: 'now' }).apps[0];
  assert.equal(run({ status: 'error', version: null }).play_version, '1.0.0');
  assert.equal(run(undefined).play_version, '1.0.0');
  assert.equal(run({ status: 'not_found', version: null }).play_version, null);
  const ok = run({ status: 'ok', version: '8.2.0' });
  assert.equal(ok.play_version, '8.2.0');
  assert.equal(ok.play_checked_at, 'now');
});

test('index card prefers Play version and notes a differing docs version', () => {
  const data = { built_at: '2026-11-17T00:00:00+09:00', stats: { total: 1, succeeded: 1, no_docs: 0, failed: 0 },
    apps: [{ ...meta, fetch_status: 'ok', latest_version: 'v8.1.0', latest_update_date: '2026-10-08', play_version: '8.2.0' }] };
  const out = renderIndexPage(data, '{{cards}}');
  assert.match(out, /Play v8\.2\.0/);
  assert.match(out, /문서 v8\.1\.0/);
  data.apps[0].play_version = '8.1.0';
  assert.match(renderIndexPage(data, '{{cards}}'), /Play v8\.1\.0 · 2026-10-08/);
});

test('merge records play_status and keeps last good version on parse failure', () => {
  const base = { meta, status: 'ok', overview_html: null, updates: [] };
  const out = mergeFetchResults({ previous: prev, fresh: [{ ...base, play: { status: 'parse_failed', version: null } }], builtAt: 'now' }).apps[0];
  assert.equal(out.play_version, '1.0.0');
  assert.equal(out.play_status, 'parse_failed');
});

test('index card shows failure / unregistered badges and no repo or landing links', () => {
  const mk = extra => ({ built_at: '2026-11-17T00:00:00+09:00', stats: { total: 1, succeeded: 1, no_docs: 0, failed: 0 },
    apps: [{ ...meta, fetch_status: 'ok', latest_version: 'v1.0.0', ...extra }] });
  const failed = renderIndexPage(mk({ play_status: 'parse_failed', play_version: '1.0.0' }), '{{cards}}');
  assert.match(failed, /Play 파싱 실패/);
  assert.doesNotMatch(failed, /card-links|repo/);
  assert.match(renderIndexPage(mk({ play_status: 'error' }), '{{cards}}'), /Play 조회 실패/);
  assert.match(renderIndexPage(mk({ play_status: 'not_found' }), '{{cards}}'), /Play 미등록/);
  assert.doesNotMatch(renderIndexPage(mk({ play_status: 'ok', play_version: '1.0.0' }), '{{cards}}'), /Play (파싱|조회) 실패/);
});

test('index card shows rating and installs, and flags partial parse', () => {
  const mk = extra => ({ built_at: '2026-11-17T00:00:00+09:00', stats: { total: 1, succeeded: 1, no_docs: 0, failed: 0 },
    apps: [{ ...meta, fetch_status: 'ok', latest_version: 'v1.0.0', play_version: '1.0.0', ...extra }] });
  const out = renderIndexPage(mk({ play_status: 'ok', play_installs: '10K+', play_rating: 3.7, play_rating_count: 1234 }), '{{cards}}');
  assert.match(out, /★<\/span> 3\.7/);
  assert.match(out, /\(1,234\)/);
  assert.match(out, /설치<\/span> 10K\+/);
  assert.doesNotMatch(renderIndexPage(mk({ play_status: 'ok' }), '{{cards}}'), /card-stats/);
  assert.match(renderIndexPage(mk({ play_status: 'partial' }), '{{cards}}'), /Play 일부 파싱 실패/);
});

test('merge stores installs/rating and keeps them on failure', () => {
  const base = { meta, status: 'ok', overview_html: null, updates: [] };
  const p2 = { ...prev, apps: [{ ...meta, play_version: '1.0.0', play_installs: '1K+', play_rating: 4.1, play_rating_count: 9 }] };
  const ok = mergeFetchResults({ previous: p2, fresh: [{ ...base, play: { status: 'ok', version: '2.0.0', installs: '5K+', rating: 4.3, rating_count: 12 } }], builtAt: 'now' }).apps[0];
  assert.equal(ok.play_installs, '5K+');
  assert.equal(ok.play_rating, 4.3);
  const kept = mergeFetchResults({ previous: p2, fresh: [{ ...base, play: { status: 'error' } }], builtAt: 'now' }).apps[0];
  assert.equal(kept.play_installs, '1K+');
  assert.equal(kept.play_rating, 4.1);
});
