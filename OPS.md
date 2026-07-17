**최종 갱신: 2026-07-17 10:43 (KST)**

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

### 현행 메뉴 (6탭)
`01 시장 모니터링(v-market)` · `02 궁금한 것(v-cycle/v-alpha/v-thread)` · `03 관점과 정보 얻기(insight.js 자가 마운트)` · `04 리밸런싱(v-decision)` · `05 캘린더(v-cal)` · `06 메모(v-memo)` · **`전문가 원탁(v-council)` — 네비 04**(`insight.js`가 03 관점 주입 직후 `council` 탭을 `port`(리밸런싱) 앞으로 이동 → **04 전문가 원탁 · 05 리밸런싱 · 06 캘린더 · 07 메모**). §3 내부번호(구 6탭 기준 04 리밸런싱·05 캘린더·06 메모)와 네비번호는 여전히 다름(insight=03 자가마운트) — 내부 재번호는 보류.
※ `nav`의 정적 버튼은 5개 + `insight.js`가 03을 주입. `v-port`·`v-tracker`·`v-macro`는 2026-07-11 재편으로 **뷰서 제외·코드 잔존**(데이터는 계속 갱신되어 결정보드가 소비).

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
| ↳ **축 정규화 `ax` — 같은 축은 한 블록** | 자동 | 실행마다 + 런타임 | 발굴이 매 실행이라 같은 축이 다른 이름·id로 들어온다(중동 3종·capex 2종 → 8블록). 키워드 규칙 7종(`capex`·`chip`·`power`·`energy`·`trade`·`rates`·`fx` / 미매칭=정규화 이름)으로 축 키 `ax` 파생 → `fetch-news.mjs`(축 중복 제거 · 직전 id·name 승계 · 5건 슬롯 축별 배정 · digest `macro[].id`=축) + `index.html loadMacroNews()`(축으로 블록 병합 · 링크 중복 제거 · 축당 5건 · 구 데이터도 즉시 병합). **축 키는 병합용 — 표시명은 라이브 `macroTopics[].name`** |

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

**교차 점검 규율 — 01 갱신 시 02·03·05 동반 확인(2026-07-15 신설):** 01 시장 모니터링 정보를 갱신할 때는 **매번** 아래 3개 메뉴에서 해당분이 있는지 확인하고, 있으면 같은 세션에서 반영한다. **단, narrative≠numbers·게이트 AND 규율은 그대로** — 일정·발표·뉴스 자체는 `signal_log`/캘린더 **표시일 뿐**, 숫자·판단 파일 변경은 §1 트리거를 통과해야 한다.

| 대상 | 무엇을 교차 확인 | 반영 방향 |
|---|---|---|
| **05 캘린더** | 예정 거시·실적 이벤트(FOMC·CPI/PCE·금통위·메가이벤트·워치리스트·실적)가 **경과**했는지 | 경과분 → 01(관련 기사·매크로 렌즈)에서 파악 · 05에선 해당 일정 **경과 처리·다음 회차 갱신**. 예: 어제 US CPI 발표 → 01 매크로 축에 반영, 05 일정 소거→다음 CPI로 |
| **02 궁금한 것** | 01 데이터·병목 뉴스(지수·메모리 가격·capex·L3~L8 병목)가 **반도체 사이클(E군집)·주도주 사분면·γ·stage**에 함의가 있는지 | 메모리 가격 롤오버·병목 조임/완화 → 02 `cycle`·`gamma` stage 렌즈 점검. **숫자 변경은 §1 트리거 통과 시만**(가격 상승 자체는 플래그) |
| **03 관점** | 01 종목·매크로 뉴스의 **확정 사건(m≥1)**이 채택 관점·`signal_log`로 이어지는지 | 확정 사건 → 03 관점 아래 `signal_log.json` EOF append(§6-5). 관점은 「반영 대기」 유지, 숫자는 §1 트리거 |

### 02 궁금한 것 (`v-cycle` + `v-alpha` + `v-thread`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 즉답 요약 (전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널) | 혼합 | 런타임 파생 | `gamma`·`holdings`+`TARGETS`·`signal_log` (`renderInstantAnswer`) / 전선·다음재채점만 `IA_CFG` 수동 |
| 반도체 사이클 3차트 (D CAPEX · D₂ 메모리매출 · C DDR5) + 종합 판정 1줄 | 혼합 (E 자동) | E: 런타임 / 나머지: 판단 시 | `cycle.json` + worker `/api/fred` (E군집 = `derive-cycle-e.mjs` 파생). ※ 「현재값·임계값 신호 요약」 표는 2026-07-12 제거 — E·B·A는 차트 없이 `cycVerdict` 램프 집계로만 반영 |
| 주도주 4사분면 | 혼합 | alpha 주1회 + 판단 시 | `alpha` → `earnings` → `judgment` · 상단 렌즈 2줄(사분면 분포+`MACRO_GRADE`) · 크기 토글(비중↔적정밴드 갭 `TARGETS`) · **가로축 토글(예상 ↔ 실현 3M `charts.json` 63거래일 초과수익)** · **무게중심 토글(L1~L8 비중가중 평균 좌표 + 오버→언더 한계자본 회전 화살표)** · **궤적 토글(스냅샷들→현재 위치 점선 꼬리, 예상 좌표·라이브 뷰만 — ①↔③ 강등/회복 가시화)** · 각주 기준일 = `alpha.asOf` 자동연동 |
| ↳ 판단 캘리브레이션 패널 | 자동(런타임 파생) | 로드 시 | `snapshots.json`(과거 예상 3M `aN[1]`) × `charts.json`(스냅샷일 이후 실현 경과) → 부호 적중률·편향(예상 과대/과소). 단일종목 시계열 보유분만 매핑(ETF·바스켓 제외) · 경과 <63거래일이면 부분 실현(방향 위주). OPS §1 「침묵하는 오류」 감시 |
| 강물·8레이어 스택·24종목 매트릭스 | 수동 | 콘텐츠 변경 시 | `index.html` 인라인 (`RIVERS`·`C`배열·`CASCADES`) |

