**최종 갱신: 2026-07-12 17:05 (KST)**

# OPS — 알파맵 운영 가이드

> 初入 Observatory · **운영 SoT = 이 파일(리포 `main`).**
> **짝 문서 = `STYLE_GUIDE.md`(디자인).** 이 리포의 지속 갱신 문서는 **이 둘뿐**이다 — 화면을 어떻게 그리나=STYLE_GUIDE, 정보를 언제·어떻게 갱신하나=OPS.
> `.assetsignore`에 `*.md` → 사이트 미배포·리포 전용.
> 버전: **v3.1** (2문서 체계 확정 · `INFO_SOURCES.md` 흡수 · 6탭 현행화 · 상단 타임스탬프 규칙)
> **문서 맨 위 「최종 갱신」은 연월일+시분(KST). 이 문서를 고치면 그 줄을 반드시 함께 갱신한다.**

---

## 0. 세션 시작 프로토콜 (모든 작업의 0단계)

1. **이 파일 + `STYLE_GUIDE.md`를 `main`에서 재페치**해 읽는다. Project 캐시는 폴백일 뿐 — **충돌하면 라이브 리포가 이긴다.**
2. **기본 브랜치 해소**(하드코딩 금지): `GET /repos/SimpleorNothing/ten-bagger` → `default_branch`. raw 404면 즉시 기본 브랜치로 폴백.
   raw 베이스 = `https://raw.githubusercontent.com/SimpleorNothing/ten-bagger/{기본브랜치}/{파일}?t=$(date +%s)`
3. **분석·브리핑이면** 라이브 JSON 8종 재페치: `gamma`·`cycle`·`signals`·`judgment`·`holdings`·`earnings`·`prices`·`signal_log`. 스테일 캡처 외삽 금지.
4. `signal_log.json`을 먼저 훑는다 — 아카이브가 아니라 **누적 판단 컨텍스트**(어느 층이 싸졌나/비싸졌나).
5. **작업이 끝나면 같은 PR에서 이 문서(및 필요 시 STYLE_GUIDE)를 갱신**한다(§7). 문서 갱신 없는 코드 변경 = 미완료.

---

## 1. 불변 규율 (절대 규칙 — 코드보다 위)

- **narrative ≠ numbers.** 발표·키노트·M&A 논의·뉴스 → `signal_log.json` only. **실적 비트·가이던스 상향·확정 수주만** 단계/실적 파일 변경 트리거.
- **두 시계 분리.** 논제 시계(펀더멘털·EPS 리비전) vs 가격 시계(센티먼트·플로우). 표시도 판단도 섞지 않는다(STYLE_GUIDE §6-4 렌즈 2줄).
- **단계 강등 트리거 = 가격 상승률 vs FY+1/+2 EPS 리비전 속도.** 「많이 올랐다」는 플래그일 뿐 트리거가 아니다. 추정이 더 빨리 오르면 γ open(유지), 가격이 낙관적 추정마저 추월하면 성숙.
- **게이트는 전부 AND.** 하나라도 미충족이면 실행 불가. 매매 권유가 아니라 프레임 도출(`dir=trim/add/hold` · `gate=AND` 선결).
- **첫 눌림 규율(S5).** 이미 크게 오른 종목은 초입이 아니다. 낙하칼(베이스 미확인 급락) 추격 매수 금지.
- **D-1 중립화.** 실적 전날 신규 방향성 포지션 금지(`judgment` wk 중립 유지).
- **`holdings.json`은 실제 체결 후에만 갱신.** 추정 비중 기입 금지.
- **중앙은행 컨센서스는 스테일 외삽 금지.** 회의별 전용 쿼리(로이터/블룸버그 폴·선물·OIS 내재확률). **美 정책금리 = CME FedWatch 단일 SoT**(Polymarket 등은 ECB/韓 보조로만). 알파맵 패널 캡처 수치는 권위값으로 재검증 없이 사용.
- **침묵하는 오류가 유일한 진짜 리스크.** 자동층은 안 틀린다 — **판단층은 방치하면 썩는다.** `judgment.json`의 모든 override는 `why`(조건)에 묶인다 → **조건 소멸 즉시 폐기.**

