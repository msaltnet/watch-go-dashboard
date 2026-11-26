import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOverview } from '../scripts/parsers/overview.mjs';

const REPO = 'msaltnet/sample-app';
const BRANCH = 'main';

test('converts markdown to HTML', () => {
  const html = parseOverview('# Title\n\nBody text.', REPO, BRANCH);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /Body text/);
});

test('strips script tags', () => {
  const html = parseOverview('Hello <script>alert(1)</script> world', REPO, BRANCH);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('alert(1)'));
});

test('rewrites relative image paths to repo raw URL', () => {
  const md = '![icon](./images/icon.png)';
  const html = parseOverview(md, REPO, BRANCH);
  assert.match(
    html,
    /src="https:\/\/raw\.githubusercontent\.com\/msaltnet\/sample-app\/main\/docs\/app\/images\/icon\.png"/
  );
});

test('rewrites images without leading dot-slash', () => {
  const md = '![icon](images/icon.png)';
  const html = parseOverview(md, REPO, BRANCH);
  assert.match(
    html,
    /src="https:\/\/raw\.githubusercontent\.com\/msaltnet\/sample-app\/main\/docs\/app\/images\/icon\.png"/
  );
});

test('leaves absolute image URLs untouched', () => {
  const md = '![icon](https://example.com/icon.png)';
  const html = parseOverview(md, REPO, BRANCH);
  assert.match(html, /src="https:\/\/example\.com\/icon\.png"/);
});

test('respects docs_subdir when rewriting image paths', () => {
  const html = parseOverview('![x](images/x.png)', REPO, BRANCH, 'clean');
  assert.match(
    html,
    /msaltnet\/sample-app\/main\/clean\/docs\/app\/images\/x\.png/
  );
});

test('does not rewrite protocol-relative URLs', () => {
  const html = parseOverview('![x](//cdn.example.com/x.png)', REPO, BRANCH);
  assert.match(html, /src="\/\/cdn\.example\.com\/x\.png"/);
});

test('does not rewrite data URIs or fragment-only references', () => {
  const dataUri = parseOverview('![x](data:image/png;base64,AAAA)', REPO, BRANCH);
  assert.match(dataUri, /src="data:image\/png;base64,AAAA"/);
});

// The site is public but overview.md is a developer document: only the intro and
// the feature sections may be published.
const DEV_DOC = [
  '# Sample — Overview', '', 'Intro text.', '',
  '## 주요 기능', '', '- feature one', '', '### 워치', '', '- watch feature', '',
  '## 아키텍처 요약', '', 'module secret', '', '### 하위 구조', '', 'nested secret', '',
  '## 랭킹 API 요약', '', '```', '## 주요 기능', 'fenced secret', '```', '',
  '# 부록', '', 'appendix secret',
].join('\n');

test('publishes the intro and feature section including its subsections', () => {
  const html = parseOverview(DEV_DOC, REPO, BRANCH);
  assert.match(html, /<h1>Sample — Overview<\/h1>/);
  assert.match(html, /Intro text/);
  assert.match(html, /<h2>주요 기능<\/h2>/);
  assert.match(html, /feature one/);
  assert.match(html, /watch feature/);
});

test('drops every other section, even when a code block mimics a feature heading', () => {
  const html = parseOverview(DEV_DOC, REPO, BRANCH);
  assert.ok(!html.includes('아키텍처'));
  assert.ok(!html.includes('랭킹 API'));
  assert.ok(!html.includes('secret'));
});

test('publishes introduction and core feature headings used by some apps', () => {
  const html = parseOverview('## 소개\n\nhello\n\n## 핵심 기능\n\ncore\n\n## 기술 스택\n\nstack', REPO, BRANCH);
  assert.match(html, /hello/);
  assert.match(html, /core/);
  assert.ok(!html.includes('stack'));
});

test('does not publish a leading section that is not a feature section', () => {
  const html = parseOverview('## 아키텍처 요약\n\nsecret', REPO, BRANCH);
  assert.equal(html.trim(), '');
});

test('resolves reference links defined inside a dropped section', () => {
  const md = '[site][home]\n\n## 기술 스택\n\n[home]: https://example.com/';
  const html = parseOverview(md, REPO, BRANCH);
  assert.match(html, /href="https:\/\/example\.com\/"/);
});
