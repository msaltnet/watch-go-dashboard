# watch-go.com Dashboard — 설계 문서

**작성일:** 2026-04-23
**상태:** 설계 승인 대기

## 1. 목적

watch-go.com 브랜드의 Wear OS / Android 앱 현황을 한눈에 볼 수 있는 개발자 공유용 정적 대시보드. 각 앱 repo의 공개 문서를 하루 1회 수집해 카드 목록과 앱별 상세 페이지로 표시한다.

- **공개 정보만 취급** — 비밀값 없음. 앱 소개(`overview.md`)와 사용자용 릴리스 노트(`updates.md`)만 사용.
- **배포:** GitHub Pages (정적 호스팅).
- **갱신:** GitHub Actions가 매일 1회 자동 실행.

## 2. 범위

### 포함
- 앱 카탈로그 (이름, 번호, 한 줄 정체성, 패키지명, 랜딩 페이지, repo)
- 앱별 `overview.md` 렌더링 (상세 페이지)
- 앱별 `updates.md` 최신 버전 요약 (카드) 및 최근 5개 버전 (상세)
- 데이터 수집 성공/실패 상태 및 신선도 배지
- 빌드 시각·성공/실패 통계 푸터

### 제외 (YAGNI)
- Play Store 스크래핑 (버전/평점/다운로드)
- 실시간 API 호출
- 사용자 로그인/관리 기능
- `faq.md`, `user-guide.md`, `store-description.md`, `changelog.md` 표시 (대시보드 목적 외)
- 검색 기능 (17개 앱 규모에서 불필요)

## 3. 아키텍처

```
[각 앱 repo]                 [이 repo]                        [GitHub Pages]
 docs/overview.md                                              watch-go-dashboard
 docs/updates.md   ──────▶  Actions (daily 03:00 KST)
                             │
                             ├─ fetch-docs.mjs ──▶ data/apps.json (커밋)
                             │
                             └─ render-site.mjs ─▶ dist/ ──────▶ GitHub Pages 배포
```

**핵심 결정:**
- **JSON 중간 산출물을 repo에 커밋.** fetch 실패해도 이전 데이터로 사이트 유지 + 변경 사항이 git diff로 검증 가능.
- **소스 오브 트루스는 `apps.yml`** (현재 `watch-go-com.md`의 앱 테이블을 기계 가독 형태로). 앱 추가·수정은 이 파일만 건드린다.
- **fetch와 render 스크립트 분리.** fetch가 실패해도 render는 독립적으로 가능. 템플릿/스타일 수정 시 데이터 재수집 없이 배포.

## 4. 데이터 모델

### 4.1 `apps.yml` (수동 관리, repo 루트)

```yaml
apps:
  - id: 100
    name: "My Photo Watch Face: watch-go"
    identity: "내 사진을 워치페이스로 — 손목 위에 나만의 얼굴을"
    package: "com.watch_go.myphotowatchface"
    landing: "https://watch-go.com/100"
    repo: "msaltnet/MyPhotoWatchFace"
    # docs_subdir: 선택 — 지정 시 docs/<subdir>/overview.md 경로 사용
  - id: 102
    name: "My Photo Watch Face: Clean"
    # ...
    repo: "msaltnet/wff-watch-face"
    docs_subdir: "clean"
```

**경로 규약:**
- 기본: `docs/overview.md`, `docs/updates.md`
- `docs_subdir: "clean"` 지정 시: `docs/clean/overview.md`, `docs/clean/updates.md`

`wff-watch-face`처럼 여러 앱이 한 repo를 공유하는 경우 `docs_subdir`로 구분한다. 현재 documentation-guide.md는 "`docs/` 루트에 평면 배치"를 기본으로 하므로, multi-app repo는 예외적으로 하위 디렉토리 구조를 사용한다 (해당 repo의 문서 구성 시 이 점을 반영해야 함).

### 4.2 `data/apps.json` (자동 생성, 커밋됨)

