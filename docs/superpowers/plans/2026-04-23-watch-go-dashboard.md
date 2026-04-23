# watch-go.com Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** watch-go.com 앱들의 현황을 한눈에 볼 수 있는 정적 대시보드 구축. GitHub Actions가 일 1회 각 앱 repo의 `docs/overview.md`, `docs/updates.md`를 수집해 JSON으로 저장하고, 정적 HTML로 빌드해 GitHub Pages에 배포.

**Architecture:** 두 단계 파이프라인. `fetch-docs.mjs`가 GitHub Contents API로 문서를 받아 `data/apps.json`을 커밋하고, `render-site.mjs`가 JSON + 템플릿 → `dist/`로 정적 HTML을 생성. Actions 워크플로우 2개 — daily-update (데이터 수집·커밋), deploy (빌드·Pages 배포). 부분 실패 시 이전 데이터 유지, 전체 실패 시 커밋 스킵 + Actions fail.

**Tech Stack:** Node.js 20, marked (Markdown → HTML), isomorphic-dompurify (sanitize), yaml (apps.yml 파싱), node:test (테스트), GitHub Actions, GitHub Pages.

참고 스펙: [`docs/superpowers/specs/2026-04-23-watch-go-dashboard-design.md`](../specs/2026-04-23-watch-go-dashboard-design.md)

---

## File Structure

```
.
├── README.md                          # 프로젝트 소개·설정·운영 가이드
├── apps.yml                           # 수동 관리 앱 목록 (17개 앱)
├── package.json                       # 의존성: marked, isomorphic-dompurify, yaml
├── .gitignore                         # dist/, node_modules/
├── data/
│   └── apps.json                      # fetch 결과 (커밋됨, 초기엔 빈 skeleton)
├── scripts/
│   ├── fetch-docs.mjs                 # 엔트리: apps.yml → data/apps.json
│   ├── render-site.mjs                # 엔트리: data/apps.json → dist/
│   ├── github.mjs                     # GitHub Contents API 클라이언트
│   ├── parsers/
│   │   ├── updates.mjs                # updates.md → 버전 배열
│   │   └── overview.mjs               # overview.md → sanitized HTML
│   ├── merge.mjs                      # 이전 JSON과 새 fetch 결과 병합
│   └── render/
│       ├── layout.mjs                 # 공통 head/header/footer 문자열
│       ├── index-page.mjs             # 대시보드 생성
│       ├── detail-page.mjs            # 앱 상세 페이지 생성
│       └── util.mjs                   # HTML escape, 날짜 포맷
├── templates/
│   ├── index.html                     # 대시보드 뼈대
│   └── app-detail.html                # 상세 페이지 뼈대
├── public/
│   └── styles.css                     # 단일 CSS 파일
├── test/
│   ├── parsers.updates.test.mjs
│   ├── parsers.overview.test.mjs
│   ├── merge.test.mjs
│   ├── fetch-docs.test.mjs            # fetch mock 통합 테스트
│   └── render.test.mjs                # 고정 JSON → dist 스냅샷
└── .github/
    └── workflows/
        ├── daily-update.yml
        └── deploy.yml
```

**책임 분리 원칙:**
- `scripts/github.mjs` — 네트워크 I/O만. 테스트에서 주입 가능하게 fetch 함수를 인자로 받음.
- `scripts/parsers/*` — 순수 함수. 입력 문자열 → 출력 객체. 외부 I/O 없음.
- `scripts/merge.mjs` — 순수 함수. 이전 JSON + 새 결과 → 최종 JSON.
- `scripts/render/*` — 순수 함수. JSON + 템플릿 문자열 → HTML 문자열.
- `fetch-docs.mjs`, `render-site.mjs` — 엔트리 포인트. I/O 오케스트레이션만.

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: `.nvmrc` 작성**

```
20
```

- [ ] **Step 2: `.gitignore` 작성**

```
node_modules/
dist/
.DS_Store
*.log
```

- [ ] **Step 3: `package.json` 작성**

```json
{
  "name": "watch-go-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "fetch": "node scripts/fetch-docs.mjs",
    "render": "node scripts/render-site.mjs",
    "build": "node scripts/render-site.mjs",
    "test": "node --test test/"
  },
  "dependencies": {
    "isomorphic-dompurify": "^2.16.0",
    "marked": "^14.1.3",
    "yaml": "^2.6.0"
  }
}
```

- [ ] **Step 4: 설치 확인**

