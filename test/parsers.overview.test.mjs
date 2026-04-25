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
