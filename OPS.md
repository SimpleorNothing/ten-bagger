**최종 갱신: 2026-07-20 16:20 (KST)**

# OPS — 알파맵 운영 가이드

> 初入 Observatory · **운영 SoT = 이 파일(리포 `main`).**
> **짝 문서 = `STYLE_GUIDE.md`(디자인).** 이 리포의 지속 갱신 문서는 **이 둘뿐**이다 — 화면을 어떻게 그리나=STYLE_GUIDE, 정보를 언제·어떻게 갱신하나=OPS.
> `.assetsignore`에 `*.md` → 사이트 미배포·리포 전용.
> 버전: **v3.5** (2문서 체계 · `INFO_SOURCES.md` 흡수 · **06 캘린더 뷰 삭제→01 흡수(정적 5버튼·런타임 6탭)** · 상단 타임스탬프 · 무날짜 실적 일정 공시 컷 · MV 3 · 관점 라이프사이클 트리아지 §0-5·§3 · **메뉴 재배열·개명: 02 인사이트 찾기·03 전문가 원탁·04 시장과 실적 전망**)
> **문서 맨 위 「최종 갱신」은 연월일+시분(KST). 이 문서를 고치면 그 줄을 반드시 함께 갱신한다.**

---

## 0. 세션 시작 프로토콜 (모든 작업의 0단계)

1. **이 파일 + `STYLE_GUIDE.md`를 `main`에서 재페치**해 읽는다. Project 캐시는 폴백일 뿐 — **충돌하면 라이브 리포가 이긴다.**
2. **기본 브랜치 해소**(하드코딩 금지): `GET /repos/SimpleorNothing/ten-bagger` → `default_branch`. raw 404면 즉시 기본 브랜치로 폴백.
   raw 베이스 = `https://raw.githubusercontent.com/SimpleorNothing/ten-bagger/{기본브랜치}/{파일}?t=$(date +%s)`
3. **분석·브리핑이면** 라이브 JSON 8종 재페치: `gamma`·`cycle`·`signals`·`judgment`·`holdings`·`earnings`·`prices`·`signal_log`. 스테일 캡처 외삽 금지.
4. `signal_log.json`을 먼저 훑는다 — 아카이브가 아니라 **누적 판단 컨텍스트**(어느 층이 싸졌나/비싸졌나).
5. **관점 트리아지(02).** 채택 관점 중 **지지(g2)↑만** 라이브 게이트·`gamma`·`signals`와 대조해 3분류한다 — **발동**(전제·발동조건 충족 + 게이트 AND → 05 리밸런싱 후보) · **만료**(`until` 트리거 or 전제 소멸 → 폐기·강등) · **유지**(변화 없음 → `review` 점검일만 갱신). 점검일 도래분(02 「점검 필요」 배지)이 우선. 후보·관찰은 승격 전까진 잠자는 재고 — 트리아지 대상 아님.
6. **작업이 끝나면 같은 PR에서 이 문서(및 필요 시 STYLE_GUIDE)를 갱신**한다(§7). 문서 갱신 없는 코드 변경 = 미완료.

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
- **LLM 호출은 판단에만.** 시세·변동성·수익률·게이트 수치는 **무료 피드에서 결정론적으로 계산**한다(§6-6). 숫자를 LLM+`web_search` 로 「조사」하지 않는다 — 검색 턴마다 전체 컨텍스트가 재전송돼 입력이 2차식으로 늘고 결과가 재현 불가능해진다.
- **세션도 같은 규율을 받는다 — 시세·목표가·게이트 입력은 JSON 단일 SoT, `web_search` 금지.** 가격·등락 = `prices.json`(82종목) · 목표가·γ·리비전 추세 = `gamma.json` · VIX/VIX3M·F&G·나스닥 드로다운 = `signals.json`. **셋 다 무료 자동 수집이라 웹에서 다시 찾을 이유가 없다**(값별 경로는 §3-0). 「라이브 재페치」는 *웹 재확인*이 아니라 **JSON 재페치**다. 예외 4만 허용: ①커버리지 밖 신규 후보 ②실적 발표 당일 수치 ③서술형 뉴스·지정학 ④중앙은행 확률(위 규율). 인용 시 **`asOf` 병기 의무**.
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

### 3-0. 세션 도구 우선순위 — 어디서 읽고, 언제만 검색하나 (2026-07-20 신설)

> **원칙: 자동층이 이미 채운 값은 절대 웹에서 다시 찾지 않는다.** ❌ 행을 `web_search` 로 조회하면 데이터 공백이 아니라 규율 위반이다(§1). §6-6 이 **워커의** LLM 호출을 묶었다면, 이 표는 **세션의** 도구 선택을 묶는다.

| 필요한 값 | 1순위 SoT | 자동 수집 경로 | web_search |
|---|---|---|---|
| 시세·등락 (82종목) | `prices.json` | `fetch-prices.mjs` — Yahoo chart · 네이버 `siseJson` | ❌ |
| 목표가·γ·리비전 추세 | `gamma.json` | `fetch-gamma.mjs` — Yahoo `quoteSummary.targetMeanPrice` + `targetHist` 120포인트 누적 | ❌ |
| VIX 종가·장중고가·VIX3M | `signals.json` | `fetch-signals.mjs` — Yahoo `^VIX`·`^VIX3M` | ❌ |
| CNN F&G | `signals.json` | `production.dataviz.cnn.io` 직결 | ❌ |
| 나스닥 드로다운·40주선 | `signals.json` | 5y 차트 파생 | ❌ |
| KR 서킷·사이드카 | `signals.json` | `^KS11` 일중 저가 + `charts.json` 파생 | ❌ |
| 연 변동성·드리프트 | 워커 `localVolDrift()` | Yahoo v8 1y 일봉 → 로그수익률 σ×√252 (§6-6) | ❌ |
| 커버리지 밖 신규 후보 | — | 없음 | ✅ |
| 실적 발표 당일 수치 | — | 익일 반영(D-Day 만 공백) | ✅ |
| 서술형 뉴스·지정학 맥락 | `signal_log.json` | 수동 인테이크(§6-4) | ✅ |
| 중앙은행 정책금리 확률 | CME FedWatch | 없음 | ✅ 회의별 전용 쿼리(§1) |

**계기(2026-07-19 API 사용분):** 「stock price」 키가 하루 **$2.23(비중 50%)** 로 1위 — 249,718토큰·웹서치 7회, 실효 **$8.93/1M** 로 「da-market-insight」(3.72M토큰 $1.11 = **$0.30/1M**)의 약 **30배**. 같은 날 14:10 패치가 워커 쪽 원인(σ 추정의 LLM 조사)을 제거했고, **이 표는 남은 절반 — 세션이 이미 있는 값을 웹에서 다시 찾던 습관**을 막는다.

**스틸맨:** 「07:00 KST 스냅샷으로는 장중 급락을 놓친다」 — 유효하나 매크로 게이트는 **VIX 종가·F&G 일일값** 기준으로 설계돼 장중 해상도를 요구하지 않는다. 실제로 장중 해상도가 필요한 건 **DRM3 스파이크 타임박스**뿐이고 그건 예외 ②로 커버된다.

### 현행 메뉴 (7탭 · 런타임 렌더 순)
`01 시장 모니터링(v-market)` · `02 인사이트 찾기(v-insight · insight.js 자가 마운트)` · `03 전문가 원탁(v-council)` · `04 시장과 실적 전망(v-thread · v-cycle·v-alpha 2026-07-18 렌더 제외)` · `05 리밸런싱(v-decision)` · **`06 모닝 브리핑(v-brief · brief.js 자가 마운트 · 2026-07-19 신설)`** · `07 메모(v-memo)`
※ 위는 **런타임 렌더 순**(§3 내부번호 = 이 순서). `nav` 정적 버튼은 5개(market·cycle·port·council·memo · **index.html 무편집**)이고, `insight.js` `mount()`가 런타임에 ①`insight` 탭을 `market` 뒤 주입 ②`council`을 `cycle` 앞으로 이동 ③`cycle` 라벨 「궁금한 것」→「시장과 실적 전망」 개명 ④전 탭 index 순 재번호 → 위 순서 확정(정적 폴백은 마운트 전 구 5탭 · `insight.js` 로드 전 잠깐). **`data-v`·뷰 id·데이터 소스는 불변 — 라벨·순서만 재구성**(2026-07-18). ※ 04 뷰 제목은 #424가 옛 `#instantAnswer` vhead(「지금 궁금한 것」)를 삭제해 별도 개명 불필요 — v-thread 최상단은 `#dsAisd`(AI 수요·공급 로드맵). `v-port`·`v-tracker`·`v-macro`·`v-cal`은 **뷰서 제외·코드 잔존**(v-cal은 2026-07-17 06 캘린더 삭제로 합류 — 임박 이벤트는 01로 흡수, `#v-cal` CSS는 비활성 잔존).

