# ten-bagger — 알파맵(Alpha Map)

> **AI 인프라 투자 관측소.** 포트폴리오를 AI 인프라 8레이어에 ~80% 집중 운용하는 구조화된 관측소 웹앱.
> 배포: **[simpleornothing.com](https://simpleornothing.com)** (Cloudflare Workers 단일 파일 앱)

이 문서는 리포 **개요·길잡이**다. 실제 운영·디자인의 단일 진실원천(SoT)은 아래 두 문서이며, 충돌하면 **라이브 리포가 이긴다.**

| 문서 | SoT 범위 | 언제 읽나 |
|---|---|---|
| **[`OPS.md`](./OPS.md)** | 운영 — 세션 시작 프로토콜·불변 규율·정보 인벤토리(메뉴별 소스·주기)·케이던스·GitHub 파이프라인·자기갱신 매핑표 | 모든 분석·데이터·운영 작업 전 |
| **[`STYLE_GUIDE.md`](./STYLE_GUIDE.md)** | 디자인 — 토큰(자동 생성)·해도 레이어·컴포넌트 관행·「01 시장 모니터링 = 레퍼런스 구현」 | UI/CSS/신규 메뉴 작업 전 |
| [`CLAUDE.md`](./CLAUDE.md) | 위 둘을 가리키는 얇은 작업 규칙 포인터 | 리포 작업 시 |

---

## 무엇인가

알파맵은 하이퍼스케일러 capex를 상류 수요로 삼는 **AI 인프라 8레이어 스택**을 관측하고, 밸류에이션(γ)·사이클 단계·매크로 게이트를 한 화면에서 추적하는 대시보드다.

**8레이어 스택:** L1 모델/SW → L2 컴퓨트 → L3 메모리 → L4 패키징/장비 → L5 서버 → L6 옵티컬 → L7 전력/냉각 → L8 발전/그리드. 상류 수요 = 하이퍼스케일러 capex, 정점 = NVIDIA.

**핵심 프레임:** 논제 시계(펀더멘털·EPS 리비전)와 가격 시계(센티먼트)를 분리하고, 모든 실행은 **게이트 AND**(매크로 3중 AND + 종목별 락)를 선결로 한다. 상세는 `OPS.md` §1·§4.

---

## 아키텍처

```
브라우저 ──▶ Cloudflare Workers (worker.js) ──▶ 정적 에셋(index.html + *.json + *.js/css)
                     │
                     ├─ 패스워드 게이트 (run_worker_first=true → .json 데이터도 보호)
                     ├─ /api/* 런타임 프록시 (us10y·wti 등)
                     └─ R2 (MEMO_BUCKET) — 메모 저장, 없으면 localStorage로 graceful degrade
```

- **프론트:** `index.html` — 약 550KB 단일 파일 SPA. 6탭 런타임 렌더(`01 시장 모니터링` · `02 궁금한 것` · `03 관점과 정보 얻기` · `04 전문가 원탁` · `05 리밸런싱` · `06 메모`). 보조 모듈: `insight.js/css`, `council-sot.js`, `changelog.js`, `hover-chart.js`, `flags.js`, `hmz.js` 등.
- **데이터(JSON):** 자동 2층(시세·매크로 신호·모멘텀 알파) + 판단 2층(γ·stage·실적 크기·판단 알파). **γ·stage 단일 소스 = `gamma.json`.** 층위·병합 순서는 `OPS.md` §2.
- **백엔드:** `worker.js` (Cloudflare Workers) · 설정 `wrangler.jsonc`.
- **배포 안 되는 것:** `.assetsignore`에 `*.md` → 마크다운 문서는 **리포 전용**(사이트 미배포).

---

## 데이터 파이프라인 (cron)

`scripts/*.mjs`를 `.github/workflows/*.yml` 크론이 주기 실행 → 산출 JSON을 커밋 → 사이트 반영. 대표 파이프라인:

| 영역 | 스크립트 | 워크플로 | 산출 |
|---|---|---|---|
| 시세·차트 | `fetch-prices.mjs` | `update-prices.yml` | `prices.json` · `charts.json` |
| 뉴스·digest | `fetch-news.mjs` · `news-screen.mjs` | `update-news.yml` | `news.json` · `news_digest.json` |
| 매크로 신호 | `fetch-signals.mjs` | `update-signals.yml` | `signals.json` |
| γ · stage | `fetch-gamma.mjs` | (게이트/판단) | `gamma.json` |
| 모멘텀 알파 | `compute-alpha.mjs` | `compute-alpha.yml` | `alpha.json` |
| 사이클 | `derive-cycle-e.mjs` | `weekly-cycle-refresh.yml` | `cycle.json` |
| 보유 동기화 | `sync-holdings.mjs` | `sync-holdings.yml` | `holdings.json` |
| 캘린더·CPI·펄스·TSLA | `derive-calendar` · `fetch-cpi` · `fetch-pulse` · `fetch-tsla-deliveries` | 각 `*.yml` | `calendar`·`cpi`·`pulse` 등 |

> 정확한 주기·소스·표시 규칙은 **`OPS.md` §3 정보 인벤토리**가 SoT다. 이 표는 개요일 뿐 — 크론 시각 등 라이브 상태값은 워크플로 파일과 OPS를 따른다.

---

## 개발·배포 규율

**main 직접 push 금지 — 변경은 PR로만.**

1. `main`에서 `claude/*` 브랜치로 분기.
2. 커밋·푸시 후 PR 생성 (base = `main`).
3. `.github/workflows/claude-pr-gate.yml` 이 validate → 통과 시 **auto-merge(squash)** + 브랜치 삭제.

주의사항:

- **`index.html` 전체 재작성 금지** — 고유 문자열 앵커 기준 부분 치환만. 핵심 앵커(`const D=`·`const C=`·`HOLDINGS`·`SIGNAL_LOG`·`TARGETS`)는 편집 후 보존. 대용량은 `patches/*.b64`(미니파이 + `base64 -w0` + 커밋SHA핀 raw 디코드 md5 왕복 검증). **크기 일치는 무결성 보증이 아니다.**
- **UI/CSS 변경 PR은 `node scripts/check-docs.mjs` 통과 필수.** `STYLE_GUIDE.md`의 `TOKENS:BEGIN~END`는 자동 생성 구역 — 손대지 말고 `--fix`.
- **`.github/workflows/` 편집은 App 권한 부재로 403 → 운영자 수동.**
- **문서 갱신 없는 코드 변경은 미완료.** 무엇을 바꾸면 어디를 고치는지는 `OPS.md` §7 매핑표.

로컬 실행(선택): `npx wrangler dev` — 자세한 배포는 `deploy.yml` / `wrangler.jsonc` 참고.

---

## 디렉터리

```
index.html            # 550KB 단일 파일 SPA (앵커 기준 부분 치환만)
worker.js             # Cloudflare Workers 엔트리 (패스워드 게이트 · /api · R2)
wrangler.jsonc        # Workers 배포 설정
*.json                # 라이브 데이터 (gamma·signals·holdings·prices·news …)
*.js / *.css          # 프론트 보조 모듈
scripts/*.mjs         # 데이터 파이프라인 · check-docs 드리프트 가드
.github/workflows/    # 크론 · PR 게이트 · 배포
patches/              # index.html 대용량 패치 (*.b64)
archive/ history/ notes/  # 아카이브 · 과거 스냅샷 · 메모
OPS.md STYLE_GUIDE.md CLAUDE.md  # 문서 (사이트 미배포)
```

---

*이 README는 개요·길잡이다. 운영·디자인의 진실원천은 `OPS.md`·`STYLE_GUIDE.md`이며, 지시문·캐시본과 충돌하면 **라이브 리포가 이긴다.***