---

## 2. 데이터 층위 — 자동 2층 vs 판단 2층

| 층 | 파일 | 성격 | 갱신 주체 |
|----|------|------|-----------|
| 시세·차트 | `prices.json` · `charts.json` | 자동 | cron |
| 매크로 신호 | `signals.json` | 자동 | cron |
| 모멘텀 알파 | `alpha.json` | 자동(휴리스틱 + 트래커 Gist) | cron |
| γ · stage | `gamma.json` | **혼합** — g 자동 / stage 수동 | cron + 판단 |
| 실적 크기 | `earnings.json` | **판단** | 운영자/Claude |
| 판단 알파 | `judgment.json` | **판단** | 운영자/Claude |

**병합 순서:** `alpha` → `earnings` → `judgment` (판단이 자동을 덮는다). **γ·stage 단일 소스는 `gamma.json`** — 인라인 `D` 배열·judgment의 g는 폴백.
**운영 원칙: 자동층은 방치하고, 판단층만 적시에 갱신·정리한다.**

---

## 3. 정보 인벤토리 — 메뉴별 무엇을·언제·어디서 (구 INFO_SOURCES)

> 범례 — **자동**: cron 워크플로 or worker 런타임 API · **수동**: 편집→PR→deploy · **혼합**: 자동값 위에 판단이 덮음 · **날짜연동**: 클라가 날짜 기준 자동 표시.
> 메뉴·정보명·소스·주기가 바뀌면 **같은 PR에서 이 절을 갱신**한다(§7).

### 현행 메뉴 (6탭)
`01 시장 모니터링(v-market)` · `02 궁금한 것(v-cycle/v-alpha/v-thread)` · `03 관점과 정보 얻기(insight.js 자가 마운트)` · `04 리밸런싱(v-decision)` · `05 캘린더(v-cal)` · `06 메모(v-memo)`
※ `nav`의 정적 버튼은 5개 + `insight.js`가 03을 주입. `v-port`·`v-tracker`·`v-macro`는 2026-07-11 재편으로 **뷰서 제외·코드 잔존**(데이터는 계속 갱신되어 결정보드가 소비).