### 01 시장 모니터링 (`v-market`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **다가오는 일정** (거시·실적 게이트 D-N 카드+범례 · 2026-07-17 06서 흡수) | 혼합 | 데일리 프루닝·asOf / 큐레이션 수시 | `calendar.json` `events`(수기+`derive-calendar.mjs` 프루닝) + `earnings.json` moves(`CAL_EARN_MOVES`). `renderCalNow()`가 오늘 기준 경과 제거·D-N·임박 `CAL_NOW_MAX`(8) 렌더. `#calNow`·`--cat-*` `#v-market` 스코프. 크론 `update-calendar.yml`(운영자 수동) |
| 업데이트 이력(변경 로그) | 수동(인라인) | 사이트 변경 시 | `changelog.js` 인라인 `MKT_CHANGELOG`(`{d,t}` 최신순·자가 마운트=insight.js 패턴). `mountHead()`가 **01 시장 모니터링(`#v-market`) + 전문가 원탁(`#v-council`) 헤더(`.vhead`) 우상단**에 각각 `.mkt-upd` 배지를 마운트 → 클릭 시 `.cyc-pop` 모달(`.cyc-upd`/`.cyc-pop` 재사용 · 신규 토큰 0). **사용자 향 변경만** 기록 · 신규 항목은 배열 맨 위 |
| 코스피·S&P·나스닥 지수 | 자동 | 06:37·18:37 KST (1일 2회 · ⏳저녁 §8-11) | `charts.json` (`fetch-prices.mjs`, `^KS11·^GSPC·^IXIC` Yahoo 5Y). **meta 거래일을 시계열 끝에 강제 반영 + 이전 창과 union 병합** → `prices.json`과 갈라지지 않는다. 괴리>1%는 `prices.json.warn` |
| 미 10년물 금리 | 자동 | 06:37·18:37 KST + 폴백 런타임 | **1순위 `charts.json` `us10y`**(`fetch-prices.mjs` `^TNX` Yahoo 5Y · 지수 카드와 동일 t/c → 기간버튼 1M~5Y 실동작 · `^TNX` 10× 스케일은 `>20→÷10`로 % 정규화). **폴백** worker `/api/us10y` → `history[].markets.ten_year`(외부 피드 ~2개월). ※구버전은 폴백만 써서 6M+ 기간 무반응 버그(2026-07-16 수리, PR #345) |
| WTI 유가 | 자동 | 런타임 | worker `/api/wti` → **`points`** 배열 (Yahoo). `series` 로 읽으면 0건 |
| **DXI 메모리 현물** (신규 · 지표 6번째 카드) | 수동/주간 | **매주 금요일 장마감 후**(스케줄 태스크) | `dxi.json` `series[]`(DDR4 16Gb 3200 메인스트림 현물 $). DXI 지수는 DRAMeXchange 포털 게이트라 무료 피드 없음 → TrendForce 공개 현물가로 주간 1점 append. `loadDxi()`·`lensDxi()`=01 `card()`/`lens()` 복제(신규 토큰 0·`dod:false`로 전일대비 억제). narrative≠numbers — MU γ-닫힘 ③ 입력 참고용 |
| 보유 종목 스파크라인 | 자동 | 06:37·18:37 KST (1일 2회 · ⏳저녁 §8-11) | `charts.json` (Yahoo/Naver 5Y 일봉 t/c · 기간버튼 1M~5Y) |
| **카드 렌즈 요약 2줄** (그래프마다 프레임→판정) | 자동(런타임 파생) | gamma·signals 일별 / holdings 주간에 편승 | `gamma.json`(γ·stage·flagged) + `signals.json`(**`window.macroEval` 단일소스 재사용**) + `holdings.json`(layer·평단) + `charts.json` |
| 종목 뉴스 (종목 블록형 + 기사별 **일자 + 두 점**[명사형 요약 `a` / `→` 의미·주가영향 `w`] + 우측 주가 차트) | 자동 | **뉴스·digest 06:12·18:12 (1일 2회)** / 차트 06:37·18:37 | `news_digest.json`(claude-sonnet-4-6) + `news.json`(**물질성 m≥1만**) + `charts.json` |
| ↳ 표시 규칙 | — | — | **최근 3개월(92일) 창 · 종목당 최신 5건.** 초과분은 「더 보기」 → `archive/{TK}.json` **온디맨드 로드**(첫 로딩 페이로드 상수 유지) |
| ↳ **`NEW` 배지(신선도 큐)** | 자동(런타임 파생) | 매 렌더 | 최근 3일(72h·`isNewDt`)+미열람 기사에 `.arow .anew` 부표(디자인=STYLE_GUIDE §6-5). **3초 호버 or 클릭 시 제거**→localStorage `am_news_seen_v1`(키=link) 영속·재렌더 재출현 없음. `rowHTML()` 경로(종목+「더 보기」). narrative≠numbers |
| 관련 기사 (매크로 · 토픽 블록형 + **기사별 일자 + 두 점**[명사형 요약 `a` / `→` 레이어·게이트 함의 `w`] — 종목 뉴스와 동일 형식) | 자동 | **06:12·18:12 KST** | `news_digest.json` `macro`(블록 상단 축 요약 `s`) + `news.json` `MACRO`. **LLM 물질성 채점(m)은 여전히 미적용**(축 자체가 관측 대상 · 하드룰만) 이나, **기사별 두 점 요약 `a·w`는 `summarizeMacro()`가 생성**(신규만 증분 · 과거치 재요약 없음). `w`는 개별 주가가 아니라 8레이어·매크로 게이트·상류 수요 관점의 함의. 렌더는 `.arow`(종목 뉴스 컴포넌트 재사용) · `a` 없으면 제목 폴백. **이 섹션 상단(자동 뉴스 위)에 03 채택 매크로 관점 스트립(`insStripMarket`)이 함께 렌더된다**(2026-07-18 상단→여기 이동 · `insight.js mount()` 앵커 `#mktMacroNews` 앞 · 큐레이션 관점=narrative, 뉴스와 별 컴포넌트) |
| ↳ **매크로 축 = 고정 아님·매 실행 자동 발굴** | 자동 | 실행마다 | `discoverMacroTopics()` — 광역 헤드라인 스캔(증시·stock market·economy·BUSINESS) → LLM이 **지금 도는 매크로 축 3개** 선별(금리·지정학·관세·전력·환율·capex 중 서로 다른 축) → 그 검색어로 수집. 실패 시 직전 축 승계 → 시드 폴백. 채택 축 = `news.json` `macroTopics`. **토픽명 하드코딩 금지**(사이트는 `it.name` 사용) |
| ↳ **병목축(고정 5축)** — L3 DRAM/HBM 가격·공급 · L4 패키징 캐파 · L6 옵티컬 리드타임 · L7·L8 전력 · 상류 하이퍼스케일러 capex | 자동 | 실행마다 | `BOTTLENECK_TOPICS`(`news-screen.mjs` 고정) → 매크로 레인(`ticker='MACRO'`)으로 렌더. **리밸런싱은 종목 뉴스가 아니라 '어느 레이어 병목이 조였나'에서 나온다** → 트렌딩 발굴에 맡기지 않고 상시 관측. digest가 **조임/완화 방향**을 명시 |
| ↳ **축 정규화 `ax` — 같은 축은 한 블록** | 자동 | 실행마다 + 런타임 | 발굴이 매 실행이라 같은 축이 다른 이름·id로 들어온다(중동 3종·capex 2종 → 8블록). 키워드 규칙 8종(`china`·`capex`·`chip`·`power`·`energy`·`trade`·`rates`·`fx` / 미매칭=정규화 이름)으로 축 키 `ax` 파생. `china` 규칙을 최선두에 두어 중국 관련 토픽(공급망·성장둔화·디플레·수요 등)이 단일 블록으로 병합됨 → `fetch-news.mjs`(축 중복 제거 · 직전 id·name 승계 · 5건 슬롯 축별 배정 · digest `macro[].id`=축) + `index.html loadMacroNews()`(축으로 블록 병합 · 링크 중복 제거 · 축당 5건 · 구 데이터도 즉시 병합). **축 키는 병합용 — 표시명은 라이브 `macroTopics[].name`** |

**뉴스 수집 3축(`fetch-news.mjs`):** ①**종목축** = 종목명 검색 8건 · ②**시그널축** = 종목명 + 확정 사실 키워드(`실적·수주·계약·공급·증설` / `guidance·capex·contract·order·backlog·shipment·capacity`) 14일 창 4건 — *종목명 단독 검색은 SEO 콘텐츠팜을 부른다*("Why MU stock is down…") · ③**병목축** = 레이어 고정 5축(위 표).

**소스 티어(`items[].st`) — 구글 뉴스는 매체를 고르지 않으므로 우리가 고른다:**

| st | 매체군 | 처리 |
|---|---|---|
| 1 | 원문·통신사 — Reuters · Bloomberg · FT · WSJ · Nikkei · GlobeNewswire/Business Wire/Stock Titan(IR 원문) · 연합 · 한경 · 매경 · 조선 | 우선 |
| 2 | 산업 전문지 — DigiTimes · TrendForce · SemiAnalysis · Counterpoint · Omdia · Yole · EE Times · The Register · DataCenter Dynamics · Utility Dive · Lightwave · Gazettabyte · 전자신문 · 디일렉 · ZDNet · 더구루 | 우선 |
| 3 | 집계·해설 — Yahoo Finance · Investing.com · CNBC · Barron's | 통과 |
| 9 | 콘텐츠팜 — Motley Fool · simplywall.st · 24/7 Wall St. · Kavout · Trefis · TIKR · MarketBeat · Stocktwits · Quiver · Benzinga · Zacks · AOL · TipRanks · Barchart · Moomoo/富途 · 씽크풀 · 팍스넷 | **확정 사건(`RE_EVENT`) 없으면 m=0** (실측 254건에서 이 매체군의 m=2 산출 **0건**. 특종 유실 방지용 안전판만 둔다) |

**물질성 스크리닝(`items[].m`) · 스크리너 세대 `items[].mv` = MV(현재 **3**):** 기준은 하나 — **앞으로의 등락에 영향을 줄 시그널인가.** 지나간 등락의 해설은 시그널이 아니다.

| m | 정의 | 예 |
|---|---|---|
| 2 | **논제(펀더멘털)** | 실적·가이던스·수주·계약·출하·고객·공급망·제품가격(고정거래가)·증설·규제·M&A |
| 1 | **리비전·수급 실사건** | 애널리스트 목표가·투자의견·추정 변경(= **MU γ-닫힘 트리거 ① 입력**) · 지수 편출입 · 대량보유/내부자 공시 · 자사주·증자 |
| 0 | **비물질(표시 제외)** | **"주가가 X% 올랐다/내렸다"는 사후 등락 서술** · "왜 떨어졌나" 해설 · 홍보·수상·채용 · 가정 시나리오·가격 예측 · 추천 리스트 · 콘텐츠팜(st=9) · **날짜 없는 실적 발표 「일정 공시」**(언제 발표할지가 빠지면 시그널 가치 0 · `RE_ERN_SCHED`&&!`RE_HAS_DATE`) |

핵심 구분: 주가 움직임 **자체를 보도**하면 원인이 사실이어도 m=0(「지수 편출 이후 22.6% 하락」). 그 원인을 **사건으로 보도**하면 살린다(「S&P500 편출 결정」 → m=1, 「Tower PIC 500만개 출하」 → m=2).
**날짜 없는 실적 일정 공시(2026-07-16 신설):** 파이프라인은 **제목만** LLM에 넘긴다 → 본문의 발표일이 요약(`a`)에 못 담긴다. 「실적 발표 일정을 공시/공지했다」만 있고 **실제 발표 날짜(월·일)가 제목·요약에 없으면 m=0**(「Lumentum 실적 발표일 공시」→0). **날짜가 박히면 살린다**(「Qualcomm 실적 발표일 7월 29일 확정」→1, 「Astera Q2 실적 8월 4일」→1). 같은 종목이라도 무날짜 판(0)은 떨어지고 날짜 판(1)은 남는다(VRT 실측). 캘린더 반영은 별개 — 발표일 자체는 05 캘린더·`signal_log`에서 다룬다(narrative≠numbers).

**3층 판정:** ①하드룰(`RE_PR` 홍보 / `RE_SPEC` 추측·리스트 / `RE_MOVE`&&!`RE_KEEP` 사후 등락 서술 / st=9&&!`RE_EVENT` / **`RE_ERN_SCHED`&&!`RE_HAS_DATE` 무날짜 일정 공시**) → ②신규 요약 시 LLM이 `a`·`w`와 함께 `m` 생성(LADDER에 무날짜 일정 공시 룰 명시) → ③`scoreLegacy` 백필·**MV 상향 시 전건 재채점**(요약 `a`·`w`는 재사용 → 토큰 낭비 없음). **`ruleM`은 title+`a`를 함께 본다** → MV 3 재채점 때 과거 기사는 이미 한글 요약이 있어 무날짜 일정 공시가 결정적으로 컷된다(LITE 등 5건 실측). 신규 기사는 preScreen에서 제목만 보므로, 제목에 일정어가 약한 영문 기사(예: "AMD to Report … Results")는 ②의 LLM(LADDER)이 m=0을 매긴다. 사다리·정규식·티어의 **단일 소스 = `scripts/news-screen.mjs`**. `news.json`·`archive/{TK}.json`은 **m≥1만 적재**, m=0은 `news_archive.json`에 **전건 보존(삭제 아님)**.
**규율:** 스크리닝은 **표시 대상만** 정한다. 판단·숫자 파일은 건드리지 않는다(narrative≠numbers).

**교차 점검 규율 — 01 갱신 시 02·04·06 동반 확인(2026-07-15 신설 · 2026-07-18 메뉴 재배열 반영):** 01 시장 모니터링 정보를 갱신할 때는 **매번** 아래 3개 메뉴에서 해당분이 있는지 확인하고, 있으면 같은 세션에서 반영한다. **단, narrative≠numbers·게이트 AND 규율은 그대로** — 일정·발표·뉴스 자체는 `signal_log`/캘린더 **표시일 뿐**, 숫자·판단 파일 변경은 §1 트리거를 통과해야 한다.

| 대상 | 무엇을 교차 확인 | 반영 방향 |
|---|---|---|
| **01 다가오는 일정** | 예정 거시·실적 이벤트(FOMC·CPI/PCE·금통위·메가이벤트·실적)가 **경과**했는지 | 경과분은 `renderCalNow()`가 오늘(KST) 기준 자동 소거 · 이벤트 큐레이션·다음 회차 추가는 `calendar.json` `events` 수기 편집. 예: US CPI 발표 → 01 매크로 축에 반영. narrative≠numbers |
| **04 시장과 실적 전망** | 01 데이터·병목 뉴스(지수·메모리 가격·capex·L3~L8 병목)가 **반도체 사이클(E군집)·주도주 사분면·γ·stage**에 함의가 있는지 | 메모리 가격 롤오버·병목 조임/완화 → 04 `cycle`·`gamma` stage 렌즈 점검. **숫자 변경은 §1 트리거 통과 시만**(가격 상승 자체는 플래그) |
| **02 인사이트 찾기** | 01 종목·매크로 뉴스의 **확정 사건(m≥1)**이 채택 관점·`signal_log`로 이어지는지 | 확정 사건 → 02 인사이트 아래 `signal_log.json` EOF append(§6-5). 관점은 「반영 대기」 유지, 숫자는 §1 트리거 |

### 02 인사이트 찾기 (`v-insight`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 관점 카드 (Insight) | 수동 | 판단·논제 시계 변화 시 | R2 `/api/insights`(+localStorage 캐시). **하나의 채택 claim = 하나의 관점**. 필드: 출처(`src`)·`route`·N·I·C·`grade`(관찰→확신 자동 승격)·`applied`(숫자 route 반영 여부) + **라이프사이클 `hyp`(전제)·`trig`(발동조건)·`until`(폐기 트리거)·`review`(점검일, 신규 채택 시 +14d 기본)**. `review` 도래 시 02 「점검 필요」로 재부상 → §0-5 트리아지. **편집기 = 카드 「🕔 라이프사이클」 → 모달 + 필드별 「보기 칩」 선택식**(클라 템플릿이 게이트·레이어·티커 기반 후보·날짜 프리셋 제시 · 칩 클릭=채우기·직접 수정 가능). |
| 관점 추출 (인테이크) | 수동(운영자 입력) | 인테이크 시 | 「관점 뽑기」 → `/api/insight`(worker→Claude). 본문(스크립트/기사) 있으면 그대로, URL만 있으면 web_search로 시도. 8레이어·단계 프레임으로 claims 후보 정렬(뽑기≠반영 · 채택은 사람이 체크). 캡처 이미지=클라 OCR(Tesseract)·PDF/TXT/파일=클라 추출로 textarea 채움 |
| ↳ **유튜브 링크 스크립트 추출**(2026-07-18 신설) | 자동(입력 보조) | 인테이크 시 | URL 칸에 **유튜브 링크만** 넣고 본문이 비면 클라(`ytExtract`)가 먼저 `/api/yt-view`(**`mode:'insight'`** · Gemini 영상 인식)로 영상을 **상세 전사**→`insText` textarea 채움(원문 raw 저장)→그 스크립트로 `/api/insight` 관점 추출로 이어감. **03 전문가 원탁과 동일 엔드포인트**(03=발화자 관점 압축 요약 / 02=`mode:'insight'` 상세 전사 분기·`maxOutputTokens` 상향). 실패·`GEMINI_API_KEY` 부재(503)면 **URL web_search로 폴백**(구 동작). narrative≠numbers — 스크립트는 인테이크 입력일 뿐 숫자 파일 불변. 신규 CSS·토큰 0(index.html 무패치·insight.js/worker.js만) |
| **표시 레벨(뎁스) 접기**(2026-07-18 신설) | 런타임(표시 전용) | 상시 · 기본 L1 | 「채택한 관점」 목록을 3단계 아웃라인으로: **L1 자료**(소스 카드만·접힌 관점·시그널 건수 힌트) · **L2 관점**(+claims, 시그널은 건수 힌트) · **L3 시그널**(+관련 시그널 로그·미연결 시그널 펼침). 상단 `.ins-lv` 버튼군(기본 L1). `insight.js` `renderLevel()`·`lvl` 상태·`renderList` 뎁스 분기·`claimLine(…,showSig)`·`sigSection(c,open)`·`renderSigRest` lvl 게이트. **힌트 클릭 = 그 자리 펼침(전체 lvl 독립)** — L1 자료 힌트(`.ins-lvhint`) 클릭→그 자료 관점을 `.ins-recwrap`로 펼침, 관점 시그널 힌트(`.ins-sighint`) 클릭→로그를 `.ins-sigwrap`로 펼침(자료→관점→시그널 중첩 드릴·CTA 펼치기↔접기·`data-rec`/`data-sig`, 2026-07-18~19). **검색·라우트 필터·등급 보드와 직교**(무엇을 펼칠지만 · 데이터 무변). narrative≠numbers — 표시 방식일 뿐 숫자·판단 파일 불변. 신규 CSS만(`:root` 토큰 0 · index.html 무패치) |
| 인사이트 자가 마운트 | 자동(런타임) | 페이지 로딩 시 | `insight.js`의 `mount()` 함수가 `#v-insight` 탭(**01 시장 모니터링 뒤·03 전문가 원탁 앞에 주입** · 정적 nav 무편집 런타임 재구성 · 2026-07-18) + 헤더 배지 + `signal_log` 섹션을 런타임에 주입. **채택 관점 반영 스트립(`insStripMarket`/`insStripCal`→01 · `insStripDec`→**04** · 2026-07-18 05→04 이동, 로드맵 `#dsAisd` 아래·강물 탐색 `.vhead` 위)도 `mount()`가 각 뷰에 앵커링**(`insStripThread`는 2026-07-18 #424 「02 박스1 삭제」로 앵커 제거 — `strip()`은 `#insStripThread` 부재 시 no-op) — 매크로 관점 스트립은 01 「관련 기사」 섹션(`#mktMacroNews` 앞)에 붙는다(2026-07-18 상단→이동, §01 관련 기사 행) |

> **관점은 채택으로 끝나지 않는다.** `review`(점검일)가 강제 부여돼 도래 시 「점검 필요」로 재부상하고, §0-5 트리아지에서 발동/만료/유지로 처리된다. narrative는 여전히 숫자 파일을 못 바꾼다 — **발동 = 05 리밸런싱 후보로 올릴 뿐**이고, 숫자 변경은 §1 트리거(실적 비트·가이던스 상향·확정 수주) 별도.

### 03 전문가 원탁 (`v-council`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 원탁 토론 | 수동 | 필요 시 | 전문가 2인+ → 「토론 시작」 → `/api/council`(Claude). **토론 주제(`#clTopic`) 선택 입력**(2026-07-17) — 비우면 현 상황 종합, 채우면 그 논제 중심. `narrative≠numbers` |
| **1인 심층 자문**(2026-07-19 신설) | 수동 | 필요 시 | 전문가 **1인만** 선택 → 하단 바에 뜨는 「심층 자문」 → `/api/council-ask`(Claude opus-4-8·`max_tokens` 3500). 다인 토론과 별개 — **그 전문가 렌즈만 순수하게**(좌장 오버레이 없음, 운영자 결정) 깊은 진단·**직접 실행 조언**·자기 반증(`watch`)을 낸다. 출력 스키마 `{diagnosis, basis[], advice[], watch[], answer, stance}`. 좌장 스틸맨 대신 **그 렌즈 자체의 리스크 규율을 `watch`(자기 반증)로 강제**해 편향 진단 방지. `#clTopic`=질문(비우면 현 상황 심층 진단)·`#clCtx`=라이브 situation 재사용. 결과는 토론 이력(`/api/council-discussions`)에 `[심층 자문]` 접두로 누적(advice→actions·watch→steelman 매핑). **자가 마운트 `council-ask.js`**(worker `<script defer>` 주입·index.html 무편집·카드 선택 상태는 `.cl-card.on` DOM으로 감지·전문가 데이터는 선택 카드 DOM에서 읽어 라이브 오버라이드 자동 반영). 신규 CSS·:root 토큰 0(기존 `.cl-*` 재사용). narrative≠numbers — 관점 텍스트일 뿐 숫자 파일 불변. 음성 재생은 `window.COUNCIL.playReport` 재사용(diagnosis 비우고 board를 그 전문가 목소리로 몰아 순수 렌즈 유지) |
| **패널 관리 (로스터 추가·삭제·편집)**(2026-07-19 신설) | 수동(운영자 입력) | 필요 시 | vhead 「패널 관리」 버튼 → 모달에서 전문가 카드 **추가·삭제·편집**(기본 6인 포함 전체 CRUD·「기본 6인 복원」). 편집 필드=이름·전문·레이어 태그·시계(논제/가격/좌장)·스탠스·관점·아바타(프리셋 6종). **서버 저장** = R2 `council_roster.json`(`/api/council-roster` GET/POST · 존재 시 인라인 기본 6인을 대체 · 모든 기기 공유). 뷰·스탠스 편집은 **council_log 채널에도 흘려**(`/api/council-log`) council-sot 덮어쓰기를 피하고 관점 SoT를 일원화. **자가 마운트 `council-roster.js`** — 인라인 COUNCIL이 노출한 훅(`getExperts`/`setExperts`/`reRender`)으로 로스터를 주입해 **토론·1인 자문 양쪽이 커스텀/편집 명단으로 동작**(index.html은 훅 3개만 추가). 상한: 최대 24인·필드 길이 제한(worker `sanitizeRosterExpert`). 신규 :root 토큰 0(기존 `.cl-*`·`.cl-modal` 재사용). narrative≠numbers — 명단·관점 텍스트일 뿐 숫자 파일 불변. 실존 인물 렌즈 시뮬레이션 가드레일 유지 |
| 전문가 관점 갱신 | 수동(운영자 입력) | 필요 시 | 각 전문가 카드 「관점 갱신」 모달 4탭 — **텍스트**(`/api/council-summary` Claude) · **유튜브 링크**(`/api/yt-view` Gemini 영상 인식 · 기본 모드=발화자 관점 압축 요약, 02는 `mode:'insight'` 상세 전사 분기 공유) · **여러 링크**(신설) · **파일**(txt·md·srt·vtt·csv·docx·pdf → council-summary). 관점 텍스트·stance만 갱신, **숫자 파일 불변**(narrative≠numbers). 반영분은 R2 감사 로그 `council_log.json`(`/api/council-log`)에 누적 → 카드 복원·「관점 갱신 이력」 모달 |
| ↳ **여러 링크 자동 인식·통합**(2026-07-17 신설) | 수동(운영자 입력) | 필요 시 | 유튜브·기사 링크를 **한꺼번에 붙여넣으면** 클라(`recognizeLinks`)가 URL을 파싱→유형 자동 분류(유튜브/기사)→소스별 요약(유튜브=`/api/yt-view` Gemini 영상 인식 · 기사=`/api/council-read` **서버가 URL 본문을 직접 페치→HTML 스트립→Claude 비스트리밍 요약**, web_search 아님 → 특정 URL을 빠르고 확실하게 읽음)→**하나의 통합 관점으로 합성**(`/api/council-summary` 재사용). **소스는 병렬 인식**(`Promise.all` — 다건도 동시 처리). 링크 아닌 문장은 메모로 반영. 소스별 진행·한 줄 요약 표시, **실패·본문 얇음(차단·JS 렌더·페이월)은 건너뜀**(개별 처리 · view 빈 문자열). 모든 출처 링크는 로그 `refs[]`(신규 필드 · `{label,url}`)에 함께 저장·이력 모달에서 각각 링크로 표시. 신규 CSS·토큰 0(모달 컴포넌트 재사용) |
| 원탁 음성 토론 재생 | 클라이언트(브라우저 TTS) | 재생 시 | 원탁 진단 리포트(diagnosis·board·consensus·tension·steelman)를 화자별 브라우저 TTS로 메신저형 극화 재생하는 인앱 플레이어(`#v-council`, 「▶ 음성 토론 재생」 버튼 · `window.COUNCIL.playReport`). 서버·데이터 페치 무관(리포트 재사용·오프라인). 고품질 Gemini AI 음성판은 사이트 밖 로컬 도구(`claude/roundtable`)로 별도 |
| 원탁 업데이트 배지 | 자동(런타임) | 로딩 시 | `changelog.js` `mountHead()` — 01 시장 모니터링과 동일 `.mkt-upd` 배지 재사용 |

### 04 시장과 실적 전망 (`v-thread`만 렌더 · `v-cycle`·`v-alpha` 2026-07-18 렌더 제외)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **AI 수요·공급 로드맵** (04 맨위 · 판정 보드 + 밸류체인 구조도(①~④·돈의 흐름·티어별 손익 스트립·관측 위치) + **이익률 추이 매트릭스(병목의 온도계 — ②랩·③클라우드·④NVDA·④메모리·④통신/전력 연도별 영업이익률 + 행 클릭=요인·구조성·**선행 시그널**[가격·리드타임·캐파·경쟁 진입 4종 — 마진 후행 보정] 판정)** + ①진화 · ②AI 판매자 매트릭스 · ③컴퓨팅 통합(CAPEX 리비전 트랙+4사) · ④Factory 구성요소별 · ④중국) | 수동 | 분기(실적 시즌 캡처) | `aisd.js` 자가 마운트(#dsAisd · flags.js 패턴 — worker.js `<script defer>` 주입 · v-thread 최상단). 전역 토큰만·`ds-*` 스코프·신규 :root 토큰 0. 수치=컨센서스·공개 실적 방향성, **리비전 트랙·손익·이익률은 캡처 축적 전 예시 표시**. narrative 층 — 숫자 파일 무관. 재판정 트리거: ①추정 ▼하향 ②DDR5 현물<계약 롤오버 ③가격>리비전 속도 · **이익률 서열 역전 = 레이어 회전 신호** |
| 즉답 요약 (전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널) | 혼합 | 런타임 파생 | `gamma`·`holdings`+`TARGETS`·`signal_log` (`renderInstantAnswer`) / 전선·다음재채점만 `IA_CFG` 수동 |
| 반도체 사이클 3차트 (D CAPEX · D₂ 메모리매출 · C DDR5) + 종합 판정 1줄 | 혼합 (E 자동) | E: 런타임 / 나머지: 판단 시 | `cycle.json` + worker `/api/fred` (E군집 = `derive-cycle-e.mjs` 파생). ※ 「현재값·임계값 신호 요약」 표는 2026-07-12 제거 — E·B·A는 차트 없이 `cycVerdict` 램프 집계로만 반영 |
| 주도주 4사분면 | 혼합 | alpha 주1회 + 판단 시 | `alpha` → `earnings` → `judgment` · 상단 렌즈 2줄(사분면 분포+`MACRO_GRADE`) · 크기 토글(비중↔적정밴드 갭 `TARGETS`) · **가로축 토글(예상 ↔ 실현 3M `charts.json` 63거래일 초과수익)** · **무게중심 토글(L1~L8 비중가중 평균 좌표 + 오버→언더 한계자본 회전 화살표)** · **궤적 토글(스냅샷들→현재 위치 점선 꼬리, 예상 좌표·라이브 뷰만 — ①↔③ 강등/회복 가시화)** · 각주 기준일 = `alpha.asOf` 자동연동 |
| ↳ 판단 캘리브레이션 패널 | 자동(런타임 파생) | 로드 시 | `snapshots.json`(과거 예상 3M `aN[1]`) × `charts.json`(스냅샷일 이후 실현 경과) → 부호 적중률·편향(예상 과대/과소). 단일종목 시계열 보유분만 매핑(ETF·바스켓 제외) · 경과 <63거래일이면 부분 실현(방향 위주). OPS §1 「침묵하는 오류」 감시 |
| 레이어 파이 (비중) | 혼합 | holdings 주간에 편승 | `holdings.json` |
| γ 테이블 | 자동(cron) + 수동(판단) | 일별 (자동) + 실적/리비전 시 (수동) | `gamma.json` (g 자동 / stage·flagged·override 수동). gamma 테이블은 `renderGamma()` 함수가 `gamma.json`을 직접 소비 |
| signal_log | 수동 | narrative 유입 시 | `signal_log.json` EOF append. 포맷: `{date, at, source, srcs:[{label,url}], items:[{tag,layer,col,html}]}`. 인라인 SIGNAL_LOG(~5/30)는 불변·신규만 외부 파일에 쌓인다 |
| 관통 강물 (RIVERS) | 수동 | 논제 시계 변화 시 | `gamma.json` `RIVERS` 배열. 번호·순서는 라이브 SoT — 하드코딩 금지 |

### 05 리밸런싱 (`v-decision`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 결정 보드 | 혼합 | 리밸런싱 실행 시 | `judgment.json` (`decisions` 배열). 매매 방향·게이트·근거·사후 추적 |
| 포트폴리오 테이블 | 자동 + 수동 | holdings 주간 + prices 일별 | `holdings.json` × `prices.json` |
| **종목 채점 라이브 참고(01~04 접속)** — 드로어 「01~04 라이브 참고」 박스(02 스택→종목 클릭 시) + 트래커 행 칩(v-tracker 잔존 뷰) | 자동(런타임) | 드로어 열 때 | `gamma.json`(γ갭·g·stage·override why·**EPS 리비전30d vs 가격30d → 두 시계 판정**·애널 컨센서스·최근 액션) + `signals`(매크로 게이트 G) + `council.json`(종목 레이어 매치 전문가 스탠스·상/하방) + `/api/insights`(티커 매치 채택 관점 수·최신). **초입 5신호 채점은 수동 유지(불변 규율)** — 라이브는 「채점 전 확인」 참고용. GAMMA 로드 후 `renderTracker` 재렌더 훅 |
| 시장 모멘텀 전망 + 추정 리비전 트래커 (`#momOutlook`·`#probEst`) | 자동(런타임) | gamma·signals·charts 일별 | index.html 인라인 IIFE. `renderMom`=signals+삼성 프록시 레짐 · `renderRev`=`gamma.json` `rev`(TP·EPS·주가 리비전·애널·강등 게이트 d30). **강등 게이트 = 30d 주가 − 30d EPS(FY+1) 리비전율**(양수=가격 추월·성숙 강등 후보 / 음수=추정 앞섬·γ open). 관측치·예측 아님 |
| ↳ **「기대수익 점수」 컬럼** (`raer.js` 자가 마운트) | 자동(런타임 파생) | gamma 로드 시 | 추정 리비전 트래커에 위험조정 기대수익(**RAER = 여력 × 실현확률 ÷ 리스크**, 14행 상대 0–100) 컬럼을 종목 다음에 주입 + 점수 내림차순 재정렬 + **현금 행** 추가. 실현확률=EPS 리비전(90d·30d)·애널 상향폭·γ 건전성(하향이면 급감) / 리스크=단계(성숙 1.2·과열 1.45)·90d 급등·γ 소진·고변동 가산. 현금=무위험(한은 기준금리 `RF` 상수)·상승 기대수익 바닥·게이트 잠김 시 배분 실탄. `changelog.js` 부트스트랩이 `loadRaer()`로 `<script defer src="/raer.js">` 주입·index.html·worker.js 무편집·신규 :root 토큰 0·jsdom 배치 검증. **기간은 점수로 안 나눔 — 「언제」는 촉매(실적 D-N)가 답함.** 관측 휴리스틱·예측/투자권유 아님(narrative≠numbers) |

> **σ·μ 추정(`#v-prob` 「AI로 σ·μ 추정」 · 비렌더 뷰).** 2026-07-20부터 **LLM·웹검색을 쓰지 않는다** — `POST /api/estimate` 가 Yahoo 일봉 1년치로 로그수익률 표준편차×√252 를 직접 계산한다(드리프트는 실현 CAGR 을 시장 8%로 수축·−10~+20% 클램프). 심볼 해석 실패(회사명 입력·비상장) 시에만 Sonnet+검색 3회 상한 폴백. 응답 스키마 불변(§6-6).

### 06 모닝 브리핑 (`v-brief` · `brief.js` 자가 마운트)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **텍스트 브리핑** — **9섹션 고정 순서**: ①결론(+근거 불릿) → ②**시장 맥박 리스크 보드** → ③매크로 게이트 3중 AND → ④**한·미 종합지수** → ⑤**보유종목 마감(전체 요약 → 주요 종목만)** → ⑥레이어 갭 표 → ⑦**보유종목 주요 뉴스** → ⑧**다가오는 일정** → ⑨**오늘 리밸런싱 한다면** → 오늘 볼 것 · 액션 아이템 · **스틸맨 반론** | 자동(열 때 생성·R2 날짜 캐시) | 하루 1회분 | `GET /api/brief?part=0` (worker `handleBrief` · `BRIEF_TEXT_SYS`). 입력은 `signals`·`gamma`·`holdings`·`calendar`·`signal_log`·`judgment` **+ `pulse.json`(맥박 축·방향·귀결) · `charts.json`(지수·보유 종가→전일·5거래일 파생) · `earnings.json`(보유 실적 D-N) · `index.html` `TARGETS`(적정밴드)**. `gate[].s`는 충족/미충족만 · `layers[].state`는 오버/언더/적정 · `rebalance.verdict`는 **오늘 실행 가능 여부를 먼저 못박고** rows는 언더웨이트 우선(유한자본 규율) · `actions`는 전부 조건부 AND |
| ↳ 파생 규칙 | 자동 | 매 생성 | **밴드는 브리핑에 다시 정의하지 않는다** — `briefBands()`가 `index.html` `let TARGETS` 를 **정규식으로** 읽는다(Workers 는 `new Function` 이 막혀 슬랙 러너의 `new Function` 경로를 못 쓴다 · §1 임계 중복 정의 금지). 등락은 `briefSeries()`가 `charts.json` 시계열 끝 2점·6점으로 파생 → **입력에 없으면 빈 칸**(지어내지 않는다). **美 10년물은 지수 표에서 제외** — 수준값(%)만 `us10yPct` 로 넘긴다(등락률의 % 표기가 bp 오독을 부름). 텍스트 회차만 `max_tokens` 6500(대담 파트는 4000 유지 — 100s 한도 여유) |
| **오늘 브리핑 듣기** (2인 대담 · 약 5분 · **텍스트 회차와 같은 7섹션 순서**) | 자동(열 때 생성·R2 캐시) | 하루 1회분 | 전반부 = 결론 → ①시장 맥박 → ②매크로 게이트 → ③한·미 종합지수 / 후반부 = ④주요 보유종목 마감 → ⑤주요 보유종목 뉴스 → ⑥리밸런싱 가이드 → ⑦오늘·내일 볼 것 → **스틸맨**. 「▶ 오늘 브리핑 듣기」 → `part=1` 먼저 재생 · `part=2`는 재생 중 수신·이어붙임(§ 외부 채널 동일 엔드포인트 재사용). 낭독 = **① 고품질 Gemini 오디오 우선**(`GET /api/brief-audio` · 워커가 대본을 「The Energetic Co-Host」 톤 WAV 로 구움 · R2 캐시 · 말풍선 하이라이트는 글자수 비례 근사) **② 실패 시 브라우저 TTS 2보이스로 자동 폴백**. 말풍선 클릭 = 그 대목부터 재생 · 배속·음소거 |
| ↳ 오디오 굽기 방식(2026-07-20 수정) | 자동 | 최초 재생 시 | `handleBriefAudio` 는 한 파트를 **단발 TTS 로 굽지 않는다** — `BRIEF_TTS_CHUNK_CHARS`(420자·각 청크에 두 화자 포함) 단위로 쪼개 청크마다 스타일 지시를 다시 실어 `Promise.all` 병렬 생성 → 청크별 RMS 를 최대 청크에 맞춰 정규화(피크 리미팅) → `BRIEF_TTS_GAP_MS`(140ms) 무음으로 이어붙여 WAV 서빙. **뒤로 갈수록 성량이 줄고 속도가 빨라지던 프로소디 드리프트 대응**(§9). 총 문자 수 동일 → TTS 과금 변동 없음 |
| **지난 호 (저장분 · 회차)** | 자동 | 상시 | `GET /api/briefs` → R2 `brief_` 키에서 날짜 추출 + 각 날짜 `p0`의 `headline`·`no` 를 읽어 **「제N호 · 날짜 · 제목」 한 줄씩**(뉴스레터 「지난 호」 형식 · 최신순 · 최근 60호까지 제목 조회). **회차 번호 `no`는 p0 생성 시점에 박아 저장**(기존 텍스트 회차 수 +1)하므로 이후 목록이 바뀌어도 불변이고, 옛 회차는 날짜 오름차순 순번으로 폴백한다. 행 클릭 = 그 호 열람(`?d=YYYY-MM-DD`). **보관 자체가 캐시** — 따로 커밋하지 않는다 |
| ↳ 「다시 만들기」 | 수동 | 필요 시 | `part=0&regen=1` — 그날치 **텍스트(p0)만** 새 라이브 값으로 덮어쓴다(대담·오디오는 안 건드림) |
| ↳ 「대담 다시 굽기」 | 수동 | 필요 시 | 대담 대본(`part=1·2&regen=1`)과 오디오(`brief-audio?...&regen=1`)를 강제 재생성 후 재생. 대담·오디오는 그날 최초 열람 때 한 번만 구워져 캐시되고 이를 다시 굽는 UI 가 없었다 → **worker 프롬프트 변경 배포 후 그날 캐시를 새 순서로 다시 굽는 용도.** Claude 대담+Gemini TTS 비용이 들어 텍스트 「다시 만들기」와 분리(별도 버튼) |

> **저장 시점 = 첫 열람 또는 크론 워밍(가동 중).** 06 회차는 첫 열람 때 워커가 생성해 저장하는데, 아침에 아무도 안 열면 그날 회차가 빈다(「지난 호」 결번). 이를 막으려고 **`daily-brief-slack.mjs`(07:45 KST 크론)가 직접 게이트에 로그인(`/__auth`)해 `/api/brief?part=0` 을 선호출**, 오늘 회차를 미리 굽는다(`warmBrief()`). 리포 시크릿 **`SITE_PASSWORD`** + `daily-brief-slack.yml` run 스텝 `env:` 전달 **완료(2026-07-20)** → 워밍 가동 중이다. 워크플로에 **`BRIEF_WARM_PODCAST: "1"`** 이 있어 텍스트 p0 뿐 아니라 **팟캐스트 p1·p2 대본까지 사전 생성**된다(첫 재생 지연 제거). 시크릿·env 가 없으면 워밍은 조용히 건너뛰고 슬랙 본문·링크는 그대로 나간다.
> **narrative ≠ numbers** — 브리핑은 라이브 값을 읽어 말할 뿐 `gamma`·`judgment`·`holdings`·`earnings` 어느 것도 쓰지 않는다.

### 07 메모 (`v-memo`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 자유 메모 | 수동 | 필요 시 | `reviews.json` (`entries` 배열 · 주간 리뷰 포함) |

### 외부 채널 — 슬랙 데일리 브리핑 (6탭 밖 · 사이트 미노출)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **슬랙 데일리 브리핑(뉴스레터 본문)** | 자동(cron) | **07:45 KST 월~금**(US 마감 후) | `daily-brief-slack.yml` · `scripts/daily-brief-slack.mjs` → `chat.postMessage`. 본문 = **①매크로 게이트 보드(3중 AND · 축별 현재값·트립 임계·점등)+등급 판정 한 줄 ②레이어 갭 상위 4(비중 vs 적정밴드·오버/언더 %p) ③지표(나스닥·美 10Y·WTI·코스피·F&G) ④가전 뉴스 5건 ⑤듣기·06 링크**. **임계·밴드·판정식은 러너가 `index.html` 에서 통째로 추출해 쓴다**(`const TH` · `function evalGate` · `let TARGETS` 정규식 → `new Function`) — 슬랙 스크립트에 임계를 **다시 정의하지 않는다**(§1). 파싱 실패 시 판정 블록만 조용히 생략하고 지표·뉴스·링크는 그대로 나간다. CNN F&G는 로컬 `signals.json`(라이브 엔드포인트가 러너 IP를 418 차단) |
| **데일리 브리핑 팟캐스트 (2인 대담 · 약 5분)**(2026-07-19 신설) | 자동(열 때 생성·R2 날짜 캐시) | 하루 1회분(첫 접속 시 생성) | 단독 페이지 **`brief.html`** → `GET /api/brief?part=1\|2` (worker `handleBrief`). 라이브 `signals`·`gamma`·`holdings`·`calendar`·`signal_log`·`judgment`를 워커가 읽어 **진행자(`host`)+애널리스트(`ana`) 2인 대담 대본**(합 18~22발언·군더더기 제거·정보 밀도 유지)을 Claude(opus-4-8)로 생성 → R2 `brief_{YYYY-MM-DD}_p{1,2}.json` 캐시. **파트 분할 이유** = 비스트리밍 1회로 뽑으면 `api.anthropic.com` ~100s 한도에 근접 → part1(맥박·게이트·지수) 먼저 반환해 재생을 시작하고 part2(보유 마감·뉴스·리밸런싱·볼 것·**스틸맨**)는 재생 중 뒤에서 받아 이어붙인다. **대본 순서는 텍스트 회차(`part=0`)와 동일**하다 — 듣기와 훑기가 갈라지지 않게 `BRIEF_PART[1·2]` 가 같은 섹션 순서를 강제한다. 낭독 = **① 고품질 Gemini 오디오**(`GET /api/brief-audio?part=1\|2` · worker `handleBriefAudio` — 대본 R2 캐시를 `gemini-3.1-flash-tts-preview` 멀티스피커 「The Energetic Co-Host」 톤·보이스 Puck/Kore 로 구워 **WAV** 로 서빙 · R2 `briefaud_{날짜}_p{n}.wav` 캐시 · 첫 재생 1회만 굽고 이후 즉시 · 모델·보이스는 워커 env `GEMINI_TTS_MODEL`·`GEMINI_VOICE_HOST/ANA` 오버라이드) **② 실패 시 브라우저 TTS 폴백**(ko-KR 품질 점수순 2인 · 진행자 rate 1.12·pitch 1.14 / 애널리스트 rate 1.06·pitch 1.0). `?d=YYYY-MM-DD` 과거분·`?regen=1` 재생성 |
| ↳ **오디오(MP3) 슬랙 첨부판 = 미가동(제안본)** | — | — | `scripts/proposed-workflows/daily-brief-podcast-audio.{yml,md}` + `brief-tts.mjs`. **위 `/api/brief-audio` 는 사이트 안 재생용**(워커 키·R2, 선행 없음). 이 제안본은 그걸 **슬랙 DM 에 파일로 밀어넣는** 별도 경로 — 잠금화면 재생용이며 **선행 3건(슬랙 `files:write`·`SITE_PASSWORD`·Actions `GEMINI_API_KEY`) 전부 운영자 수동**(§8) |

> **규율:** 브리핑 대본은 **narrative 층**이다 — 라이브 게이트 값을 *읽어서 말할* 뿐, `gamma`·`judgment`·`holdings`·`earnings` 어느 것도 쓰지 않는다. 대본 프롬프트에 §1 불변 규율(결론 먼저·AND 게이트·narrative≠numbers·두 시계 분리·강등 트리거=가격 vs EPS 리비전 속도)이 시스템 프롬프트로 박혀 있다.

---

## 4. 케이던스 — 언제 무엇을

| 주기 | 자동 | 수동(운영자/Claude) |
|---|---|---|
| 일별 (06:12·18:12) | 뉴스 수집·스크리닝·요약·digest | signal_log 인테이크(narrative) |
| 일별 (06:37·18:37) | 시세·차트·신호·알파 업데이트 | — |
| 세션마다 | — | **관점 트리아지(§0-5)** — 지지↑ 관점 `until`·`review` 대조 → 발동/만료/유지 |
| 주간 (금요일) | — | **DXI 현물가 갱신**(`dxi.json` · 스케줄 태스크) · holdings 동기화 · reviews.json 주간 리뷰 append |
| 실적 시즌 | — | earnings.json 갱신 · γ·stage 재채점 |
| 수시 | — | judgment override · signal_log 확정 사건 |

---

## 5. D-N 플레이북

- **D-5 이전**: 실적 추정(컨센·가이던스 갭) 점검 · earnings.json 확인
- **D-1**: `judgment` wk 중립화(신규 방향성 포지션 금지)
- **D-Day 장 마감 후**: 실적 수치 반영 — 비트/미스 여부 → earnings.json 갱신 → γ·stage 재채점 판단
- **D+1**: signal_log에 실적 인테이크(확정 사건이면 숫자 파일 변경 트리거 검토)

---

## 6. 파이프라인 상세

### 6-1. 자동 워크플로 (`.github/workflows/`)

| 워크플로 | 트리거 | 주요 출력 |
|---|---|---|
| `fetch-prices.yml` | cron 06:37·18:37 | `prices.json` · `charts.json` |
| `update-signals.yml` | cron 06:37·18:37 | `signals.json` |
| `fetch-news.yml` | cron 06:12·18:12 | `news.json` · `news_digest.json` · `news_archive.json` |
| `update-prices.yml` | manual / schedule | E-군집 파생(`derive-cycle-e.mjs`) |
| `sync-holdings.yml` | `repository_dispatch` (Drive Apps Script) | `holdings.json` |
| `apply-patch.yml` | `repository_dispatch` | `index.html` 패치 적용 |
| `deploy.yml` | push to main (paths 필터) | Cloudflare Workers 배포 |
| `claude-pr-gate.yml` | PR open/sync | 유효성 검사 · auto-merge |

### 6-2. PR 워크플로 (코드 변경)

1. `claude/*` 브랜치 생성
2. 커밋 push
3. `base: main` PR 생성
4. `claude-pr-gate.yml` validate 통과
5. **auto-merge (squash)** — 승인 대기 없이 한 턴에 머지까지
6. 머지 여부·squash SHA 명시 보고 ('queued'로 종료 금지)

### 6-3. index.html 수정 규칙

- **전체 재작성 금지** — 앵커 기준 부분 치환
- 4KB+ b64 페이로드 → `patches/*.b64` 파이프라인(미니파이 + `base64 -w0` + **커밋SHA핀 raw 디코드 md5 왕복**)
- **크기 일치 ≠ 무결성 보증** — 반드시 md5 왕복 검증
- `.github/workflows/` 편집 → 403 → 운영자 수동

### 6-4. 관련 기사 정리 규칙 (signal_log 인테이크)

기사 정리 시 아래 규칙을 항상 적용한다:

1. **동일 이벤트** (예: 중앙은행 결정) → items[] 1개로 merge, srcs[]에 원본 기사 전부 나열
2. **같은 테마 내 다른 각도** (예: capex 규모 vs capex 리스크) → 별도 items[] 엔트리
3. **섹션 귀속 오류** (예: AI캐펙스 섹션에 메모리 기사) → 올바른 레이어 섹션으로 이관, items[] tag에 이관 출처 명기
4. **섹션명-내용 불일치** (예: '미국 CPI' 섹션에 한은 기사 다수) → rename 플래그, 신규 섹션 분리 제안
5. **모든 뉴스 기사 = narrative** → signal_log only, 숫자 파일(earnings/judgment/holdings) 불변
6. **배치 로그 시** date = 배치 첫 기사 날짜, source에 날짜 범위 명기, at = 로그 시점

### 6-5. signal_log 인테이크 포맷

```json
{
  "date": "YYYY-MM-DD",
  "at": "YYYY-MM-DDTHH:MM+09:00",
  "source": "설명 — narrative≠numbers",
  "srcs": [{"label": "기사 제목 (날짜)"}],
  "items": [{"tag": "레이어·토픽", "layer": "L?", "col": "#색상", "html": "<b>요약</b> 내용"}]
}
```

### 6-6. LLM 호출 비용 규율 (2026-07-20 신설)

**원칙 — 결정론 우선 · 판단만 Opus · 검색은 상한.**

| # | 규율 | 내용 |
|---|---|---|
| ① | 결정론 우선 | 시세·변동성·수익률·게이트 임계는 **무료 피드 직산**(Yahoo 일봉·네이버·CNN F&G). LLM 은 심볼 해석 실패 등 **폴백 경로에서만** |
| ② | 모델 계층 | **판단·생성**(브리핑 p0·p1·p2, 원탁 토론, 1인 심층 자문, 베어 케이스, 인사이트 추출) = `claude-opus-4-8` · **추출·요약·수치 회수**(관점 요약 2종, σ·μ 폴백) = `claude-sonnet-5` |
| ③ | 검색 상한 | `web_search` 툴에는 **반드시 `max_uses: 3`**. 검색 턴마다 전체 컨텍스트가 재전송돼 입력이 2차식으로 증가한다 |
| ④ | 출력 상한 | `max_tokens` 는 실제 필요분까지만 — 출력 토큰이 생성비의 대부분이다 |

**실측 근거(2026-07-19 콘솔).** `da-market-insight` 3.72M 토큰 = $1.11(실효 **$0.30/M** · Sonnet+캐시 히트) vs `stock price` 0.25M 토큰 = $2.23(실효 **$8.93/M** · Opus+무제한 검색 7회). **30배 차이의 원인은 토큰량이 아니라 모델·검색 정책이었다.**

**적용 지점(worker.js).** `handleEstimate` = `localVolDrift()` 결정론 경로 우선(비용 0·검색 0회) → 실패 시에만 Sonnet+`max_uses:3` 폴백 · `anthropicText()` 검색 상한 · 관점 요약 2종(`handleCouncilIntake`·`handleCouncilSummary`) Sonnet.

**미적용(후속).** `cache_control` 프롬프트 캐싱 — 워커 시스템 프롬프트가 짧아 최소 캐시 단위(1024토큰) 미달. `BRIEF_SYS_BASE` 계열이 커지면 재검토.

---

## 7. 자기갱신 매핑표 (무엇이 바뀌면 어디를 고치나)

| 변경 내용 | STYLE_GUIDE | OPS |
|---|---|---|
| 디자인 토큰·컴포넌트·레이아웃 | ✅ `TOKENS:BEGIN~END` 자동 생성 구역 제외 | — |
| 신규 메뉴·뷰 추가 | ✅ §6·§7 레퍼런스 구현 체크리스트 | ✅ §3 정보 인벤토리 |
| 정보 소스·주기·자동/수동 변경 | — | ✅ §3 |
| 워크플로·파이프라인·PR 규칙 | — | ✅ §6 |
| 불변 규율 변경 | — | ✅ §1 |
| 알려진 이슈·버그 | — | ✅ §8 |
| AXIS_RULES 축 추가/수정 | — | ✅ §3 축 정규화 설명 갱신 |
| 세션 도구 선택·데이터 출처(무엇을 JSON 에서 읽고 무엇만 검색하나) | — | ✅ §1 규율 + §3-0 표 |

---

## 8. 알려진 이슈 · 미완료 항목

- **E-군집 자동화** (`update-prices.yml` manual edit): GitHub App lacks workflows write scope (403) → 운영자 수동 dispatch 필요
- **`update-calendar.yml` 미등록(수동)**: `derive-calendar.mjs`(01 다가오는 일정 프루닝·asOf) 크론 미등록 — App workflow write 부재(403). 런타임 `renderCalNow()`가 오늘 기준 재계산하므로 표시는 신선(파일 `asOf`만 수동 refresh까지 스테일 가능). 신규 이벤트는 `calendar.json` 수기.
- **⏳ 저녁 fetch-prices 지연**: cron 18:37 KST가 실제로 19:xx~20:xx에 돌고 있음 — 원인 미확인(Actions 큐 지연 추정). 모니터링 중.
- **관점 라이프사이클 LLM 자동 제안 미구현(부분 완화)**: 03 「🕔 라이프사이클」 편집은 **모달 + 필드별 「보기 칩」 선택식**으로, 클라 템플릿(게이트 어휘·8레이어·관점 티커·thesis-break 패턴)이 `hyp`·`trig`·`until` 후보와 `review` 날짜 프리셋을 즉시 제시한다(수동 4연타 부담 해소·오프라인·기존 채택분 전부). 다만 이는 **템플릿**이라 관점 고유 맥락은 못 맞춘다 — `/api/insight`(worker) 추출 시 `hyp`·`until`을 LLM으로 관점별 맞춤 자동 채우는 건 여전히 후속 PR(③). 신규 채택은 `review`=+14d 자동 유지.
- **DXI 자동 피드 없음(2026-07-17)**: DXI 지수는 포털 게이트라 무료 피드 없음 → 매주 금요일 스케줄이 TrendForce 현물가로 `dxi.json` append.
- **브리핑 팟캐스트 오디오판(A안) 대기(2026-07-19)**: MP3를 슬랙에 직접 첨부하려면 ①슬랙 봇 **`files:write`** 스코프 추가 후 재설치 ②리포 시크릿 **`SITE_PASSWORD`** ③리포 시크릿 **`GEMINI_API_KEY`** ④`.github/workflows/` 배치 — **전부 운영자 수동**(App workflows write 403). 제안본은 `scripts/proposed-workflows/daily-brief-podcast-audio.md` 체크리스트. 그 전까지는 링크형(B안)만 가동.
- **모닝 브리핑 크론 워밍 — 가동(2026-07-20 해소)**: `daily-brief-slack.mjs` `warmBrief()`(게이트 `/__auth` 로그인 → `/api/brief?part=0` 선호출) 배선 + 리포 시크릿 `SITE_PASSWORD` + `daily-brief-slack.yml` run 스텝 `env:` 전달까지 **3건 모두 완료** → 07:45 KST 크론이 오늘 회차를 미리 굽는다(「지난 호」 결번 방지). 워크플로에 `BRIEF_WARM_PODCAST: "1"` 도 들어가 **팟캐스트 p1·p2 대본까지 사전 생성**된다(첫 재생 지연 제거·생성비는 매일 발생하나 5분 압축분). 로그인 실패·타임아웃이면 `warmBrief()`는 조용히 건너뛰고 슬랙 본문·링크는 그대로 나간다.
- **브리핑 링크는 비밀번호 게이트 뒤**: 슬랙에서 처음 열면 워커 로그인 화면이 뜬다(기기·인앱 브라우저별 1회). 쿠키 `Max-Age` 만료 시 재로그인.
- `prices.json.warn = lazr chart 43.47 vs quote 41.35` — LAZR 비보유·무시 가능

---

## 9. 갱신 이력

- 2026-07-20 22:02 · **06 투자 캘린더 「지나간 일정 접기」 복원 — `foldPastCal()` 재배선.** SimpleorNothing 지시. 06 탭 삭제 때 호출부가 사라져 미동작이던 것을 `.cal-jump`가 `#v-cal` 열 때 호출(멱등). 과거 행 기본 접힘·「지나간 일정 N건」 바 클릭 펼침. 숫자·데이터 불변(표시만). STYLE_GUIDE §갱신이력 동반 · check-docs·Playwright 통과.

- 2026-07-20 21:20 · **01 「다가오는 일정」 헤더에 「전체 캘린더 →」 링크 — 삭제된 06 투자 캘린더(`#v-cal`) 상세 타임라인 재연결.** SimpleorNothing 지시. `.cal-jump` 링크+역링크, `document` 위임 핸들러로 뷰 토글. 숫자·데이터 불변(표시 경로만). STYLE_GUIDE §6-1 동반.

- 2026-07-20 16:20 · **06 듣기 오디오 프로소디 드리프트 수정 — 뒤로 갈수록 작아지고 빨라지던 문제 해소.** SimpleorNothing 리포트. 원인 = `handleBriefAudio` 가 한 파트(9~11발언·약 2분 30초)를 Gemini 멀티스피커 TTS **단발 호출**로 구워, 스타일 지시가 앞부분에만 강하게 걸리고 뒤로 갈수록 성량 감쇠·속도 상승이 WAV 에 각인됐다(재생 문제 아님 · `brief.js` 는 고정 배속 재생만 한다). 수정 3겹: ①`briefTtsChunks()` 청크 분할(420자·두 화자 포함·짧은 꼬리는 직전 청크 병합) 후 청크마다 스타일 프롬프트를 다시 실어 `Promise.all` 병렬 생성 ②`pcmRms()`·`pcmGain()`(0.5~4 클램프+피크 리미팅)으로 청크별 성량을 최대 청크에 맞춰 정규화, `pcmJoin()` 이 140ms 무음으로 이어붙임 ③`BRIEF_TTS_STYLE` 에 성량·속도 유지 지시 + 청크에 구간 안내 추가. **총 문자 수 동일 → 과금 변동 없음** · 엔드포인트·R2 캐시 키·클라이언트 계약·폴백 무변 · **신규 `:root` 토큰 0**. `node --check` 통과 · 헬퍼 단위 스모크 통과. **적용 확인은 06 「대담 다시 굽기」 필요.** narrative≠numbers. §3 06 듣기 행 동반.
- 2026-07-20 14:40 · **주가 확인 비용 절감의 남은 절반 — 세션 도구 우선순위표(§3-0) 신설.** SimpleorNothing 지시("절감 방안 모두 적용 · 지시문도 반영"). 같은 날 14:10 패치가 **워커** 쪽 원인(σ·μ 를 Opus+`web_search` 로 조사하던 `handleEstimate`)을 제거했지만, 「stock price」 키 비용의 나머지는 **세션이 이미 있는 값을 웹에서 다시 찾은 것**이었다. 라이브 스크립트 확인 결과 시세는 `fetch-prices.mjs`(Yahoo chart·네이버 siseJson), **목표가·리비전 추세는 `fetch-gamma.mjs`**(`quoteSummary.targetMeanPrice` + `targetHist` 120포인트), **VIX·VIX3M·CNN F&G·나스닥 드로다운은 `fetch-signals.mjs`** 가 전부 **무료로** 자동 수집 중 — 즉 **MU γ-닫힘 트리거 ①과 매크로 게이트 3중 AND 전부가 JSON 만으로 판정 가능**하다. 검색이 나간 원인은 데이터 공백이 아니라 §0 「라이브 재페치」를 *웹 재확인*으로 이행한 것. ①**§3-0 표 신설** — 값별 1순위 SoT·자동 수집 경로·web_search 허용(❌ 7행 / ✅ 4행 = 커버리지 밖 신규 후보·실적 D-Day·서술형 뉴스·중앙은행 확률), 인용 시 `asOf` 병기 의무, 스틸맨 동반. ②**§1 규율 1줄** — 「세션도 같은 규율 · 라이브 재페치 = JSON 재페치 · 예외 4」(14:10 의 「LLM 호출은 판단에만」이 워커를 묶었다면 이건 세션을 묶는다). ③§7 매핑표 1행. **코드 무편집** — worker.js 는 14:10 에서 이미 `max_uses: 3`·sonnet-5 다운시프트·`localVolDrift()` 적용 완료라 추가 변경 없음(라이브 재확인). index.html·CSS·워크플로 무편집 · 신규 토큰 0(check-docs 무관). narrative≠numbers — 도구 규율일 뿐 숫자·판단 파일 불변. 예상 절감: 해당 키 일비용 $2.23 → $0.2~0.3.
- 2026-07-20 14:10 · **LLM 호출 비용 규율 신설 + 워커 4개 호출 지점 적용 (σ·μ 추정 탈LLM화).** SimpleorNothing 지시("절감 방안 모두 적용"). 콘솔 실측에서 `stock price` 키가 하루 비용의 50%(0.25M 토큰에 $2.23 · 실효 $8.93/M)를 먹고 있었고, 원인은 `handleEstimate` 가 **연 변동성을 Opus+무제한 `web_search` 로 「조사」**하고 있었기 때문 — 표준편차×√252 는 결정론 계산이지 추론 대상이 아니다. ①**`localVolDrift()` 신설** — Yahoo v8 chart 1y 일봉 종가로 로그수익률 표준편차 연율화, 드리프트는 실현 CAGR 을 시장 8%로 수축 후 −10~+20% 클램프(실현수익률 ≠ 「합리적 가정」). `handleEstimate` 는 이 경로를 **먼저** 타고 성공 시 LLM 을 아예 호출하지 않는다(응답 `content[0].text` JSON 스키마 불변 → 클라 무편집). `ANTHROPIC_API_KEY` 부재 503 체크를 폴백 직전으로 이동해 키 없이도 추정이 돈다. ②**폴백 다운시프트** — opus-4-8·1500 → sonnet-5·800 + `max_uses: 3`. ③**`anthropicText()` 검색 상한** `max_uses: 3`(무제한 → 3). ④**관점 요약 2종**(`handleCouncilIntake`·`handleCouncilSummary` · 각 700토큰 추출 작업) opus → sonnet-5. **판단·생성 경로(브리핑 p0·p1·p2·원탁 토론·1인 심층 자문·베어 케이스·인사이트 추출)는 전부 Opus 불변.** `node --check`(worker) 통과 · 합성 GBM 252일 단위검증(σ=30% 주입 → 산출 29.2%) · index.html·CSS·워크플로 무편집(신규 토큰 0 → check-docs 무관). narrative≠numbers — 호출 정책일 뿐 숫자·판단 파일 불변. §1 규율 1줄 · §3 05 주석 · **§6-6 신설**. **후속: `cache_control` 프롬프트 캐싱은 워커 sys 프롬프트가 1024토큰 미달이라 보류 · `#v-prob` 안내 문구("웹에서 … 조사하는 중")는 index.html 대용량 푸시 리스크로 다음 패치 회차.**
- 2026-07-20 12:40 · **06 「오늘 브리핑 듣기」 대담 순서를 텍스트 회차와 동일한 7섹션으로 정렬.** SimpleorNothing 지시("듣기 클릭 시 위 내용대로"). #452 로 텍스트 회차(`part=0`)만 9섹션이 됐고 **대담(`part=1·2`)은 옛 흐름(게이트→레이어 갭→상대가치 / γ→일정→로그→액션)** 이라 훑기와 듣기가 갈라져 있었다 → `BRIEF_PART[1·2]` 재정의: 전반부 = 결론 → **①시장 맥박**(`marketPulse` 축·방향, 위험 개수 먼저·무거운 2~3축만) → **②매크로 게이트 3중 AND** → **③한·미 종합지수**(`indices` · 마감일이 다르면 휴장·시차 명시) / 후반부 = **④주요 보유종목 마감**(`holdingCloses` 중 움직임 큰 4~6개만·전일+5거래일·γ단계·닫힘 트리거) → **⑤주요 보유종목 뉴스**(레이어 리드스루 + 숫자 파일 불변 명시) → **⑥리밸런싱 가이드**(실행 가능 여부 먼저·**언더웨이트 우선**·게이트 잠김이면 가정형·매매 지시 금지) → **⑦오늘·내일 볼 것** → **스틸맨** → 클로징. `BRIEF_SYS_BASE` 의 압축 규약 필수 포함 항목도 새 7섹션으로 동기화하고 낭독 평문 치환에 `S&P500`·`F&G`·`%p` 추가. **입력은 이미 #452 에서 확장돼 있어 `briefSituation` 무편집** — 대담이 같은 `situation` 을 공유하므로 `marketPulse`·`indices`·`holdingCloses`·`upcomingEarnings` 를 그대로 받는다. **분량 5분·발언 18~22개·`max_tokens` 4000·파트 분할·모델(opus-4-8)·TTS 경로는 전부 불변**(섹션이 늘었으니 말수가 아니라 발언당 밀도로 흡수). `node --check`(worker) 통과 · check-docs 통과(토큰 24종 무변) · index.html·brief.js·워크플로 무편집. narrative≠numbers — 대본은 라이브 값을 읽어 말할 뿐 숫자·판단 파일 불변. §3 06 듣기 행·외부 채널 팟캐스트 행 갱신 · STYLE_GUIDE 동반.
- 2026-07-20 11:20 · **06 모닝 브리핑 구성 전면 개편 — 6섹션 → 9섹션(맥박·지수·마감·뉴스·일정·리밸런싱 신설).** SimpleorNothing 지시("이대로 모닝브리핑 만들게 변경해줘" · 직전 세션 수기 브리핑 구성을 정식 회차 포맷으로 승격). 기존 텍스트 회차는 결론·게이트·레이어·볼것·액션·스틸맨 6섹션이라 **아침에 시황·지수·내 종목 마감을 따로 찾아야 했다** → 한 회차로 끝나게 입력·출력·렌더를 함께 넓혔다. ①**입력 확장**(`briefSituation`) — `pulse.json`(01 시장 맥박 동인 = 리스크 카드 축·방향·렌즈·귀결) · `charts.json`(코스피·나스닥·S&P 지수 + 보유 종목 종가 → **전일대비·5거래일** 파생) · `earnings.json`(보유 종목 실적 D-N) · `index.html` `TARGETS`(적정밴드) 추가, `signal_log` 4→6건 + 항목 태그·레이어 동반. ②**밴드는 정규식 파싱**(`briefBands`) — Workers 는 동적 코드 평가가 막혀 슬랙 러너의 `new Function` 경로를 못 쓴다. 임계·밴드를 브리핑에 **다시 정의하지 않는다**(§1) — SoT 는 여전히 `index.html`. ③**출력 9섹션 고정**(`BRIEF_TEXT_SYS`) — `risks`·`indices`·`holdSummary`+`holdings`·`news`·`upcoming`·`rebalance` 신설, 보유 마감은 **전체 요약 한 단락 + 유의미한 6~9개만**(전 종목 나열 금지), `rebalance.verdict` 는 게이트 잠김이면 **가정형임을 못박는다**(매매 지시로 읽히지 않게) · rows 는 언더웨이트 우선(애크먼 유한자본 규율). ④**렌더**(`brief.js`) — 맥박 카드(방향 배지)·지수·마감·뉴스·일정·리밸런싱 표 추가, 등락 부호에만 색(`.up`/`.dn` — 부호 없으면 무채색), 잠김 판정은 `--st-mature` 강조. **신규 `:root` 토큰 0**(`.br-*` 스코프 스타일만) · index.html·워크플로 무편집. 텍스트 회차만 `max_tokens` 4000→6500(섹션 9개라 잘림 · 대담 파트는 100s 한도 여유로 4000 유지). `node --check`(worker·brief) 통과 · `check-docs` 통과(토큰 24종 무변) · 스모크: 밴드 8행·L3 30~32 파싱 / 지수·종목 시계열 파생 / 없는 키 null / jsdom **섹션 9개·순서·색 클래스·구 스키마 하위호환·에러 경로**. narrative≠numbers — 브리핑은 라이브 값을 읽어 말할 뿐 숫자·판단 파일 불변. §3 06 인벤토리 2행 갱신 · STYLE_GUIDE §4-1 동반.
- 2026-07-20 09:30 · **모닝 브리핑 크론 워밍 선행 해소 — 워크플로 env 반영 확인(문서만).** SimpleorNothing이 `.github/workflows/daily-brief-slack.yml` run 스텝 `env:` 에 `SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}` 와 `BRIEF_WARM_PODCAST: "1"` 을 직접 추가(App workflows-write 403이라 운영자 수동 경로). 라이브 raw 재페치로 반영 확인. → 07:45 KST 크론이 게이트 로그인 후 `/api/brief?part=0` 을 선호출해 오늘 회차를 굽고, **팟캐스트 p1·p2 대본까지 사전 생성**한다(결번 방지 + 첫 재생 지연 제거). §3 06 저장시점 주석·§8 이슈를 **미해소 → 가동**으로 갱신. 코드·UI·워크플로 무편집 · 숫자·판단 파일 불변(narrative≠numbers).
- 2026-07-20 02:00 · **대담 대본 8분→5분 압축(비용 절감 · 품질 무손실).** SimpleorNothing 지시(비용 절감안 #1 채택 · "분량 줄이되 품질 유지"). 출력 토큰이 브리핑 생성비의 ~80%라 대담 분량이 곧 비용 → `BRIEF_SYS_BASE`에 **「5분·양 파트 합 발언 18~22개로 압축」** 규약 추가(인사말·맞장구·앞말 되풀이 같은 **군더더기 발언만 제거**, 발언당 정보 밀도↑ — 게이트·레이어·종목·액션·**스틸맨**은 전부 유지, 내용이 아니라 말수를 줄인다). `BRIEF_PART[1·2]` 각 「약 4분·발언 14~18개」 → **「약 2분 30초·발언 9~11개」**. 대담 출력·Gemini TTS 각 **~30% 절감**(내용 무손실이라 오히려 훑기·듣기 군더더기↓). 사용자 노출 문구 8분→5분 동기화(`brief.html`·`brief.js` 인뷰 라벨·`daily-brief-slack.mjs` 링크). 텍스트판(p0)·모델(opus-4-8)·파트 분할·규율 6개는 불변. `node --check`(worker·brief·slack) 통과 · check-docs 통과(토큰 24종 무변) · jsdom 스모크(HiFi+폴백) 통과. narrative≠numbers — 낭독 분량 규약일 뿐 숫자·판단 파일 불변. §3 팟캐스트·오늘 브리핑 행 갱신.
- 2026-07-20 01:10 · **06 모닝 브리핑 크론 워밍 배선 — 슬랙 크론이 직접 게이트 로그인해 오늘 회차를 굽는다.** SimpleorNothing이 `SITE_PASSWORD` 리포 시크릿 추가 완료 → 후속. 06 회차는 「첫 열람 시」 생성이라 아침에 아무도 안 열면 그날이 비어 「지난 호」에 결번이 뚫린다 → `daily-brief-slack.mjs`에 **`warmBrief()`** 추가: `/__auth`에 `SITE_PASSWORD`를 POST해 `tb_auth` 쿠키를 받고(제안본 `brief-tts.mjs`의 `login()` 패턴 재사용·`redirect:"manual"`), `/api/brief?part=0`을 GET해 오늘 회차를 미리 생성·R2 캐시한다. 지표 수집과 **동시 실행**하고 `await`하되 내부 try/catch로 **best-effort** — 로그인 실패·시크릿 부재·타임아웃(로그인 15s·생성 120s) 어느 쪽이든 슬랙 본문·링크는 그대로 나간다. 기본 **p0만**(결번 방지 최소분·어차피 첫 열람 때 생길 생성을 당길 뿐이라 추가 비용 ~0), 팟캐스트 p1·p2는 `BRIEF_WARM_PODCAST=1` 선택. **남은 1건 = 운영자 수동**: `daily-brief-slack.yml` run 스텝 `env:`에 `SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}` 한 줄(App workflows-write 403이라 스크립트 PR로는 못 넣음) — 그 줄이 들어가야 러너 env가 채워져 워밍이 실제로 돈다. `node --check`(slack) 통과 · check-docs 통과(토큰 24종 무변) · 로컬 목 게이트로 4케이스 스모크(시크릿 부재 스킵·오답 무throw·p0만·p0+p1+p2). narrative≠numbers — 워밍은 라이브 값으로 회차를 생성할 뿐 숫자 파일 불변. §3 06 저장시점·§8 워밍 항목 갱신. index.html·워크플로 무편집.
- 2026-07-20 00:45 · **브라우저 재생을 고품질 Gemini 오디오로 승격 — 사이트 안에서 「The Energetic Co-Host」 그 목소리(선행 없음).** SimpleorNothing 지시("완전히 통일된 고품질 음색으로 진행해줘" · 전달처 = 브라우저 인앱). **핵심 발견: 워커에 이미 `GEMINI_API_KEY`·R2 가 있다** → 슬랙 MP3판(A안, 선행 4건 운영자 수동)을 안 거치고, **워커가 대본을 오디오로 구워 플레이어에 바로 준다.** ①worker `handleBriefAudio`(+`GET /api/brief-audio?part=1\|2`) — R2 대본(`brief_{날짜}_p{n}.json`)을 `gemini-3.1-flash-tts-preview` 멀티스피커(진행자 Puck·애널리스트 Kore·「Energetic Co-Host」 STYLE)로 TTS → base64 PCM → **WAV(44B 헤더)** 로 서빙, R2 `briefaud_{날짜}_p{n}.wav` 캐시(첫 재생 1회만 굽고 이후 즉시 · `briefaud_` 접두라 「지난 호」 `brief_..._p{n}.json` 정규식과 무충돌). 모델·보이스는 워커 env(`GEMINI_TTS_MODEL`·`GEMINI_VOICE_HOST/ANA`) 오버라이드. ②`brief.js`(06 인뷰)·`brief.html`(단독 · 슬랙 「듣기」 링크 도착지) 양쪽에 **HiFi 재생 레이어** 추가 — 재생 시 오디오 우선 로드, 되면 파트 스트림 재생(말풍선 하이라이트 = 발언 글자수 비례 근사·클릭 = 그 대목부터 seek·배속=playbackRate·음소거=muted), **실패하면 기존 브라우저 TTS 로 자동 폴백**(무해). **index.html 무편집·신규 :root 토큰 0·워크플로 무편집.** `node --check`(worker·brief·brief.html script) 통과 · check-docs 통과(토큰 24종 무변) · WAV 헤더 단위검증(RIFF/WAVE/fmt/data·크기·s16le 24kHz) · jsdom 스모크 양쪽(HiFi 오디오 재생 경로 + 오디오 불가 시 TTS 폴백) 통과. narrative≠numbers — 오디오는 대본을 읽어 말할 뿐 숫자·판단 파일 불변(읽기 전용). §3 오늘 브리핑·오디오 행 갱신. **슬랙 MP3판(A안)은 잠금화면 재생용 별도 경로로 그대로 대기(§8).**
- 2026-07-20 00:20 · **06 모닝 브리핑을 「뉴스레터」 형태로 — 슬랙 본문 승격 + 회차 번호·제목 목록.** SimpleorNothing 지시(samsungda.net 뉴스레터와 같은 취지 · 선택 2건). ①**슬랙 본문 승격** — 링크만 던지던 메시지에 **매크로 게이트 보드(축별 현재값·트립 임계·점등 + 등급 판정 한 줄)**와 **레이어 갭 상위 4(비중 vs 적정밴드·오버/언더 %p)**를 실었다. 러너는 비밀번호 게이트를 못 넘어 `/api/brief` 를 못 읽으므로(§8) LLM 문장 대신 **결정론적 판정**을 직접 계산하되, **임계·밴드·판정식을 슬랙 스크립트에 다시 정의하지 않고 `index.html` 에서 통째로 추출**해 쓴다(`const TH`·`function evalGate`·`let TARGETS` → `new Function`) — §1 「임계 중복 정의 금지」 준수·SoT 단일. 파싱 실패는 판정 블록만 생략(지표·뉴스·링크 무영향). 실데이터 렌더 확인(0/3 잠김 · L3 +11.2%p 오버 · L4 −4.9%p 언더). ②**회차 개념** — `/api/briefs` 가 각 날짜 `p0`의 `headline`·`no` 를 읽어 **「제N호 · 날짜 · 제목」** 목록으로 낸다(최근 60호 제목 조회). `no` 는 **p0 생성 시점에 고정 저장**(기존 텍스트 회차 수 +1)이라 이후 불변이고, 옛 회차는 날짜 순번 폴백. 06 헤더도 「제38호 · 2026-07-19 · 오늘」 표기. **신규 :root 토큰 0**(`.br-iss` 스코프 행 스타일만 추가) · index.html·워크플로 무편집. `node --check`(worker·brief·slack) 통과 · check-docs 통과(토큰 24종 무변) · jsdom 스모크(회차 3행·제목 없는 호 폴백 문구·활성 표시·전환) 통과. narrative≠numbers — 판정은 라이브 값을 읽어 표시할 뿐 숫자 파일 불변. §3 06·외부 채널 행 갱신. **크론 워밍(아침 자동 발행)·주간 다이제스트는 여전히 미착수 — 전자는 `SITE_PASSWORD` 선행(§8).**
- 2026-07-19 23:55 · **브라우저 낭독 목소리를 「The Energetic Co-Host」 톤으로 재조정(B안 — 실제로 지금 사이트에서 들리는 판).** SimpleorNothing 지시("지금 브라우저에서 듣는 그 목소리를 바꿔줘"). 직전(23:40)은 미가동 오디오판(A)의 설정만 바꾼 것이라 실제 청취 톤은 그대로였다 → **`brief.js`(06 인뷰 플레이어)·`brief.html`(단독) 양쪽**의 `SPK` 튜닝을 교체: 진행자 rate 1.0→**1.12**·pitch 1.04→**1.14**(밝고 경쾌한 리드), 애널리스트 rate 0.98→**1.06**·pitch 0.98→**1.0**(차분하되 생동감). **피치를 늘 적용**(기존엔 두 보이스가 같을 때만) — 활기찬 톤 + 화자 분리, 상한 rate 1.7·pitch 1.6. 음성 선택 로직(ko-KR 품질 점수순 f/m 배정)은 그대로. 브라우저 TTS라 기기별 보이스 편차는 남지만 톤·속도는 공통 적용. `node --check`(brief) 통과 · check-docs 통과(토큰 24종 무변). narrative≠numbers — 낭독 파라미터일 뿐 숫자·판단 파일 불변. §3 오늘 브리핑 행 동반.
- 2026-07-19 23:40 · **오디오판(A) TTS 를 AI Studio 「The Energetic Co-Host」 팟캐스트판으로 맞춤.** SimpleorNothing 지시(AI Studio 스크린샷 — 「The Energetic Co-Host · Podcast style conversation」·모델 `gemini-3.1-flash-tts-preview`). `brief-tts.mjs`의 기본 모델을 `gemini-2.5-flash-preview-tts` → **`gemini-3.1-flash-tts-preview`**, 낭독 프롬프트를 「또박또박」 → **활기찬 공동 진행 연출 지시(STYLE)**, 보이스를 Kore/Charon → **Puck/Kore**(경쾌·또렷)로 교체. 모델·보이스·스타일 4개 전부 env(`GEMINI_TTS_MODEL`·`GEMINI_VOICE_HOST`·`GEMINI_VOICE_ANA`·`GEMINI_TTS_STYLE`) 오버라이드 — 운영자가 스튜디오에서 고른 값으로 교체 가능. 제안본 `.md`·`.yml`(선택 env 주석)·§3 오디오 행 동반. **여전히 미가동 제안본** — 승격 선행 3건(§8) 그대로. `node --check`(brief-tts) 통과. narrative≠numbers — 읽기 전용.
- 2026-07-19 23:05 · **06 모닝 브리핑 신설(`brief.js` 자가 마운트 + `/api/brief?part=0` + `/api/briefs`) — 메뉴 7탭으로.** SimpleorNothing 지시("알파맵에 06 모닝 브리핑 추가 · 매일 브리핑한 내용 저장 · 텍스트로 정리 + 오늘 브리핑 듣기"). 직전(21:40)에 만든 팟캐스트는 **사이트 밖 단독 페이지**라 매일 쌓이는 기록이 안 됐다 → 사이트 메뉴로 승격하고 보관을 붙였다. ①**텍스트 판 `part=0` 신설**(`BRIEF_TEXT_SYS`) — 대담과 같은 라이브 입력으로 결론·게이트 보드·레이어 갭 표·볼 것·액션·**스틸맨**을 구조화 JSON으로. 낭독 대본(part 1·2)과 **엔드포인트·캐시 스키마 공유**(`brief_{날짜}_p{0,1,2}.json`). ②`GET /api/briefs` — R2 `brief_` 접두 키에서 날짜 추출(페이지네이션 5회 상한) → 「지난 브리핑」 목록·날짜 클릭 열람. **보관이 곧 캐시라 리포에 파일이 늘지 않는다.** ③`brief.js` 자가 마운트 — nav에 `data-v="brief"` 탭을 **메모 앞**에 넣고 01~07 재번호(insight.js 재번호 뒤에 도는 멱등 루프), `#v-brief` 섹션을 `#v-memo` 앞에 주입. 「▶ 오늘 브리핑 듣기」는 인뷰 플레이어(말풍선·배속·음소거·클릭 재낭독). **index.html 무편집**(worker `<script defer src="/brief.js">` 주입 1줄) · **신규 :root 토큰 0**(스코프 `.br-*` 스타일만 JS가 주입). `node --check`(worker·brief) 통과 · check-docs 통과(토큰 24종 무변) · jsdom 스모크(탭 순서 01~07·뷰 위치·게이트 3칸·레이어 오버/언더 색·액션/스틸맨·보관분 2건·대담 4발언 이어붙임·보관분 클릭 전환) 통과. narrative≠numbers — 브리핑은 라이브 값을 읽어 말할 뿐 숫자·판단 파일 불변. §3 06 인벤토리 신설·메모 07로 이동 · §8 이슈 1건 · STYLE_GUIDE §4-1 동반. **크론 워밍(아침 자동 생성)은 `SITE_PASSWORD` 선행 · 주간 다이제스트는 후속 과제.**
- 2026-07-19 21:40 · **데일리 브리핑 「팟캐스트(2인 대담·약 8분)」 신설 — 링크형(B) 가동 + 오디오판(A) 제안본.** SimpleorNothing 지시("매일 슬랙으로 문자 요약 받는데 팟캐스트 형식으로"). 운영자 결정 3: **둘 다 준비 · 2인(진행자+애널리스트) · 8분(스틸맨까지)**. ①worker `handleBrief`(+`/api/brief` 라우팅) 신설 — 라이브 `signals`·`gamma`·`holdings`·`calendar`·`signal_log`·`judgment`를 `env.ASSETS`로 읽어 상황 요약을 만들고 opus-4-8로 2인 대담 대본 생성, **R2 `brief_{날짜}_p{1,2}.json` 날짜 캐시**(열 때마다 과금되지 않게). **part 1/2 분할** = 8분치 비스트리밍 1회는 ~100s 한도에 걸림 → 전반부 먼저 재생·후반부는 재생 중 수신. ②단독 페이지 `brief.html`(index.html 무편집) — 말풍선 대담 UI + 브라우저 TTS 2보이스 + 재생/이전/다음/배속/음소거·말풍선 클릭 재낭독. ③`scripts/daily-brief-slack.mjs`에 링크 1줄 **병기**(텍스트 대체 아님 — 스캔은 텍스트, 이동 중엔 음성). ④오디오판(A)은 `scripts/proposed-workflows/daily-brief-podcast-audio.{yml,md}`+`brief-tts.mjs` 제안본으로만 — 선행 3건 운영자 수동(§8). **워크플로 무편집**(403 회피) — 기존 `daily-brief-slack.yml`이 그대로 호출하는 스크립트만 고쳤다. `node --check`(worker·slack·tts) 통과 · check-docs 통과(토큰 24종 무변). **narrative≠numbers** — 대본은 라이브 값을 읽어 말할 뿐 숫자·판단 파일 불변. §3 외부 채널 소절 신설 · §8 이슈 2건 추가 · STYLE_GUIDE §4-1 동반. **오디오판 승격·과거 회차 목록 페이지는 후속 과제.**
- 2026-07-19 10:56 · **03 전문가 원탁에 「패널 관리」(로스터 추가·삭제·편집) 신설(`council-roster.js` 자가 마운트 + `/api/council-roster` R2).** SimpleorNothing 지시("전문가 패널 변경가능한 메뉴 추가 — 패널 추가·삭제 등"). 운영자 결정 3: **기본 6인 포함 전체 CRUD · 서버(R2) 공유 · 토론+자문 모두 완전 동작.** 인라인 `EXPERTS`가 하드코딩이라 데이터화가 필요 → 인라인 COUNCIL에 훅 3개(`getExperts`/`setExperts`/`reRender`)만 추가하고, 자가 마운트 `council-roster.js`가 vhead 「패널 관리」 버튼·모달로 명단을 편집한다. 저장 = R2 `council_roster.json`(`/api/council-roster` GET/POST · `sanitizeRosterExpert` 상한 24인·필드 길이컷). 로스터 존재 시 `setExperts`로 기본 6인을 대체 렌더 → **토론 시작·1인 심층 자문 양쪽이 커스텀/편집 명단으로 동작**. 뷰·스탠스 편집은 **council_log 채널에도 흘려**(`/api/council-log`) council-sot(council.json 재패치)의 덮어쓰기를 피하고 관점 SoT를 일원화. 아바타=프리셋 6종(인라인 `avatar()` cfg 재사용). 삭제는 최소 1인 유지·「기본 6인 복원」 = base 재주입. worker.js(핸들러 2 + 라우팅 + 주입 1줄)·신규 `council-roster.js`·index.html(훅 3개)·문서만 변경 — **신규 :root 토큰·CSS 0**(기존 `.cl-*`·`.cl-modal` 재사용) → `node --check`(worker·roster·인라인 10블록) 통과·check-docs 통과(토큰 24종 무변)·jsdom 스모크(버튼·추가[roster+log POST·setExperts]·삭제·편집 프리필·기본 복원) 통과·`git apply --check` clean main. narrative≠numbers — 명단·관점 텍스트일 뿐 숫자 파일 불변, 실존 인물 렌즈 시뮬레이션(투자자문 아님). §3 03 인벤토리 행 신설 · STYLE_GUIDE §9 동반. **아바타 커스텀 색상 직접 지정·명단 순서 드래그는 후속 과제.**
- 2026-07-19 09:37 · **03 전문가 원탁에 「1인 심층 자문」 신설(`council-ask.js` 자가 마운트 + `/api/council-ask`).** SimpleorNothing 지시("토론도 하지만 한 명한테 물어보면 깊이 있는 진단·조언이 되도록"). 현행 원탁은 `personas>=2` 하드검증으로 1인 진단 불가 → 전문가 **1인만 선택**하면 하단 바에 「심층 자문」 버튼이 떠 `/api/council-ask`(신규 · opus-4-8 · `max_tokens` 3500)로 **그 전문가 렌즈만 순수하게**(좌장 오버레이 없음 — 운영자 결정) 심층 진단·**직접 실행 조언**·자기 반증(`watch`)을 받는다. 출력 `{diagnosis, basis[], advice[], watch[], answer, stance}` → `#clResult`에 기존 `.cl-*`(cl-rep·cl-diag·cl-blk·cl-two·cl-steel) 재사용 렌더. **좌장 스틸맨 대신 그 렌즈 자신의 리스크 규율을 `watch`로 강제**해 편향 진단을 렌즈 내부로 방어(예: 김효진 자문이면 "반도체 사이클 트리거가 꺾이면 이 강세는 무효"). `#clTopic`=질문·`#clCtx`=라이브 situation 재사용, 결과는 토론 이력에 `[심층 자문]` 접두로 누적(advice→actions·watch→steelman). **자가 마운트** — worker `<script defer src="/council-ask.js">` 주입(flags/aisd 패턴), index.html 무편집. 카드 선택 상태는 `.cl-card.on` DOM 감지(MutationObserver), 전문가 데이터는 선택 카드 DOM에서 읽어 council-sot/restoreCards 라이브 오버라이드 자동 반영. 음성은 `window.COUNCIL.playReport` 재사용(diagnosis 비우고 board를 전문가 목소리로 몰아 순수 렌즈). worker.js(핸들러+라우팅+주입 1줄)·신규 `council-ask.js`만 변경 — **신규 :root 토큰·CSS 0** → `node --check` 통과·check-docs 통과(토큰 24종 무변경)·jsdom 스모크(버튼 1명 노출·2명 숨김·페이로드·리포트·이력·순수 렌즈 음성) 통과. narrative≠numbers — 관점 텍스트일 뿐 숫자 파일 불변, 실존 인물 렌즈 시뮬레이션(투자자문 아님·05 라이브 게이트 재대조 고지). §3 03 인벤토리 행 신설 · STYLE_GUIDE §9 이력 동반. **음성 재생 1인 전용 플레이어·질문 프리셋은 후속 과제.**
- 2026-07-18 22:18 · **05 리밸런싱 「숫자 반영 대기」 스트립(`insStripDec`)을 04 시장과 실적 전망으로 이동.** SimpleorNothing 지시(ASML 2Q 실적 서프라이즈+연간 매출 전망 상향 카드가 05 결정판에 떠 있던 것 지적). 실적 비트·가이던스 상향은 「실적 전망」 주제 → `insight.js mount()` 앵커를 `#v-decision`(before `#decisionBoard`) → `#v-thread`(before 최상단 `.vhead`)로 변경. 런타임 순서=로드맵(`#dsAisd`)→반영 대기 스트립→강물 탐색(`.vhead`). **route·필터(`NUM[route]&&!applied`)·컴포넌트 불변 = 앵커만 이동** — 모든 숫자 반영 대기 항목이 함께 04로 가고 05 체크리스트에서는 빠진다. 스트립 note의 스테일 「03에서 반영 완료」→「02 인사이트 찾기에서 반영 완료」 정정(메뉴 재배열 반영). **신규 :root 토큰·CSS 0** → check-docs 통과(토큰 24종 무변경)·`node --check` 통과·jsdom 렌더 검증(insStripDec가 `#v-thread` 내부·`#v-decision` 미부착·순서 일치). narrative≠numbers — 표시 위치만, 숫자·판단 파일 불변. §3 02 자가 마운트 행 갱신 · STYLE_GUIDE §9 이력 동반. index.html·CSS 무편집(insight.js만). ※ 동시 커밋(20:29 시그널 토글) 위에 재베이스 착지(fresh 브랜치).
- 2026-07-19 11:02 · **02 인사이트 찾기 L1 자료 힌트 클릭 펼침 — 그 자료의 관점을 그 자리 전개(중첩 드릴·전체 레벨 독립).** SimpleorNothing 지시(스크린샷 L1 「L2·L3로 펼치기」 지목). 07-18 20:29의 시그널 힌트 클릭 토글에 이어, **자료 카드 밑 `.ins-lvhint`**(구 정적 「L2·L3로 펼치기」)도 클릭 토글로: `data-rec`·`role=button`·`tabindex`·`aria-expanded`, CTA(`.ins-lv-cta` `--dawn`/700) 「펼치기 ▾」↔「접기 ▴」, 관점 묶음 `.ins-recwrap`(hidden 토글). L1 자료→클릭→관점(claims) 그 자리 펼침→관점 시그널 힌트 클릭→로그까지 **중첩 드릴다운**(자료→관점→시그널), 상단 레벨 버튼과 독립. `renderList` L1 분기가 관점을 hidden `.ins-recwrap`로 렌더 + `[data-rec]` 클릭/Enter 핸들러. `insight.js`·`insight.css`만 편집(index.html 무패치·자가 마운트) · **신규 :root 토큰 0** → `check-docs` 통과·`node --check` 통과·jsdom 검증. narrative≠numbers — 표시 방식만. §3 표시 레벨 행 갱신 · STYLE_GUIDE §9 이력 동반.
- 2026-07-18 20:29 · **02 인사이트 찾기 「채택한 관점」 시그널 힌트 클릭 펼침 — 자료 카드 밑에서 그 자리 전개(전체 레벨 독립).** SimpleorNothing 지시(스크린샷 「L3에서 펼치기」 지목). 정적 안내였던 `.ins-sighint`를 **클릭 토글**로: `data-sig`·`role=button`·`tabindex`·`aria-expanded`, CTA(`.ins-sig-cta` `--dawn`/700) 「펼치기 ▾」↔「접기 ▴」, 로그 본문 `.ins-sigwrap`(hidden 토글·`sigBlock` 재사용). L2 기본 접힘→클릭 펼침 / L3 기본 펼침→개별 접기, **전체 표시 레벨(lvl)과 독립**. `sigHint()`→`sigSection(c,open)`·`renderList` 클릭/Enter 핸들러. `insight.js`·`insight.css`만 편집(index.html 무패치·자가 마운트) · **신규 :root 토큰 0** → `check-docs` 통과·`node --check` 통과·jsdom 토글 검증. narrative≠numbers — 표시 방식만. §3 표시 레벨 행 갱신 · STYLE_GUIDE §9 이력 동반.
- 2026-07-18 16:10 · **02 인사이트 찾기 「채택한 관점」 목록에 표시 레벨(뎁스) 접기 — L1 자료·L2 관점·L3 시그널(기본 L1).** SimpleorNothing 지시. 「채택한 관점」 목록을 3단계 아웃라인으로 접는다: **L1=자료(소스 카드)만**(접힌 관점·시그널 건수 힌트) · **L2=+관점(claims, 시그널은 건수 힌트)** · **L3=+관련 시그널 로그·미연결 시그널 펼침**. 상단 `.ins-lv` 레벨 버튼군(기본 L1)이 '무엇을 펼칠지'만 정하고, 기존 검색·라우트 필터·등급 보드와 직교. `insight.js`(`renderLevel()`·`renderList` 뎁스 분기·`claimLine` `showSig`·`sigHint()`·`renderSigRest` lvl 게이트)·`insight.css`만 편집(index.html 무패치·insight.js 자가 마운트) · **신규 :root 토큰 0·CSS 클래스만** → `check-docs` 통과·`node --check` 통과·jsdom 3단계 렌더 검증. narrative≠numbers — 표시 방식만 바꿀 뿐 숫자·판단 파일 불변. §3 02 인사이트 찾기 인벤토리 행 추가 · STYLE_GUIDE §9 이력 동반. ※ 코드는 #432(squash 92ded49) 선반영 · 문서 후속 착지.
- 2026-07-18 15:18 · **상단 메뉴 재배열·개명 (01 시장 모니터링 · 02 인사이트 찾기 · 03 전문가 원탁 · 04 시장과 실적 전망 · 05 리밸런싱 · 06 메모).** SimpleorNothing 지시. **`index.html` 무편집** — `insight.js mount()`가 정적 nav(market·cycle·port·council·memo)를 런타임 재구성: ①`insight` 탭 생성(라벨 「인사이트 찾기」·`vkick` 「Insight · 인사이트 찾기」)을 `market` 뒤 주입 ②`council`을 `cycle` 앞 이동 ③`cycle` 라벨 「궁금한 것」→「시장과 실적 전망」 개명 ④index 순 재번호(01~06). 구 「`port` 앞 주입+`council`을 `port` 앞 이동」 로직 폐기. **04 뷰 제목 개명은 불필요** — #424가 옛 vhead(「지금 궁금한 것」)를 이미 삭제(v-thread 최상단=`#dsAisd`). **신규 :root 토큰·CSS 0 → check-docs 통과 · `node --check` 통과.** jsdom nav 렌더 검증(6탭 순서·번호·라벨 일치). §0-5·§3(현행 메뉴·마운트 설명·메뉴 상세 재배열·교차점검 표) 갱신 · STYLE_GUIDE §2·§6-1·이력 동반. **narrative≠numbers — `data-v`·뷰 id·데이터 소스 전부 불변, 라벨·순서만.**
- 2026-07-18 15:15 · **05 종목 채점에 01~04 라이브 참고 접속(index.html).** SimpleorNothing 지시. 초입 5신호 채점 드로어에 「01~04 라이브 참고 — 채점 전 확인」: 02 γ(갭·g·stage·override) · 02 두 시계(EPS 리비전30d vs 가격30d → γ open 유지/성숙 압력 — 단계 강등 룰 종목별 라이브화) · 02 애널 컨센서스 · 01 매크로 게이트 · 04 원탁(레이어 매치) · 03 채택 관점(티커 매치). 트래커 행 컴팩트 칩. 채점(S1~S5)은 수동 유지. GAMMA 로드 후 renderTracker 재렌더 훅. 문서 패치 경합 3회(#421·#424) 후 재생성 착지.
- 2026-07-18 15:15 · **02 aisd.js v6 문서 재착지 — 이익률 「결정 요인 → 선행 시그널」.** (#422 코드 반영 완료 — 문서만 경합 중단분.) 렌즈 후행 보정 원칙(시그널 4종: 가격>리드타임>캐파>경쟁 진입). 행별 선행 시그널: ②토큰 단가·백로그 / ③GPU 임대료·RPO·감가상각 연수 변경 / ④NVDA=CoWoS·HBM 캐파·ASIC 수주·리드타임 / ④메모리=DDR5 현물vs계약·DXI·HBM4 퀄·WFE·DIO / ④통신·전력=CPO·수주잔고·터빈 리드타임·PPA. 합산행 최우선 감시 3종.
- 2026-07-18 14:35 · **05 리밸런싱 추정 리비전 트래커에 「기대수익 점수」 컬럼 신설(`raer.js` 자가 마운트 · PR #423 · squash c15af61).** SimpleorNothing 지시. 「백지 재투자 시 향후 상승 가능성」을 여력만이 아니라 실현확률·리스크로 보정한 위험조정 기대수익(RAER = 여력 × 실현확률 ÷ 리스크, 14행 상대 0–100)을 트래커 테이블 종목 다음 컬럼으로 주입, 점수 내림차순 재정렬, **현금 행**을 종목으로 추가(현금=무위험 `RF`=한은 기준금리·상승 기대수익 바닥·게이트 잠김 시 배분 실탄). 실현확률 p=EPS 리비전(90d·30d)·애널 상향폭·γ open 건전성(하향이면 급감) / 리스크 R=단계(성숙 1.2·과열 1.45)·90d 급등·γ 소진·고변동 가산. **기간은 점수로 나누지 않는다** — 「언제」는 촉매(실적 D-N)가 답한다(대화 결론). index.html·worker.js·pantone.css 무편집 — 이미 로드되는 `changelog.js` 부트스트랩이 `loadRaer()`로 `<script defer src="/raer.js">` 주입·gamma.json 단일 소스 재사용·MutationObserver로 재렌더 시 유지. 신규 :root 토큰 0→check-docs 통과. jsdom 배치 검증(헤더 9열·점수 내림차순·현금 하단·재렌더 멱등·에러 0). **관측 휴리스틱이며 예측·투자권유 아님**(narrative≠numbers·숫자 파일 불변). §3 05 리밸런싱 행 신설·STYLE_GUIDE §9 동반. ※ 코드는 #423에서 선반영·문서는 API 무손실 전송(git fetch 원본+blob-sha 왕복 검증)으로 후속 반영.
- 2026-07-18 14:24 · **02 간소화 — 박스1(즉답 요약) 삭제·v-cycle·v-alpha 렌더 제외.** SimpleorNothing. 탭 매핑 `cycle:['thread']`(v-cycle·v-alpha 비활성 orphan)·v-thread vhead+`#instantAnswer` DOM 삭제·insight.js `insStripThread` 앵커 제거(원본 03 유지)·line3276 CYCLE.render/renderInstantAnswer 제거(drawSCurve 유지)·#dsAisd 유지. check-docs·Playwright(pageerror0) 통과. STYLE 동반.
- 2026-07-18 14:20 · **02 aisd.js — ③ Meta 상세 갱신(하이페리온 5GW·$50B) + 조달 구조 박스.** SimpleorNothing 지시(디일렉 07-14 기사). 수요 4사 매트릭스 Meta 행: note에 「Hyperion 5GW 확정」, 2026E=2GW→5GW 확정($50B), 2027E=단계 가동 개시, 2028E=5GW 완공(~2030)·부지 ~93만㎡. 상세 카드 아래 `ds-vco` 재사용 조달 구조 박스 신설 — Blue Owl 80%/Meta 20% SPV·JV 소유, PIMCO $18B·BlackRock 계열 $3B 채권(A+), Meta는 장기 임차(초기 ~4년). 읽는 법 3종: ①capex 상한이 자기자본→**민간 신용시장** 이동=수요 시계 연장 ②리스 만기·크레딧 사이클=새 취약 고리(리비전 하향 방아쇠가 조달에서 나올 수 있음) ③L8 읽기=Entergy 가스발전 7기·그리드 배터리 3기·원전 uprate=전력 병목 실물 확인. **narrative≠numbers — `signal_log.json` 2엔트리 append(L8·L2), gamma·judgment·holdings·earnings 불변.** 신규 CSS·:root 토큰 0. (STYLE_GUIDE 동반)
- 2026-07-18 13:45 · **03 관점과 정보 얻기에 유튜브 URL 스크립트 추출 이식(04 전문가 원탁과 동일 경로).** SimpleorNothing 지시. 03 「관점 뽑기」에서 URL 칸에 유튜브 링크만 넣고 본문이 비면 클라(`insight.js` `ytExtract`)가 먼저 `/api/yt-view`(**신규 `mode:'insight'` 분기** · Gemini 영상 인식)로 영상을 상세 전사→`insText` 채움(원문 raw 저장)→그 스크립트로 `/api/insight` 관점 추출로 이어감. 04는 기본 모드(발화자 관점 압축 요약) 불변, 03은 `mode:'insight'`(상세 전사 프롬프트·`maxOutputTokens` 2048→8192). 실패·`GEMINI_API_KEY` 부재(503)면 URL web_search로 폴백(구 동작). `worker.js`·`insight.js`만 편집(index.html 무패치·insight.js 자가 마운트) · **신규 :root 토큰·CSS 0**→`check-docs` 통과 · `node --check` 통과. narrative≠numbers — 스크립트는 인테이크 입력일 뿐 숫자 파일 불변. §3 03·04 인벤토리 갱신 · STYLE_GUIDE 이력 동반.
- 2026-07-18 12:49 · **02 aisd.js v5 — 「이익률 추이 — 병목의 온도계」 매트릭스 신설.** SimpleorNothing 지시. 밸류체인 구조도 아래 티어·업체별 영업이익률 추이(2023~2026E · 공개 실적 방향성): ②랩 적자(병목 아님 — 가격결정력 약함) / ③클라우드 ~28→33%(본업 구조적·AI 증분 미증명) / ④NVDA ~54→62→60%±(혼합 — CUDA 생태계=구조적·공급 부족 프리미엄=사이클) / ④메모리 적자→35→50%±(기본 사이클 — HBM 주문형 전환이 구조성 부여 중·2028E 캐파 램프가 시험대=γ-닫힘 감시선) / ④통신·전력 ~60/20%(과점 구조적·병목 남하 수혜 후보). 각 행 클릭=왜 높은가·구조성 판정 상세(tr.exp/dtl 재사용). 판독법 렌즈=이익률 높은 층이 병목·서열(④≫③>②) 역전=레이어 회전 타이밍, 합산행=감시 항목 3종(NVDA 마진 꺾임·메모리 롤오버·통신/전력 상승). 분기 실적마다 캡처 갱신. 신규 :root 토큰 0. (STYLE_GUIDE 동반)
- 2026-07-18 12:37 · **01 종목 뉴스 행 `NEW` 배지(신선도 큐).** SimpleorNothing 지시. 최근 3일(72h·`isNewDt`)+미열람 기사에 `.arow .anew` 부표, **3초 호버 or 클릭 시 제거**→localStorage `am_news_seen_v1` 영속(키=link·재렌더 재출현 없음). `loadStockNews` `rowHTML()` 경로(종목+「더 보기」)·`#mktDigest` 위임. 매크로는 별도 템플릿이라 미적용(범위=보유 종목). 신규 :root 토큰 0→check-docs 통과. narrative≠numbers. §3 표시규칙 행·STYLE_GUIDE §6-5·이력 동반.
- 2026-07-18 12:16 · **02 aisd.js v3+v4 — ③ 통합·④ 구성요소별 재편·티어별 손익(ROI 점검) 스트립.** SimpleorNothing 지시 3건 일괄. ①③의 두 섹션(CAPEX·업체 투자계획) 한 항목 통합. ②④를 메모리 단독 → **Factory 구성요소별 5행 매트릭스**(컴퓨트 NVDA·AMD·인텔 L2 / 메모리 3사 L3 / 통신 Broadcom·Marvell·옵티컬 L6 / 냉각 Vertiv L7 / 전력 CEG·VST·Bloom L7–L8 · 합산행=병목 이동 추적)로 재편. ③**밸류체인 각 티어 카드에 손익 스트립**(매출·투자/비용·이익·전망 리비전) — ①지불↑·효용 검증 진행형 / ②랩 합산 ~$40B± 급성장·컴퓨트 비용>매출·**적자 ROI 미증명** / ③AI 증분 ~$150B±·CAPEX ~$700B·본업 흑자나 AI 증분 미증명·**capex>매출 갭 확대=경고** / ④**유일 확실 흑자**(NVDA 순마진 ~50%·HBM 고마진). 관측 위치 박스에 손익 지도 결론(이익은 ④에만 고임 · ①~③ ROI 증명이 ④ 지속성의 선행 지표). 수치=공개 관측 방향성·분기 캡처 갱신. 신규 :root 토큰 0. (STYLE_GUIDE 동반)
- 2026-07-18 11:17 · **02 「AI 수요·공급 로드맵」 v2 — 밸류체인 구조도 통합·티어 재구성(aisd.js · PR #413).** SimpleorNothing 지시. 판정 보드 아래 **밸류체인 4티어**(①수요자[B2C·B2B·B2G]→②AI 판매자[범용·특화]→③컴퓨팅 판매자[하이퍼스케일러·뉴클라우드]→④Factory[반도체 L2–L6·전력 L7–L8]) + 층간 돈의 흐름(구독료→컴퓨팅 비용→CAPEX) + 알파맵 관측 위치(④ ~80% 집중 근거) 신설. 기존 섹션을 티어로 재편(①진화 · ③CAPEX·4사 · ④3사·중국) — **② AI 판매자 연도 매트릭스 신규**(OpenAI·Anthropic·Gemini·DeepSeek·특화 — 공개 관측 방향성·비상장 다수 확정치 아님 명시). 스틸맨에 밸류체인측(효율화 vs Jevons·병목 이동) 추가. 신규 :root 토큰 0. 문서 패치는 #412 경합으로 재생성(3차). (STYLE_GUIDE 동반)
- 2026-07-18 10:37 · **01 「채택한 매크로 관점」 스트립을 상단→「관련 기사」 섹션으로 이동.** `insight.js mount()` 앵커 `insStripMarket`을 `#v-market` `.vhead` 뒤 → `#mktMacroNews` 앞으로 변경(관련 기사 h2 아래·자동 뉴스 위). 큐레이션 관점(등급·출처·라이프사이클)은 스트립 컴포넌트 그대로 — 뉴스 `.arow`로 평탄화 안 함(narrative≠numbers). 신규 토큰·CSS 0·index.html 무패치(insight.js만) · jsdom 배치 검증. §3 관련 기사 행·03 자가 마운트 행 갱신 · STYLE_GUIDE §6-1·이력 동반. SimpleorNothing 지시.
- 2026-07-18 10:20 · **02 궁금한 것 맨위 「AI 수요·공급 로드맵」 블록 신설(`aisd.js` 자가 마운트 · `#dsAisd`).** 판정 보드(수요 리비전 방향 × 공급 병목 → 주가 상승 여력·재판정 트리거 3종) + AI 진화 4단계(방향만) + CAPEX 2023~2028E 막대·연도별 리비전 트랙(▲/▼ — 캡처 축적 전 예시) + 수요 4사 연도 매트릭스(업체 클릭=연도별 상세) + 공급 메모리 3사·중국 매트릭스 + 스틸맨 3종. index.html 무편집 — flags.js 패턴(worker.js `<script defer>` 주입 · PR #409 착지). 신규 :root 토큰 0. 수동/분기 — 컨센서스 캡처 asOf 누적으로 리비전 방향 파생(자동화 후보). narrative≠numbers 유지. 문서 패치는 #404·#407 경합으로 2회 원자 중단 후 재생성 착지 — **동시 머지 다발 시 doc 패치는 코드 패치와 분리·최후 착지가 안전**(§8 후보). SimpleorNothing 지시. (STYLE_GUIDE 동반)
- 2026-07-17 21:10 · **01 지표 DXI 메모리 현물 카드 + 매주 금요일 갱신.** `dxi.json` 신설·`loadDxi`/`lensDxi`(01 복제). §3·§4·§8 동반. 토큰 0. narrative≠numbers.
- 2026-07-17 20:02 · **03 라이프사이클 편집을 모달 + 「보기 칩」 선택식으로.** `insight.js` `editLC` 재작성 — `window.prompt` 4연타 → 오버레이 모달(필드별 클라 템플릿 칩: `hyp`·`trig`·`until` 후보 + `review` 날짜 프리셋). 칩 클릭=아래 칸 채우기(단일)·직접 수정 가능·Esc/배경/취소 닫기. 보기는 게이트 어휘(MU γ 3트리거·매크로 3중 AND)·8레이어·관점 티커·thesis-break 패턴으로 즉시 생성(서버·외부호출 0·오프라인·기존 채택분 전부). `insight.css` `.ins-lc-*` 모달 컴포넌트 신설(신규 `:root` 토큰 0 → check-docs 무관). §3 03 관점 필드 편집기 서술 갱신 · §8 LLM 자동 제안 이슈 「부분 완화」로 정정(템플릿은 관점 고유 맥락 못 맞춤 → LLM-at-intake는 여전히 후속 PR③) · STYLE_GUIDE 컴포넌트/갱신 이력 동반. SimpleorNothing 지시. narrative≠numbers 유지.
- 2026-07-17 18:56 · **06 캘린더 뷰 삭제 → 01 「다가오는 일정」 흡수.** SimpleorNothing 지시. nav `cal` 버튼 제거(메모 06→05·insight.js 런타임 6탭 재번호) · `#calNow`+범례를 `#v-market`으로 이관(`--cat-*`·`.now-card`·3px목록 동반) · v-cal은 v-port식 코드 잔존 · `insight.js insStripCal` 앵커 이동. `calendar.json`+`derive-calendar.mjs` 소스 유지 — `renderCalNow()` 접속마다 재계산. §3·교차점검·§8 갱신. check-docs 통과.
- 2026-07-17 17:14 · **03 관점 라이프사이클 + 세션 트리아지 도입.** 채택 관점에 `hyp`·`trig`·`until`·`review` 필드 추가(`insight.js` `save()` · 카드 「🕔 라이프사이클」 편집기 · 「점검 필요」 필터/배지 · 신규 채택 `review`=오늘+14일 기본). §0-5 트리아지 프로토콜(지지↑ 관점을 라이브 게이트와 대조 → 발동/만료/유지) · §3 03 관점 필드 정정(구 「인라인 INSIGHTS 배열」 서술 → R2 `/api/insights` 실제 스키마) · §4 세션마다 케이던스 · §8 LLM 자동 제안 후속 과제. insight.css `:root` 미변경(check-docs 무관). SimpleorNothing 지시. narrative≠numbers 유지.
- 2026-07-17 17:12 · **04 원탁 「여러 링크」 소스별 제외/복원(✕) + 재통합.** 인식 소스 행마다 ✕/복원 → 제외 시 남은 소스로 `/api/council-summary` 재호출(`recombine()`·`prev.__rows`/`__recombine` 위임 핸들러·`srcRow(r,i,del)`). 기존 `.cl-btn` 재사용(토큰 0). index.html patches/*.b64(apply-patch 경합으로 #389 미적용→#391 재적용).
- 2026-07-17 17:12 · **04 전문가 관점 단일 SoT `council.json`(experts[]+synthesis) + `council-sot.js` 배선(#387).** flags.js가 인핸서 로드→카드 view/stance를 council.json으로 패치(KV 갱신분 라이브 우선)+`#clSynth` 관점 지형 렌더. 실제 공개발언 기반(소속 정정: 김장열=유니스토리·강세, 김효진=신영증권·강세, 오건영=신한 프리미어 단장). index·worker·인라인 COUNCIL 무편집. narrative≠numbers.
- 2026-07-17 16:38 · **04 전문가 원탁에 「토론 주제」 입력 신설.** 「현 상황」 위 단일행 `#clTopic` — 비우면 현 상황 종합, 채우면 그 논제 중심. `/api/council`가 `topic`(≤300자) 수용→중심 논제로 강제. **신규 CSS·토큰 0** · check-docs 통과. §3·STYLE 동반 갱신.
- 2026-07-17 16:03 · **「여러 링크」 기사 읽기를 web_search→서버 직접 페치로 교체 + 소스 병렬 인식(버그픽스).** 첫 배포판은 기사 URL을 Claude web_search로 '검색'해 특정 URL(economist·namu·yes24·millie 등)을 못 찾고 느리게 맴돌아 인식이 멈춘 것처럼 보임 → `handleCouncilRead`가 **URL 본문을 직접 fetch(12s 타임아웃·브라우저 UA)→HTML 스트립(`stripHtmlToText`)→Claude 비스트리밍 요약**하도록 교체(빠르고 확실). 본문 <200자면 view 빈 문자열로 개별 건너뜀. 클라 `recognizeLinks`는 순차 루프→`Promise.all` 병렬로 전환(다건 체감속도 개선). worker.js·index.html만 변경, 신규 CSS·토큰 0.
- 2026-07-17 13:38 · **04 전문가 원탁 관점 갱신에 「여러 링크」 탭 신설.** 유튜브·기사 링크를 한꺼번에 붙여넣으면 클라(`recognizeLinks`)가 URL 파싱→유형 분류→소스별 요약(유튜브 `/api/yt-view` · 기사 신설 `/api/council-read` = Claude web_search 본문 읽기, 기존 `/api/insight` useSearch 패턴 재사용)→`/api/council-summary`로 **하나의 통합 관점 합성**. 소스별 진행·한 줄 표시, 실패 링크는 개별 건너뜀. 로그(`council_log.json`)에 `refs[]`(복수 출처 `{label,url}`) 필드 추가 — 이력 모달이 각 출처를 링크로 표시. worker.js: 엔드포인트 1종(`/api/council-read`)+로그 refs 저장. index.html: 모달 컴포넌트 재사용(**신규 CSS·토큰 0** · check-docs 통과). §3 04 원탁 갱신.
- 2026-07-17 · **04 자문단 관점 초기값 업데이트(공개 발언 기반).** 지식인사이드·신뢰 매체 보도 기준 카드 view 갱신 — 김정호(AI=메모리·HBM4 시스템통합·HBF, **강세**)·김장열(이익추정 20~30%↑·안전마진·MU 선행)·오건영(뉴노멀·K자 양극화·달러는 파동)·이광수(국장 전환점·저점매수 경계). 김효진은 개별 발언 미확보→도메인 렌즈·관점 갱신 권장. 실존 인물 가드레일 유지. narrative≠numbers. SimpleorNothing 지시.
- 2026-07-17 · **04 자문단 일러스트 아바타 특징 조정(초상권·저작권 회피).** 실존 인물 사진 게시 대신 도형 기반 일러스트의 cfg만 조정 — 김정호/김장열(회색 헤어) · 오건영(둥근 안경) · 김효진(단발·무안경) · 이광수(무안경). 닮은꼴 복제 아님(안경 유무·헤어 톤 등 일반 인상만). 사진 미사용 가드레일 유지. 표시 전용. SimpleorNothing 지시.
- 2026-07-17 10:45 · **AXIS_RULES `china` 축 추가** — 중국 관련 토픽(경기둔화·GDP·디플레·공급망)이 4개 섹션으로 분산되는 구조적 원인 해소. `china` 규칙을 AXIS_RULES 최선두에 추가 → 다음 파이프라인 실행 시 4→1블록으로 병합. 7종→8종.
- 2026-07-12 16:20 · **매크로 토픽 축 정규화(`ax`)** — 매 실행 발굴로 같은 축이 다른 이름·id로 들어와 「관련 기사」가 8블록으로 쪼개짐. 파이프라인·렌더를 축 키 기준으로 통일 → **8→5블록**.
- 2026-07-11 · v-port·v-tracker·v-macro 뷰서 제외(코드 잔존·결정보드 소비) · 6탭 확정 · 타임스탬프 신설
- 2026-07-10 · INFO_SOURCES.md 흡수 → §3 정보 인벤토리로 통합 · 구 파일 삭제
