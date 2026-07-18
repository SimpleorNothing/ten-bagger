**최종 갱신: 2026-07-18 13:01 (KST)**

# OPS — 알파맵 운영 가이드

> 初入 Observatory · **운영 SoT = 이 파일(리포 `main`).**
> **짝 문서 = `STYLE_GUIDE.md`(디자인).** 이 리포의 지속 갱신 문서는 **이 둘뿐**이다 — 화면을 어떻게 그리나=STYLE_GUIDE, 정보를 언제·어떻게 갱신하나=OPS.
> `.assetsignore`에 `*.md` → 사이트 미배포·리포 전용.
> 버전: **v3.4** (2문서 체계 · `INFO_SOURCES.md` 흡수 · **06 캘린더 뷰 삭제→01 흡수(정적 5버튼·런타임 6탭)** · 상단 타임스탬프 · 무날짜 실적 일정 공시 컷 · MV 3 · 관점 라이프사이클 트리아지 §0-5·§3)
> **문서 맨 위 「최종 갱신」은 연월일+시분(KST). 이 문서를 고치면 그 줄을 반드시 함께 갱신한다.**

---

## 0. 세션 시작 프로토콜 (모든 작업의 0단계)

1. **이 파일 + `STYLE_GUIDE.md`를 `main`에서 재페치**해 읽는다. Project 캐시는 폴백일 뿐 — **충돌하면 라이브 리포가 이긴다.**
2. **기본 브랜치 해소**(하드코딩 금지): `GET /repos/SimpleorNothing/ten-bagger` → `default_branch`. raw 404면 즉시 기본 브랜치로 폴백.
   raw 베이스 = `https://raw.githubusercontent.com/SimpleorNothing/ten-bagger/{기본브랜치}/{파일}?t=$(date +%s)`
3. **분석·브리핑이면** 라이브 JSON 8종 재페치: `gamma`·`cycle`·`signals`·`judgment`·`holdings`·`earnings`·`prices`·`signal_log`. 스테일 캡처 외삽 금지.
4. `signal_log.json`을 먼저 훑는다 — 아카이브가 아니라 **누적 판단 컨텍스트**(어느 층이 싸졌나/비싸졌나).
5. **관점 트리아지(03).** 채택 관점 중 **지지(g2)↑만** 라이브 게이트·`gamma`·`signals`와 대조해 3분류한다 — **발동**(전제·발동조건 충족 + 게이트 AND → 05 리밸런싱 후보) · **만료**(`until` 트리거 or 전제 소멸 → 폐기·강등) · **유지**(변화 없음 → `review` 점검일만 갱신). 점검일 도래분(03 「점검 필요」 배지)이 우선. 후보·관찰은 승격 전까진 잠자는 재고 — 트리아지 대상 아님.
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

### 현행 메뉴 (6탭 · 런타임 렌더 순)
`01 시장 모니터링(v-market)` · `02 궁금한 것(v-cycle/v-alpha/v-thread)` · `03 관점과 정보 얻기(v-insight · insight.js 자가 마운트)` · `04 전문가 원탁(v-council)` · `05 리밸런싱(v-decision)` · `06 메모(v-memo)`
※ 위는 **런타임 렌더 순**(§3 내부번호 = 이 순서). `nav` 정적 버튼은 5개(market·cycle·port·council·memo)이고, `insight.js` `mount()`가 `insight` 탭을 `port` 앞에 주입 + `council`을 `port` 앞으로 이동 + 전 탭 index 순 재번호 → 위 순서 확정(정적 번호는 마운트 전 폴백). `v-port`·`v-tracker`·`v-macro`·`v-cal`은 **뷰서 제외·코드 잔존**(v-cal은 2026-07-17 06 캘린더 삭제로 합류 — 임박 이벤트는 01로 흡수, `#v-cal` CSS는 비활성 잔존).

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