### 03 관점과 정보 얻기 (`insight.js` 자가 마운트)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 인테이크(**원문 저장**) → 선별(claims 체크·narrative clamp) → 반영(채택분만 스트립) | 수동 | 작성 시 | worker `/api/insight`·`/api/insights` (R2 배열, 레코드 `raw`=인테이크 원문 **20k자 캡**·`rawcut`=전체 길이) + `insight.js`/`insight.css` |
| ↳ 자료 입력 경로 = URL · 본문 붙여넣기 · 파일(PDF·TXT) · **이미지 OCR** · **깨진/스캔 PDF 자동 OCR 폴백** | 수동 | 작성 시 | 드롭존/파일선택이 이미지도 수용 + 텍스트칸·드롭존에 **캡처 이미지 붙여넣기(Ctrl/⌘+V)** → `tesseract.js@5`(kor+eng, CDN 지연 로드·워커 1회 생성 재사용) 로 글자 인식해 위 칸에 append. **PDF 는 `pdfText()` 가 pdf.js 텍스트 레이어를 먼저 읽되, 실글자(한글·영숫자) 수 < max(24, 페이지×8) 이면(스캔 PDF·ToUnicode 깨진 PDF — 실측 20260716_CXMT.pdf 는 Word 2019 Batang CID 가 전 글자를 U+2014(—)로 매핑 → 어떤 추출기도 「— — —」만) `pdfOcr()` 로 폴백 — 페이지를 캔버스(scale 2.2 ≈ 158dpi)로 렌더→이미지 OCR 워커 재사용, 앞 20페이지 상한.** 클라 전용(서버·숫자 파일 무변경) |
| ↳ 원문 추적 (카드) | 수동 | 저장 시 | 저장 카드에 `src.url` **「원문 링크 ↗」** · `raw` **「원문 보기」** 토글 · **「저장 원문 ↗」 영구 링크**(`renderList`). R2 임의 배열 그대로(16MB 상한). **기존 카드는 원문 미저장 → URL만** |
| **↳ 관점별 출처 표기 · 저장 원문 링크** | 자동(파생) | 렌더마다 | 채택 관점 **1건마다** `출처: 매체 · 종류 · 날짜` + 링크(`claimSrc()`) — 저장 목록 · **다른 메뉴 스트립**(01·02·04·05, 자료 카드 밖이라 제목 병기)에 동일 적용. 링크 두 갈래: ①`src.url` **원문 ↗** ②**저장 원문 ↗** = worker **`GET /api/insights/raw?id=`**(R2 `insights.json`에서 rec 조회 → 인테이크 원문 HTML 페이지 · 인증 쿠키 필요 · `no-store`). **원문 URL이 없거나 링크가 죽어도 근거가 남는다** |
| **관점 등급(승격)** = 관찰→후보→지지→확립→확신(g0~g4) | 자동(파생) | 렌더마다 | `insight.js` `recomputeGrades()` — 기본 점수(N·I·C≥5→+2·≥3→+1) + **유사 관점 보강 횟수**(min 3) → grade(0~4). 유사 판정 `similar()` = 종목 겹침+토큰 Jaccard≥0.16 또는 Jaccard≥0.5. **같은 자료(rec) 내부는 self-corroboration 제외.** 표시: 저장 목록·스트립 배지 + 등급 보드(집계·필터) + 선별 화면 「승격 예고」 |
| **시그널 로그 (관점 아래 중첩)** ★07-14 이관 | 파생(표시) / 기록은 수동 | 렌더마다 | 데이터 = 전역 `SIGNAL_LOG`(index.html 인라인 + `signal_log.json` 병합분)를 bare 식별자로 지연 읽기 — **`index.html` 무패치**(insight.js 는 `defer`). 표시 = `sigFor()` 가 **채택 관점마다 그 아래 중첩**. 매칭 ①티커가 `items[].html`+`tag` 에 등장(엔트리 `source` 제외 — 다종목 인테이크 오매칭 방지) → 최대 4건 ②없으면 레이어 일치 → 최대 3건. 미매칭분은 하단 **「미연결 시그널」**에 전건 보존 |

**규율:** 채택돼도 **숫자는 「반영 대기」**. 파일 변경은 §1 트리거를 통과해야 한다. **원문 저장은 추적용일 뿐 — narrative≠numbers 규율은 그대로**(원문에 숫자가 있어도 자동 반영 없음).
**등급은 파생·표시 전용** — 유사한 내용이 다른 자료에서 반복 채택될수록 자동 승격될 뿐, 숫자 파일·라우트를 바꾸지 않는다(narrative ≠ numbers 무관).
**시그널 로그는 독립 화면이 아니다** — 관점의 누적 컨텍스트(§0-4)라 관점 밑에 산다. 구 `#v-siglog` 는 6탭 재편 때 nav 탭을 잃은 **고아 뷰**였고, `insight.js` `mount()` 가 런타임 제거한다. 기록은 여전히 `signal_log.json` EOF append 수동(§6-5).

