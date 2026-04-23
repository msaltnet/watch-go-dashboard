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
     # branch: "master"    # 선택: 기본 브랜치가 main이 아닐 때
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
