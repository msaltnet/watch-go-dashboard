import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detailSeo,
  indexSeo,
  renderRobotsTxt,
  renderSitemapXml,
} from '../scripts/render/seo.mjs';

const app = {
  id: 205,
  name: 'Pomodoro Timer: Focus & Study',
  identity: '손목 위에서 집중력을 키우는 뽀모도로 타이머',
  package: 'com.watch_go.pomodoro',
  landing: 'https://watch-go.com/205',
  icon_url: '/app-icons/205.png',
  latest_update_date: '2026-09-01',
};

test('creates index metadata at the public canonical origin', () => {
  const seo = indexSeo({ apps: [app] });

  assert.equal(seo.canonical_url, 'https://now.watch-go.com/');
  assert.equal(seo.social_image, 'https://now.watch-go.com/social-card.png');
  assert.match(seo.title, /Wear OS Apps &amp; Watch Faces/);
  assert.match(seo.description, /Wear OS 워치페이스와 Android 앱/);
  assert.match(seo.json_ld, /"Organization"/);
  assert.match(seo.json_ld, /"WebSite"/);
  assert.match(seo.json_ld, /https:\/\/now\.watch-go\.com\/app\/205\.html/);
});

test('creates app-specific metadata and safely serializes structured data', () => {
  const seo = detailSeo({ ...app, name: 'Focus <Timer>' }, { apps: [app] });

  assert.equal(seo.canonical_url, 'https://now.watch-go.com/app/205.html');
  assert.match(seo.title, /Focus &lt;Timer&gt;/);
  assert.match(seo.description, /뽀모도로 타이머/);
  assert.match(seo.json_ld, /"SoftwareApplication"/);
  assert.match(seo.json_ld, /"BreadcrumbList"/);
  assert.match(seo.json_ld, /"operatingSystem":"Wear OS, Android"/);
  assert.match(seo.json_ld, /"dateModified":"2026-09-01"/);
  assert.ok(!seo.json_ld.includes('<Timer>'));
  assert.match(seo.json_ld, /\\u003cTimer>/);
});

test('publishes crawler access policy and a sitemap with only valid modification dates', () => {
  const sitemap = renderSitemapXml({
    apps: [
      app,
      { id: 206, variant: 'classic', latest_update_date: '2026-02-31' },
    ],
  });

  assert.match(renderRobotsTxt(), /User-agent: GPTBot\r?\nAllow: \//);
  assert.match(renderRobotsTxt(), /Sitemap: https:\/\/now\.watch-go\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/now\.watch-go\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/now\.watch-go\.com\/app\/205\.html<\/loc>/);
  assert.match(sitemap, /<lastmod>2026-09-01<\/lastmod>/);
  assert.match(sitemap, /<loc>https:\/\/now\.watch-go\.com\/app\/206-classic\.html<\/loc>/);
  assert.ok(!sitemap.includes('2026-02-31'));
});