### 01 시장 모니터링 (`v-market`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 코스피·S&P·나스닥 지수 | 자동 | 매일 06:37 KST | `charts.json` (`fetch-prices.mjs`, `^KS11·^GSPC·^IXIC` Yahoo 1Y) |
| 미 10년물 금리 | 자동 | 런타임 | worker `/api/us10y` → `history[].markets.ten_year` |
| WTI 유가 | 자동 | 런타임 | worker `/api/wti` (Yahoo upstream) |
| 보유 종목 스파크라인 | 자동 | 매일 06:37 KST | `charts.json` (Yahoo 1Y 일봉 t/c) |
| **카드 렌즈 요약 2줄** (그래프마다 프레임→판정) | 자동(런타임 파생) | gamma·signals 일별 / holdings 주간에 편승 | `gamma.json`(γ·stage·flagged) + `signals.json`(**`window.macroEval` 단일소스 재사용**) + `holdings.json`(layer·평단) + `charts.json` |
| 종목 뉴스 (종목 블록형 + 기사별 **일자 + 두 점**[명사형 요약 `a` / `→` 의미·주가영향 `w`] + 우측 주가 차트) | 자동 | **뉴스·digest 06:12·18:12 (1일 2회)** / 차트 06:37 | `news_digest.json`(claude-sonnet-4-6) + `news.json`(**물질성 m≥1만**) + `charts.json` |
| ↳ 표시 규칙 | — | — | **최근 3개월(92일) 창 · 종목당 최신 5건.** 초과분은 「더 보기」 → `archive/{TK}.json` **온디맨드 로드**(첫 로딩 페이로드 상수 유지) |
| 관련 기사 (매크로 · 토픽 블록형) | 자동 | **06:12·18:12 KST** | `news_digest.json` `macro` + `news.json` `MACRO` (스크리닝 미적용 — 매크로는 축 전체가 관측 대상) |
| ↳ **매크로 축 = 고정 아님·매 실행 자동 발굴** | 자동 | 실행마다 | `discoverMacroTopics()` — 광역 헤드라인 스캔(증시·stock market·economy·BUSINESS) → LLM이 **지금 도는 매크로 축 3개** 선별(금리·지정학·관세·전력·환율·capex 중 서로 다른 축) → 그 검색어로 수집. 실패 시 직전 축 승계 → 시드 폴백. 채택 축 = `news.json` `macroTopics`. **토픽명 하드코딩 금지**(사이트는 `it.name` 사용) |
| ↳ **축 정규화 `ax` — 같은 축은 한 블록** | 자동 | 실행마다 + 런타임 | 발굴이 매 실행이라 같은 축이 다른 이름·id로 들어온다(중동 3종·capex 2종 → 8블록). 키워드 규칙 7종(`capex`·`chip`·`power`·`energy`·`trade`·`rates`·`fx` / 미매칭=정규화 이름)으로 축 키 `ax` 파생 → `fetch-news.mjs`(축 중복 제거 · 직전 id·name 승계 · 5건 슬롯 축별 배정 · digest `macro[].id`=축) + `index.html loadMacroNews()`(축으로 블록 병합 · 링크 중복 제거 · 축당 5건 · 구 데이터도 즉시 병합). **축 키는 병합용 — 표시명은 라이브 `macroTopics[].name`** |

**뉴스 물질성 스크리닝(`items[].m`) — 3층:** ①하드룰(`RE_PR` 홍보·수상·채용 / `RE_SPEC` "Why Is X Falling"류 사후추측·추천 리스트) → ②신규 요약 시 LLM이 `a`·`w`와 함께 `m` 생성 → ③과거분 `scoreLegacy` 백필. `m`=2 논제/펀더멘털 · 1 가격시계 실사건 · 0 노이즈. `news.json`·`archive/{TK}.json`은 **m≥1만 적재**, m=0은 `news_archive.json`에 **전건 보존(삭제 아님)**.
**규율:** 스크리닝은 **표시 대상만** 정한다. 판단·숫자 파일은 건드리지 않는다(narrative≠numbers).

### 02 궁금한 것 (`v-cycle` + `v-alpha` + `v-thread`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 즉답 요약 (전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널) | 혼합 | 런타임 파생 | `gamma`·`holdings`+`TARGETS`·`signal_log` (`renderInstantAnswer`) / 전선·다음재채점만 `IA_CFG` 수동 |
| 반도체 사이클 3차트 (D CAPEX · D₂ 메모리매출 · C DDR5) + 종합 판정 1줄 | 혼합 (E 자동) | E: 런타임 / 나머지: 판단 시 | `cycle.json` + worker `/api/fred` (E군집 = `derive-cycle-e.mjs` 파생). ※ 「현재값·임계값 신호 요약」 표는 2026-07-12 제거 — E·B·A는 차트 없이 `cycVerdict` 램프 집계로만 반영 |
| 주도주 4사분면 | 혼합 | alpha 주1회 + 판단 시 | `alpha` → `earnings` → `judgment` |
| 강물·8레이어 스택·24종목 매트릭스 | 수동 | 콘텐츠 변경 시 | `index.html` 인라인 (`RIVERS`·`C`배열·`CASCADES`) |

### 03 관점과 정보 얻기 (`insight.js` 자가 마운트)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 인테이크 → 선별(claims 체크·narrative clamp) → 반영(채택분만 스트립) | 수동 | 작성 시 | worker `/api/insight`·`/api/insights` (R2) + `insight.js`/`insight.css` |

