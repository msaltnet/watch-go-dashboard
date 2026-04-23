import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUpdates } from '../scripts/parsers/updates.mjs';

test('parses single version section', () => {
  const md = `# Updates

## v7.0.0 — 2026-04-23
- 홈 화면 위젯 추가
- 알림 강화
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].version, 'v7.0.0');
  assert.equal(result[0].date, '2026-04-23');
  assert.match(result[0].items_html, /홈 화면 위젯 추가/);
  assert.match(result[0].items_html, /<ul>/);
});

test('returns empty array when no version headers', () => {
  const md = `# Updates\n\n아직 릴리스 없음.`;
  assert.deepEqual(parseUpdates(md), []);
});

test('parses multiple versions in reverse chronological order (newest first)', () => {
  const md = `# Updates

## v1.0.0 — 2025-01-01
- 최초 릴리스

## v2.0.0 — 2026-03-01
- 기능 개선
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 2);
  assert.equal(result[0].version, 'v2.0.0');
  assert.equal(result[1].version, 'v1.0.0');
});

test('orders same-date releases by version descending', () => {
  const md = `## v1.0.0 — 2026-04-23
- first

## v1.0.1 — 2026-04-23
- hotfix
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 2);
  assert.equal(result[0].version, 'v1.0.1');
  assert.equal(result[1].version, 'v1.0.0');
});

test('skips headers without a valid date', () => {
  const md = `## v1.0.0 — coming soon
- 준비중

## v2.0.0 — 2026-03-01
- 기능 개선
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].version, 'v2.0.0');
});

test('handles different em-dash variants (— vs --)', () => {
  const md = `## v1.0.0 -- 2026-01-01\n- test`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-01-01');
});