### 04 리밸런싱 (`v-decision`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **결정 보드** (자산구성 + 적정밴드 오버레이 + 매크로게이트 + MU γ 3트리거 + 회전/타이밍) | 혼합 | 런타임(holdings 주간 + gamma/signals 일별에 편승) | `#decisionBoard` IIFE — `holdings`+`gamma`+`signals`+`cycle` 재페치 + `TARGETS` |
| 시장 모멘텀 전망 (미/한 레짐) | 자동 | 런타임 | `#momOutlook` — 미: `signals`(40주선·갭·DD·VIX·F&G) / 한: `charts`(삼성 프록시) + `signals`(서킷·사이드카) |
| 방향 확률 추정 (다음주/1달/3개월 P) | 자동 (**추정치·투자권유 아님**) | 런타임 | `#probEst` — GBM: σ 프리셋 · μ 프리셋+`charts` 모멘텀 50:50 블렌드 |
| 매매 타이밍 (매크로 게이트 lamp) | 자동 | 매일 06:37 KST | `signals.json` (VIX·S&P·CNN F&G·나스닥 드로다운·40주선) |
| γ · stage | 혼합 | g 매일 / stage 판단 시 | `gamma.json` (`fetch-gamma.mjs`) |

### 전문가 원탁 (`v-council`) — 네비 04

| 정보 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 전문가 페르소나(이름·전문분야·이력·주요관점·stance·레이어칩) | 수동 | 관점 갱신 시 | index.html `window.COUNCIL` embedded `EXPERTS`(7인, 논제/가격·규율 2벤치) |
| 관점 갱신 — 유튜브 링크 | 반자동 | 요청 시 | worker `/api/yt-view`(Gemini 3.5-flash · fileData URL 인입 = NotebookLM 방식 · 공개영상·프리뷰 무료·하루 8h) |
| 관점 갱신 — 텍스트·파일(txt/md/srt/vtt/csv/docx/pdf) | 반자동 | 요청 시 | worker `/api/council-summary`(Claude opus-4-8 요약). 파일은 클라이언트 파싱(자막 타임스탬프 제거 · docx/pdf는 site 추출기 존재 시) |
| 원탁 토론 진단(결론·보드·합의·이견·액션·스틸맨) | 반자동 | 요청 시 | worker `/api/council`(Claude opus-4-8 · web_search 미사용 비스트리밍) |
| 관점 갱신 감사 로그(언제·전문가·소스·참조·내용·stance) | 자동 | 반영 시 | worker `/api/council-log`(POST append · GET 조회) · R2 `council_log.json`. 뷰어: 04 상단 「관점 갱신 이력」 버튼 |

**규율:** narrative≠numbers — 관점 텍스트·stance만 갱신, `earnings/judgment/stage/holdings` 숫자 파일 불변. 현 상황 입력은 라이브 자동 주입(`buildLiveSituation()` — holdings·gamma·signals·cycle·signal_log 동일 오리진 페치) + 편집 가능(SAMPLE 폴백). 카드는 `.mkt-grid` 복제 · 렌즈칩(§6-4 관행) 부착.
**운영자 조치:** `npx wrangler secret put GEMINI_API_KEY`(AI Studio) — 없으면 `/api/yt-view` 503.

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
| 시그널 로그 — **기록** | 수동 | 시그널 포착 시 | `signal_log.json` (EOF append). **표시는 뷰 미노출 아님** → 03 관점 아래 중첩(위 03 표) + 04 다이제스트 + 02 즉답요약 |
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
`fetch-prices` · `fetch-news` · **`news-screen`(뉴스 스크리너 SoT — 사다리·정규식·소스 티어·병목축)** · `fetch-signals` · `fetch-gamma` · `fetch-cpi` · `fetch-tsla-deliveries` · `compute-alpha` · `derive-cycle-e` · `derive-drafts` · `derive-calendar` · `sync-holdings` · `judgment-diff` · `daily-brief-slack` · `check-docs` · `enable-r2` · `proposed-workflows/`
※ **cron 시각·워크플로 권한·`paths-ignore` 목록은 라이브 `.github/workflows/`가 SoT.** 위 주기는 관측값이며, 어긋나면 라이브가 이긴다.

---

## 4. 갱신 케이던스