**규율:** 채택돼도 **숫자는 「반영 대기」**. 파일 변경은 §1 트리거를 통과해야 한다.

### 04 리밸런싱 (`v-decision`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **결정 보드** (자산구성 + 적정밴드 오버레이 + 매크로게이트 + MU γ 3트리거 + 회전/타이밍) | 혼합 | 런타임(holdings 주간 + gamma/signals 일별에 편승) | `#decisionBoard` IIFE — `holdings`+`gamma`+`signals`+`cycle` 재페치 + `TARGETS` |
| 시장 모멘텀 전망 (미/한 레짐) | 자동 | 런타임 | `#momOutlook` — 미: `signals`(40주선·갭·DD·VIX·F&G) / 한: `charts`(삼성 프록시) + `signals`(서킷·사이드카) |
| 방향 확률 추정 (다음주/1달/3개월 P) | 자동 (**추정치·투자권유 아님**) | 런타임 | `#probEst` — GBM: σ 프리셋 · μ 프리셋+`charts` 모멘텀 50:50 블렌드 |
| 매매 타이밍 (매크로 게이트 lamp) | 자동 | 매일 06:37 KST | `signals.json` (VIX·S&P·CNN F&G·나스닥 드로다운·40주선) |
| γ · stage | 혼합 | g 매일 / stage 판단 시 | `gamma.json` (`fetch-gamma.mjs`) |

### 05 캘린더 (`v-cal`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 거시·실적·이벤트 일정 (FOMC·CPI/PCE·금통위·메가이벤트·워치리스트) | 수동(정적) | 콘텐츠 변경 시 (`VIEW_UPDATED`) | `index.html` 인라인 (→ `calendar.json`·`derive-calendar.mjs` 동적화 진행) |
| 실적 D-N 카운트다운·펄스링 | 날짜연동 | 실시간 표시 | `earnings.json` `playbook` (확정=굵게·추정=점선) |

### 06 메모 (`v-memo`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 개인 메모 | 수동 | 작성 시 | localStorage(`alphamap_notes_v1`) + worker `/api/memo` (R2) |

### 보조 데이터 (뷰 미노출·파이프라인 내부)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 시그널 로그 (누적 판단 컨텍스트) | 수동 | 시그널 포착 시 | `signal_log.json` (EOF append) |
| 뉴스 영구 아카이브 (스크리닝 탈락분 포함 전건) | 자동 | **06:12·18:12 KST** | `news_archive.json` — **프루닝 없음·삭제 없음**(단일 진실원천). `news.json`은 여기서 잘라낸 표시 창(95일·종목당 5건) · `.assetsignore` |
| 뉴스 종목별 샤드 (「더 보기」 온디맨드) | 자동 | **06:12·18:12 KST** | `archive/{TICKER}.json` — 3개월 창 **전건**(슬림 d·a·w·t·u). 사이트 배포됨(클릭 시에만 내려감) |
| 시그널 드래프트 (트리아지 후보) | 자동 | 뉴스 후 | `signal_drafts.json` (`derive-drafts.mjs`) |
| CPI (전년비) | 자동 | 갱신 시 | `cpi.json` (FRED via worker `/api/fred`) |
| 호르무즈 물동량 | 자동 | 일별 | worker `/api/hormuz` · `hormuz.json` 폴백 |
| 판단 스냅샷 | 수동 | 판단 갱신 시 | `snapshots.json` (`dumpSnap()` → append) |

### 헤더·배지 타임스탬프

| 표시 | 소스 | 갱신 |
|---|---|---|
| 시세 표시 | `prices.json` asOf | 자동(cron) |
| 정보 표시 | `signal_log` 최신 `at` (`infoAsof()`) | 수동(시그널 기록 시) |
| 정적 뷰 배지(`.updstamp`) | `VIEW_UPDATED` 상수 | **정보가 바뀔 때만** 수동. CSS·문구만 고친 배포에선 건드리지 않는다 |
| 자동 뷰 배지 | 해당 데이터 파일 asOf | 자동 |