Run: `npm install`
Expected: 3개 패키지 + 의존성 설치. `node_modules/` 생성.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore .nvmrc
git commit -m "chore: scaffold Node project with build/test scripts"
```

---

## Task 2: `apps.yml` 작성

**Files:**
- Create: `apps.yml`

`watch-go-com.md`의 앱 테이블을 기계 가독 형태로 옮긴다. 102번(wff-watch-face) 공유 repo는 `docs_subdir`로 구분한다.

- [ ] **Step 1: `apps.yml` 작성**

```yaml
apps:
  - id: 100
    name: "My Photo Watch Face: watch-go"
    identity: "내 사진을 워치페이스로 — 손목 위에 나만의 얼굴을"
    package: "com.watch_go.myphotowatchface"
    landing: "https://watch-go.com/100"
    repo: "msaltnet/MyPhotoWatchFace"

  - id: 102
    variant: "clean"
    name: "My Photo Watch Face: Clean"
    identity: "깔끔한 레이아웃으로 내 사진을 담은 미니멀 워치페이스"
    package: "com.watch_go.new_my_photo_watch_face"
    landing: "https://watch-go.com/102"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "clean"

  - id: 102
    variant: "thin"
    name: "My Photo Watch Face: Thin"
    identity: "얇고 세련된 라인으로 완성하는 내 사진 워치페이스"
    package: "com.watch_go.new_my_photo_watch_face_thin"
    landing: "https://watch-go.com/102"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "thin"

  - id: 102
    variant: "cute"
    name: "My Photo Watch Face: Cute"
    identity: "귀엽고 사랑스러운 감성의 내 사진 워치페이스"
    package: "com.watch_go.new_my_photo_watch_face_cute"
    landing: "https://watch-go.com/102"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "cute"

  - id: 103
    name: "Quote Moment Watch Face"
    identity: "매 순간 영감을 주는 명언이 흐르는 워치페이스"
    package: "com.watch_go.quote_moment_watch_face"
    landing: "https://watch-go.com/103"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "quote-moment"

  - id: 104
    name: "My Photo Circle Watch Face"
    identity: "원형 프레임 속 내 사진으로 꾸미는 워치페이스"
    package: "com.watch_go.my_photo_circle_wff"
    landing: "https://watch-go.com/104"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "photo-circle"

  - id: 105
    name: "My Photo Quote: Daily Inspire"
    identity: "내 사진과 오늘의 명언이 함께하는 워치페이스"
    package: "com.watch_go.photo_quote_wff"
    landing: "https://watch-go.com/105"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "photo-quote"

  - id: 106
    name: "LED Board Watch Face"
    identity: "Watch LED Scroller와 연동되는 LED 전광판 컴플리케이션 워치페이스"
    package: "com.watch_go.led_board_watch_face"
    landing: "https://watch-go.com/106"
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "led-board"

  - id: 200
    name: "Double Check: To-Do & List"
    identity: "손목에서 바로 체크하는 심플한 투두 & 리스트 앱"
    package: "com.watch_go.doublecheck"
    landing: "https://watch-go.com/200"
    repo: "msaltnet/double-check-pro"

  - id: 201
    name: "Watch LED Scroller & Banner"
    identity: "손목 위에서 빛나는 LED 전광판 텍스트 스크롤러"
    package: "com.watch_go.watchledscroller"
    landing: "https://watch-go.com/201"
    repo: "msaltnet/watch-led-scroller"

  - id: 202
    name: "My Photo Watch Frame: watch-go"
    identity: "내 사진을 멋진 프레임으로 감싸는 워치 앱"
    package: "com.watch_go.myphotowatchframe"
    landing: "https://watch-go.com/202"
    repo: "msaltnet/my-photo-watch-frame"

  - id: 203
    name: "Crypto Watch: Bitcoin & Tile"
    identity: "손목에서 실시간으로 확인하는 암호화폐 시세 위젯"
    package: "com.watch_go.cryptowatch"
    landing: "https://watch-go.com/203"
    repo: "msaltnet/crypto-watch"

  - id: 204
    name: "Multi Counter: Tally & Click"
    identity: "탭 한 번으로 여러 항목을 동시에 세는 멀티 카운터"
    package: "com.watch_go.multicounter"
    landing: "https://watch-go.com/204"
    repo: "msaltnet/watch-go-multi-counter"

  - id: 205
    name: "Pomodoro Timer: Focus & Study"
    identity: "손목 위에서 집중력을 키우는 뽀모도로 타이머"
    package: "com.watch_go.pomodoro"
    landing: "https://watch-go.com/205"
    repo: "msaltnet/watch-pomodoro-timer"

  - id: 206
    name: "2048 Watch Game: Rank & Logic"
    identity: "워치에서 즐기는 두뇌 자극 2048 퍼즐 게임"
    package: "com.watch_go.watch2048"
    landing: "https://watch-go.com/206"
    repo: "msaltnet/2048-watch"

  - id: 207
    name: "Quote Moment: Daily Inspire"
    identity: "매일 새로운 명언으로 하루를 시작하는 인스파이어 앱"
    package: "com.watch_go.quotemoment"
    landing: "https://watch-go.com/207"
    repo: "msaltnet/quote-moment"

  - id: 208
    name: "Remote Camera: Watch Control"
    identity: "워치로 스마트폰 카메라를 원격 제어하는 셔터 앱"
    package: "com.watch_go.remotecamwatch"
    landing: "https://watch-go.com/208"
    repo: "msaltnet/remote-cam-watch"
```

참고: 102번 WFF 변형들의 `docs_subdir` 이름(`clean`, `thin`, `cute` 등)은 `wff-watch-face` repo의 실제 디렉토리 구조와 일치해야 한다. 현재 값은 추정이며, 해당 repo에 맞게 조정이 필요할 수 있다 — 수집 시 404가 뜨면 이 값을 수정한다.

- [ ] **Step 2: Commit**

```bash
git add apps.yml
git commit -m "feat: add apps.yml with 17 app entries"
```

---

## Task 3: `parsers/updates.mjs` — updates.md 파서

**Files:**
- Create: `scripts/parsers/updates.mjs`
- Create: `test/parsers.updates.test.mjs`

documentation-guide.md의 `updates.md` 포맷:
```markdown
## v7.0.0 — 2026-04-23
- 홈 화면 위젯 추가 — 2x2 / 4x4 크기로 타이머 제어 가능
- 모바일 타이머 알림 강화 — 소리/진동 반복, 30초 자동 종료
```

- [ ] **Step 1: 실패하는 테스트 작성**

`test/parsers.updates.test.mjs`:

```javascript
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test`
Expected: FAIL — `parseUpdates`가 정의되지 않음.

- [ ] **Step 3: 파서 구현**

`scripts/parsers/updates.mjs`:

```javascript
import { marked } from 'marked';

const HEADER_RE = /^##\s+(v[^\s]+)\s*[—–-]+\s*(\d{4}-\d{2}-\d{2})\s*$/;

