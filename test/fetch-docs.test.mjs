import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAppDocs } from '../scripts/fetch-docs.mjs';

const appsYml = `
apps:
  - id: 100
    name: "App A"
    identity: "aaa"
    package: "com.a"
    landing: "https://a.test"
    repo: "owner/a"
  - id: 200
    name: "App B"
    identity: "bbb"
    package: "com.b"
    landing: "https://b.test"
    repo: "owner/b"
`;

function mockFetch(map) {
  return async (url) => {
    if (url in map) return map[url];
    return { status: 404, ok: false, json: async () => ({}) };
  };
}

function jsonResponse(content) {
  return {
    status: 200,
    ok: true,
    json: async () => ({
      encoding: 'base64',
      content: Buffer.from(content, 'utf8').toString('base64'),
    }),
  };
}

test('collects docs for all apps with mocked fetch (happy path)', async () => {
  const fetchMap = {
    'https://api.github.com/repos/owner/a/contents/docs/app/overview.md?ref=main': jsonResponse('# A overview'),
    'https://api.github.com/repos/owner/a/contents/docs/app/updates.md?ref=main':
      jsonResponse('## v1.0.0 — 2026-04-01\n- first'),
    'https://api.github.com/repos/owner/b/contents/docs/app/overview.md?ref=main': jsonResponse('# B overview'),
    'https://api.github.com/repos/owner/b/contents/docs/app/updates.md?ref=main':
      jsonResponse('## v2.0.0 — 2026-04-10\n- shipped'),
  };
  const results = await collectAppDocs({
    appsYml,
    token: 'fake-token',
    fetchFn: mockFetch(fetchMap),
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].status, 'ok');
  assert.match(results[0].overview_html, /A overview/);
  assert.equal(results[0].updates[0].version, 'v1.0.0');
  assert.equal(results[1].status, 'ok');
  assert.equal(results[1].updates[0].version, 'v2.0.0');
});

test('marks app as no_docs when both files return 404', async () => {
  const results = await collectAppDocs({
    appsYml: `apps:\n  - id: 100\n    name: A\n    identity: a\n    package: p\n    landing: l\n    repo: owner/a\n`,
    token: 'fake',
    fetchFn: mockFetch({}),
  });
  assert.equal(results[0].status, 'no_docs');
});

test('marks app as fetch_failed on auth error', async () => {
  const results = await collectAppDocs({
    appsYml: `apps:\n  - id: 100\n    name: A\n    identity: a\n    package: p\n    landing: l\n    repo: owner/a\n`,
    token: 'bad',
    fetchFn: async () => ({ status: 401, ok: false, json: async () => ({}) }),
  });
  assert.equal(results[0].status, 'fetch_failed');
});

test('uses docs_subdir when provided', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return { status: 404, ok: false, json: async () => ({}) };
  };
  await collectAppDocs({
    appsYml: `apps:\n  - id: 102\n    name: A\n    identity: a\n    package: p\n    landing: l\n    repo: owner/wff\n    docs_subdir: clean\n`,
    token: 'fake',
    fetchFn,
  });
  assert.ok(calls.some(u => u.includes('/contents/clean/docs/app/overview.md')));
  assert.ok(calls.some(u => u.includes('/contents/clean/docs/app/updates.md')));
});

test('uses configured icon_url without probing landing page', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url.includes('/overview.md')) return jsonResponse('# A overview');
    if (url.includes('/updates.md')) return jsonResponse('## v1.0.0\n- first');
    return { status: 404, ok: false, json: async () => ({}) };
  };

  const results = await collectAppDocs({
    appsYml: `apps:\n  - id: 107\n    name: A\n    identity: a\n    package: p\n    landing: https://landing.test/107\n    icon_url: /app-icons/107.png\n    repo: owner/a\n`,
    token: 'fake',
    fetchFn,
  });

  assert.equal(results[0].status, 'ok');
  assert.equal(results[0].icon_url, '/app-icons/107.png');
  assert.ok(!calls.includes('https://landing.test/107'));
});

test('sends ?ref=branch when app specifies a custom branch', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return { status: 404, ok: false, json: async () => ({}) };
  };
  await collectAppDocs({
    appsYml: `apps:\n  - id: 300\n    name: A\n    identity: a\n    package: p\n    landing: l\n    repo: owner/x\n    branch: master\n`,
    token: 'fake',
    fetchFn,
  });
  const apiCalls = calls.filter(u => u.startsWith('https://api.github.com/'));
  assert.ok(apiCalls.length > 0);
  assert.ok(apiCalls.every(u => u.includes('?ref=master')));
});

test('throws when token missing', async () => {
  await assert.rejects(
    collectAppDocs({ appsYml, token: null, fetchFn: mockFetch({}) }),
    /DOCS_FETCH_TOKEN/
  );
});
