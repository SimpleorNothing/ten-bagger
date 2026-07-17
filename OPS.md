**최종 갱신: 2026-07-17 10:45 (KST)**

# OPS — 알파맵 운영 가이드

> 初入 Observatory · **운영 SoT = 이 파일(리포 `main`).**
> **짝 문서 = `STYLE_GUIDE.md`(디자인).** 이 리포의 지속 갱신 문서는 **이 둘뿐**이다 — 화면을 어떻게 그리나=STYLE_GUIDE, 정보를 언제·어떻게 갱신하나=OPS.
> `.assetsignore`에 `*.md` → 사이트 미배포·리포 전용.
> 버전: **v3.2** (2문서 체계 · `INFO_SOURCES.md` 흡수 · 6탭 · 상단 타임스탬프 · **무날짜 실적 일정 공시 컷 규율 + MV 3**)
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

### 현행 메뉴 (7탭 · 런타임 렌더 순)
`01 시장 모니터링(v-market)` · `02 궁금한 것(v-cycle/v-alpha/v-thread)` · `03 관점과 정보 얻기(v-insight · insight.js 자가 마운트)` · `04 전문가 원탁(v-council)` · `05 리밸런싱(v-decision)` · `06 캘린더(v-cal)` · `07 메모(v-memo)`
※ 위는 **런타임 렌더 순**(§3 내부번호 = 이 순서). `nav` 정적 버튼은 6개(market·cycle·port·council·cal·memo)이고, `insight.js` `mount()`가 `insight` 탭을 `port` 앞에 주입 + `council`을 `port` 앞으로 이동 + 전 탭 index 순 재번호 → 위 순서 확정(정적 번호는 마운트 전 폴백). `v-port`·`v-tracker`·`v-macro`는 2026-07-11 재편으로 **뷰서 제외·코드 잔존**(결정보드가 소비).