export function parseUpdates(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(HEADER_RE);
    if (match) {
      if (current) sections.push(current);
      current = { version: match[1], date: match[2], body: [] };
    } else if (line.startsWith('## ')) {
      if (current) {
        sections.push(current);
        current = null;
      }
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  const parsed = sections.map(s => ({
    version: s.version,
    date: s.date,
    items_html: marked.parse(s.body.join('\n').trim() || ''),
  }));

  parsed.sort((a, b) => b.date.localeCompare(a.date));
  return parsed;
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: PASS — 5개 테스트 모두 통과.

- [ ] **Step 5: Commit**

```bash
git add scripts/parsers/updates.mjs test/parsers.updates.test.mjs
git commit -m "feat: add updates.md parser"
```

---

## Task 4: `parsers/overview.mjs` — overview.md → sanitized HTML

**Files:**
- Create: `scripts/parsers/overview.mjs`
- Create: `test/parsers.overview.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/parsers.overview.test.mjs`:

```javascript
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
    /src="https:\/\/raw\.githubusercontent\.com\/msaltnet\/sample-app\/main\/docs\/images\/icon\.png"/
  );
});

test('rewrites images without leading dot-slash', () => {
  const md = '![icon](images/icon.png)';
  const html = parseOverview(md, REPO, BRANCH);
  assert.match(
    html,
    /src="https:\/\/raw\.githubusercontent\.com\/msaltnet\/sample-app\/main\/docs\/images\/icon\.png"/
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
    /msaltnet\/sample-app\/main\/docs\/clean\/images\/x\.png/
  );
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test`
Expected: FAIL — `parseOverview`가 없음.

- [ ] **Step 3: 파서 구현**

`scripts/parsers/overview.mjs`:

```javascript
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function parseOverview(markdown, repo, branch = 'main', subdir = null) {
  const docsBase = subdir ? `docs/${subdir}` : 'docs';
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}/${docsBase}`;

  const renderer = new marked.Renderer();
  const origImage = renderer.image.bind(renderer);
  renderer.image = (href, title, text) => {
    if (href && !/^https?:\/\//.test(href) && !href.startsWith('/')) {
      const cleaned = href.replace(/^\.\//, '');
      href = `${rawBase}/${cleaned}`;
    }
    return origImage(href, title, text);
  };

  const rawHtml = marked.parse(markdown, { renderer });
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: PASS — overview 테스트 6개 + updates 테스트 5개.

- [ ] **Step 5: Commit**

```bash
git add scripts/parsers/overview.mjs test/parsers.overview.test.mjs
git commit -m "feat: add overview.md parser with sanitize and image URL rewriting"
```

---

## Task 5: `github.mjs` — GitHub Contents API 클라이언트

**Files:**
- Create: `scripts/github.mjs`

네트워크 I/O만 담당. 테스트는 다음 task의 fetch-docs 통합 테스트에서 mock fetch로 커버한다 (여기선 단위 테스트 없이 단순 함수).

- [ ] **Step 1: 클라이언트 구현**

`scripts/github.mjs`:

```javascript
const API_BASE = 'https://api.github.com';

export async function fetchDocFile({ repo, path, token, fetchFn = fetch }) {
  const url = `${API_BASE}/repos/${repo}/contents/${path}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'watch-go-dashboard',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const maxAttempts = 3;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetchFn(url, { headers });
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      await sleep(300 * 2 ** (attempt - 1));
      continue;
    }

    if (res.status === 404) {
      return { status: 'not_found' };
    }
    if (res.status === 401 || res.status === 403) {
      return { status: 'auth_failed', http: res.status };
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`HTTP ${res.status}`);
      if (attempt === maxAttempts) break;
      await sleep(300 * 2 ** (attempt - 1));
      continue;
    }
    if (!res.ok) {
      return { status: 'error', http: res.status };
    }

    const body = await res.json();
    if (body.encoding !== 'base64' || typeof body.content !== 'string') {
      return { status: 'error', reason: 'unexpected_body' };
    }
    const content = Buffer.from(body.content, 'base64').toString('utf8');
    return { status: 'ok', content };
  }

  return { status: 'error', reason: lastErr?.message ?? 'unknown' };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

반환 값 형태:
- `{ status: 'ok', content: '...' }`
- `{ status: 'not_found' }` — 문서 파일 없음
- `{ status: 'auth_failed', http: 401|403 }` — 토큰 문제
- `{ status: 'error', ... }` — 그 외

- [ ] **Step 2: Commit**

```bash
git add scripts/github.mjs
git commit -m "feat: add GitHub Contents API client with retry"
```

---

## Task 6: `merge.mjs` — 이전 JSON 병합 로직

**Files:**
- Create: `scripts/merge.mjs`
- Create: `test/merge.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/merge.test.mjs`:

```javascript
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test`
Expected: FAIL — `mergeFetchResults`가 없음.

- [ ] **Step 3: 구현**

`scripts/merge.mjs`:

```javascript
function appKey(app) {
  return `${app.id}::${app.variant ?? ''}`;
}

function findPrevious(previous, meta) {
  return previous.apps.find(a => appKey(a) === appKey(meta));
}

export function mergeFetchResults({ previous, fresh, builtAt }) {
  const total = fresh.length;
  const succeededCount = fresh.filter(r => r.status === 'ok').length;
  if (succeededCount === 0 && total > 0) {
    throw new Error('all apps failed — refusing to overwrite previous data');
  }

  const apps = fresh.map(result => {
    const { meta, status } = result;
    if (status === 'ok') {
      const first = result.updates[0];
      return {
        ...meta,
        overview_html: result.overview_html,
        updates: result.updates,
        latest_version: first?.version ?? null,
        latest_update_date: first?.date ?? null,
        fetch_status: 'ok',
        last_successful_fetch: builtAt,
      };
    }
    if (status === 'no_docs') {
      return {
        ...meta,
        overview_html: null,
        updates: [],
        latest_version: null,
        latest_update_date: null,
        fetch_status: 'no_docs',
        last_successful_fetch: null,
      };
    }
    // fetch_failed: preserve previous entry if exists
    const prev = findPrevious(previous, meta);
    if (prev) {
      return { ...prev, fetch_status: 'fetch_failed' };
    }
    return {
      ...meta,
      overview_html: null,
      updates: [],
      latest_version: null,
      latest_update_date: null,
      fetch_status: 'fetch_failed',
      last_successful_fetch: null,
    };
  });

  const stats = {
    total,
    succeeded: succeededCount,
    no_docs: fresh.filter(r => r.status === 'no_docs').length,
    failed: fresh.filter(r => r.status === 'fetch_failed').length,
  };

  return { built_at: builtAt, stats, apps };
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: PASS — merge 5개 + 이전 테스트 전체 통과.

- [ ] **Step 5: Commit**

```bash
git add scripts/merge.mjs test/merge.test.mjs
git commit -m "feat: add fetch result merger with previous-data fallback"
```

---

## Task 7: `fetch-docs.mjs` — 엔트리 포인트 + mock 통합 테스트

**Files:**
- Create: `scripts/fetch-docs.mjs`
- Create: `data/apps.json` (빈 skeleton)
- Create: `test/fetch-docs.test.mjs`

- [ ] **Step 1: 빈 JSON skeleton 작성**

`data/apps.json`:

```json
{
  "built_at": null,
  "stats": { "total": 0, "succeeded": 0, "no_docs": 0, "failed": 0 },
  "apps": []
}
```

- [ ] **Step 2: 실패하는 통합 테스트 작성**

`test/fetch-docs.test.mjs`:

```javascript
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
    'https://api.github.com/repos/owner/a/contents/docs/overview.md': jsonResponse('# A overview'),
    'https://api.github.com/repos/owner/a/contents/docs/updates.md':
      jsonResponse('## v1.0.0 — 2026-04-01\n- first'),
    'https://api.github.com/repos/owner/b/contents/docs/overview.md': jsonResponse('# B overview'),
    'https://api.github.com/repos/owner/b/contents/docs/updates.md':
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
  assert.ok(calls.some(u => u.endsWith('/contents/docs/clean/overview.md')));
  assert.ok(calls.some(u => u.endsWith('/contents/docs/clean/updates.md')));
});

test('throws when token missing', async () => {
  await assert.rejects(
    collectAppDocs({ appsYml, token: null, fetchFn: mockFetch({}) }),
    /DOCS_FETCH_TOKEN/
  );
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm test`
Expected: FAIL — `collectAppDocs`가 없음.

- [ ] **Step 4: 구현**

`scripts/fetch-docs.mjs`:

```javascript
import { readFile, writeFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { fetchDocFile } from './github.mjs';
import { parseUpdates } from './parsers/updates.mjs';
import { parseOverview } from './parsers/overview.mjs';
import { mergeFetchResults } from './merge.mjs';

export async function collectAppDocs({ appsYml, token, fetchFn }) {
  if (!token) {
    throw new Error('DOCS_FETCH_TOKEN environment variable is required');
  }

  const { apps } = parseYaml(appsYml);
  const results = [];

  for (const meta of apps) {
    const subdir = meta.docs_subdir;
    const basePath = subdir ? `docs/${subdir}` : 'docs';
    const overviewPath = `${basePath}/overview.md`;
    const updatesPath = `${basePath}/updates.md`;

    const [overview, updates] = await Promise.all([
      fetchDocFile({ repo: meta.repo, path: overviewPath, token, fetchFn }),
      fetchDocFile({ repo: meta.repo, path: updatesPath, token, fetchFn }),
    ]);

    if (overview.status === 'auth_failed' || updates.status === 'auth_failed') {
      results.push({ meta, status: 'fetch_failed' });
      continue;
    }
    if (overview.status === 'error' || updates.status === 'error') {
      results.push({ meta, status: 'fetch_failed' });
      continue;
    }
    if (overview.status === 'not_found' && updates.status === 'not_found') {
      results.push({ meta, status: 'no_docs' });
      continue;
    }

    const overview_html = overview.status === 'ok'
      ? parseOverview(overview.content, meta.repo, 'main', subdir ?? null)
      : null;
    const updatesArr = updates.status === 'ok' ? parseUpdates(updates.content) : [];

    results.push({
      meta,
      status: 'ok',
      overview_html,
      updates: updatesArr,
    });
  }

  return results;
}

function nowIsoKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const iso = kst.toISOString().replace('Z', '+09:00');
  return iso;
}

async function main() {
  const token = process.env.DOCS_FETCH_TOKEN;
  const appsYml = await readFile('apps.yml', 'utf8');
  const previousRaw = await readFile('data/apps.json', 'utf8');
  const previous = JSON.parse(previousRaw);

  const fresh = await collectAppDocs({ appsYml, token, fetchFn: fetch });
  const merged = mergeFetchResults({ previous, fresh, builtAt: nowIsoKst() });

  await writeFile('data/apps.json', JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`built_at=${merged.built_at} stats=${JSON.stringify(merged.stats)}`);
}

const isEntry = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
  || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isEntry) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: PASS — fetch-docs 5개 + 이전 테스트 전체.

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-docs.mjs data/apps.json test/fetch-docs.test.mjs
git commit -m "feat: add fetch-docs entry point with mocked integration tests"
```

---

## Task 8: 템플릿 및 스타일

**Files:**
- Create: `templates/index.html`
- Create: `templates/app-detail.html`
- Create: `public/styles.css`

템플릿은 간단한 `{{placeholder}}` 치환을 사용한다. 이스케이프는 렌더 스크립트에서 처리.

- [ ] **Step 1: `templates/index.html`**

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>watch-go.com Dashboard</title>
<link rel="stylesheet" href="./styles.css">
</head>
<body>
<header class="site-header">
  <h1>watch-go.com Dashboard</h1>
  <p class="tagline">Wear Beauty. Live Smart.</p>
</header>

<section class="summary">
  <span class="summary-item">총 <strong>{{total}}</strong>개 앱</span>
  <span class="summary-item">마지막 업데이트 <strong>{{built_at_display}}</strong></span>
  <span class="summary-item summary-ok">{{succeeded}} ok</span>
  <span class="summary-item summary-no-docs">{{no_docs}} no docs</span>
  <span class="summary-item summary-failed">{{failed}} failed</span>
</section>

<nav class="filters" data-filter-nav>
  <button class="filter active" data-filter="all">전체</button>
  <button class="filter" data-filter="watchface">Watch Face</button>
  <button class="filter" data-filter="app">App</button>
</nav>

<main class="grid">
{{cards}}
</main>

<footer class="site-footer">
  <p>watch-go.com Dashboard — 공개 정보 기반 대시보드</p>
  <p>빌드 시각: {{built_at_display}}</p>
</footer>

<script>
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.card').forEach(card => {
        card.hidden = f !== 'all' && card.dataset.category !== f;
      });
    });
  });
</script>
</body>
</html>
```

- [ ] **Step 2: `templates/app-detail.html`**

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{name}} — watch-go Dashboard</title>
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<header class="site-header">
  <p><a href="../index.html">← Dashboard</a></p>
  <h1>{{name}}</h1>
  <p class="identity">{{identity}}</p>
  <ul class="app-links">
    <li><strong>번호:</strong> #{{id}}</li>
    <li><strong>패키지:</strong> <code>{{package}}</code></li>
    <li><strong>랜딩:</strong> <a href="{{landing}}">{{landing}}</a></li>
    <li><strong>Repo:</strong> <a href="https://github.com/{{repo}}">{{repo}}</a></li>
  </ul>
  {{status_badge}}