### 스크립트 인벤토리 (`scripts/`)
`fetch-prices` · `fetch-news` · `fetch-signals` · `fetch-gamma` · `fetch-cpi` · `fetch-tsla-deliveries` · `compute-alpha` · `derive-cycle-e` · `derive-drafts` · `derive-calendar` · `sync-holdings` · `judgment-diff` · `daily-brief-slack` · `check-docs` · `enable-r2` · `proposed-workflows/`
※ **cron 시각·워크플로 권한·`paths-ignore` 목록은 라이브 `.github/workflows/`가 SoT.** 위 주기는 관측값이며, 어긋나면 라이브가 이긴다.

---

## 4. 갱신 케이던스

**매일** — 손 거의 안 댐. 시세·뉴스·신호는 cron. `news.json`(m≥1)에서 신호만 골라 `signal_log.json`에 기록.
- **뉴스 = 1일 2회(2026-07-12~).** `06:12 KST`(미국 장 마감 반영) · `18:12 KST`(한국 장 마감 반영). 각 세션에 30분 후행 + 1시간 백업 트리거(스케줄러 누락 흡수). **가드 6h < 세션 간격 12h** → 같은 세션의 중복만 스킵되고 두 세션은 각각 실행. `workflow_dispatch`는 가드 우회.
- **LLM 호출 3종·비용 성격이 다르다:** ①매크로 발굴·②다이제스트 = **실행 횟수**에 비례 / ③기사 요약 = **신규 기사 수**에 비례(증분이라 빈도를 올려도 거의 안 늘어난다). 다이제스트는 **신규 0건이면 호출 자체를 스킵**(기존 파일 유지). Sonnet 4.6 $3/$15 per MTok 기준 **1일 2회 ≈ 월 $2.3**(1일 4회 $3.5 · 매시간 $12).
**실적마다** — D-N 플레이북(§5)이 캘린더에서 자동 점등.
**주 1회** — `alpha.json` 자동 재계산(토). `judgment.json` override의 `why` 조건이 아직 살아있는지 점검.
**분기 1회** — 초입 5신호 재채점 · stage 재평가 · `TARGETS` 적정밴드 재산정 · 낡은 실적·판단 일괄 정리 · `judgment.json` 덮기 전 `history/judgment_YYMMDD.json` 스냅샷 → `judgment-diff.mjs`로 사분면 궤적 기록.
**수시** — 큰 실적콜·뉴스 → `signal_log`. 편입·편출 → `D`/`C` 배열. 재료 없는 급등락 → judgment 조건부반전 검토. **실제 체결 → `holdings.json`.**

---

## 5. D-N 실적 플레이북

데이터는 `earnings.json`의 `playbook` 배열(문구 수정은 코드가 아니라 이 파일).

| 시점 | 할 일 |
|---|---|
| **D-7** | 추정 실적일이면 IR 캘린더로 **확정**. `basis:"hist"`면 event-iv 갱신 준비 |
| **D-3** | 옵션 IV로 expected move 갱신(`pct`·`basis`) |
| **D-1** | 프런트 위클리 ATM 스트래들로 최종 확정. **신규 방향성 포지션 금지** |
| **D-Day** | AMC/BMO 확인. judgment wk 중립(≈0) 유지 |
| **D+1** | 실제 방향 확정 → judgment wk 갱신/폐기 · `earnings`에서 제거 · `signal_log` 기록 · stage·5신호 재평가 |

**방향 ≠ 크기:** `earnings.json`=크기(불확실성 폭·번개) / `judgment.json`=방향(알파·점 위치). 곱하지 않는다.

---

## 6. GitHub 운영 (기술 제약 — 위반하면 조용히 깨진다)