### 01 시장 모니터링 (`v-market`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 업데이트 이력(변경 로그) | 수동(인라인) | 사이트 변경 시 | `changelog.js` 인라인 `MKT_CHANGELOG`(`{d,t}` 최신순·자가 마운트=insight.js 패턴). `mountHead()`가 **01 시장 모니터링(`#v-market`) + 전문가 원탁(`#v-council`) 헤더(`.vhead`) 우상단**에 각각 `.mkt-upd` 배지를 마운트 → 클릭 시 `.cyc-pop` 모달(`.cyc-upd`/`.cyc-pop` 재사용 · 신규 토큰 0). **사용자 향 변경만** 기록 · 신규 항목은 배열 맨 위 |
| 코스피·S&P·나스닥 지수 | 자동 | 06:37·18:37 KST (1일 2회 · ⏳저녁 §8-11) | `charts.json` (`fetch-prices.mjs`, `^KS11·^GSPC·^IXIC` Yahoo 5Y). **meta 거래일을 시계열 끝에 강제 반영 + 이전 창과 union 병합** → `prices.json`과 갈라지지 않는다. 괴리>1%는 `prices.json.warn` |
| 미 10년물 금리 | 자동 | 06:37·18:37 KST + 폴백 런타임 | **1순위 `charts.json` `us10y`**(`fetch-prices.mjs` `^TNX` Yahoo 5Y · 지수 카드와 동일 t/c → 기간버튼 1M~5Y 실동작 · `^TNX` 10× 스케일은 `>20→÷10`로 % 정규화). **폴백** worker `/api/us10y` → `history[].markets.ten_year`(외부 피드 ~2개월). ※구버전은 폴백만 써서 6M+ 기간 무반응 버그(2026-07-16 수리, PR #345) |
| WTI 유가 | 자동 | 런타임 | worker `/api/wti` → **`points`** 배열 (Yahoo). `series` 로 읽으면 0건 |
| 보유 종목 스파크라인 | 자동 | 06:37·18:37 KST (1일 2회 · ⏳저녁 §8-11) | `charts.json` (Yahoo/Naver 5Y 일봉 t/c · 기간버튼 1M~5Y) |
| **카드 렌즈 요약 2줄** (그래프마다 프레임→판정) | 자동(런타임 파생) | gamma·signals 일별 / holdings 주간에 편승 | `gamma.json`(γ·stage·flagged) + `signals.json`(**`window.macroEval` 단일소스 재사용**) + `holdings.json`(layer·평단) + `charts.json` |
| 종목 뉴스 (종목 블록형 + 기사별 **일자 + 두 점**[명사형 요약 `a` / `→` 의미·주가영향 `w`] + 우측 주가 차트) | 자동 | **뉴스·digest 06:12·18:12 (1일 2회)** / 차트 06:37·18:37 | `news_digest.json`(claude-sonnet-4-6) + `news.json`(**물질성 m≥1만**) + `charts.json` |
| ↳ 표시 규칙 | — | — | **최근 3개월(92일) 창 · 종목당 최신 5건.** 초과분은 「더 보기」 → `archive/{TK}.json` **온디맨드 로드**(첫 로딩 페이로드 상수 유지) |
| 관련 기사 (매크로 · 토픽 블록형 + **기사별 일자 + 두 점**[명사형 요약 `a` / `→` 레이어·게이트 함의 `w`] — 종목 뉴스와 동일 형식) | 자동 | **06:12·18:12 KST** | `news_digest.json` `macro`(블록 상단 축 요약 `s`) + `news.json` `MACRO`. **LLM 물질성 채점(m)은 여전히 미적용**(축 자체가 관측 대상 · 하드룰만) 이나, **기사별 두 점 요약 `a·w`는 `summarizeMacro()`가 생성**(신규만 증분 · 과거치 재요약 없음). `w`는 개별 주가가 아니라 8레이어·매크로 게이트·상류 수요 관점의 함의. 렌더는 `.arow`(종목 뉴스 컴포넌트 재사용) · `a` 없으면 제목 폴백 |
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
| **06 캘린더** | 예정 거시·실적 이벤트(FOMC·CPI/PCE·금통위·메가이벤트·워치리스트·실적)가 **경과**했는지 | 경과분 → 01(관련 기사·매크로 렌즈)에서 파악 · 06에선 해당 일정 **경과 처리·다음 회차 갱신**. 예: 어제 US CPI 발표 → 01 매크로 축에 반영, 05 일정 소거→다음 CPI로 |
| **02 궁금한 것** | 01 데이터·병목 뉴스(지수·메모리 가격·capex·L3~L8 병목)가 **반도체 사이클(E군집)·주도주 사분면·γ·stage**에 함의가 있는지 | 메모리 가격 롤오버·병목 조임/완화 → 02 `cycle`·`gamma` stage 렌즈 점검. **숫자 변경은 §1 트리거 통과 시만**(가격 상승 자체는 플래그) |
| **03 관점** | 01 종목·매크로 뉴스의 **확정 사건(m≥1)**이 채택 관점·`signal_log`로 이어지는지 | 확정 사건 → 03 관점 아래 `signal_log.json` EOF append(§6-5). 관점은 「반영 대기」 유지, 숫자는 §1 트리거 |

### 02 궁금한 것 (`v-cycle` + `v-alpha` + `v-thread`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
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
| 관점 카드 (Insight) | 수동 | 판단·논제 시계 변화 시 | `insight.js` 인라인 `INSIGHTS` 배열(최신순). **하나의 insight = 하나의 채택 관점**. 관점에 `srcs`(출처)·`when`(적용 시점)·`until`(종료 트리거) 필드 |
| 인사이트 자가 마운트 | 자동(런타임) | 페이지 로딩 시 | `insight.js`의 `mount()` 함수가 `#v-insight` 탭 + 헤더 배지 + `signal_log` 섹션을 런타임에 주입 |

### 04 전문가 원탁 (`v-council`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 원탁 토론 | 수동 | 필요 시 | `council.json` (패널리스트 배열 + 토론 라운드). 원탁 플레이어·포맷은 handover-council.md 참조 |
| 원탁 업데이트 배지 | 자동(런타임) | 로딩 시 | `changelog.js` `mountHead()` — 01 시장 모니터링과 동일 `.mkt-upd` 배지 재사용 |

### 05 리밸런싱 (`v-decision`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 결정 보드 | 혼합 | 리밸런싱 실행 시 | `judgment.json` (`decisions` 배열). 매매 방향·게이트·근거·사후 추적 |
| 포트폴리오 테이블 | 자동 + 수동 | holdings 주간 + prices 일별 | `holdings.json` × `prices.json` |

### 06 캘린더 (`v-cal`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 실적·매크로 이벤트 | 수동 | 일정 변경 시 | `earnings.json` (실적 일정·추정) + `signals.json` (매크로 이벤트) |
| D-N 카운트다운 | 자동(런타임) | 매 로딩 | 현재 날짜 vs `earnings.json` 일정 |

### 07 메모 (`v-memo`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 자유 메모 | 수동 | 필요 시 | `reviews.json` (`entries` 배열 · 주간 리뷰 포함) |

---

## 4. 케이던스 — 언제 무엇을

| 주기 | 자동 | 수동(운영자/Claude) |
|---|---|---|
| 일별 (06:12·18:12) | 뉴스 수집·스크리닝·요약·digest | signal_log 인테이크(narrative) |
| 일별 (06:37·18:37) | 시세·차트·신호·알파 업데이트 | — |
| 주간 | — | holdings 동기화 · reviews.json 주간 리뷰 append |
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
- **⏳ 저녁 fetch-prices 지연**: cron 18:37 KST가 실제로 19:xx~20:xx에 돌고 있음 — 원인 미확인(Actions 큐 지연 추정). 모니터링 중.
- `prices.json.warn = lazr chart 43.47 vs quote 41.35` — LAZR 비보유·무시 가능

---

## 9. 갱신 이력

- 2026-07-17 10:45 · **AXIS_RULES `china` 축 추가** — 중국 관련 토픽(경기둔화·GDP·디플레·공급망)이 4개 섹션으로 분산되는 구조적 원인 해소. `china` 규칙을 AXIS_RULES 최선두에 추가 → 다음 파이프라인 실행 시 4→1블록으로 병합. 7종→8종.
- 2026-07-12 16:20 · **매크로 토픽 축 정규화(`ax`)** — 매 실행 발굴로 같은 축이 다른 이름·id로 들어와 「관련 기사」가 8블록으로 쪼개짐. 파이프라인·렌더를 축 키 기준으로 통일 → **8→5블록**.
- 2026-07-11 · v-port·v-tracker·v-macro 뷰서 제외(코드 잔존·결정보드 소비) · 6탭 확정 · 타임스탬프 신설
- 2026-07-10 · INFO_SOURCES.md 흡수 → §3 정보 인벤토리로 통합 · 구 파일 삭제