**매일** — 손 거의 안 댐. 시세·뉴스·신호는 cron. `news.json`(m≥1)에서 신호만 골라 `signal_log.json`에 기록.
- **뉴스 = 1일 2회(2026-07-12~).** `06:12 KST`(미국 장 마감 반영) · `18:12 KST`(한국 장 마감 반영). 각 세션에 30분 후행 + 1시간 백업 트리거(스케줄러 누락 흡수). **가드 6h < 세션 간격 12h** → 같은 세션의 중복만 스킵되고 두 세션은 각각 실행. `workflow_dispatch`는 가드 우회. ※ **라이브 크론은 아직 아침 세션만** — 저녁 18:12 cron 추가는 운영자 수동(§8-11). 반영 전까지 실제 실행은 아침 1건.
- **시세·종합지수·스파크라인 = 1일 2회(2026-07-14~).** `06:37 KST`(미 장 마감) · `18:37 KST`(한국 장 마감) — `update-prices.yml`. 가드 없음·union 병합 멱등이라 중복 무해. **토큰 0**(Yahoo/Naver HTTP·LLM 미사용). 저녁 `37 9 * * *` cron 추가는 운영자 수동(§8-11). **유가·10년물은 worker 런타임 = 페이지 로드마다 ≥2회 → 배치 불요.**
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
- **손상은 페이로드가 클수록 잦다.** 2026-07-12 관측: pos 4321 `Z→Y`, char 2962, char 6941 — **11KB b64는 3회 연속 손상**, **41KB b64는 전송 중 절단**. 큰 파일은 **패치 대신 파일 직접 푸시 + 커밋-SHA 핀 raw md5 대조**가 낫다(2026-07-12 실측: 32KB 평문 푸시는 무손상 — b64는 1바이트 손상도 치명적이지만 평문은 md5로 잡히고 국소 수정이 된다).
- **큰 MD 문서(OPS·STYLE)는 MCP 전문 업로드도 1자 드리프트가 난다** — 2026-07-16 실측: STYLE 35KB 전송에서 `남긴다→남김` 1자 치환(크기는 3바이트만 달라 크기검증 무력). **절차: 로컬 클론(`git clone`) 편집 → `create_or_update_file` → 브랜치 raw 재페치 후 로컬과 `md5` 대조(≠면 `git diff`로 국소 재업로드) → 일치 확인 후에만 머지.** md5 왕복이 게이트다.
- **손상 패치는 즉시 v2로 덮거나 삭제한다** — `patches/`에 남으면 apply가 계속 실패(파이프라인 스톨).
- **stale base 방지:** 패치 직전 대상 파일을 **다시 페치**해서 diff 생성. 성공 신호 = `.b64`가 `patches/applied/`로 이동 + HEAD가 `chore: apply` 커밋으로 전진 + **신규 엔트리 고유 문자열**이 라이브에 존재(`asOf` 같은 공유 필드로 확인하지 말 것).
- CDN은 apply 후 30~60초+ 지연 → **브랜치 HEAD raw가 아니라 커밋-SHA 핀 raw**로 검증.

### 6-4. 배포·노출
- push → `deploy.yml` 자동 wrangler. `paths-ignore` 대상(뉴스·시세류)만 커밋해도 배포는 안 뜼다 — **라이브 워크플로에서 목록 확인.**
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
3. **b64 전사 손상 재발 위험** — §6-3 절차(**`base64 -w 76` 래핑** + 커밋SHA핀 디코드 md5 왕복)를 예외 없이 적용. **2026-07-12 하루에만 5건 재발**(11KB 페이로드는 3연속 · 41KB는 전송 절단). **대용량은 평문 직접 푸시로 우회**한다.
4. **뉴스 파이프라인 변경은 다음 cron(06:12/18:12)부터 데이터에 반영** — 즉시 반영하려면 Actions에서 `Update news feed` 수동 dispatch(가드 우회). 코드가 먼저 나가고 데이터가 늦으면 **화면이 옛 스키마로 보인다**(2026-07-12 실측: 워크플로 실행이 패치와 경합해 구 프롬프트 산출).
5. **MV 상향 직후 1회차 실행은 재채점 부하가 크다** — `scoreLegacy`가 구세대 등급 전건을 다시 돌린다(제목+요약만 쓰는 경량 배치 · 60건/호출). 아카이브 250건 기준 1회성 ≈ $0.05. **요약(a·w)은 재생성하지 않는다.**
6. **Google News RSS 503 스로틀링** — 2026-07-12 전 피드 503(러너 IP 차단 추정). `fetchFeed`에 지수 백오프 3회 적용. 재발 시 **신규 수집만** 멈추고 기존 요약·표시는 유지. 상시화되면 **RSS 소스 교체**(IR·뉴스와이어 피드 또는 유료 API).
7. **다이제스트 증분 게이트의 사각** — 신규 기사 0건이면 다이제스트를 스킵하므로, **RSS가 며칠 죽으면 `headline`·`macro`가 낡은 채 고정**된다. 필요 시 「신규 0건이어도 N시간 이상 낡으면 강제 재생성」 OR 조건 추가(+월 $1.5).
8. **캘린더 동적화** — `calendar.json`·`derive-calendar.mjs` 진행 중. 완료 시 §3의 05 행을 「수동(정적)」→「혼합」으로 갱신.
9. **야후 일봉 결측 (2026-07-13 ^KS11)** — 코스피 −8.95%(1단계 서킷) 당일 Yahoo `chart` 의 meta 는 최신인데 일봉 배열에 그 캔들이 없었다. `charts.json` 만 3일 스테일(7/10 · 전일 +2.5%) → 01 카드가 최대 폭락일을 못 보고, KR 서킷·사이드카도 미점등(=침묵하는 오류). 조치: ①`fetch-prices.mjs` meta 강제 반영·union 병합·`BACKFILL`·괴리 가드 ②`fetch-signals.mjs` KR 판정에 **종가 백스톱**(charts ks11) 추가. **매 세션 `prices.json.warn` 확인.**
10. **`charts.json`(942KB)은 MCP 직접 푸시 불가** — 스크립트 수정 후 Actions에서 `Update stock prices` → `Update macro signals` dispatch 해야 즉시 반영(미실행 시 다음 크론까지 스테일).
11. **01 전 지표 1일 2회 — 저녁 크론 운영자 대기(2026-07-14).** `.github/workflows/` 403이라 수동. ①`update-prices.yml` schedule에 `- cron: '37 9 * * *'`(18:37 KST) 추가 → 시세·지수·스파크라인 저녁 반영(가드 없음·멱등). ②`update-news.yml` schedule에 `- cron: '12,42 9 * * *'` + `- cron: '12 10 * * *'`(18:12·18:42·19:12 KST) 추가 → 뉴스 저녁 세션(가드 6h<12h라 아침·저녁 각각 실행). 반영 전까지 시세·뉴스는 **아침 1회**로 돈다(문서가 앞섬 — 충돌 시 라이브가 이기는 값). 유가·10년물은 런타임이라 대상 아님.
12. **`index.html` 잔여 죽은 코드(07-14 이관 후)** — `#v-siglog` 마크업·`renderSignalLog()`·호출이 남아 있다. `mount()` 가 섹션을 런타임 제거하고 렌더러는 `if(!el)return;` 가드라 **무해**. 다음 `index.html` 패치 때 함께 걷어낸다(단독 패치는 b64 리스크만 산다 — §6-3).
13. **patches/ 루트 잔여 .b64 23건(스테일)** — 과거 실패 런·미이관 잔여물. `git apply --check` 실패분이라 push 트리거엔 무해하나, 수동 dispatch 폴백에서 자동 보관 처리됨 → **운영자 1회 dispatch로 일괄 정리 권장**. 재적용 위험이 있던 5건(worker 인사이트 중복·구버전 뉴스 mjs·OPS 부분수정)은 2026-07-14 `patches/applied/`로 이관 완료.
10. **전문가 원탁(v-council · 네비 04) — Stage 2 빌드 완료·커밋 대기.** worker 3라우트(`/api/yt-view` Gemini · `/api/council`·`/api/council-summary` Claude) + index.html(네비 04 삽입·05/06 재번호·라우터 훅·`#v-council` 뷰) + 본 §3 서브섹션. **운영자 조치: `GEMINI_API_KEY` 시크릿 + 배포 후 시각 스모크 테스트.** 미결정: §3 내부번호 vs 네비번호 정합(교차점검 규율이 §3번호 참조 → SimpleorNothing 확정 필요).