### 6-1. 브랜치·PR
- **`main` 직접 push 금지. 변경은 PR로만.** `claude/*` 브랜치 → base `main` → `claude-pr-gate.yml`의 validate → **auto-merge(squash)**.
- PR을 만든 뒤 **게이트가 끝날 때까지 확인하고 머지 여부를 명시 보고**한다("queued"로 끝내지 않는다). 머지 확정 = squash SHA + head 브랜치 삭제.
- **`.github/workflows/` 는 GitHub App 권한 부재로 403** → **운영자 수동 편집**(권한은 바뀔 수 있으니 상태로 취급, 하드코딩 금지).

### 6-2. `index.html`(~550KB) 편집
- **절대 전체 재작성 금지.** 고유 문자열 앵커 기준 부분 치환만. 앵커 `const D=`·`const C=`·`HOLDINGS`·`SIGNAL_LOG`·`TARGETS`는 편집 후에도 보존.
- 대용량은 **`patches/*.b64` 파이프라인** 또는 `present_files` 수동 커밋.

### 6-3. b64 묵시 손상 (반복 관측 — 방어가 유일)
- 증상: **파일 크기는 일치하는데 1~2바이트가 조용히 치환**(CSS 중괄호·한글 1자·b64 문자 1개). 크기 검증은 방어가 안 된다.
- 표준 절차: **미니파이 → b64 → 푸시 → 커밋-SHA 핀 raw로 재페치 → 디코드 후 md5/cmp 왕복 비교.**
- **`base64 -w 76` 래핑을 기본으로 쓴다**(개행은 디코더가 무시 → 공백 삽입형에 내성). 불일치 시 diff 컨텍스트를 바꿔(**`-U1`/`-U2`**) 재생성. **`-U0`은 `git apply`가 거부**(`--unidiff-zero` 필요).
- **손상은 페이로드가 클수록 잦다.** 2026-07-12 관측: pos 4321 `Z→Y`, char 2962, char 6941 — **11KB b64는 3회 연속 손상**. 큰 문서(`*.md`)는 **패치 대신 파일 직접 푸시 + raw md5 대조**가 낫다(코드는 apply 실패로 드러나지만, 문서는 조용히 깨진다).
- **손상 패치는 즉시 v2로 덮거나 삭제한다** — `patches/`에 남으면 apply가 계속 실패(파이프라인 스톨).
- **stale base 방지:** 패치 직전 대상 파일을 **다시 페치**해서 diff 생성. 성공 신호 = `.b64`가 `patches/applied/`로 이동 + HEAD가 `chore: apply` 커밋으로 전진 + **신규 엔트리 고유 문자열**이 라이브에 존재(`asOf` 같은 공유 필드로 확인하지 말 것).
- CDN은 apply 후 30~60초+ 지연 → **브랜치 HEAD raw가 아니라 커밋-SHA 핀 raw**로 검증.

### 6-4. 배포·노출
- push → `deploy.yml` 자동 wrangler. `paths-ignore` 대상(뉴스·시세류)만 커밋해도 배포는 안 뜬다 — **라이브 워크플로에서 목록 확인.**
- `.assetsignore` = 사이트 미노출·리포 전용: `*.md`(이 문서 포함)·`scripts/`·`history/`·`.github/`·`worker.js`·`wrangler.jsonc`·`signal_drafts.json`·`news_archive.json`.

### 6-5. 데이터 접근 패턴
- `prices.json`: `quotes` 키 → **소문자 티커**(mu, mrvl…). `charts.json`: 한국 종목 별칭(sec·sem·ddk·twng).
- `signal_log.json`: `log` 배열. **EOF 앵커 raw-text append**(전체 재직렬화 금지 — 기존 엔트리 리포맷으로 diff 노이즈). 1-space 그룹 · 2-space 키 들여쓰기.
- 페치: `curl -sL {raw} -o {file}` → python3로 **저장 후 파싱**(파이프 `head -c`는 UTF-8 분할 위험).

---

## 7. 문서 자기갱신 규칙 (이 체계의 핵심)

