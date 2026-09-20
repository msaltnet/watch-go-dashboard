# now.watch-go.com Discovery Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate search, AI-discovery, and social-sharing metadata for the Watch-Go dashboard at `https://now.watch-go.com`.

**Architecture:** A dedicated SEO module owns canonical URLs, structured data, and crawler output. Existing renderers receive its escaped values; the static build writes crawler files with the generated HTML.

**Tech Stack:** Node.js 20, ECMAScript modules, node:test, existing string-template renderer.

**Spec:** `docs/superpowers/specs/2026-09-20-now-watch-go-seo-design.md`

## Global Constraints

- Canonical origin is exactly `https://now.watch-go.com`.
- Use only existing app data and keep rendering static and dependency-free.
- Escape HTML, JSON-LD script content, and XML independently.
- Ship a 1200×630 `social-card.png`; never commit `dist/`.

---

### Task 1: Generate SEO values and crawler files

**Files:**
- Create: `scripts/render/seo.mjs`
- Create: `test/seo.test.mjs`

**Interfaces:**
- Produces: `SITE_ORIGIN`, `indexSeo(data)`, `detailSeo(app, data)`, `renderRobotsTxt()`, and `renderSitemapXml(data)`.

- [ ] **Step 1: Write the failing SEO-value test.**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexSeo, detailSeo } from '../scripts/render/seo.mjs';

test('creates public canonical URLs and app discovery metadata', () => {
  const data = { apps: [{ id: 205, name: 'Pomodoro', identity: 'Focus timer', package: 'com.watch_go.pomodoro', landing: 'https://watch-go.com/205', latest_update_date: '2026-09-01' }] };
  assert.equal(indexSeo(data).canonical_url, 'https://now.watch-go.com/');
  assert.equal(detailSeo(data.apps[0], data).canonical_url, 'https://now.watch-go.com/app/205.html');
  assert.match(detailSeo(data.apps[0], data).json_ld, /SoftwareApplication/);
});
```

- [ ] **Step 2: Run `node --test test/seo.test.mjs`; it must fail because `seo.mjs` is absent.**

- [ ] **Step 3: Implement the helper API and safe serialization.**

```js
export const SITE_ORIGIN = 'https://now.watch-go.com';
export function indexSeo(data) {
  return pageSeo('/', 'Watch-Go Wear OS Apps & Watch Faces | now.watch-go.com', INDEX_DESCRIPTION, indexSchema(data));
}
export function detailSeo(app, data) {
  return pageSeo(`/${detailPath(app)}`, `${app.name} | Watch-Go Wear OS App`, `${app.identity} Watch-Go의 Wear OS 및 Android 앱 카탈로그에서 자세히 알아보세요.`, detailSchema(app, data));
}
export function renderRobotsTxt() { return `User-agent: *\\nAllow: /\\n\\nSitemap: ${SITE_ORIGIN}/sitemap.xml\\n`; }
export function renderSitemapXml(data) { return xmlUrlset([rootUrl(), ...data.apps.map(detailUrl)]); }
```

Use `JSON.stringify(value).replace(/</g, '\\u003c')` for JSON-LD and a dedicated XML escape function. Include `lastmod` only for valid `YYYY-MM-DD` dates.

- [ ] **Step 4: Add a crawler test for sitemap location, detail URLs, and optional `lastmod`; run the focused suite and confirm it passes.**

- [ ] **Step 5: Commit the tested module.**

```bash
git add scripts/render/seo.mjs test/seo.test.mjs
git commit -m "feat: generate dashboard discovery metadata"
```

### Task 2: Render metadata on all pages

**Files:**
- Modify: `templates/index.html`
- Modify: `templates/app-detail.html`
- Modify: `scripts/render/index-page.mjs`
- Modify: `scripts/render/detail-page.mjs`
- Modify: `test/render.test.mjs`

**Interfaces:**
- Consumes: `indexSeo(data)` and `detailSeo(app, data)`.
- Produces: title, description, canonical, Open Graph, Twitter Card, and JSON-LD in every rendered page.

- [ ] **Step 1: Add failing renderer assertions.**

```js
assert.match(renderIndexPage(fixture, index), /<link rel="canonical" href="https:\/\/now\.watch-go\.com\/">/);
assert.match(renderDetailPage(fixture.apps[0], fixture, detail), /property="og:url" content="https:\/\/now\.watch-go\.com\/app\/205\.html"/);
```

- [ ] **Step 2: Run `node --test test/render.test.mjs`; it must fail because the templates lack metadata.**

- [ ] **Step 3: Add document-head slots and pass SEO values from the existing renderers.**

```html
<meta name="description" content="{{description}}">
<link rel="canonical" href="{{canonical_url}}">
<meta property="og:image" content="{{social_image}}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{{json_ld}}</script>
```

Add OG type, URL, title, description, image dimensions/type/alt, site name, Korean locale, and equivalent Twitter fields. Update the index kicker to say Wear OS watch faces and Android apps.

- [ ] **Step 4: Run the renderer tests and confirm they pass.**

- [ ] **Step 5: Commit the page rendering change.**

```bash
git add templates/index.html templates/app-detail.html scripts/render/index-page.mjs scripts/render/detail-page.mjs test/render.test.mjs
git commit -m "feat: expose searchable dashboard pages"
```

### Task 3: Publish crawler artifacts

**Files:**
- Modify: `scripts/render-site.mjs`
- Modify: `test/render.test.mjs`

**Interfaces:**
- Consumes: `renderRobotsTxt()` and `renderSitemapXml(data)`.
- Produces: `dist/robots.txt` and `dist/sitemap.xml`.

- [ ] **Step 1: Add a failing build-output assertion for both crawler files.**
- [ ] **Step 2: Run a clean build and verify the assertion fails before implementation.**
- [ ] **Step 3: Add the explicit writes.**

```js
await writeFile('dist/robots.txt', renderRobotsTxt(), 'utf8');
await writeFile('dist/sitemap.xml', renderSitemapXml(data), 'utf8');
```

- [ ] **Step 4: Build and run the focused test; confirm both files use `now.watch-go.com`.**
- [ ] **Step 5: Commit the crawler integration.**

```bash
git add scripts/render-site.mjs test/render.test.mjs
git commit -m "feat: publish dashboard crawler files"
```

### Task 4: Add social preview and validate deployment output

**Files:**
- Create: `public/social-card.png`
- Modify: `README.md`

**Interfaces:**
- Produces: a 1200×630 PNG copied from `public/` to `dist/`, and public crawler endpoint documentation.

- [ ] **Step 1: Create the PNG with Watch-Go mark, “Wear Beauty. Live Smart.”, and “Wear OS Apps & Watch Faces.”**
- [ ] **Step 2: Build and inspect `dist/social-card.png` to confirm it is 1200×630.**
- [ ] **Step 3: Document the canonical origin, crawler endpoints, and social cache behavior in README.**
- [ ] **Step 4: Run `npm test` and `npm run build`; inspect index, a detail page, robots, and sitemap for the canonical origin and no unresolved template slots.**
- [ ] **Step 5: Check `git status --short` excludes `dist/`, then commit.**

```bash
git add public/social-card.png README.md
git commit -m "feat: add social sharing preview"
```