---

## 갱신 이력

- 2026-07-17 10:43 · **전문가 원탁 = 네비 04로 이동(`insight.js`).** SimpleorNothing 지시 — 화면 네비를 `04 전문가 원탁 · 05 리밸런싱 · 06 캘린더 · 07 메모`로. `insight.js` nav 조립부에서 03 관점 탭 주입 직후 `council` 탭을 `port`(리밸런싱) 앞으로 `insertBefore` → 기존 위치기반 재번호 루프가 council=04로 매김. **`index.html`·b64 무패치**(정적 폴백도 전문가원탁=04라 정합). §3 현행 메뉴 행 갱신. 미결: `index.html` 본문 내 「03 리밸런싱」 하드코딩 텍스트(게이트 안내·주석)는 네비번호와 별개 — 다음 index 패치 때 정합.
- 2026-07-17 · **04 전문가 원탁 Stage 3 — 라이브 현 상황 자동 주입(알파맵 SoT석 사양).** 현 상황 텍스트를 샘플 하드코딩 → 라이브 조립으로 대체: `buildLiveSituation()`이 `holdings`(비중)·`gamma`(MU γ·open/closed)·`signals`(매크로 게이트 raw: 나스닥DD·VIX·F&G)·`cycle`(신호등 D~A)·`signal_log`(최근)을 동일 오리진 페치해 조립, 마운트 시 clCtx에 주입(SAMPLE 폴백)·「라이브 갱신」 버튼. worker 무변경(클라이언트 페치). narrative≠numbers: 전제 표시일 뿐 숫자 파일 불변. 미결: 토론 이력 코너·§3 번호정합. SimpleorNothing 지시.
- 2026-07-17 · **04 전문가 원탁 로스터 확정(인수인계서 반영).** 가상 7인 → 실존 공개 인물 5인(김정호·김장열·오건영·김효진·이광수) + 「알파맵」좌장(SoT·비인간). 실존 인물 가드레일: 사진 미사용(일러스트) · 카드 관점=공개 도메인 렌즈 중립 요약(구체 발언 날조 금지 · 실제 관점은 관점 갱신으로 반영) · 면책 문구 + 토론 프롬프트를 「공개 관점 시뮬레이션·가짜 인용 금지」로 재프레이밍. 좌장 벤치 신설. narrative≠numbers 불변. 미결: Stage 3 라이브 주입(알파맵석 사양)·토론 이력 코너·§3 번호정합. SimpleorNothing 지시.
- 2026-07-17 10:12 · **update 배지를 전문가 원탁 헤더로 이전(`changelog.js`).** 직전 좌하단 고정 배지(`.mkt-foot-upd`, #366)가 04 하단 「토론 시작」 스티키 바와 겹쳐, SimpleorNothing 지시(스크린샷: 헤더 우상단 지정)로 **전문가 원탁 헤더 우상단**(`#v-council .vhead`)에 01과 동일한 `.mkt-upd` 배지로 재배치. `mount()`→`mountHead(sel,id)` 일반화로 01·council 공통 마운트(asOf 도착 시 `renderAll()`이 전 배지 재렌더) · `footMount`/`footRender`/`.mkt-foot-upd` 제거. 신규 컴포넌트·토큰 0(`.cyc-upd`/`.cyc-pop` 재사용) · `index.html` 무패치. §3 01 업데이트 이력 행 갱신.
- 2026-07-17 · **관점 갱신 감사 로그 신설(`/api/council-log` · R2 `council_log.json`).** 04 전문가 원탁에서 관점 반영 시 {at·전문가·소스(유튜브/텍스트/파일)·참조·view·stance}를 R2에 append. 04 상단 「관점 갱신 이력」 버튼으로 조회(최신순). narrative≠numbers. SimpleorNothing 지시.
- 2026-07-17 09:23 · **전 화면 좌하단 update 배지 추가(`changelog.js`).** 01 헤더 배지(`.mkt-upd`)는 `#v-market`에만 마운트돼 04 전문가 원탁 등 다른 화면에선 변경 이력 접근 경로가 없었음(좌하단 빈 공간) → `footMount()`가 `body`에 고정 배지(`.mkt-foot-upd`)를 전역 마운트하고, 클릭 시 기존 `.cyc-pop` 모달·`open()`을 그대로 재사용. **신규 컴포넌트·토큰 0**(`.cyc-upd`/`.cyc-pop` 재사용 · CSS는 위치용 `.mkt-foot-upd` 1클래스만, design token 무추가). MKT_CHANGELOG에 사용자향 항목 2건 추가(04 전문가 원탁 신설 07-16 · 본 배지 07-17). `index.html` 무패치(`changelog.js`만 수정). §3 01 업데이트 이력 행 갱신.
- 2026-07-17 · **전문가 원탁(v-council) Stage 2 빌드.** 네비 04 삽입(캘린더·메모 +1) · `#v-council` 뷰(01 `#v-market` 복제·`.mkt-grid`·`window.COUNCIL`) · worker 3라우트. 전문가=렌즈별 7인 페르소나, 유튜브/텍스트/파일 관점 갱신(narrative≠numbers). §3 서브섹션·§8-10. 커밋·시크릿·스모크 대기.
- 2026-07-17 · **07 자문단 Stage 1 — worker 라우트 추가.** `/api/yt-view`(Gemini fileData URL 인입) · `/api/council`(Claude 원탁). 신규 라우트 2개 · 기존 라우트 불변 · 키 부재 시 503. 운영자 `GEMINI_API_KEY` 시크릿 등록 필요. 프런트(#v-council)는 Stage 2. §8-10.
- 2026-07-16 22:41 · **03 인테이크 PDF 추출에 OCR 폴백 추가(`insight.js`).** `pdfText()` 가 pdf.js 텍스트 레이어만 읽어, ToUnicode 가 깨진 PDF(실측 20260716_CXMT.pdf — Word 2019 Batang CID 폰트가 전 글자를 U+2014(—)로 매핑)는 「— — —」만 뽑히고 사이트가 「본문 공백」으로 판정하던 사각을 해소. 실글자(한글·영숫자) 수 < max(24, 페이지×8) 이면 `pdfOcr()` 로 폴백 — 페이지를 캔버스(scale 2.2)로 렌더해 **기존 이미지 OCR 워커(tesseract kor+eng)** 재사용(앞 20페이지 상한). 신규 의존성 0(pdf.js·tesseract 둘 다 이미 로드)·클라 전용·서버·숫자 파일 무변경(narrative≠numbers). 실측 검증: 깨진 레이어 실글자 0→폴백 발동, OCR 결과 7,509자→통과. §3 03 자료 입력 경로 행 갱신.
- 2026-07-16 22:15 · **뉴스 동일 내용 기사 dedup(`news-dedup.js`).** 출처만 다른 근접 중복(VRT 실적 컨퍼런스콜 공지 2건 등)을 자가 마운트 스크립트가 렌더 직후 `.stk-blk` 내 `.arow`(표시 요약 char-bigram Jaccard ≥0.35)로 1건화. `#mktDigest`·`#mktMacroNews` MutationObserver. index.html은 `<script src>` 1줄(PR #349). 표시 전용 — 데이터·숫자 무변경(narrative≠numbers). 상세 STYLE_GUIDE §6-5.
- 2026-07-16 · **§6-3에 큰 MD 문서 md5 왕복 게이트 절차 추가.** MCP 전문 업로드가 큰 한글 문서에서 1자 드리프트(실측 STYLE `남긴다→남김`)를 내므로 — 로컬 클론 편집 → raw md5 대조 → 일치 시 머지 절차를 명문화(크기 일치는 무결성 보증 아님). 문서만 변경.
- 2026-07-16 · **시장 맥박 파이프라인 안정화 + 헤더 배지 라이브화.** ①별도 `update-pulse` 크론이 seed(manual)에 고착 → 맥박 합성을 검증된 `update-news`에 **편승**(Synthesize 스텝, 1일 2회)·update-pulse 스케줄 은퇴(dispatch만). ②`fetch-pulse.mjs` 침묵 실패 하드닝 — 응답 JSON 견고 추출 + 실패 `::warning::` 노출(exit 0)로 원인 가시화(#337). ③그 로그가 짚은 `stop_reason=max_tokens` 절단을 **max_tokens 4096→8192**로 수리(#339). ④01 헤더 `update` 배지를 변경 로그 날짜 대신 **`pulse.json` asOf(라이브)**로 표시(`changelog.js`)·변경 로그는 「이력」 모달로 보존(#340). §3 스크립트 인벤토리·헤더 타임스탬프 · §4 케이던스 · §8-11.
- 2026-07-15 23:07 · **01 갱신 시 02·03·05 교차 점검 규율 신설(§3 01 절).** SimpleorNothing 지시 — 01 시장 모니터링 정보 갱신 시 05 캘린더 경과 이벤트(CPI·FOMC·실적 등)·02 사이클/주도주·γ·stage 함의·03 관점/`signal_log` 연결을 **매 세션 동반 확인**. narrative≠numbers·게이트 AND 불변(일정·발표·뉴스는 표시/`signal_log`만, 숫자 파일은 §1 트리거). 순수 규율 추가(코드·데이터·토큰 무변). 지시문(Project)은 실행 세부 미포함 원칙이라 무변경.
- 2026-07-14 · **종목 뉴스 미니차트 X축 다년 날짜 오독 수리.** Ctrl+휠로 넓힌 다년 창(PLTR 1254D)이 `MM-DD`만 찍혀 하루 차로 보였음 → `index.html` `fd()`를 `spanYr`(시작·끝 연도 상이) 인식으로: 다년은 `YY-MM-DD`, 한 해 안은 종전 `MM-DD`. 순수 표기 변경(데이터·크론 무변, 신규 토큰 없음). 상세=STYLE_GUIDE §6-5. (PR #333)

- 2026-07-14 23:40 · **시그널 로그 → 03으로 이관.** 구 `#v-siglog` 는 7/12 6탭 재편 때 nav 탭을 잃어 **도달 불가한 고아 뷰**였다(데이터·렌더·DOM 은 살아 있는데 진입 경로만 없음 = **침묵하는 오류**, §1). 시그널은 관점의 누적 컨텍스트지 독립 화면이 아니므로 03 「채택한 관점」 **각 관점 아래로 중첩**. 매칭 = 티커 → 없으면 레이어. 미매칭분은 **「미연결 시그널」** 블록에 전건 보존. `mount()` 가 고아 섹션 런타임 제거 · `insStripSig` 폐지. **`index.html` 무패치**. `insight.css` `.ins-sig*` 추가(**신규 토큰 0개**, check-docs 통과). §3 03·보조데이터 · §8-12.
- 2026-07-14 23:50 · **OPS 본문 b64 잔류 손상 7곳 수리**(캐프처→캡처 ×2 · 센티멘트→센티먼트 · 썰는다→썩는다 · 펌스링→펄스링 · 안 댈→안 댐 · 굤적→궤적 — 미적용 ops-corrupt-fix 패치가 고치려던 지점) + 재적용 위험 잔여 패치 5건 `applied/` 이관 · §8-13 추가.
- 2026-07-14 22:57 · **관련 기사(매크로)를 종목 뉴스와 같은 「두 점」 형식으로 통일.** 지금까지 관련 기사는 날짜+제목(`.nrow`)만 나열해 정보 밀도가 종목 뉴스(일자+요약 `a`+`→` 의미 `w`)보다 낮았음. `fetch-news.mjs`에 `summarizeMacro()` 추가 — MACRO 기사에도 기사별 두 점(a·w) 증분 생성(신규만·과거 재요약 없음). **매크로는 여전히 물질성 채점(m) 미적용**(축 자체가 관측 대상) — a·w만 채우고 m은 건드리지 않음. `w`는 개별 주가가 아니라 8레이어·매크로 게이트·상류 수요 함의. 프론트 `loadMacroNews()`는 `.nrow`→`.arow`(종목 뉴스 컴포넌트 재사용, 신규 클래스·토큰 0). `a` 없으면 제목 폴백 → **다음 update-news 크론(06:12/18:12) 또는 수동 dispatch 전까지는 제목만 표시**(§8-4). §3 01 관련 기사 행 갱신 · STYLE_GUIDE §6-5.

- 2026-07-14 · **01 시장 모니터링 전 지표 1일 2회 확정.** SimpleorNothing 지시 — 모든 종목·종합지수·유가·10년물·뉴스를 1일 2회로. 시세·지수·스파크라인(`update-prices.yml` 저녁 18:37 cron)·뉴스(`update-news.yml` 저녁 18:12 세션 cron) 추가 필요 — 둘 다 workflows 403 → **운영자 수동(§8-11)**. 유가·10년물은 worker 런타임이라 이미 ≥2회 충족(배치 불요). §3 01 지수·스파크라인·뉴스차트 행 · §4 케이던스 2줄 · §8-11 신설. 문서는 목표 2회를 반영하되 저녁 크론 반영 전까지 라이브는 아침 1회(⏳ 표기).
- 2026-07-14 · **코스피 스테일 사고 수리.** 7/13 코스피 −8.95%(6,806.93) 당일 Yahoo 가 `^KS11` 일봉을 누락 → `charts.json` 만 7/10에 고착, 01 카드 「전일 +2.5%」. `prices.json`과 충돌인데 경보가 없었다. `fetch-prices.mjs`(meta 강제 반영·union 병합·BACKFILL·`warn` 가드) · `fetch-signals.mjs`(KR 종가 백스톱) · `signals.json`(7/13 서킷·사이드카 true). §3 01 지수 행 · §8-9·10.
- 2026-07-12 23:59 · **03 채택 관점에 출처 표기 + 저장 원문 영구 링크.** 관점 카드가 `레이어 · 라우트 · NIC`만 달고 다녀 «어느 자료에서 왔나»가 자료 카드 헤더에만 있었음(다른 메뉴 스트립에선 매체·날짜뿐, 링크 없음) → `claimSrc()` 신설로 **관점 1건마다 출처 줄**(매체·종류·날짜 + 스트립에선 제목까지) 부착. 링크 ①원문 URL ↗ ②**저장 원문 ↗** — worker에 `GET /api/insights/raw?id=` 신설(R2 `insights.json` → 인테이크 원문 HTML 페이지, `no-store`·인증 쿠키). 인테이크 원문은 이미 R2에 저장되고 있었으나 **링크가 없어 03 목록 안에서 토글로만 열렸던 것**을 어디서든 열리는 영구 URL로 승격. 숫자 파일·narrative≠numbers 규율 무변경. §3 03 인벤토리 2행 갱신·신설.
- 2026-07-12 22:40 · **03 인테이크 이미지 OCR** — 캡처 이미지를 텍스트칸/드롭존에 **붙여넣기(Ctrl/⌘+V)**하거나 끌어다 놓으면 `tesseract.js@5`(kor+eng, CDN 지연 로드·워커 1회 생성 재사용)로 글자를 인식해 위 칸에 append. 파일선택 `accept`·드롭 안내문·플레이스홀더에 이미지 병기. 클라 전용(worker·숫자 파일 무변경). §3 03행 신설.
- 2026-07-12 22:25 · **01 헤더 업데이트 이력 배지·팝업 추가** — 사이트 변경 로그를 헤더 우상단에 노출(클릭 시 전체 이력 모달). `changelog.js` 자가 마운트, index.html은 `<script src>` 한 줄. §3 01 인벤토리 행 신설. 디자인은 STYLE_GUIDE §4.
- 2026-07-12 22:10 · **뉴스 = 시그널 관측기로 재정의(MV=2).** ①**사후 등락 서술 m=0 강등**(「지수 편출 후 22.6% 하락」류 — 지나간 등락 해설은 시그널이 아니다), m=1은 **리비전·수급 실사건**(목표가·등급·지수·지분 = γ 트리거 ① 입력)만 잔류. ②**소스 티어(`st`)** 도입 — 콘텐츠팜(Motley Fool·simplywall.st·MarketBeat 등, 실측 m=2 산출 0건)은 확정 사건 없으면 컷. ③**수집 3축** — 종목축 + **시그널축**(확정 사실 키워드 결합) + **병목축**(L3 가격·L4 캐파·L6 리드타임·L7·L8 전력·상류 capex 고정 5축 = 리밸런싱 입력). ④`mv` 세대 도입 → 사다리 변경 시 과거분 자동 재채점(요약 재사용). 스크리너를 `scripts/news-screen.mjs`로 분리(SoT 단일화). 실측 254건 리플레이: 하드룰 컷 76건, m=2 오탈락 0건. 매크로 축도 하드룰 스크리닝 적용(`ax` 축 그룹핑과 병존).
- 2026-07-12 17:46 · **03 관점 원문 저장·링크** — 뽑을 때 넣은 본문/스크립트를 레코드 `raw`(20k자 캡 + `rawcut` 전체 길이)로 R2에 저장. 저장 카드에 `src.url` **「원문 링크 ↗」**·`raw` **「원문 보기」** 토글 추가(`insight.js`·`insight.css`, `renderList`). worker 무변경(`handleInsightsPut`가 배열 그대로 통과·16MB 상한). **기존 카드는 원문 미저장이라 URL만**(복구 불가). §3 03행 갱신.
- 2026-07-12 17:45 · WTI 카드 수리 — `/api/wti` 는 `points`, 카드는 `series` 를 읽어 「로딩…」 고착. 대기 중에도 렌즈 l1 유지.
- 2026-07-12 17:40 · **03 관점 등급(승격)** — `insight.js`에 `recomputeGrades()`/`similar()`/`gradeOf()` 추가. 채택 관점에 등급(관찰→후보→지지→확립→확신) 부여, 다른 자료에서 유사 내용이 보강될수록 자동 승격. 저장 목록·스트립 배지, 등급 보드(집계·클릭 필터), 선별 화면 「승격 예고」, 등급 필터. 파생값이라 매 렌더 멱등 재계산 — 숫자 파일 무변경. `insight.css`에 배지·보드 규칙(`--st-*` 토큰 재사용, 신규 토큰 없음).
- 2026-07-12 17:44 · **04 알파맵 활용도 제고 1차(E·G·D)** — 그래프 위 **렌즈 2줄**(§6-4: l1 프레임 / l2 사분면 분포 ①·③ 종목수·비중 + `MACRO_GRADE` 게이트→행동) · **크기 토글**(비중 ↔ 적정밴드 갭 `TARGETS` — 오버=amber·언더=green 링으로 트림/증액 후보 자동 하이라이트) · 각주 「기준일」 하드코딩 → `alpha.asOf` 자동연동. §3 02 행 갱신.
- 2026-07-12 17:25 · **03 관점 뽑기 진행 표시** — `insight.js` `run()`에 단계(1/3 전송 → 2/3 분석 → 3/3 정리)와 경과초 카운터(1초 틱) 추가. `/api/insight`는 단일 비스트리밍이라 서버 내부 진척은 불가 → 클라 단계·타이머로 「멈춘 게 아님」 표시. URL 경로는 라벨·「최대 1~2분」 병기.
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
