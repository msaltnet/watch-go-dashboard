import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderIndexPage } from '../scripts/render/index-page.mjs';
import { renderDetailPage } from '../scripts/render/detail-page.mjs';

const fixture = {
  built_at: '2026-04-23T03:00:00+09:00',
  stats: { total: 2, succeeded: 1, no_docs: 0, failed: 1 },
  apps: [
    {
      id: 205,
      name: 'Pomodoro Timer: Focus & Study',
      identity: '손목 위에서 집중력을 키우는 뽀모도로 타이머',
      package: 'com.watch_go.pomodoro',
      landing: 'https://watch-go.com/205',
      repo: 'msaltnet/watch-pomodoro-timer',
      overview_html: '<h2>소개</h2><p>집중력 도구.</p>',
      updates: [{ version: 'v2.3.0', date: '2026-04-18', items_html: '<ul><li>위젯 추가</li></ul>' }],
      latest_version: 'v2.3.0',
      latest_update_date: '2026-04-18',
      fetch_status: 'ok',
      last_successful_fetch: '2026-04-23T03:00:00+09:00',
    },
    {
      id: 100,
      name: 'Sample Failed',
      identity: 'failed sample',
      package: 'com.sample',
      landing: 'https://watch-go.com/100',
      repo: 'msaltnet/sample',
      overview_html: '<p>old</p>',
      updates: [],
      latest_version: null,
      latest_update_date: null,
      fetch_status: 'fetch_failed',
      last_successful_fetch: '2026-04-20T03:00:00+09:00',
    },
  ],
};

async function loadTemplates() {
  return {
    index: await readFile('templates/index.html', 'utf8'),
    detail: await readFile('templates/app-detail.html', 'utf8'),
  };
}

test('renderIndexPage produces HTML with all cards', async () => {
  const { index } = await loadTemplates();
  const html = renderIndexPage(fixture, index);
  assert.match(html, /Pomodoro Timer/);
  assert.match(html, /Sample Failed/);
  assert.match(html, /v2\.3\.0/);
  assert.match(html, /2026-04-18/);
  assert.match(html, /2026-04-23 03:00 KST/);
  assert.match(html, /summary-ok/);
  assert.match(html, /data-category="app"/);
  assert.match(html, /data-category="watchface"/);
});

test('renderIndexPage shows stale badge for fetch_failed', async () => {
  const { index } = await loadTemplates();
  const html = renderIndexPage(fixture, index);
  assert.match(html, /badge-stale|badge-failed/);
});

test('renderIndexPage escapes app names', async () => {
  const { index } = await loadTemplates();
  const evil = JSON.parse(JSON.stringify(fixture));
  evil.apps[0].name = '<script>alert(1)</script>';
  const html = renderIndexPage(evil, index);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('renderDetailPage renders overview and updates', async () => {
  const { detail } = await loadTemplates();
  const html = renderDetailPage(fixture.apps[0], fixture, detail);
  assert.match(html, /Pomodoro Timer/);
  assert.match(html, /집중력 도구/);
  assert.match(html, /v2\.3\.0/);
  assert.match(html, /위젯 추가/);
});

test('renderDetailPage shows empty state when no overview', async () => {
  const { detail } = await loadTemplates();
  const app = { ...fixture.apps[1], overview_html: null };
  const html = renderDetailPage(app, fixture, detail);
  assert.match(html, /데이터 없음/);
});

test('renderDetailPage throws on undefined template placeholder', async () => {
  const badTemplate = '<html>{{bogus_placeholder}}</html>';
  assert.throws(() => renderDetailPage(fixture.apps[0], fixture, badTemplate), /Missing template value/);
});

test('renderIndexPage shows unreleased label on card', async () => {
  const { index } = await loadTemplates();
  const data = {
    ...fixture,
    apps: [{
      ...fixture.apps[0],
      updates: [{ version: 'v7.0.0', date: null, label: '개발 중', items_html: '<ul></ul>' }],
      latest_version: 'v7.0.0',
      latest_update_date: null,
      latest_update_label: '개발 중',
    }],
  };
  const html = renderIndexPage(data, index);
  assert.match(html, /v7\.0\.0 \(개발 중\)/);
});

test('renderDetailPage renders update with no date', async () => {
  const { detail } = await loadTemplates();
  const app = {
    ...fixture.apps[0],
    updates: [{ version: 'v2.3.0', date: null, label: null, items_html: '<ul><li>x</li></ul>' }],
    latest_version: 'v2.3.0',
    latest_update_date: null,
    latest_update_label: null,
  };
  const html = renderDetailPage(app, fixture, detail);
  assert.match(html, /v2\.3\.0/);
  assert.ok(!html.includes('update-date'));
});

test('renderIndexPage shows icon when icon_url is present', async () => {
  const { index } = await loadTemplates();
  const data = {
    ...fixture,
    apps: [{ ...fixture.apps[0], icon_url: 'https://watch-go.com/205/icon.png' }],
  };
  const html = renderIndexPage(data, index);
  assert.match(html, /<img class="card-icon"/);
  assert.match(html, /src="https:\/\/watch-go\.com\/205\/icon\.png"/);
});

test('renderIndexPage shows placeholder when icon_url missing', async () => {
  const { index } = await loadTemplates();
  const data = {
    ...fixture,
    apps: [{ ...fixture.apps[0], icon_url: null }],
  };
  const html = renderIndexPage(data, index);
  assert.match(html, /card-icon-placeholder/);
});

test('renderDetailPage shows detail icon when icon_url is present', async () => {
  const { detail } = await loadTemplates();
  const app = { ...fixture.apps[0], icon_url: 'https://watch-go.com/205/icon.png' };
  const html = renderDetailPage(app, fixture, detail);
  assert.match(html, /<img class="detail-icon"/);
});