**뉴스 수집 3축(`fetch-news.mjs`):** ①**종목축** = 종목명 검색 8건 · ②**시그널축** = 종목명 + 확정 사실 키워드(`실적·수주·계약·공급·증설` / `guidance·capex·contract·order·backlog·shipment·capacity`) 14일 창 4건 — *종목명 단독 검색은 SEO 콘텐츠팜을 부른다*(\"Why MU stock is down…\") · ③**병목축** = 레이어 고정 5축(위 표).

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
| 0 | **비물질(표시 제외)** | **\"주가가 X% 올랐다/내렸다\"는 사후 등락 서술** · \"왜 떨어졌나\" 해설 · 홍보·수상·채용 · 가정 시나리오·가격 예측 · 추천 리스트 · 콘텐츠팜(st=9) · **날짜 없는 실적 발표 「일정 공시」**(언제 발표할지가 빠지면 시그널 가치 0 · `RE_ERN_SCHED`&&!`RE_HAS_DATE`) |

핵심 구분: 주가 움직임 **자체를 보도**하면 원인이 사실이어도 m=0(「지수 편출 이후 22.6% 하락」). 그 원인을 **사건으로 보도**하면 살린다(「S&P500 편출 결정」 → m=1, 「Tower PIC 500만개 출하」 → m=2).
**날짜 없는 실적 일정 공시(2026-07-16 신설):** 파이프라인은 **제목만** LLM에 넘긴다 → 본문의 발표일이 요약(`a`)에 못 담긴다. 「실적 발표 일정을 공시/공지했다」만 있고 **실제 발표 날짜(월·일)가 제목·요약에 없으면 m=0**(「Lumentum 실적 발표일 공시」→0). **날짜가 박히면 살린다**(「Qualcomm 실적 발표일 7월 29일 확정」→1, 「Astera Q2 실적 8월 4일」→1). 같은 종목이라도 무날짜 판(0)은 떨어지고 날짜 판(1)은 남는다(VRT 실측). 캘린더 반영은 별개 — 발표일 자체는 05 캘린더·`signal_log`에서 다룬다(narrative≠numbers).

**3층 판정:** ①하드룰(`RE_PR` 홍보 / `RE_SPEC` 추측·리스트 / `RE_MOVE`&&!`RE_KEEP` 사후 등락 서술 / st=9&&!`RE_EVENT` / **`RE_ERN_SCHED`&&!`RE_HAS_DATE` 무날짜 일정 공시**) → ②신규 요약 시 LLM이 `a`·`w`와 함께 `m` 생성(LADDER에 무날짜 일정 공시 룰 명시) → ③`scoreLegacy` 백필·**MV 상향 시 전건 재채점**(요약 `a`·`w`는 재사용 → 토큰 낭비 없음). **`ruleM`은 title+`a`를 함께 본다** → MV 3 재채점 때 과거 기사는 이미 한글 요약이 있어 무날짜 일정 공시가 결정적으로 컷된다(LITE 등 5건 실측). 신규 기사는 preScreen에서 제목만 보므로, 제목에 일정어가 약한 영문 기사(예: \"AMD to Report … Results\")는 ②의 LLM(LADDER)이 m=0을 매긴다. 사다리·정규식·티어의 **단일 소스 = `scripts/news-screen.mjs`**. `news.json`·`archive/{TK}.json`은 **m≥1만 적재**, m=0은 `news_archive.json`에 **전건 보존(삭제 아님)**.
**규율:** 스크리닝은 **표시 대상만** 정한다. 판단·숫자 파일은 건드리지 않는다(narrative≠numbers).

**교차 점검 규율 — 01 갱신 시 02·03·06 동반 확인(2026-07-15 신설):** 01 시장 모니터링 정보를 갱신할 때는 **매번** 아래 3개 메뉴에서 해당분이 있는지 확인하고, 있으면 같은 세션에서 반영한다. **단, narrative≠numbers·게이트 AND 규율은 그대로** — 일정·발표·뉴스 자체는 `signal_log`/캘린더 **표시일 뿐**, 숫자·판단 파일 변경은 §1 트리거를 통과해야 한다.

| 대상 | 무엇을 교차 확인 | 반영 방향 |
|---|---|---|
| **01 다가오는 일정** | 예정 거시·실적 이벤트(FOMC·CPI/PCE·금통위·메가이벤트·실적)가 **경과**했는지 | 경과분은 `renderCalNow()`가 오늘(KST) 기준 자동 소거 · 이벤트 큐레이션·다음 회차 추가는 `calendar.json` `events` 수기 편집. 예: US CPI 발표 → 01 매크로 축에 반영. narrative≠numbers |
| **02 궁금한 것** | 01 데이터·병목 뉴스(지수·메모리 가격·capex·L3~L8 병목)가 **반도체 사이클(E군집)·주도주 사분면·γ·stage**에 함의가 있는지 | 메모리 가격 롤오버·병목 조임/완화 → 02 `cycle`·`gamma` stage 렌즈 점검. **숫자 변경은 §1 트리거 통과 시만**(가격 상승 자체는 플래그) |
| **03 관점** | 01 종목·매크로 뉴스의 **확정 사건(m≥1)**이 채택 관점·`signal_log`로 이어지는지 | 확정 사건 → 03 관점 아래 `signal_log.json` EOF append(§6-5). 관점은 「반영 대기」 유지, 숫자는 §1 트리거 |

### 02 궁금한 것 (`v-cycle` + `v-alpha` + `v-thread`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **AI 수요·공급 로드맵** (02 맨위 · 판정 보드 + 밸류체인 구조도(①~④·돈의 흐름·**티어별 손익 스트립[매출·투자/비용·이익·전망 리비전 — ROI 점검]**·관측 위치) + ①진화 · ②AI 판매자 연도 매트릭스 · ③컴퓨팅 판매자 통합(CAPEX 리비전 트랙+4사 매트릭스·클릭 상세) · **④Factory 구성요소별 투자(컴퓨트 L2·메모리 L3·통신 L6·냉각 L7·전력 L7–L8 — 병목 이동)** · ④중국) | 수동 | 분기(컨센서스 캡처 시) | `aisd.js` 자가 마운트(#dsAisd · flags.js 패턴 — worker.js `<script defer>` 주입 · v-thread 최상단). 전역 토큰만·`ds-*` 스코프·신규 :root 토큰 0. 수치=컨센서스 방향성 추정, **리비전 트랙·티어 손익은 캡처 축적 전 예시 표시**. narrative 층 — 숫자 파일 무관. 재판정 트리거: ①추정 ▼하향 ②DDR5 현물<계약 롤오버 ③가격>리비전 속도 |
| 즉답 요약 (전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널) | 혼합 | 런타임 파생 | `gamma`·`holdings`+`TARGETS`·`signal_log` (`renderInstantAnswer`) / 전선·다음재채점만 `IA_CFG` 수동 |
| 반도체 사이클 3차트 (D CAPEX · D₂ 메모리매출 · C DDR5) + 종합 판정 1줄 | 혼합 (E 자동) | E: 런타임 / 나머지: 판단 시 | `cycle.json` + worker `/api/fred` (E군집 = `derive-cycle-e.mjs` 파생). ※ 「현재값·임계값 신호 요약」 표는 2026-07-12 제거 — E·B·A는 차트 없이 `cycVerdict` 램프 집계로만 반영 |
| 주도주 4사분면 | 혼합 | alpha 주1회 + 판단 시 | `alpha` → `earnings` → `judgment` · 상단 렌즈 2줄(사분면 분포+`MACRO_GRADE`) · 크기 토글(비중↔적정밴드 갭 `TARGETS`) · **가로축 토글(예상 ↔ 실현 3M `charts.json` 63거래일 초과수익)** · **무게중심 토글(L1~L8 비중가중 평균 좌표 + 오버→언더 한계자본 회전 화살표)** · **궤적 토글(스냅샷들→현재 위치 점선 꼬리, 예상 좌표·라이브 뷰만 — ①↔③ 강등/회복 가시화)** · 각주 기준일 = `alpha.asOf` 자동연동 |
| ↳ 판단 캘리브레이션 패널 | 자동(런타임 파생) | 로드 시 | `snapshots.json`(과거 예상 3M `aN[1]`) × `charts.json`(스냅샷일 이후 실현 경과) → 부호 적중률·편향(예상 과대/과소). 단일종목 시계열 보유분만 매핑(ETF·바스켓 제외) · 경과 <63거래일이면 부분 실현(방향 위주). OPS §1 「침묵하는 오류」 감시 |
| 레이어 파이 (비중) | 혼합 | holdings 주간에 편승 | `holdings.json` |
| γ 테이블 | 자동(cron) + 수동(판단) | 일별 (자동) + 실적/리비전 시 (수동) | `gamma.json` (g 자동 / stage·flagged·override 수동). gamma 테이블은 `renderGamma()` 함수가 `gamma.json`을 직접 소비 |
| signal_log | 수동 | narrative 유입 시 | `signal_log.json` EOF append. 포맷: `{date, at, source, srcs:[{label,url}], items:[{tag,layer,col,html}]}`. 인라인 SIGNAL_LOG(~5/30)는 불변·신규만 외부 파일에 쌓인다 |
| 관통 강물 (RIVERS) | 수동 | 논제 시계 변화 시 | `gamma.json` `RIVERS` 배열. 번호·순서는 라이브 SoT — 하드코딩 금지 |

### 03 관점과 정보 얻기 (`v-insight`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 관점 카드 (Insight) | 수동 | 판단·논제 시계 변화 시 | R2 `/api/insights`(+localStorage 캐시). **하나의 채택 claim = 하나의 관점**. 필드: 출처(`src`)·`route`·N·I·C·`grade`(관찰→확신 자동 승격)·`applied`(숫자 route 반영 여부) + **라이프사이클 `hyp`(전제)·`trig`(발동조건)·`until`(폐기 트리거)·`review`(점검일, 신규 채택 시 +14d 기본)**. `review` 도래 시 03 「점검 필요」로 재부상 → §0-5 트리아지. **편집기 = 카드 「🕔 라이프사이클」 → 모달 + 필드별 「보기 칩」 선택식**(클라 템플릿이 게이트·레이어·티커 기반 후보·날짜 프리셋 제시 · 칩 클릭=채우기·직접 수정 가능). |
| 관점 추출 (인테이크) | 수동(운영자 입력) | 인테이크 시 | 「관점 뽑기」 → `/api/insight`(worker→Claude). 본문(스크립트/기사) 있으면 그대로, URL만 있으면 web_search로 시도. 8레이어·단계 프레임으로 claims 후보 정렬(뽑기≠반영 · 채택은 사람이 체크). 캡처 이미지=클라 OCR(Tesseract)·PDF/TXT/파일=클라 추출로 textarea 채움 |
| ↳ **유튜브 링크 스크립트 추출**(2026-07-18 신설) | 자동(입력 보조) | 인테이크 시 | URL 칸에 **유튜브 링크만** 넣고 본문이 비면 클라(`ytExtract`)가 먼저 `/api/yt-view`(**`mode:'insight'`** · Gemini 영상 인식)로 영상을 **상세 전사**→`insText` textarea 채움(원문 raw 저장)→그 스크립트로 `/api/insight` 관점 추출로 이어감. **04 전문가 원탁과 동일 엔드포인트**(04=발화자 관점 압축 요약 / 03=`mode:'insight'` 상세 전사 분기·`maxOutputTokens` 상향). 실패·`GEMINI_API_KEY` 부재(503)면 **URL web_search로 폴백**(구 동작). narrative≠numbers — 스크립트는 인테이크 입력일 뿐 숫자 파일 불변. 신규 CSS·토큰 0(index.html 무패치·insight.js/worker.js만) |
| 인사이트 자가 마운트 | 자동(런타임) | 페이지 로딩 시 | `insight.js`의 `mount()` 함수가 `#v-insight` 탭 + 헤더 배지 + `signal_log` 섹션을 런타임에 주입. **채택 관점 반영 스트립(`insStripMarket`/`insStripCal`→01 · `insStripThread`→02 · `insStripDec`→05)도 `mount()`가 각 뷰에 앵커링** — 매크로 관점 스트립은 01 「관련 기사」 섹션(`#mktMacroNews` 앞)에 붙는다(2026-07-18 상단→이동, §01 관련 기사 행) |

> **관점은 채택으로 끝나지 않는다.** `review`(점검일)가 강제 부여돼 도래 시 「점검 필요」로 재부상하고, §0-5 트리아지에서 발동/만료/유지로 처리된다. narrative는 여전히 숫자 파일을 못 바꾼다 — **발동 = 05 리밸런싱 후보로 올릴 뿐**이고, 숫자 변경은 §1 트리거(실적 비트·가이던스 상향·확정 수주) 별도.

### 04 전문가 원탁 (`v-council`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 원탁 토론 | 수동 | 필요 시 | 전문가 2인+ → 「토론 시작」 → `/api/council`(Claude). **토론 주제(`#clTopic`) 선택 입력**(2026-07-17) — 비우면 현 상황 종합, 채우면 그 논제 중심. `narrative≠numbers` |
| 전문가 관점 갱신 | 수동(운영자 입력) | 필요 시 | 각 전문가 카드 「관점 갱신」 모달 4탭 — **텍스트**(`/api/council-summary` Claude) · **유튜브 링크**(`/api/yt-view` Gemini 영상 인식 · 기본 모드=발화자 관점 압축 요약, 03은 `mode:'insight'` 상세 전사 분기 공유) · **여러 링크**(신설) · **파일**(txt·md·srt·vtt·csv·docx·pdf → council-summary). 관점 텍스트·stance만 갱신, **숫자 파일 불변**(narrative≠numbers). 반영분은 R2 감사 로그 `council_log.json`(`/api/council-log`)에 누적 → 카드 복원·「관점 갱신 이력」 모달 |
| ↳ **여러 링크 자동 인식·통합**(2026-07-17 신설) | 수동(운영자 입력) | 필요 시 | 유튜브·기사 링크를 **한꺼번에 붙여넣으면** 클라(`recognizeLinks`)가 URL을 파싱→유형 자동 분류(유튜브/기사)→소스별 요약(유튜브=`/api/yt-view` Gemini 영상 인식 · 기사=`/api/council-read` **서버가 URL 본문을 직접 페치→HTML 스트립→Claude 비스트리밍 요약**, web_search 아님 → 특정 URL을 빠르고 확실하게 읽음)→**하나의 통합 관점으로 합성**(`/api/council-summary` 재사용). **소스는 병렬 인식**(`Promise.all` — 다건도 동시 처리). 링크 아닌 문장은 메모로 반영. 소스별 진행·한 줄 요약 표시, **실패·본문 얇음(차단·JS 렌더·페이월)은 건너뜀**(개별 처리 · view 빈 문자열). 모든 출처 링크는 로그 `refs[]`(신규 필드 · `{label,url}`)에 함께 저장·이력 모달에서 각각 링크로 표시. 신규 CSS·토큰 0(모달 컴포넌트 재사용) |
| 원탁 음성 토론 재생 | 클라이언트(브라우저 TTS) | 재생 시 | 원탁 진단 리포트(diagnosis·board·consensus·tension·steelman)를 화자별 브라우저 TTS로 메신저형 극화 재생하는 인앱 플레이어(`#v-council`, 「▶ 음성 토론 재생」 버튼 · `window.COUNCIL.playReport`). 서버·데이터 페치 무관(리포트 재사용·오프라인). 고품질 Gemini AI 음성판은 사이트 밖 로컬 도구(`claude/roundtable`)로 별도 |
| 원탁 업데이트 배지 | 자동(런타임) | 로딩 시 | `changelog.js` `mountHead()` — 01 시장 모니터링과 동일 `.mkt-upd` 배지 재사용 |

### 05 리밸런싱 (`v-decision`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 결정 보드 | 혼합 | 리밸런싱 실행 시 | `judgment.json` (`decisions` 배열). 매매 방향·게이트·근거·사후 추적 |
| 포트폴리오 테이블 | 자동 + 수동 | holdings 주간 + prices 일별 | `holdings.json` × `prices.json` |

### 06 메모 (`v-memo`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 자유 메모 | 수동 | 필요 시 | `reviews.json` (`entries` 배열 · 주간 리뷰 포함) |

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

---

## 8. 알려진 이슈 · 미완료 항목

- **E-군집 자동화** (`update-prices.yml` manual edit): GitHub App lacks workflows write scope (403) → 운영자 수동 dispatch 필요
- **`update-calendar.yml` 미등록(수동)**: `derive-calendar.mjs`(01 다가오는 일정 프루닝·asOf) 크론 미등록 — App workflow write 부재(403). 런타임 `renderCalNow()`가 오늘 기준 재계산하므로 표시는 신선(파일 `asOf`만 수동 refresh까지 스테일 가능). 신규 이벤트는 `calendar.json` 수기.
- **⏳ 저녁 fetch-prices 지연**: cron 18:37 KST가 실제로 19:xx~20:xx에 돌고 있음 — 원인 미확인(Actions 큐 지연 추정). 모니터링 중.
- **관점 라이프사이클 LLM 자동 제안 미구현(부분 완화)**: 03 「🕔 라이프사이클」 편집은 **모달 + 필드별 「보기 칩」 선택식**으로, 클라 템플릿(게이트 어휘·8레이어·관점 티커·thesis-break 패턴)이 `hyp`·`trig`·`until` 후보와 `review` 날짜 프리셋을 즉시 제시한다(수동 4연타 부담 해소·오프라인·기존 채택분 전부). 다만 이는 **템플릿**이라 관점 고유 맥락은 못 맞춘다 — `/api/insight`(worker) 추출 시 `hyp`·`until`을 LLM으로 관점별 맞춤 자동 채우는 건 여전히 후속 PR(③). 신규 채택은 `review`=+14d 자동 유지.
- **DXI 자동 피드 없음(2026-07-17)**: DXI 지수는 포털 게이트라 무료 피드 없음 → 매주 금요일 스케줄이 TrendForce 현물가로 `dxi.json` append.
- `prices.json.warn = lazr chart 43.47 vs quote 41.35` — LAZR 비보유·무시 가능

---

## 9. 갱신 이력

- 2026-07-18 13:01 · **03 관점과 정보 얻기에 유튜브 URL 스크립트 추출 이식(04 전문가 원탁과 동일 경로).** SimpleorNothing 지시. 03 「관점 뽑기」에서 URL 칸에 유튜브 링크만 넣고 본문이 비면 클라(`insight.js` `ytExtract`)가 먼저 `/api/yt-view`(**신규 `mode:'insight'` 분기** · Gemini 영상 인식)로 영상을 상세 전사→`insText` 채움(원문 raw 저장)→그 스크립트로 `/api/insight` 관점 추출로 이어감. 04는 기본 모드(발화자 관점 압축 요약) 불변, 03은 `mode:'insight'`(상세 전사 프롬프트·`maxOutputTokens` 2048→8192). 실패·`GEMINI_API_KEY` 부재(503)면 URL web_search로 폴백(구 동작). `worker.js`·`insight.js`만 편집(index.html 무패치·insight.js 자가 마운트) · **신규 :root 토큰·CSS 0**→`check-docs` 통과 · `node --check` 통과. narrative≠numbers — 스크립트는 인테이크 입력일 뿐 숫자 파일 불변. §3 03·04 인벤토리 갱신 · STYLE_GUIDE 이력 동반.
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