```json
{
  "built_at": "2026-04-23T03:00:00+09:00",
  "stats": { "total": 17, "succeeded": 16, "failed": 1 },
  "apps": [
    {
      "id": 100,
      "name": "My Photo Watch Face: watch-go",
      "identity": "내 사진을 워치페이스로 — 손목 위에 나만의 얼굴을",
      "package": "com.watch_go.myphotowatchface",
      "landing": "https://watch-go.com/100",
      "repo": "msaltnet/MyPhotoWatchFace",
      "overview_html": "<h2>소개</h2>…",
      "updates": [
        {
          "version": "v7.0.0",
          "date": "2026-04-23",
          "items_html": "<ul><li>…</li></ul>"
        }
      ],
      "latest_version": "v7.0.0",
      "latest_update_date": "2026-04-23",
      "fetch_status": "ok",
      "last_successful_fetch": "2026-04-23T03:00:00+09:00"
    }
  ]
}
```

**`fetch_status` 값:**
- `ok` — 두 파일 모두 성공
- `no_docs` — 두 파일 중 하나 이상 404 (repo는 접근 가능하나 문서가 없음)
- `fetch_failed` — 네트워크/권한 오류. 이 경우 이전 JSON의 해당 앱 엔트리를 그대로 유지하고 status만 덮어쓴다.

## 5. 페이지 구성

### 5.1 `/index.html` — 대시보드

- **헤더:** "watch-go.com Dashboard" + 브랜드 슬로건
- **요약 바:** `총 17개 앱 · 마지막 업데이트 2026-04-23 03:00 KST · 16 ok · 1 failed`
- **필터 탭:** Watch Face (100번대) / App (200번대) / All — 앱 번호 기반 자동 분류
- **앱 그리드:** 반응형 카드 목록 (3~4열, 모바일 1열)

**카드 구조:**
```
#205  Pomodoro Timer: Focus & Study
손목 위에서 집중력을 키우는 뽀모도로 타이머

v2.3.0 · 2026-04-18
🔗 watch-go.com/205   💻 repo
```

카드 클릭 → 상세 페이지.

**상태별 배지:**
- `ok` — 배지 없음, 버전·날짜 표시
- `no_docs` — 회색 "데이터 없음" 배지, 버전 영역 빈칸
- `fetch_failed` — 주황 "⚠ N일 전 데이터" 배지 (`last_successful_fetch` 기준)
- 첫 수집이 아예 없었다면 "⚠ 문서 수집 실패" 배지

### 5.2 `/app/<id>.html` — 앱 상세

- **상단:** 이름, 번호, identity, 패키지명, 랜딩/repo 링크
- **소개 섹션:** `overview_html` 렌더링. 없으면 "데이터 없음" 안내.
- **업데이트 섹션:** 최신 5개 버전만. 더 보려면 repo의 `docs/updates.md` 링크 안내.
- **빈 상태 처리:** 각 섹션 독립적으로 "데이터 없음" 표시.

### 5.3 라우팅
- 모든 페이지는 빌드 시점에 생성된 정적 HTML.
- `dist/app/100.html`, `dist/app/102.html`, … 각 앱마다 1개 파일.
- 같은 repo + `docs_subdir`를 공유하는 102 변형들(Clean/Thin/Cute)은 상세 페이지 3개가 각각 생성되지만, overview/updates는 동일 소스를 참조한다.

## 6. 빌드 파이프라인

### 6.1 기술 스택
- **Node.js** (Actions 기본 제공)
- **marked** — 마크다운 → HTML 변환
- **DOMPurify** (jsdom과 함께) — 서버 사이드 sanitize
- **yaml** — `apps.yml` 파싱
- **의존성은 최소로.** 템플릿 엔진 없이 단순 문자열 치환 (2페이지 정적 사이트 규모).
- **스타일:** 단일 `styles.css` (CDN·빌드 의존성 없음).

### 6.2 디렉토리 구조