**작업이 끝날 때마다, 같은 PR에서 아래 매핑대로 문서를 갱신한다.** 문서 갱신 없는 코드 변경은 미완료로 간주한다.

| 무엇이 바뀌면 | 어느 문서를 | 어떻게 |
|---|---|---|
| CSS 토큰·팔레트·폰트 | `STYLE_GUIDE.md` | `node scripts/check-docs.mjs --fix` (토큰 구역은 자동 생성 — 손대지 않는다) + 이력 1줄 |
| 컴포넌트·레이아웃·신규 뷰 | `STYLE_GUIDE.md` | §4·§6 관행 갱신, 필요 시 §7 체크리스트 보완 + 이력 1줄 |
| 메뉴 구성·정보명·데이터 소스·주기 | `OPS.md` §3 | 해당 행 수정 + 이력 1줄 |
| 워크플로·스크립트·파이프라인·권한 | `OPS.md` §6 | 관측값 갱신(단, cron·권한은 **라이브가 SoT**임을 유지) |
| 게이트·규율·프레임 변경 | `OPS.md` §1 | 규율 갱신 + 이력 1줄. **지시문(Project)도 함께 손봐야 하는지 판단** |
| 미해결 이슈 발생·해소 | `OPS.md` §8 | 항목 추가/취소선 처리 |
| **무엇이든 문서를 고쳤으면** | **두 문서 각각 맨 위** | **「최종 갱신: YYYY-MM-DD HH:MM (KST)」 갱신 (연월일시분)** |

- **문서 맨 위 「최종 갱신: YYYY-MM-DD HH:MM (KST)」을 매번 갱신한다.** 이력 1줄만 남기고 상단 타임스탬프를 안 고치면 문서가 언제 것인지 알 수 없다 — 미완료로 간주.
- **UI/CSS를 건드린 PR은 `node scripts/check-docs.mjs` 통과 필수.** 실패 → `--fix` → 이력 1줄.
- 이력은 **한 줄, 무엇을 왜**. 장문 회고 금지(문서가 로그로 변질되면 아무도 안 읽는다).
- `INFO_SOURCES.md`는 **이 문서 §3으로 흡수·삭제**(2026-07-12). 어디선가 참조가 남아 있으면 §3으로 돌린다.

---

## 8. 알려진 이슈 · 예정 작업

1. **watching list 미구현** — 뉴스 행 버튼 → watching 추가(worker `/api/watching` R2 + 02 리스트). **다음 대기 작업.**
2. **`.github/workflows/` 편집 403** — 신규 워크플로(예: `update-drafts.yml`)·env·커밋 대상 추가는 **운영자 수동**. `scripts/proposed-workflows/`에 제안본을 둔다.
3. **b64 전사 손상 재발 위험** — §6-3 절차(**`base64 -w 76` 래핑** + 커밋SHA핀 디코드 md5 왕복)를 예외 없이 적용. **2026-07-12 하루에만 4건 재발**(11KB 페이로드는 3연속). 대용량 문서는 직접 푸시로 우회.
4. **뉴스 파이프라인 변경은 다음 cron(06:12/18:12)부터 데이터에 반영** — 즉시 반영하려면 Actions에서 `Update news feed` 수동 dispatch(가드 우회). 코드가 먼저 나가고 데이터가 늦으면 **화면이 옛 스키마로 보인다**(2026-07-12 실측: 워크플로 실행이 패치와 경합해 구 프롬프트 산출).
5. **Google News RSS 503 스로틀링** — 2026-07-12 전 피드 503(러너 IP 차단 추정). `fetchFeed`에 지수 백오프 3회 적용. 재발 시 **신규 수집만** 멈추고 기존 요약·표시는 유지. 상시화되면 **RSS 소스 교체**(IR·뉴스와이어 피드 또는 유료 API).
6. **다이제스트 증분 게이트의 사각** — 신규 기사 0건이면 다이제스트를 스킵하므로, **RSS가 며칠 죽으면 `headline`·`macro`가 낡은 채 고정**된다. 필요 시 「신규 0건이어도 N시간 이상 낡으면 강제 재생성」 OR 조건 추가(+월 $1.5).
7. **캘린더 동적화** — `calendar.json`·`derive-calendar.mjs` 진행 중. 완료 시 §3의 05 행을 「수동(정적)」→「혼합」으로 갱신.

