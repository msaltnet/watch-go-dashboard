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
  assert.equal(result[0].label, null);
  assert.match(result[0].items_html, /홈 화면 위젯 추가/);
  assert.match(result[0].items_html, /<ul>/);
});

test('parses version-only header (no date)', () => {
  const md = `## v2.3.0
- 세부 변경 내용 정보 없음
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].version, 'v2.3.0');
  assert.equal(result[0].date, null);
  assert.equal(result[0].label, null);
});

test('parses unreleased label like "(개발 중)"', () => {
  const md = `## v7.0.0 (개발 중)
- 위젯 작업
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].version, 'v7.0.0');
  assert.equal(result[0].date, null);
  assert.equal(result[0].label, '개발 중');
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

test('skips dash-prefixed header with non-date suffix', () => {
  // `## v1.0.0 — coming soon` — dash form requires YYYY-MM-DD; this header is malformed.
  // Use `(...)` for unreleased status instead.
  const md = `## v1.0.0 — coming soon
- 준비중

## v2.0.0 — 2026-03-01
- 기능 개선
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].version, 'v2.0.0');
});

test('orders unreleased (label) above dated above undated', () => {
  const md = `## v6.0.0 — 2026-03-01
- a

## v2.3.0
- b

## v7.0.0 (개발 중)
- c
`;
  const result = parseUpdates(md);
  assert.equal(result.length, 3);
  assert.equal(result[0].version, 'v7.0.0');
  assert.equal(result[0].label, '개발 중');
  assert.equal(result[1].version, 'v6.0.0');
  assert.equal(result[1].date, '2026-03-01');
  assert.equal(result[2].version, 'v2.3.0');
  assert.equal(result[2].date, null);
});

test('handles different em-dash variants (— vs --)', () => {
  const md = `## v1.0.0 -- 2026-01-01\n- test`;
  const result = parseUpdates(md);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-01-01');
});