</header>

<section class="detail-section">
  <h2>소개</h2>
  {{overview_block}}
</section>

<section class="detail-section">
  <h2>업데이트</h2>
  {{updates_block}}
</section>

<footer class="site-footer">
  <p>빌드 시각: {{built_at_display}}</p>
</footer>
</body>
</html>
```

- [ ] **Step 3: `public/styles.css`**

```css
:root {
  --bg: #f6f7fb;
  --surface: #ffffff;
  --text: #1c1f26;
  --muted: #6b7280;
  --border: #e5e7eb;
  --accent: #2563eb;
  --ok: #16a34a;
  --warn: #d97706;
  --err: #dc2626;
  --shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo",
    "Malgun Gothic", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.55;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.site-header {
  padding: 2rem 1.5rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}
.site-header h1 {
  margin: 0 0 .25rem;
  font-size: 1.75rem;
}
.tagline { color: var(--muted); margin: 0; }

.summary {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem .75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: .9rem;
  color: var(--muted);
}
.summary-ok { color: var(--ok); }
.summary-no-docs { color: var(--muted); }
.summary-failed { color: var(--err); }

.filters {
  max-width: 1200px;
  margin: 0 auto;
  padding: .5rem 1.5rem 1rem;
  display: flex;
  gap: .5rem;
}
.filter {
  padding: .4rem .9rem;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  font-size: .85rem;
  cursor: pointer;
}
.filter.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.grid {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: .5rem;
  text-decoration: none;
  color: inherit;
  transition: transform .12s ease, box-shadow .12s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,.08);
  text-decoration: none;
}
.card-id {
  color: var(--muted);
  font-size: .8rem;
  letter-spacing: .02em;
}
.card-name {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
}
.card-identity {
  font-size: .9rem;
  color: var(--muted);
  margin: 0;
  min-height: 2.5em;
}
.card-version {
  font-size: .85rem;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.card-version.empty { color: var(--muted); }
.card-links {
  margin-top: auto;
  display: flex;
  gap: .75rem;
  font-size: .8rem;
}

.badge {
  display: inline-block;
  padding: .15rem .5rem;
  border-radius: 999px;
  font-size: .75rem;
  font-weight: 500;
}
.badge-failed { background: #fef2f2; color: var(--err); }
.badge-stale { background: #fef3c7; color: var(--warn); }
.badge-no-docs { background: #f3f4f6; color: var(--muted); }

.detail-section {
  max-width: 820px;
  margin: 0 auto;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}
.detail-section h2 { margin-top: 0; }
.detail-section img { max-width: 100%; }

.updates-list { list-style: none; padding: 0; }
.updates-list li { border-top: 1px solid var(--border); padding: 1rem 0; }
.updates-list li:first-child { border-top: none; }
.update-version { font-weight: 600; }
.update-date { color: var(--muted); font-size: .85rem; margin-left: .5rem; }

.app-links {
  list-style: none;
  padding: 0;
  margin: .5rem 0 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: .75rem 1.25rem;
  color: var(--muted);
  font-size: .9rem;
}

.site-footer {
  max-width: 1200px;
  margin: 2rem auto 0;
  padding: 1rem 1.5rem 2rem;
  color: var(--muted);
  font-size: .85rem;
  border-top: 1px solid var(--border);
}

.empty-state {
  color: var(--muted);
  font-style: italic;
}

@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
  .site-header { padding: 1.25rem 1rem .5rem; }
  .summary, .filters, .grid { padding-left: 1rem; padding-right: 1rem; }
}
```

- [ ] **Step 4: Commit**

```bash
git add templates/ public/
git commit -m "feat: add HTML templates and styles"
```

---

## Task 9: 렌더 유틸 + layout 모듈

**Files:**
- Create: `scripts/render/util.mjs`
- Create: `scripts/render/layout.mjs`

- [ ] **Step 1: `scripts/render/util.mjs`**

```javascript
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBuiltAt(iso) {
  if (!iso) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return '—';
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]} KST`;
}

export function daysSince(isoDate, referenceIso) {
  if (!isoDate || !referenceIso) return null;
  const a = new Date(isoDate);
  const b = new Date(referenceIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function categoryFromId(id) {
  return id < 200 ? 'watchface' : 'app';
}

export function detailPath(app) {
  const slug = app.variant ? `${app.id}-${app.variant}` : String(app.id);
  return `app/${slug}.html`;
}
```

- [ ] **Step 2: `scripts/render/layout.mjs`**

```javascript
export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) {
      throw new Error(`Missing template value: ${key}`);
    }
    return values[key] ?? '';
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/render/util.mjs scripts/render/layout.mjs
git commit -m "feat: add render utilities (escape, date format, template fill)"
```

---

## Task 10: `render/index-page.mjs` + `render/detail-page.mjs`

**Files:**
- Create: `scripts/render/index-page.mjs`
- Create: `scripts/render/detail-page.mjs`
- Create: `test/render.test.mjs`

- [ ] **Step 1: 실패하는 스냅샷 테스트 작성**

`test/render.test.mjs`:

```javascript
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
  const { detail } = await loadTemplates();
  // Remove a required field to trigger missing-placeholder error
  const bad = { ...fixture.apps[0] };
  delete bad.name;
  assert.throws(() => renderDetailPage(bad, fixture, detail), /Missing template value/);
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test`
Expected: FAIL — render 함수들이 없음.

- [ ] **Step 3: `scripts/render/index-page.mjs`**

```javascript
import { fillTemplate } from './layout.mjs';
import { escapeHtml, formatBuiltAt, daysSince, categoryFromId, detailPath } from './util.mjs';

function renderBadge(app, builtAt) {
  if (app.fetch_status === 'ok') return '';
  if (app.fetch_status === 'no_docs') {
    return '<span class="badge badge-no-docs">데이터 없음</span>';
  }
  // fetch_failed
  const days = daysSince(app.last_successful_fetch, builtAt);
  if (days == null) {
    return '<span class="badge badge-failed">⚠ 문서 수집 실패</span>';
  }
  return `<span class="badge badge-stale">⚠ ${days}일 전 데이터</span>`;
}

function renderCard(app, builtAt) {
  const versionLine = app.latest_version
    ? `<div class="card-version">${escapeHtml(app.latest_version)} · ${escapeHtml(app.latest_update_date)}</div>`
    : `<div class="card-version empty">버전 정보 없음</div>`;

  return `
<a class="card" href="${detailPath(app)}" data-category="${categoryFromId(app.id)}">
  <span class="card-id">#${escapeHtml(app.id)}${app.variant ? ` · ${escapeHtml(app.variant)}` : ''}</span>
  <h2 class="card-name">${escapeHtml(app.name)}</h2>
  <p class="card-identity">${escapeHtml(app.identity)}</p>
  ${versionLine}
  ${renderBadge(app, builtAt)}
  <div class="card-links">
    <span>🔗 ${escapeHtml(app.landing.replace(/^https?:\/\//, ''))}</span>
    <span>💻 ${escapeHtml(app.repo)}</span>
  </div>
</a>`.trim();
}

export function renderIndexPage(data, template) {
  const cards = data.apps.map(a => renderCard(a, data.built_at)).join('\n');
  return fillTemplate(template, {
    total: escapeHtml(data.stats.total),
    succeeded: escapeHtml(data.stats.succeeded),
    no_docs: escapeHtml(data.stats.no_docs),
    failed: escapeHtml(data.stats.failed),
    built_at_display: escapeHtml(formatBuiltAt(data.built_at)),
    cards,
  });
}
```

- [ ] **Step 4: `scripts/render/detail-page.mjs`**

```javascript
import { fillTemplate } from './layout.mjs';
import { escapeHtml, formatBuiltAt, daysSince } from './util.mjs';

function renderStatusBadge(app, builtAt) {
  if (app.fetch_status === 'ok') return '';
  if (app.fetch_status === 'no_docs') {
    return '<p><span class="badge badge-no-docs">데이터 없음</span></p>';
  }
  const days = daysSince(app.last_successful_fetch, builtAt);
  if (days == null) {
    return '<p><span class="badge badge-failed">⚠ 문서 수집 실패</span></p>';
  }
  return `<p><span class="badge badge-stale">⚠ ${days}일 전 데이터</span></p>`;
}

function renderOverviewBlock(app) {
  if (!app.overview_html) {
    return '<p class="empty-state">데이터 없음</p>';
  }
  return app.overview_html;
}

function renderUpdatesBlock(app) {
  if (!app.updates || app.updates.length === 0) {
    return '<p class="empty-state">데이터 없음</p>';
  }
  const items = app.updates.slice(0, 5).map(u => `
<li>
  <span class="update-version">${escapeHtml(u.version)}</span>
  <span class="update-date">${escapeHtml(u.date)}</span>
  ${u.items_html}
</li>`).join('');
  const more = app.updates.length > 5
    ? `<p class="empty-state"><a href="https://github.com/${escapeHtml(app.repo)}/blob/main/docs/updates.md">전체 업데이트 이력 보기 ↗</a></p>`
    : '';
  return `<ul class="updates-list">${items}</ul>${more}`;
}

export function renderDetailPage(app, data, template) {
  return fillTemplate(template, {
    id: escapeHtml(app.id),
    name: escapeHtml(app.name),
    identity: escapeHtml(app.identity),
    package: escapeHtml(app.package),
    landing: escapeHtml(app.landing),
    repo: escapeHtml(app.repo),
    status_badge: renderStatusBadge(app, data.built_at),
    overview_block: renderOverviewBlock(app),
    updates_block: renderUpdatesBlock(app),
    built_at_display: escapeHtml(formatBuiltAt(data.built_at)),
  });
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: PASS — render 6개 + 이전 테스트 전체.

- [ ] **Step 6: Commit**

```bash
git add scripts/render/ test/render.test.mjs
git commit -m "feat: add index and detail page renderers"
```

---

## Task 11: `render-site.mjs` 엔트리 포인트

**Files:**
- Create: `scripts/render-site.mjs`

- [ ] **Step 1: 구현**

`scripts/render-site.mjs`:

```javascript
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { renderIndexPage } from './render/index-page.mjs';
import { renderDetailPage } from './render/detail-page.mjs';
import { detailPath } from './render/util.mjs';

async function main() {
  const dataRaw = await readFile('data/apps.json', 'utf8');
  const data = JSON.parse(dataRaw);

  const indexTpl = await readFile('templates/index.html', 'utf8');
  const detailTpl = await readFile('templates/app-detail.html', 'utf8');

  await rm('dist', { recursive: true, force: true });
  await mkdir('dist/app', { recursive: true });

  const indexHtml = renderIndexPage(data, indexTpl);
  await writeFile('dist/index.html', indexHtml, 'utf8');

  for (const app of data.apps) {
    const html = renderDetailPage(app, data, detailTpl);
    await writeFile(`dist/${detailPath(app)}`, html, 'utf8');
  }

  await cp('public', 'dist', { recursive: true });

  console.log(`rendered ${data.apps.length} app pages to dist/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: 로컬 빌드 확인**

먼저 `data/apps.json`에 더미 데이터가 필요하다. Task 7에서 만든 빈 skeleton이면 앱이 0개라 index만 생성된다. 더미 2개를 임시로 넣어 동작 확인:

```bash
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('data/apps.json','utf8'));d.built_at='2026-04-23T03:00:00+09:00';d.stats={total:2,succeeded:2,no_docs:0,failed:0};d.apps=[{id:205,name:'Test',identity:'테스트',package:'com.test',landing:'https://watch-go.com/205',repo:'msaltnet/test',overview_html:'<p>hi</p>',updates:[{version:'v1.0.0',date:'2026-04-23',items_html:'<ul><li>x</li></ul>'}],latest_version:'v1.0.0',latest_update_date:'2026-04-23',fetch_status:'ok',last_successful_fetch:'2026-04-23T03:00:00+09:00'}];fs.writeFileSync('data/apps.json',JSON.stringify(d,null,2)+'\n');"
```

Run: `npm run build`
Expected: `dist/index.html`, `dist/app/205.html`, `dist/styles.css` 생성.

브라우저로 `dist/index.html`을 열어 정상 표시 확인.

- [ ] **Step 3: `data/apps.json` 원상 복구**

```bash
git checkout data/apps.json
```

- [ ] **Step 4: Commit**

```bash
git add scripts/render-site.mjs
git commit -m "feat: add render-site entry point"
```

---

## Task 12: GitHub Actions — daily-update 워크플로우

**Files:**
- Create: `.github/workflows/daily-update.yml`

- [ ] **Step 1: 워크플로우 작성**

```yaml
name: Daily Docs Update

on:
  schedule:
    - cron: '0 18 * * *'  # 03:00 KST
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      - name: Fetch app docs
        env:
          DOCS_FETCH_TOKEN: ${{ secrets.DOCS_FETCH_TOKEN }}
        run: node scripts/fetch-docs.mjs

      - name: Commit data/apps.json if changed
        run: |
          if git diff --quiet data/apps.json; then
            echo "No changes to apps.json — skipping commit."
          else
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add data/apps.json
            git commit -m "chore: daily docs update"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/daily-update.yml
git commit -m "ci: add daily docs update workflow"
```

---

## Task 13: GitHub Actions — deploy 워크플로우

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: 워크플로우 작성**

```yaml
name: Deploy to Pages

on:
  push:
    branches: [main]
    paths:
      - 'data/**'
      - 'templates/**'
      - 'scripts/**'
      - 'public/**'
      - 'apps.yml'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run build

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add Pages build and deploy workflow"
```

---

## Task 14: README 작성

**Files:**
- Create: `README.md`

요청의 원래 핵심이었던 README. 프로젝트 개요, 설정, 운영, 수동 테스트 체크리스트를 담는다.

- [ ] **Step 1: `README.md` 작성**

````markdown
# watch-go.com Dashboard

[watch-go.com](https://watch-go.com) 브랜드의 Wear OS / Android 앱 현황을 한눈에 보여주는 개발자 공유용 정적 대시보드입니다.

- 각 앱 repo의 `docs/overview.md`, `docs/updates.md`를 하루 1회 수집
- 공개 정보만 취급 (비밀값 없음)
- GitHub Pages 정적 호스팅

## 구성

```
apps.yml              # 수동 관리 앱 목록 (소스 오브 트루스)
data/apps.json        # 자동 수집된 문서 데이터 (커밋됨)
scripts/              # fetch / render 스크립트
templates/            # HTML 템플릿
public/               # 정적 자산 (CSS)
dist/                 # 빌드 산출물 (배포 대상, gitignore)
.github/workflows/    # Actions
docs/superpowers/     # 설계·구현 플랜 문서
```

## 로컬 개발

### 요구 사항

- Node.js 20 이상 (`.nvmrc` 참고)
- GitHub Fine-grained PAT — 앱 repo의 `Contents: Read-only` 권한

### 초기 설정

```bash
npm install
```

### 환경 변수

```bash
export DOCS_FETCH_TOKEN="ghp_xxx..."   # Fine-grained PAT
```

### 명령어

| 명령 | 동작 |
|---|---|
| `npm run fetch` | 각 앱 repo에서 문서 수집 → `data/apps.json` 갱신 |
| `npm run build` | `data/apps.json` + 템플릿 → `dist/` 생성 |
| `npm test` | 단위·통합 테스트 실행 |

### 로컬에서 사이트 미리보기

```bash
npm run build
npx --yes serve dist
# 또는
python -m http.server --directory dist 8000
```

## 앱 추가·수정

1. `apps.yml`에 엔트리를 추가합니다. 스키마:

   ```yaml
   - id: 209
     name: "새 앱 이름"
     identity: "한 줄 정체성"
     package: "com.watch_go.xxx"
     landing: "https://watch-go.com/209"
     repo: "msaltnet/new-repo"
     # docs_subdir: "sub"  # 선택: 여러 앱이 한 repo를 공유할 때
     # variant: "clean"    # 선택: 같은 id를 구분해야 할 때
   ```

2. **Fine-grained PAT 권한 갱신** — GitHub 설정에서 `DOCS_FETCH_TOKEN` PAT의 repository access 목록에 새 repo를 추가합니다.

3. PR을 만들어 머지합니다. 머지 후 `deploy` 워크플로우가 재빌드합니다. 실제 데이터는 다음 일일 업데이트(03:00 KST)에 채워지거나, Actions 탭에서 "Daily Docs Update" 워크플로우를 수동 실행할 수 있습니다.

## 운영

### 데이터 갱신 주기

- 매일 18:00 UTC (03:00 KST) `Daily Docs Update` 워크플로우 실행
- 변경된 `data/apps.json`만 커밋되며, 커밋 발생 시 `Deploy to Pages`가 자동 실행됨

### 실패·신선도 표시

- 대시보드 요약 바에 `ok / no docs / failed` 카운트 표시
- 각 카드 배지:
  - 성공: 배지 없음
  - `no_docs`: "데이터 없음" (해당 repo에 `docs/overview.md`, `docs/updates.md`가 없음)
  - `fetch_failed`: "⚠ N일 전 데이터" 또는 "⚠ 문서 수집 실패"

### PAT 만료 대응

PAT가 만료되면 모든 앱 fetch가 실패하여 `Daily Docs Update` job이 fail합니다 (기본 이메일 알림). 새 PAT를 발급하고 `Settings → Secrets and variables → Actions → DOCS_FETCH_TOKEN`을 갱신하세요. 이 경우 이전 `data/apps.json`이 그대로 남아 기존 사이트는 계속 표시됩니다.

### 수동 테스트 체크리스트

릴리스 전 다음을 로컬에서 확인:

- [ ] `npm test` 전체 통과
- [ ] `npm run build` 후 `dist/index.html` 브라우저 표시 정상
- [ ] 카드 → 상세 페이지 이동 동작
- [ ] 모바일 폭(375px)에서 그리드 1열로 무너지지 않음
- [ ] 실패 배지 시뮬레이션: `apps.yml`에 존재하지 않는 repo를 추가해 `fetch_failed` 표시 확인

## 시크릿 설정

GitHub repo 설정 → `Settings → Secrets and variables → Actions`에서:

- `DOCS_FETCH_TOKEN` — Fine-grained PAT, 각 앱 repo의 `Contents: Read-only` 권한

## Pages 설정

1. `Settings → Pages → Build and deployment → Source`를 `GitHub Actions`로 설정
2. 첫 `Deploy to Pages` 워크플로우 성공 후 `https://<owner>.github.io/<repo>/` 로 접근 가능

## 문서

- [`docs/superpowers/specs/2026-04-23-watch-go-dashboard-design.md`](docs/superpowers/specs/2026-04-23-watch-go-dashboard-design.md) — 설계 문서
- [`docs/superpowers/plans/2026-04-23-watch-go-dashboard.md`](docs/superpowers/plans/2026-04-23-watch-go-dashboard.md) — 구현 플랜
- [`documentation-guide.md`](documentation-guide.md) — 각 앱 repo의 `docs/` 작성 가이드 (대시보드가 의존하는 포맷)

## 라이선스

사내·개인 프로젝트용. 별도 라이선스 표기 없음.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and operations guide"
```

---

## Task 15: 엔드투엔드 검증

수동 확인 중심. 로컬에서 실제 fetch를 돌려 실제 apps.json이 채워지는지 확인한다.

- [ ] **Step 1: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 파서(11) + merge(5) + fetch-docs(5) + render(6) = 27개 이상 통과.

- [ ] **Step 2: 실제 fetch 동작 (선택, 토큰 필요)**

```bash
export DOCS_FETCH_TOKEN="ghp_xxx"
npm run fetch
```

`data/apps.json`이 실제 데이터로 갱신되는지 확인. 일부 repo는 아직 `docs/` 문서가 없어 `no_docs`, 또는 `docs_subdir` 경로가 틀려 `no_docs`일 수 있음 — 그 경우 해당 repo의 실제 구조에 맞게 `apps.yml`을 수정.

- [ ] **Step 3: 로컬 빌드 → 시각 확인**

```bash
npm run build
python -m http.server --directory dist 8000
# 브라우저에서 http://localhost:8000
```

체크 항목:
- 요약 바 카운트와 실제 카드 수 일치
- 필터 탭 (전체/Watch Face/App) 정상 동작
- 카드 호버 효과
- 모바일 폭 반응형
- 카드 클릭 → 상세 페이지
- 상세 페이지의 소개·업데이트 섹션 표시
- 실패/없음 배지 표시

- [ ] **Step 4: `data/apps.json` 원상 복구 여부 결정**

실제 수집된 `data/apps.json`을 커밋해 둘 것인지 결정:
- **커밋하지 않음 (추천)**: 초기 배포 전까지는 skeleton 유지. 실제 데이터는 Actions가 처음 실행될 때 채움.
- **커밋함**: 초기 Pages 배포부터 데이터가 보이길 원할 때.

```bash
# 원상 복구 시
git checkout data/apps.json
```

- [ ] **Step 5: 최종 Commit (필요시)**

실제 apps.json을 반영하기로 했다면:
```bash
git add data/apps.json
git commit -m "chore: seed initial apps.json from local fetch"
```

- [ ] **Step 6: GitHub 설정 체크리스트**

플랜 실행 후 사람이 수동으로 해야 할 작업:

- [ ] repo → Settings → Secrets → `DOCS_FETCH_TOKEN` 추가 (Fine-grained PAT, 각 앱 repo에 `Contents: Read-only`)
- [ ] repo → Settings → Pages → Source: "GitHub Actions"
- [ ] main branch에 push 후 첫 `Deploy to Pages` 워크플로우 성공 확인
- [ ] Actions 탭에서 `Daily Docs Update`를 수동 실행해 `data/apps.json` 갱신 커밋 발생 확인
- [ ] 결과 사이트(`https://<owner>.github.io/<repo>/`) 방문해 카드 표시 확인