---

## 갱신 이력

- 2026-07-12 17:05 · **worker Anthropic 프록시 오류 가시화** — `/api/insight`·`/api/estimate`가 실패 시 무조건 "anthropic api failed"만 반환해 원인(크레딧·키·모델·레이트리밋·과부하) 판별 불가였음. `describeAnthropicError`로 상태코드·타입을 파싱해 조치 안내 붙인 한국어 메시지로 접어 넣음(프론트는 `error`만 표시). 03 관점 뽑기 실패 진단 가능.
- 2026-07-12 16:20 · **매크로 토픽 축 정규화(`ax`)** — 매 실행 발굴로 같은 축이 다른 이름·id로 들어와 「관련 기사」가 8블록으로 쪼개짐. 파이프라인·렌더를 축 키 기준으로 통일 → **8→5블록**.
- 2026-07-12 13:40 · **뉴스 1일 2회 전환**(06:12 미국 장 마감 / 18:12 한국 장 마감) · 기사 표시를 「일자 + 두 점(명사형 요약 / → 의미·주가영향)」으로 · 3개월 창·종목당 5건 + 「더 보기」 샤드 온디맨드 · **영구 아카이브**(`news_archive.json` 무삭제) · **매크로 축 고정 폐기 → 트렌딩 자동 발굴** · 다이제스트 중복 필드(s·b·arts) 제거 + 신규 0건 시 호출 스킵(월 비용 −40%).
- 2026-07-12 13:27 · 05 반도체 사이클에서 「현재값·임계값 신호 요약」 표 제거(마크업 + `table()` 렌더러 + `paint()` 호출) — 3차트 + 종합 판정 1줄로 압축. §3 02 행 갱신.
- 2026-07-12 13:05 · v3.1 — 문서 맨 위에 **연월일시분(KST) 최종 갱신 타임스탬프** 도입 + §7에 갱신 의무 명문화(STYLE_GUIDE 동일 적용).
- 2026-07-12 · **v3 — 2문서 체계 확정.** 지속 갱신 문서를 **`STYLE_GUIDE.md`(디자인) + `OPS.md`(운영)** 둘로 고정. `INFO_SOURCES.md`를 §3 「정보 인벤토리」로 **흡수·삭제**. 6월 구조(구 6탭 메뉴·`claude/wizardly-rubin-SubA1` 배포 브랜치·구 아키텍처 불변식)로 스테일했던 본문을 **현행 6탭**(01 시장 모니터링 / 02 궁금한 것 / 03 관점과 정보 얻기 / 04 리밸런싱 / 05 캘린더 / 06 메모)으로 전면 재작성. §0 세션 시작 프로토콜 · §1 불변 규율 · §6 GitHub 운영(PR-only·b64 손상 방어) · §7 **문서 자기갱신 매핑표** 신설.
- 2026-07-12 · 뉴스 물질성 스크리닝(`items[].m`) 도입 — 하드룰+LLM+백필 3층, m≥1만 표시·m=0은 `news_archive.json` 전건 보존.
- 2026-07-12 · 01 카드 렌즈 2줄 신설 + 게이트 판정 단일소스화(`window.macroEval`).
- 2026-07-12 · 03 관점과 정보 얻기 신설(worker `/api/insight` + `insight.js` 자가 마운트).
- 2026-07-11 · 02 답-먼저 재편(즉답 요약) · 03 리밸런싱 결정보드/모멘텀 전망/방향 확률 신설 · 01 시장 모니터링 Phase 2a~2g.