```
.
├── apps.yml                  # 수동 관리 앱 목록
├── data/
│   └── apps.json             # fetch 결과 (커밋됨)
├── scripts/
│   ├── fetch-docs.mjs        # 문서 수집 + JSON 생성
│   ├── render-site.mjs       # JSON + 템플릿 → dist/
│   ├── parsers/
│   │   ├── updates.mjs       # updates.md 파서
│   │   └── overview.mjs      # overview.md → sanitized HTML
│   └── merge.mjs             # 실패 시 이전 데이터 병합
├── templates/
│   ├── layout.html           # 공통 헤더/푸터
│   ├── index.html            # 대시보드 템플릿
│   └── app-detail.html       # 상세 페이지 템플릿
├── public/
│   ├── styles.css
│   └── assets/               # 필요 시 아이콘 등
├── test/                     # node:test 테스트
├── dist/                     # 빌드 산출물 (gitignore, gh-pages 배포 대상)
├── package.json
└── .github/
    └── workflows/
        ├── daily-update.yml
        └── deploy.yml
```

### 6.3 `fetch-docs.mjs` 동작

1. `apps.yml` 로드.
2. 환경변수 `DOCS_FETCH_TOKEN` 확인. 없으면 명확한 에러로 종료.
3. 각 앱에 대해 GitHub Contents API (`GET /repos/{owner}/{repo}/contents/{path}`)로 두 파일 fetch. `docs_subdir` 있으면 `docs/<subdir>/…` 경로.
4. `updates.md` 파싱 — `## v... — YYYY-MM-DD` 헤더로 버전 분리.
5. `overview.md`는 marked로 HTML 변환 후 DOMPurify로 sanitize. 상대 이미지 경로는 repo raw URL로 재작성.
6. 실패한 앱은 이전 `data/apps.json`에서 엔트리 유지 + `fetch_status: fetch_failed` + 기존 `last_successful_fetch` 보존.
7. `stats.succeeded === 0`이면 **exception throw** → Actions job fail (전체 실패 시 이전 데이터 덮어쓰기 금지).
8. `built_at` = KST ISO 문자열, `stats` 계산 후 `data/apps.json` 쓰기.

### 6.4 `render-site.mjs` 동작

1. `data/apps.json` 로드.
2. `dist/index.html` 생성 (카드 그리드).
3. 각 앱마다 `dist/app/<id>.html` 생성.
4. `public/` → `dist/` 복사.
5. 렌더 중 undefined/누락 필드가 있으면 exception으로 빌드 실패 (부분 배포 금지).

### 6.5 GitHub Actions 워크플로우

**`.github/workflows/daily-update.yml`** — 데이터 갱신
- 트리거: `schedule: cron: '0 18 * * *'` (UTC 18:00 = KST 03:00) + `workflow_dispatch`
- 권한: `contents: write` (JSON 커밋 용)
- 스텝:
  1. checkout
  2. setup-node
  3. `npm ci`
  4. `node scripts/fetch-docs.mjs` (env: `DOCS_FETCH_TOKEN`)
  5. `data/apps.json` 변경 시 커밋·푸시 ("chore: daily docs update")

**`.github/workflows/deploy.yml`** — 빌드·배포
- 트리거: `push` to main (paths: `data/**`, `templates/**`, `scripts/**`, `public/**`, `apps.yml`) + `workflow_dispatch`
- 권한: `pages: write`, `id-token: write`
- 스텝:
  1. checkout
  2. setup-node
  3. `npm ci`
  4. `npm test`
  5. `node scripts/render-site.mjs`
  6. `actions/configure-pages`
  7. `actions/upload-pages-artifact` (path: `dist`)
  8. `actions/deploy-pages`

**두 워크플로우 분리 이유:**
- 데이터만 갱신하는 일일 작업과 템플릿·스타일 배포를 구분.
- 템플릿 수정 시 fetch를 건너뛰고 즉시 배포 가능.
- `daily-update`가 JSON을 커밋하면 push 트리거로 `deploy`가 자동 체이닝된다.

### 6.6 인증 (Fine-grained PAT)

- **토큰 타입:** GitHub Fine-grained PAT
- **권한:** `Contents: Read-only`
- **대상 repo:** `apps.yml`에 나열된 모든 앱 repo
- **Secret 이름:** `DOCS_FETCH_TOKEN`
- **만료 관리:** PAT 만료 시 전체 앱 fetch 실패 → Actions job fail → 기본 이메일 알림
- **apps.yml에 repo 추가 시:** PAT 권한 목록에도 해당 repo 추가 필요 → README 체크리스트로 안내

## 7. 오류 처리

| 케이스 | 감지 | 동작 | 카드 표시 |
|---|---|---|---|
| 권한 부족 (private + 토큰 누락) | HTTP 403/404 | 해당 앱 `fetch_failed`, 이전 데이터 유지 | ⚠ "N일 전 데이터" |
| 파일 없음 | HTTP 404 (두 파일 중 일부) | 해당 필드 null, 다른 필드는 정상 처리 | 섹션별 "데이터 없음" |
| 포맷 불일치 | 파싱 결과 0개 | 해당 파일만 parse 실패, 경고 로그 | "업데이트 정보 없음" |
| 네트워크/레이트 리밋 | HTTP 5xx, 429 | 3회 지수 백오프 재시도, 그래도 실패면 이전 데이터 유지 | 상태 유지 |
| 토큰 만료 | 모든 앱 401 | 전체 실패 → Actions job fail, JSON 커밋 스킵 | 기존 사이트 그대로 |
| 전체 앱 실패 (`succeeded === 0`) | fetch 결과 | Actions job fail, JSON 덮어쓰기 금지 | 기존 사이트 그대로 |

**보안:**
- `overview_html`, `updates.items_html`은 marked 출력에 DOMPurify sanitize 적용.
- `apps.yml` 값(`name`, `identity` 등)은 템플릿에 삽입 시 HTML 이스케이프.
- 시간은 UTC로 저장, 표시 시 KST로 변환.

## 8. 테스트 전략

### 8.1 단위 테스트 (`node:test`)
- `parsers/updates.mjs`
  - 정상 포맷 → 버전 배열
  - 헤더 없는 입력 → 빈 배열
  - 날짜 누락 헤더 → skip + 경고
  - 여러 버전 → 역순 정렬 (최신 상단)
- `parsers/overview.mjs`
  - `<script>` 태그 제거
  - 상대 이미지 경로를 repo raw URL로 재작성
- `merge.mjs`
  - 일부 실패 → 실패한 앱만 이전 JSON에서 가져옴
  - `last_successful_fetch` 유지
  - 전체 실패 → exception

### 8.2 통합 테스트
- `fetch-docs.mjs` — fetch 함수 주입으로 GitHub API mock
  - 정상 응답 → JSON 생성
  - 404 → `no_docs`/`fetch_failed` 분기
  - 429 → 재시도 후 성공
  - 토큰 없음 → 명확한 에러
- `render-site.mjs` — 고정 입력 JSON → dist 결과 스냅샷 (대표 앱 2~3개)

### 8.3 수동 테스트 체크리스트 (README)
- `npm run build` → `dist/index.html` 브라우저 확인
- 카드 → 상세 페이지 이동
- 모바일 폭(375px)
- 실패 배지 표시 (apps.yml에 가짜 repo 추가로 시뮬레이션)

### 8.4 CI
- `deploy.yml`에 `npm test` 스텝 포함, 실패 시 배포 중단.
- `daily-update.yml`에는 테스트 생략 (코드 변경 없으므로).

### 8.5 생략
- E2E (Playwright) — 과함
- 시각 회귀 테스트 — 초기 버전 불필요
- act 등 Actions 로컬 실행 — 복잡도 대비 이득 적음

## 9. 향후 고려 (구현 제외)

- `changelog.md` 기반 개발자 전용 상세 뷰
- `store-description.md`에서 스크린샷 추출해 카드 썸네일로 사용
- 앱별 GitHub stars/이슈 수 배지
- 다국어 (영어) 토글
