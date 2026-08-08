**최종 갱신: 2026-08-08 14:05 (KST)**

# OPS — 알파맵 운영 가이드

> 2026-08-08 14:05 · **sync-holdings.mjs 매도(청산) 종목 오탐 수정 — Drive 동기화 3주째 무갱신 해소.** 평단 4칸(평가·수량·매입·현재) 전부 0을 매도로 인정하지 않고 매번 throw하던 가드 때문에 버티브(VRT) 청산 이후 `holdings.json` Drive 동기화가 7/18부터 전량 실패(§8). 전부 0=매도로 인정·avg 미기입+skip하도록 수정. SimpleorNothing 지시("없으면 보유하지 않는 것이니 그에 맞춰 처리") 반영.

> 2026-08-03 23:37 · **투자 분석 지시문 수치 검증 규칙 보강.** 모든 숫자는 검증 가능한 1차·원문 근거를 요구하고, 계산값은 원자료·기준일·정의·산식을 재현 가능하게 남긴다. 근거 부재·정의 불일치 수치는 `없음`으로 표시하며, 후속 검증에서 근거 없는 수치는 즉시 삭제·정정한다.

> 2026-08-03 21:30 · **02 인사이트 → 01 해당 화면 동시 반영.** 채택·고신뢰 매크로 관점은 계속 `signal_log.json` 시장 맥락에 누적하고, FOMC·물가·고용·중앙은행처럼 기존 `calendar.json` 일정 카드와 날짜·종류가 맞는 확정 결과는 그 카드의 설명에도 자동 반영한다. 과거 결과가 다음 회의 카드에 섞이지 않도록 R2 일괄 동기화는 원문 날짜에서 10일 이내의 가장 가까운 이벤트만 갱신한다. 토픽 레이더·게이지·보유비중·판단 수치는 변경하지 않는다.

> 2026-08-02 19:01 · **04 분기 클라우드 차트 B 단위 정수 표기.** 왼쪽 수주잔고 축을 T에서 B로 바꾸고, 수주잔고·매출·CAPEX의 막대 값과 툴팁 합계·기업별 값을 모두 B 기준 정수로 통일했다. 괄호 안 비율·배수 표기는 기존 기준을 유지한다.

> 2026-08-02 18:30 · **04 분기 클라우드 수요·투자 차트 전 구간 공시값 확정.** 24.1Q~26.2Q 수주잔고의 '없음'을 제거하고 Amazon 10-Q·10-K, Microsoft Commercial RPO, Alphabet Cloud backlog 기준으로 3사 합계를 채웠다. 매출은 Microsoft Cloud·AWS·Google Cloud, CAPEX는 각사 공시 기준으로 기업별 합계와 누적 비중을 재계산했다. Microsoft Cloud는 Intelligent Cloud와 범위가 다르고, Microsoft RPO·CAPEX 및 3사 CAPEX의 정의가 서로 다름을 화면 주석에 명시했다.

> 2026-08-02 17:57 · **02 인사이트 찾기 혼합형 PDF 페이지별 OCR 적용.** PDF 전체 글자 수가 아니라 각 페이지의 텍스트 레이어를 판정해, 본문은 이미지이고 일부 차트만 텍스트인 문서에서도 이미지 페이지를 OCR한다. 정상 텍스트 페이지는 원문 추출을 유지한다.

> 2026-08-02 17:35 · **04 분기 클라우드 수요·투자 차트 수주잔고 완전성 기준 적용.** 수주잔고 합계는 Microsoft·Amazon·Alphabet 3사의 같은 분기 공개 수치가 모두 있을 때만 표시한다. 하나라도 없으면 합계·연환산 매출 배수는 `없음`으로 처리한다. AWS는 26.1Q RPO $364B와 26.2Q 컨퍼런스콜 기준 계약 수주잔고 $496B를 반영한다. 따라서 26.2Q 합계는 $1.688T(Microsoft $678B + Amazon $496B + Alphabet $514B)다.

> 2026-08-02 17:10 · **04 분기 클라우드 수요·투자 차트 공시 기준·CY 통일.** 매출은 Microsoft Cloud·AWS·Google Cloud의 해당 CY 분기 공시액으로 정정했다. 수주잔고는 분기 잔고를 공개하는 Microsoft 상업 RPO와 Google Cloud backlog만 합산하며, AWS는 분기 잔고를 공시하지 않아 제외한다. 영업이익률은 AWS·Google Cloud 공시 부문 영업이익률의 매출 가중평균이며, Microsoft는 클라우드 영업이익률 미공시로 제외한다. 임의 배분·추정 잔고를 사용하지 않는다.

> 2026-08-02 16:45 · **04 분기 클라우드 수요·투자 차트 단일 톤 색상 적용.** Microsoft·Amazon·Alphabet의 누적 막대와 범례는 블루-그레이 계열의 명도 차이만 사용해, 과도한 다색 사용 없이 기업을 구분한다.

> 2026-08-02 16:30 · **04 분기 클라우드 수요·투자 차트 영업이익률 표기.** 매출 값 아래 괄호에는 Microsoft·Amazon·Alphabet 클라우드 부문 영업이익률의 매출 가중평균을 정수로 표시한다. Azure는 별도 영업이익 미공시로 공개된 클라우드 수익성 지표를 환산한다.

> 2026-08-02 16:01 · **GitHub 수정 자동 병합 원칙 명문화.** GitHub 코드 수정 요청은 사용자가 중단·검토만을 명시하지 않는 한 PR 생성, 검증, 자동 병합 대상 브랜치(`claude/*`) 사용, 실제 `main` 병합 확인까지 완료한다.
> 2026-08-02 15:00 · **04 분기 클라우드 수요·투자 차트 수주잔고 연환산 매출 배수 표기.** 각 수주잔고 값 아래 괄호에는 해당 분기 매출의 연환산(분기 매출×4) 대비 배수를 소수점 첫째 자리로 표시한다. 매출 아래의 수주잔고 대비 비율은 제거했다.
> 2026-08-02 12:30 · **04 분기 클라우드 수요·투자 차트 값 라벨 상향.** 매출·CAPEX의 값과 아래 괄호 비율을 막대 위쪽으로 8px 올려, 막대 및 인접 라벨과의 겹침을 줄였다.
> 2026-08-02 12:20 · **04 분기 클라우드 수요·투자 차트 축·값 단위 분리.** 왼쪽 축은 `T`, 오른쪽 축은 `B`로 표시한다. 수주잔고·매출·CAPEX 막대 값과 툴팁 값에서는 단위를 모두 제거하고, 비율은 값 아래 괄호 안 정수로 유지했다.
> 2026-08-02 12:10 · **04 분기 클라우드 수요·투자 차트 오른쪽 축 B 표기.** 수주잔고(왼쪽) 축·막대 값에서는 `T`를 제거하고, 오른쪽 축 및 매출·CAPEX 값은 `B` 단위로 표시하도록 변경했다. 비율은 기존대로 값 아래 괄호 안 정수만 표시한다.
> 初入 Observatory · **운영 SoT = 이 파일(리포 `main`).**
> **짝 문서 = `STYLE_GUIDE.md`(디자인).** 이 리포의 지속 갱신 문서는 **이 둘뿐**이다 — 화면을 어떻게 그리나=STYLE_GUIDE, 정보를 언제·어떻게 갱신하나=OPS.
> `.assetsignore`에 `*.md` → 사이트 미배포·리포 전용.
> 버전: **v3.5** (2문서 체계 · `INFO_SOURCES.md` 흡수 · **06 캘린더 뷰 삭제→01 흡수(정적 5버튼·런타임 6탭)** · 상단 타임스탬프 · 무날짜 실적 일정 공시 컷 · MV 3 · 관점 라이프사이클 트리아지 §0-5·§3 · **메뉴 재배열·개명: 02 인사이트 찾기·03 전문가 원탁·04 시장과 실적 전망**)
> **문서 맨 위 「최종 갱신」은 연월일+시분(KST). 이 문서를 고치면 그 줄을 반드시 함께 갱신한다.**

> 2026-08-02 12:05 · **업데이트 이력 DOM 감시 무한 루프 수정.** 04 자체 헤더의 배지는 신규 생성 때만 렌더하고, 이미 존재하는 배지는 MutationObserver가 다시 쓰지 않도록 차단했다. 비동기 이력 갱신은 `renderAll()` 단일 경로로 유지한다.

> 2026-08-02 11:50 · **04 AI 수요·공급 헤더 업데이트 이력 표시.** `changelog.js`가 aisd.js의 자체 헤더 우측에도 공통 업데이트 배지를 마운트한다. main 커밋 이력은 GitHub API에서 자동 합산해 이후 머지되는 변경을 별도 수기 등록 없이 이력 팝업에 표시한다.

> 2026-08-02 12:00 · **04 분기 클라우드 수요·투자 차트 표기 단위 통일.** 좌우 축과 막대 값을 모두 `T`·소수점 2자리로 통일했다. 매출의 수주잔고 대비·CAPEX의 매출 대비 수치는 값 아래 괄호 안 정수만 표시하며 `$`·`B`·`%` 표기는 제거했다.

> 2026-08-02 · 사이트 반영 자동 PR 브랜치를 `claude/site-apply-*`로 통일. Claude PR Gate의 검사·자동 병합 대상과 일치시키고, PR 생성 실패 시 임시 브랜치를 정리하며 GitHub 응답 원인을 모달에 표시.

> 2026-08-01 16:30 · **03 전문가 원탁 토론 이력 헤더 단순화.** UI는 「토론 이력」만 표시하고 새로고침 버튼을 제거했다. 누적 보관 상태와 UI 일치. 신규 토큰·CSS 0.
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
※ 위는 **런타임 렌더 순**(§3 내부번호 = 이 순서). `nav` 정적 버튼은 5개(market·cycle·port·council·memo · **index.html 무편집**)이고, `insight.js` `mount()`가 런타임에 ①`insight` 탭을 `market` 뒤 주입 ②`council`을 `cycle` 앞으로 이동 ③`cycle` 라벨 「궁금한 것」→「시장과 실적 전망」 개명 ④전 탭 index 순 재번호 → 위 순서 확정(정적 폴백은 마운트 전 구 5탭 · `insight.js` 로드 전 잠깐). **이 「잠깐」이 새로고침 플래시(FOUC)였고 `</head>` 앞 `#nav-fouc-guard`(`#nav{visibility:hidden}`→하이드레이션 후 `.rdy`)로 억제(2026-07-25·STYLE_GUIDE §4·§9).** **`data-v`·뷰 id·데이터 소스는 불변 — 라벨·순서만 재구성**(2026-07-18). ※ 04 뷰 제목은 #424가 옛 `#instantAnswer` vhead(「지금 궁금한 것」)를 삭제해 별도 개명 불필요 — v-thread 최상단은 `#dsAisd`(AI 수요·공급 로드맵). `v-port`·`v-tracker`·`v-macro`·`v-cal`은 **뷰서 제외·코드 잔존**(v-cal은 2026-07-17 06 캘린더 삭제로 합류 — 임박 이벤트는 01로 흡수, `#v-cal` CSS는 비활성 잔존).

### 01 시장 모니터링 (`v-market`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **시장 맥박**(동인 6축) | 자동(LLM) | `update-pulse.yml` | `pulse.json`(`fetch-pulse.mjs`). **근거 링크는 LLM 이 만들지 않는다** — 모델은 기사 번호(`si`)로 지목만, URL 은 `resolveSrcs()` 가 `news.json` 원본에서 채운다. 실패분 렌더 제외 |
| **다가오는 일정** (거시·실적 게이트 D-N 카드+범례 · 2026-07-17 06서 흡수) | 혼합 | 데일리 프루닝·asOf / 큐레이션 수시 | `calendar.json` `events`(수기+`derive-calendar.mjs` 프루닝) + `earnings.json` moves(`CAL_EARN_MOVES`). `renderCalNow()`가 오늘 기준 경과 제거·D-N·임박 `CAL_NOW_MAX`(8) 렌더. **02 연동**: 채택·고신뢰 매크로 관점 중 FOMC·물가·고용·중앙은행처럼 기존 이벤트와 날짜·종류가 일치하는 확정 결과는 R2 일괄 동기화와 화면 자동 동기화가 해당 카드 `meta`에도 반영한다(원문 날짜 ±10일, 가장 가까운 1개만). **운영자 오버레이(2026-07-26)**: 카드 **롱프레스(마우스·터치 600ms) → 삭제**, 그리드 끝 **「＋ 이벤트 추가」** 모달 — 텍스트 붙여넣기 → `/api/calevent-parse`(Claude, 오늘 KST 기준 상대날짜 환산·cat 6분류·렌즈 meta 초안)로 필드 자동 추출(뽑기≠반영·사람이 저장) → `/api/calevents` R2 `calevents.json` `{added,removed:["d|lbl"키]}` 전 기기 공유·`renderCalNow()` 병합(added 추가·removed 필터 — earnings moves 카드도 키 일치 시 숨김). `calendar.json`(리포 SoT)·숫자 파일 불변 — 표시 큐레이션(narrative≠numbers). `#calNow`·`--cat-*` `#v-market` 스코프. 크론 `update-calendar.yml`(운영자 수동) |
| 업데이트 이력(변경 로그) | 수동(인라인) | 사이트 변경 시 | `changelog.js` 인라인 `MKT_CHANGELOG`(`{d,t}` 최신순·자가 마운트=insight.js 패턴). `mountHead()`가 **01 시장 모니터링(`#v-market`) + 전문가 원탁(`#v-council`) 헤더(`.vhead`) 우상단**에 각각 `.mkt-upd` 배지를 마운트 → 클릭 시 `.cyc-pop` 모달(`.cyc-upd`/`.cyc-pop` 재사용 · 신규 토큰 0). **사용자 향 변경만** 기록 · 신규 항목은 배열 맨 위 |
| **오늘의 투자 명언** (뷰 최상단 스트립 · `quote.js` 자가 마운트 · `.vhead` 위) | 자동(런타임) | 페이지 로딩 시 · 스트립 클릭 시 교체 | `quote.js` 내장 명언 풀(공포/중립/과열 레짐별 8개) + `signals.json`(CNN F&G·VIX·나스닥 DD 합산 스코어)으로 레짐 판정 → 레짐 풀에서 랜덤 1개. 로더=`changelog.js` `loadQuote()`(raer·lead 패턴, index.html·worker 무편집). **레짐은 명언 「선곡」 전용** — 매크로 게이트(3중 AND) 판정과 별개 렌즈, narrative≠numbers·숫자 파일 불변. signals 실패 시 중립 풀 + 「지표 수집 대기」 칩(STYLE_GUIDE §6-6) |
| 코스피·S&P·나스닥 지수 | 자동 | 06:05·15:40 KST 예약 (1일 2회 · 실측지연 ~1~1.5h §8 — 저녁분 15:40 예약은 운영자 yml 적용 대기) | `charts.json` (`fetch-prices.mjs`, `^KS11·^GSPC·^IXIC` Yahoo 5Y). **meta 거래일을 시계열 끝에 강제 반영 + 이전 창과 union 병합** → `prices.json`과 갈라지지 않는다. 괴리>1%는 `prices.json.warn` |
| 미 10년물 금리 | 자동 | 06:05·15:40 KST 예약(시세 크론 편승 §6-1) + 폴백 런타임 | **1순위 `charts.json` `us10y`**(`fetch-prices.mjs` `^TNX` Yahoo 5Y · 지수 카드와 동일 t/c → 기간버튼 1M~5Y 실동작 · `^TNX` 10× 스케일은 `>20→÷10`로 % 정규화). **폴백** worker `/api/us10y` → `history[].markets.ten_year`(외부 피드 ~2개월). ※구버전은 폴백만 써서 6M+ 기간 무반응 버그(2026-07-16 수리, PR #345) |
| WTI 유가 | 자동 | 런타임 | worker `/api/wti` → **`points`** 배열 (Yahoo). `series` 로 읽으면 0건 |
| 미국 가솔린 (RBOB $/gal) | 자동 | 런타임 | worker `/api/gasoline` = `handleWti("RB=F","rb.f")` 재사용 → **`points`** 배열 (Yahoo · Stooq 폴백). 카드 표기 소수 2자리 |
| **DXI 메모리 현물** (신규 · 지표 6번째 카드) | 수동/주간 | **매주 금요일 장마감 후**(스케줄 태스크) | `dxi.json` `series[]`(DDR4 16Gb 3200 메인스트림 현물 $). DXI 지수는 DRAMeXchange 포털 게이트라 무료 피드 없음 → TrendForce 공개 현물가로 주간 1점 append. `loadDxi()`·`lensDxi()`=01 `card()`/`lens()` 복제(신규 토큰 0·`dod:false`로 전일대비 억제). narrative≠numbers — MU γ-닫힘 ③ 입력 참고용 |
| **통합 지표 그리드** (12카드) | 혼합 | 카드별 기존 주기 | VIX·CNN F&G·원/달러를 별도 게이지 줄에서 지표로 통합하고, VIX(Cboe)·원/달러(연준 H.10 `DEXKOUS`)는 `market_history.json` 최근 3년 일별 백필과 실시간 값을 날짜별 병합해 3Y 차트를 제공하며, 한국 반도체 수출(`trade.json`)도 같은 그리드에 배치. 총수출·무역수지 카드는 삭제. **01 기간 기본값은 6M(126거래일)**이며 1M·6M·1Y·3Y·5Y 선택은 공통 상태로 동기화한다. 미국 NFP는 worker `/api/fred?ids=PAYEMS` 월간 고용 수준의 전월 차분(천 명)을 그래프로 렌더하며, `nfp.json`에 BLS CES0000000001 최근 3년(2023-07~2026-06, 36개월)을 백필해 FRED 장애 시 대체하며, 6M 선택은 0선을 포함한 월별 막대그래프, 나머지 기간은 기존 선 그래프로 표시한다. 나스닥 드로다운은 지표 카드에서만 제거하고 매크로 게이트 입력은 유지한다. 데스크톱은 카드 드래그로 고정 그리드 슬롯 순서를 바꾸며 `am_market_indicator_order_v1`에 저장, 700px 이하는 드래그 비활성. 반도체 수출 카드도 공통 내부 순서(값 → 렌즈 2줄 → 하단 그래프 → 출처)를 따르며 `.mkt-chart`로 그래프 하단을 맞춘다. |
| **월간 선행지표** (FRED · `lead.js` 자가 마운트 · 관련 기사 앞) | 자동 | 신호 크론 편승(월 1회 갱신) | `signals.json` `lead`(`fetch-signals.mjs` `fetchLead()`). FRED 무키 CSV 3계열 — `IPG3344S` 반도체 생산지수(L3·L4) · `CAPUTLG3344S` 반도체 가동률(L4) · `NEWORDER` 비국방 자본재 신규수주 ex항공(상류). 판정 = **최근 3개월 평균 vs 직전 3개월(mom3)** + 전년동월비(yoy) → up/flat/down. 자동층이 전부 일간 시세(후행·동행)라 「미리 보는」 축이 없던 공백을 메움. 비치명(실패 시 직전 `lead` 보존)·워크플로 편집 불요(update-signals 가 signals.json 을 이미 커밋). 관측치 표시 전용 — narrative≠numbers |
| ~~보유 종목 스파크라인~~ **삭제(2026-07-25)** | — | — | SimpleorNothing 지시로 01에서 제거. `risk.js`가 런타임에 `h2`+`#mktHoldings`를 떼어내고 그 자리에 「리스크 보드」를 넣는다(index.html 무편집). `loadHoldings()`·`charts.json` 보유 시리즈는 코드·데이터 잔존(호스트 없으면 즉시 return) — 개별 종목 그래프는 01 「종목 뉴스」 블록·05 트래커에 그대로 |
| **리스크 보드 (3축 · `risk.js` 자가 마운트 · 지표 다음)** | 혼합 | 상태·게이지=수기(조건 충족 시) / 관련 기사=뉴스 크론 06:12·18:12 편승 | `risk.json`(축 정의·상태·게이지·점등 조건·`insight`) + `news.json`(런타임 키워드 매칭). 3축 = ①사모 크레딧의 역습(자본·강물3) ②채권 자경단의 귀활(매크로·장기금리) ③수출 바통 터치(한국·실물). 카드의 상시 영역은 상태 배지·렌즈 2줄·게이지 4~5행만 남긴다. **점등 조건·레이어 리드스루·최근 반영 기사·근거는 카드 하단 「조건·근거 보기」에 숨기고 데스크톱 호버/포커스·모바일 탭으로 오버레이 표시한다.** 카드 빈 영역 600ms 롱프레스(4px 이동 취소) 시 삭제 버튼을 표시하고 확인한 id는 `am_risk_board_hidden_v1`에 저장해 재접속에도 숨긴다. **보드 위 인사이트 2줄** = l1 상태 집계 런타임 자동 파생 + l2 `risk.json.insight`(해석 한 줄). **뉴스 자동 반영** = 축별 `keys`(라틴은 단어 경계·한글은 부분 일치) − `xkeys`(동형이의 배제, 예 「수출통제」) 로 최근 45일·축당 3건. narrative≠numbers — 표시 전용, 상태 전환은 `trigger` 충족 시 `risk.json` 수기 갱신으로만 |
| **사이클 판별 보드 (AI capex 4지표 · `gates.js` 자가 마운트 · 리스크 보드 다음)** | 혼합 | 상태·게이지=수기(분기 실적·대형 공시 시) / 관련 기사=뉴스 크론 06:12·18:12 편승 | `gates.json`(지표·상태·게이지·점등/해제 조건·`insight`) + `news.json`(키워드 매칭 · risk.js 패턴 복제). 4지표 = ①수주잔고 vs capex ②상각기간 재조정 ③조달 가속·환원 축소 ④모델 레이어 조달. 상태 = 점등 `wn`/황색 `nt`/미점등 `ok` — 상시 영역은 제목·판정·게이지만, **조건·리드스루·최근 기사·근거는 하단 호버/포커스·탭 상세로 축약**. 카드 600ms 롱프레스 삭제는 `am_cycle_board_hidden_v1`에 id를 저장하며 원본 JSON은 불변. 마운트 = `#riskBoard` 뒤(6초 대기) → 폴백 `#mktMacroNews` 앞. narrative≠numbers — 표시 전용, 상태 전환은 `trigger` 충족 시 `gates.json` 수기 갱신으로만 |
| **카드 렌즈 요약 2줄** (그래프마다 프레임→판정) | 자동(런타임 파생) | gamma·signals 일별 / holdings 주간에 편승 | `gamma.json`(γ·stage·flagged) + `signals.json`(**`window.macroEval` 단일소스 재사용**) + `holdings.json`(layer·평단) + `charts.json` |
| 종목 뉴스 (종목 블록형 + 기사별 **일자 + 두 점**[명사형 요약 `a` / `→` 의미·주가영향 `w`] + 우측 주가 차트) | 자동 | **뉴스·digest 06:12·18:12 (1일 2회)** / 차트 = 시세 크론 편승(§6-1) | `news_digest.json`(claude-sonnet-4-6) + `news.json`(**물질성 m≥1만**) + `charts.json` |
| ↳ 표시 규칙 | — | — | **최근 3개월(92일) 창 · 종목당 최신 5건.** 초과분은 「더 보기」 → `archive/{TK}.json` **온디맨드 로드**(첫 로딩 페이로드 상수 유지) |
| ↳ **`NEW` 배지(신선도 큐)** | 자동(런타임 파생) | 매 렌더 | 최근 3일(72h·`isNewDt`)+미열람 기사에 `.arow .anew` 부표(디자인=STYLE_GUIDE §6-5). **3초 호버 or 클릭 시 제거**→localStorage `am_news_seen_v1`(키=link) 영속·재렌더 재출현 없음. `rowHTML()` 경로(종목+「더 보기」). narrative≠numbers |
| 관련 기사 (매크로 · 토픽 블록형 + **기사별 일자 + 두 점**[명사형 요약 `a` / `→` 레이어·게이트 함의 `w`] — 종목 뉴스와 동일 형식) | 자동 | **06:12·18:12 KST** | `news_digest.json` `macro`(블록 상단 축 요약 `s`) + `news.json` `MACRO`. **LLM 물질성 채점(m)은 여전히 미적용**(축 자체가 관측 대상 · 하드룰만) 이나, **기사별 두 점 요약 `a·w`는 `summarizeMacro()`가 생성**(신규만 증분 · 과거치 재요약 없음). `w`는 개별 주가가 아니라 8레이어·매크로 게이트·상류 수요 관점의 함의. 렌더는 `.arow`(종목 뉴스 컴포넌트 재사용) · `a` 없으면 제목 폴백. **이 섹션 상단(자동 뉴스 위)에 03 채택 매크로 관점 스트립(`insStripMarket`)이 함께 렌더된다**(2026-07-18 상단→여기 이동 · `insight.js mount()` 앵커 `#mktMacroNews` 앞 · 큐레이션 관점=narrative, 뉴스와 별 컴포넌트). **토픽 블록은 기본 접힘이며 헤더 클릭(키보드 Enter/Space 포함)으로 펼친다. 토픽 영역은 좌표 기반 자유 배치 보드이며 헤더 포인터 드래그로 빈 공간·카드 사이·겹침 위치 어디든 이동한다. 카드별 `x/y` 좌표는 브라우저 `localStorage`에 축 키로 영속하고, 리사이즈 시 가로 비율·보드 경계를 보정한다. 단, 700px 이하 모바일은 드래그를 비활성화하고 헤더 탭을 펼침·접힘에만 사용한다. 헤더 600ms 롱프레스 시 축별 삭제 버튼을 노출하며, 확인한 축 키는 로컬 `am_topic_radar_hidden_v1`에 저장해 이후 렌더에서 제외한다(원본 뉴스 데이터 불변).** |
| ↳ **매크로 축 = 고정 아님·매 실행 자동 발굴** | 자동 | 실행마다 | `discoverMacroTopics()` — 광역 헤드라인 스캔(증시·stock market·economy·BUSINESS) → LLM이 **지금 도는 매크로 축 3개** 선별(금리·지정학·관세·전력·환율·capex 중 서로 다른 축) → 그 검색어로 수집. 실패 시 직전 축 승계 → 시드 폴백. 채택 축 = `news.json` `macroTopics`. **토픽명 하드코딩 금지**(사이트는 `it.name` 사용) |
| ↳ **병목축(고정 7축)** — L3 DRAM/HBM · L4 패키징 캐파 · L6 옵티컬 · L7·L8 전력 · 상류 capex · **상류 빅테크 자체 실리콘** · **L2 커스텀 실리콘·전력효율** | 자동 | 실행마다 | `BOTTLENECK_TOPICS`(`news-screen.mjs` 고정) → 매크로 레인(`ticker='MACRO'`)으로 렌더. **리밸런싱은 종목 뉴스가 아니라 '어느 레이어 병목이 조였나'에서 나온다** → 트렌딩 발굴에 맡기지 않고 상시 관측. digest가 **조임/완화 방향**을 명시 |
| ↳ **축 정규화 `ax` — 같은 축은 한 블록** | 자동 | 실행마다 + 런타임 | 발굴이 매 실행이라 같은 축이 다른 이름·id로 들어온다(중동 3종·capex 2종 → 8블록). 키워드 규칙 8종(`china`·`capex`·`chip`·`power`·`energy`·`trade`·`rates`·`fx` / 미매칭=정규화 이름)으로 축 키 `ax` 파생. `china` 규칙을 최선두에 두어 중국 관련 토픽(공급망·성장둔화·디플레·수요 등)이 단일 블록으로 병합됨 → `fetch-news.mjs`(축 중복 제거 · 직전 id·name 승계 · 5건 슬롯 축별 배정 · digest `macro[].id`=축) + `index.html loadMacroNews()`(축으로 블록 병합 · 링크 중복 제거 · 축당 5건 · 구 데이터도 즉시 병합). **축 키는 병합용 — 표시명은 라이브 `macroTopics[].name`**. ※ **병목축은 원칙적으로 정규화에서 격리(2026-07-21), CAPEX만 동일 토픽 예외 병합(2026-07-28).** L3·L4·L6·L7·L8·자체 실리콘 등은 `bn_*` 독립축을 유지한다. `bneck_capex`/`bn_capex`만 대표키 `capex`로 환원하고 `캐펙스·캐팩스·케펙스·케팩스·자본지출·AI 지출` 표기 변형도 같은 키로 정규화한다. 과거 데이터는 클라 `axIt()`에서 즉시 합치고 향후 수집은 `news-screen.mjs`가 처음부터 `ax:'capex'`를 기록한다. **내용 우선 예외: 기사 제목·요약·함의에 `CXMT|창신메모리|창신반도체|Kimi K3|Moonshot|DeepSeek|중국 AI`가 있으면 검색 유입축(예: 관세 `trade`)보다 `china`를 우선한다. 클라는 기존 기사·다이제스트 요약을 즉시 이동하고, `fetch-news.mjs articleAxis()`는 누적·신규 MACRO 기사의 `ax`를 저장 전 보정한다. `china`는 사이트 창·카드에 최신 12건을 유지해 CXMT 단일 이슈가 Kimi K3 등 다른 중국 AI 신호를 밀어내지 않게 한다.** |

**뉴스 수집 3축(`fetch-news.mjs`):** ①**종목축** = 종목명 검색 8건 · ②**시그널축** = 종목명 + 확정 사실 키워드 14일 창 4건 · **방향 대칭(2026-07-21)**: 긍정(`실적·수주·계약·증설` / `guidance·capex·order·backlog`) + 부정(`취소·연기·지연·감산·축소·보류·중단` / `cancel·delay·postpone·push out·cut·halt`) — 사이클 전환은 부정 신호로 먼저 온다 — *종목명 단독 검색은 SEO 콘텐츠팜을 부른다*("Why MU stock is down…") · ③**병목축** = 레이어 고정 5축(위 표).

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
| **01 다가오는 일정** | 예정 거시·실적 이벤트(FOMC·CPI/PCE·금통위·메가이벤트·실적)가 **경과**했는지 | 경과분은 `renderCalNow()`가 오늘(KST) 기준 자동 소거 · 이벤트 큐레이션·다음 회차 추가는 `calendar.json` `events` 수기 편집. 예: US CPI 발표 → 01 매크로 축에 반영. narrative≠numbers. **표시 범위 = 근접 8칸(`CAL_NOW_MAX=8`·D-N 오름차순, 고정 D-N 아님) — 8칸 밖(예: 9월+) 먼 일정은 「전체 캘린더 →」(#v-cal `#calFull`·`renderCalFull()`)에서 8칸 제한 없이 월별 전부 표시**(2026-07-26). |
| **04 시장과 실적 전망** | 01 데이터·병목 뉴스(지수·메모리 가격·capex·L3~L8 병목)가 **반도체 사이클(E군집)·주도주 사분면·γ·stage**에 함의가 있는지 | 메모리 가격 롤오버·병목 조임/완화 → 04 `cycle`·`gamma` stage 렌즈 점검. **숫자 변경은 §1 트리거 통과 시만**(가격 상승 자체는 플래그) |
| **02 인사이트 찾기** | 01 종목·매크로 뉴스의 **확정 사건(m≥1)**이 채택 관점·`signal_log`로 이어지는지 | 확정 사건 → 02 인사이트 아래 `signal_log.json` EOF append(§6-5). 관점은 「반영 대기」 유지, 숫자는 §1 트리거 |

### 02 인사이트 찾기 (`v-insight`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 관점 카드 (Insight) | 수동 | 판단·논제 시계 변화 시 | R2 `/api/insights`(+localStorage 캐시). **하나의 채택 claim = 하나의 관점**. 필드: 출처(`src`)·`route`·N·I·C·`grade`(관찰→확신 자동 승격)·`applied`(숫자 route 반영 여부) + **라이프사이클 `lcState`(발동 대기·발동·유지·만료)·`hyp`(전제)·`trig`(발동조건)·`until`(폐기 트리거)·`review`(점검일, 신규 채택 시 +14d 기본)**. 등급 옆에 후속 상태를 별도 배지로 표시하며, 기존 데이터는 관찰·후보=`승격 대기`, 지지↑=`발동 대기`로 무이전 파생한다. 상태는 「🕔 라이프사이클」 모달에서 선택·저장한다. `review` 도래 시 02 「점검 필요」로 재부상 → §0-5 트리아지. **편집기 = 카드 「🕔 라이프사이클」 → 모달 + 필드별 「보기 칩」 선택식**(클라 템플릿이 게이트·레이어·티커 기반 후보·날짜 프리셋 제시 · 칩 클릭=채우기·직접 수정 가능). |
| 관점 추출 (인테이크) | 수동(운영자 입력) | 인테이크 시 | 「관점 뽑기」 → `/api/insight`(worker→Claude). 본문(스크립트/기사) 있으면 그대로, URL만 있으면 web_search로 시도. 8레이어·단계 프레임으로 claims 후보 정렬(뽑기≠반영 · 채택은 사람이 체크). **형식별 전용 클라 추출기(2026-07-30)**: PDF(pdf.js 텍스트→필요 시 OCR) · 이미지(Tesseract OCR) · DOCX(OOXML `word/document.xml` 단일패스) · PPTX(슬라이드/발표자 노트, 네이티브 글자 없으면 슬라이드 media OCR) · XLSX/XLS/XLSM/XLSB/ODS(SheetJS, 시트별 CSV) · RTF/HTML/XML/ODT/ODP/HWPX/EML · TXT/MD/CSV/TSV/JSON/SRT/VTT/YAML. ZIP 기반 Office를 `file.text()`로 읽는 폴백을 제거해 `PK`·`word/document.xml` 바이너리 노출을 차단한다. 파일당 25MB·분석 입력 120,000자 상한이며 초과 시 전체 글자수와 컷을 명시한다. 구형 DOC/PPT/HWP·암호화/손상 문서는 깨진 내용을 넣지 않고 최신 Office/HWPX/PDF 변환 안내를 표시한다. **PDF는 `getDocument`에 `cMapUrl`(cdnjs `/pdf.js/{PDFJS_VER}/cmaps/`)+`cMapPacked` 지정 → 한글 CID 폰트(Adobe-Korea1·ToUnicode 없음) 정상 디코드**(2026-07-20). OCR 폴백은 진짜 스캔본·ToUnicode 파손 PDF만 `realLetters` 컷으로 걸러 발동. **Sonnet 5 adaptive thinking 기본 활성화 대응(2026-07-31)**: 첫 호출은 추론·web_search를 유지하고 출력 예산 12,000, 최종 JSON이 없을 때만 thinking-off 8,000으로 1회 자동 복구. 재시도 후에도 비면 502 원인 메시지로 반환해 클라의 모호한 파싱 실패를 제거 |
| ↳ **유튜브 링크 스크립트 추출**(2026-07-18 신설) | 자동(입력 보조) | 인테이크 시 | URL 칸에 **유튜브 링크만** 넣고 본문이 비면 클라(`ytExtract`)가 먼저 `/api/yt-view`(**`mode:'insight'`** · Gemini 영상 인식)로 영상을 **상세 전사**→`insText` textarea 채움(원문 raw 저장)→그 스크립트로 `/api/insight` 관점 추출로 이어감. **03 전문가 원탁과 동일 엔드포인트**(03=발화자 관점 압축 요약 / 02=`mode:'insight'` 상세 전사 분기·`maxOutputTokens` 상향). 실패·`GEMINI_API_KEY` 부재(503)면 **URL web_search로 폴백**(구 동작). narrative≠numbers — 스크립트는 인테이크 입력일 뿐 숫자 파일 불변. 신규 CSS·토큰 0(index.html 무패치·insight.js/worker.js만) |
| **표시 레벨(뎁스) 접기**(2026-07-18 신설) | 런타임(표시 전용) | 상시 · 기본 L1 | 「채택한 관점」 목록을 3단계 아웃라인으로: **L1 자료**(소스 카드만·접힌 관점·시그널 건수 힌트) · **L2 관점**(+claims, 시그널은 건수 힌트) · **L3 시그널**(+관련 시그널 로그·미연결 시그널 펼침). 상단 `.ins-lv` 버튼군(기본 L1). `insight.js` `renderLevel()`·`lvl` 상태·`renderList` 뎁스 분기·`claimLine(…,showSig)`·`sigSection(c,open)`·`renderSigRest` lvl 게이트. **힌트 클릭 = 그 자리 펼침(전체 lvl 독립)** — L1 자료 힌트(`.ins-lvhint`) 클릭→그 자료 관점을 `.ins-recwrap`로 펼침, 관점 시그널 힌트(`.ins-sighint`) 클릭→로그를 `.ins-sigwrap`로 펼침(자료→관점→시그널 중첩 드릴·CTA 펼치기↔접기·`data-rec`/`data-sig`, 2026-07-18~19). **검색·라우트 필터·등급 보드와 직교**(무엇을 펼칠지만 · 데이터 무변). narrative≠numbers — 표시 방식일 뿐 숫자·판단 파일 불변. 신규 CSS만(`:root` 토큰 0 · index.html 무패치) |
| 인사이트 자가 마운트 | 자동(런타임) | 페이지 로딩 시 | `insight.js`의 `mount()` 함수가 `#v-insight` 탭(**01 시장 모니터링 뒤·03 전문가 원탁 앞에 주입** · 정적 nav 무편집 런타임 재구성 · 2026-07-18) + 헤더 배지 + `signal_log` 섹션을 런타임에 주입. **채택 관점 반영 스트립(`insStripMarket`/`insStripCal`→01 · `insStripDec`→**04** · 2026-07-18 05→04 이동, 로드맵 `#dsAisd` 아래·강물 탐색 `.vhead` 위)도 `mount()`가 각 뷰에 앵커링**(`insStripThread`는 2026-07-18 #424 「02 박스1 삭제」로 앵커 제거 — `strip()`은 `#insStripThread` 부재 시 no-op) — 매크로 관점 스트립은 01 「관련 기사」 섹션(`#mktMacroNews` 앞)에 붙는다(2026-07-18 상단→이동, §01 관련 기사 행). **`insStripCal` 일정 관점은 항목별 `삭제` 버튼 제공(2026-07-28): 해당 claim만 제거·다른 관점 보존, 마지막 claim 삭제 시 빈 자료 정리, `persist()`가 localStorage+R2에 동시 저장** |
| **사이트 반영(「반영하기」)**(2026-07-28 신설 · 2026-07-29 완전자동 · 2026-07-31 교차메뉴 확장) | 런타임 감지 + **완전 자동 직접 커밋** | 관점 추출·저장목록 렌더 시 | `SITE_SRC`가 사이클 판별 `gates.json`·리스크 `risk.json`뿐 아니라 **01 시장 맥락 `signal_log.json`·다가오는 일정 `calendar.json`**도 읽는다. 숫자 보드는 기존 `keys`/`xkeys`와 수치 게이트를 유지하고, `macro`/`calendar` narrative는 확정 정책 결과·판정 맥락이므로 수치 필터 예외로 관련 보드에 매칭한다. 시장 맥락은 route(`macro`·`calendar`·`signal_log`), 일정은 이벤트명·티커 토큰으로 연결한다. 「🚀 지금 반영」은 `POST /api/site-apply`를 대상별 호출해 ① `gates`/`risk`: Claude가 gauge/verdict/srcs/asOf 패치 계산(게이지 길이·순서·`k` 불변, 근거 없는 수치 변경 거부) ② `signal_log`: 기존 스키마로 append·정규화 중복 차단 ③ `calendar`: 동일 이벤트의 `meta`에 결과 업데이트·중복 차단 후 저장소 `default_branch`에 직접 커밋한다. FOMC처럼 수치 없는 narrative도 확정 회의 결과면 보드 verdict·시장 맥락·해당 D-day 카드 설명을 함께 갱신할 수 있지만 숫자 파일은 변경하지 않는다. 카드별 결과(반영됨/변경 없음/실패), 수동 「반영 지시 복사」, `siteDone` 영속은 유지. `handleSiteApply`는 `ANTHROPIC_API_KEY`·`GITHUB_TOKEN` 필요. 허용 대상은 worker 전역 `SITE_APPLY_FILES`(`gates`·`risk`·`signal_log`·`calendar`)가 단일 SoT이며 프런트 `SITE_SRC`와 동일하게 유지. **Sonnet 5 빈 JSON 복구(2026-07-31)**: 보드 패치 첫 호출은 adaptive thinking 유지+4,000, JSON 부재 시 thinking-off 2,400으로 1회 자동 재시도하며 재실패는 한국어 502 원인으로 표시 |

> **관점은 채택으로 끝나지 않는다.** `review`(점검일)가 강제 부여돼 도래 시 「점검 필요」로 재부상하고, §0-5 트리아지에서 발동/만료/유지로 처리된다. narrative는 여전히 숫자 파일을 못 바꾼다 — **발동 = 05 리밸런싱 후보로 올릴 뿐**이고, 숫자 변경은 §1 트리거(실적 비트·가이던스 상향·확정 수주) 별도.

> **02 헤더·인테이크 표시 정리(2026-07-20):** 전 페이지 공통 `#asofBox`(시세/정보 스탬프)는 **02에서만 숨긴다** — `insight.js mount()`의 nav 클릭 리스너가 insight 탭일 때 `#asofBox`를 `display:none`으로 덮어쓴다(자가 마운트라 index.html 탭 핸들러보다 **뒤에 등록** → 나중 값이 이김 · **index.html 무편집** · `#asofBox`가 DOM에서 `#v-insight`보다 **앞**이라 CSS `~`도 불가). 우상단 `updIns`(인사이트 전용 update 스탬프)는 유지. 뷰 설명(`.vsub`)은 `.vhead`에서 빼 **뷰 맨 아래**(`#insSigRest` 뒤·`.ins-wrap` 막내)로 이동(`GUIDE_HTML` 분리·`border-top var(--line)` 구분). 인테이크 3입력(`insUrl`·`insText`·`insDrop`)의 예시·힌트 placeholder는 최소 라벨만 남기고 삭제. `insight.js`만 편집(index.html·insight.css 무편집) · 신규 :root 토큰 0. SimpleorNothing 지시.

### 03 전문가 원탁 (`v-council`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 원탁 토론 | 수동 | 필요 시 | 전문가 2인+ → 「토론 시작」 → `/api/council`(Claude). **토론 주제(`#clTopic`) 선택 입력**(2026-07-17) — 비우면 현 상황 종합, 채우면 그 논제 중심. `narrative≠numbers` |
| **1인 심층 자문**(2026-07-19 신설) | 수동 | 필요 시 | 전문가 **1인만** 선택 → 하단 바에 뜨는 「심층 자문」 → `/api/council-ask`(Claude opus-4-8·`max_tokens` 3500). 다인 토론과 별개 — **그 전문가 렌즈만 순수하게**(좌장 오버레이 없음, 운영자 결정) 깊은 진단·**직접 실행 조언**·자기 반증(`watch`)을 낸다. 출력 스키마 `{diagnosis, basis[], advice[], watch[], answer, stance}`. 좌장 스틸맨 대신 **그 렌즈 자체의 리스크 규율을 `watch`(자기 반증)로 강제**해 편향 진단 방지. `#clTopic`=질문(비우면 현 상황 심층 진단)·`#clCtx`=라이브 situation 재사용. 결과는 토론 이력(`/api/council-discussions`)에 `[심층 자문]` 접두로 누적(advice→actions·watch→steelman 매핑). **자가 마운트 `council-ask.js`**(worker `<script defer>` 주입·index.html 무편집·카드 선택 상태는 `.cl-card.on` DOM으로 감지·전문가 데이터는 선택 카드 DOM에서 읽어 라이브 오버라이드 자동 반영). 신규 CSS·:root 토큰 0(기존 `.cl-*` 재사용). narrative≠numbers — 관점 텍스트일 뿐 숫자 파일 불변. 음성 재생은 `window.COUNCIL.playReport` 재사용(diagnosis 비우고 board를 그 전문가 목소리로 몰아 순수 렌즈 유지) |
| **패널 관리 (로스터 추가·삭제·편집)**(2026-07-19 신설) | 수동(운영자 입력) | 필요 시 | vhead 「패널 관리」 버튼 → 모달에서 전문가 카드 **추가·삭제·편집**(기본 6인 포함 전체 CRUD·「기본 6인 복원」). 편집 필드=이름·전문·레이어 태그·시계(논제/가격/좌장)·스탠스·관점·아바타(프리셋 6종). **서버 저장** = R2 `council_roster.json`(`/api/council-roster` GET/POST · 존재 시 인라인 기본 6인을 대체 · 모든 기기 공유). 뷰·스탠스 편집은 **council_log 채널에도 흘려**(`/api/council-log`) council-sot 덮어쓰기를 피하고 관점 SoT를 일원화. **자가 마운트 `council-roster.js`** — 인라인 COUNCIL이 노출한 훅(`getExperts`/`setExperts`/`reRender`)으로 로스터를 주입해 **토론·1인 자문 양쪽이 커스텀/편집 명단으로 동작**(index.html은 훅 3개만 추가). 상한: 최대 24인·필드 길이 제한(worker `sanitizeRosterExpert`). 신규 :root 토큰 0(기존 `.cl-*`·`.cl-modal` 재사용). narrative≠numbers — 명단·관점 텍스트일 뿐 숫자 파일 불변. 실존 인물 렌즈 시뮬레이션 가드레일 유지 |
| 전문가 관점 갱신 | 수동(운영자 입력) | 필요 시 | 각 전문가 카드 「관점 갱신」 모달 4탭 — **텍스트**(`/api/council-summary` Claude) · **유튜브 링크**(`/api/yt-view` Gemini 영상 인식 · 기본 모드=발화자 관점 압축 요약, 02는 `mode:'insight'` 상세 전사 분기 공유) · **여러 링크**(신설) · **파일**(txt·md·srt·vtt·csv·docx·pdf → council-summary). 관점 텍스트·stance만 갱신, **숫자 파일 불변**(narrative≠numbers). 반영분은 R2 감사 로그 `council_log.json`(`/api/council-log`)에 누적 → 카드 복원·「관점 갱신 이력」 모달 |
| ↳ **여러 링크 자동 인식·통합**(2026-07-17 신설) | 수동(운영자 입력) | 필요 시 | 유튜브·기사 링크를 **한꺼번에 붙여넣으면** 클라(`recognizeLinks`)가 URL을 파싱→유형 자동 분류(유튜브/기사)→소스별 요약(유튜브=`/api/yt-view` Gemini 영상 인식 · 기사=`/api/council-read` **서버가 URL 본문을 직접 페치→HTML 스트립→Claude 비스트리밍 요약**, web_search 아님 → 특정 URL을 빠르고 확실하게 읽음)→**하나의 통합 관점으로 합성**(`/api/council-summary` 재사용). **소스는 병렬 인식**(`Promise.all` — 다건도 동시 처리). 링크 아닌 문장은 메모로 반영. 소스별 진행·한 줄 요약 표시, **실패·본문 얇음(차단·JS 렌더·페이월)은 건너뜀**(개별 처리 · view 빈 문자열). 모든 출처 링크는 로그 `refs[]`(신규 필드 · `{label,url}`)에 함께 저장·이력 모달에서 각각 링크로 표시. 신규 CSS·토큰 0(모달 컴포넌트 재사용) |
| **원탁 자료 기반 토론** | 수동(운영자 업로드) + 자동(전문가별 해석) | 토론 전 | `council-material.js` 자가 마운트가 03 원탁 「토론 주제」 위에 여러 자료 업로드 영역을 추가한다. 최대 6개·파일당 25MB, PDF·PPTX·DOCX·TXT·MD·CSV·JSON·SRT·VTT·HTML 지원(PDF.js·JSZip·Mammoth 지연 로드). 파일별 최대 4만 자(초과 시 앞 2.6만+뒤 1.4만), 통합 최대 10만 자를 `[자료 N · 파일명]`·`[페이지/슬라이드]` 표식과 함께 기존 `POST /api/council`의 `material`로 첨부한다. worker는 자료를 1차 근거로 고정하고 모든 `board.take`가 같은 자료의 구체 근거→각 전문가 `field/view` 렌즈 해석→의견·위험 순으로 말하게 한다. 자료 속 지시문은 데이터로만 취급하며, 없는 수치·인용은 생성 금지·근거 부재 시 「자료에서 확인되지 않음」 명시. 생성된 리포트는 기존 Gemini 음성 토론(`/api/council-audio`)으로 재생. index.html·숫자 파일 무편집, narrative≠numbers |
| **원탁 알파맵 기본 컨텍스트** | 자동(토론 시작 시 최신 수집) | 모든 원탁 토론 | `council-context.js` 자가 마운트가 `POST /api/council` 직전에 알파맵의 **나의 자산현황**(`holdings.json`·`prices.json`), **01 시장 모니터링**(`signals.json`·`cycle.json`·`gamma.json`·`signal_log.json`·`calendar.json`), **02 채택 인사이트**(`/api/insights`), **04 시장·실적 전망**(`gates.json`·`risk.json`·`earnings.json`·`judgment.json`)을 병렬 수집·압축해 `siteContext`로 첨부한다. 60초 이내 재토론은 캐시하고 그 이후 다시 수집한다. worker는 업로드 1차 자료 → 날짜가 표시된 알파맵 내부 SoT → 사용자가 편집한 현 상황 순으로 근거 우선순위를 적용하며, 충돌은 기준일·출처 차이를 명시한다. 모든 전문가는 논제와 관련된 보유자산 영향·01 신호·02 채택 관점·04 게이트를 확인하되 관련성이 낮으면 억지 연결하지 않는다. 자산·내부 판단의 Anthropic Claude API 처리에 대한 운영자 명시 승인(2026-07-29). index.html·숫자 파일 무편집, narrative≠numbers |
| 원탁 음성 토론 재생 | **고품질 Gemini(Google AI Studio) 우선** · 실패 시 브라우저 TTS 폴백 | 재생 시 | 원탁 진단 리포트(diagnosis·board·consensus·tension·steelman)를 화자별 음성으로 메신저형 극화 재생. `council-audio.js` 자가 마운트가 `window.COUNCIL.playReport`와 원탁 재생 버튼을 가로채 리포트 DOM을 발언 목록으로 구성하고, worker `POST /api/council-audio`에 `{turns:[{say,voice}]}`를 전송한다. worker는 발언별 단일 화자 Gemini TTS를 병렬 생성해 RMS 정규화·간격 삽입 후 단일 WAV로 연결하고, R2 `cnclaud_{sha256}.wav`에 내용 해시 캐시한다. `X-Council-Starts` 시작 시각으로 말풍선 하이라이트를 동기화한다. 좌장=Kore, 나머지는 `VOICE_POOL` 순환 배정. Gemini 호출·R2·WAV 생성 실패 시 기존 브라우저 TTS(`_orig`)로 자동 폴백. index.html 무편집·신규 `:root` 토큰 0·기존 `.cl-*` 플레이어 재사용. narrative≠numbers |
| 원탁 업데이트 배지 | 자동(런타임) | 로딩 시 | `changelog.js` `mountHead()` — 01 시장 모니터링과 동일 `.mkt-upd` 배지 재사용 |

### 04 시장과 실적 전망 (`v-thread`만 렌더 · `v-cycle`·`v-alpha` 2026-07-18 렌더 제외)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **AI 수요·공급 로드맵** (04 맨위 · 판정 보드 + 밸류체인 구조도(①~④·돈의 흐름·티어별 손익 스트립·관측 위치) + **이익률 추이 매트릭스(병목의 온도계 — ②랩·③클라우드·④NVDA·④메모리·④통신/전력 연도별 영업이익률 + 행 클릭=요인·구조성·**선행 시그널**[가격·리드타임·캐파·경쟁 진입 4종 — 마진 후행 보정] 판정)** + ①진화 · ②AI 판매자 매트릭스 · ③컴퓨팅 통합(CAPEX 리비전 트랙+**매출·FCF·영업이익 4사 합산 라인 오버레이**(SVG · 막대·매출·FCF·영업이익 전부 동일 $축[상한 ~$2.55T · ③ 차트 높이 510px] — 2024 교차 후 26E FCF ~0 붕괴 · 값 트랙 2줄)+**CAPEX 실현 검증 3종 동행 지표 막대**(2023~2028 연도별)[가속기 L2 NVDA DC매출·메모리 L3 HBM 시장규모·전력 L8 글로벌 DC전력 — 명목$/물량+가격/커밋 실물 3시계 · 공백=빈칸(—)]+4사) · ④Factory 구성요소별 · **④칩 제조사별 Capex(삼성·SK·마이크론·TSMC · 메모리 L3/파운드리 L2·L4 구분)** · ④중국) | 수동 | 분기(실적 시즌 캡처) | `aisd.js` 자가 마운트(#dsAisd · flags.js 패턴 — worker.js `<script defer>` 주입 · v-thread 최상단). 전역 토큰만·`ds-*` 스코프·신규 :root 토큰 0. 수치=컨센서스·공개 실적 방향성, **리비전 트랙·손익·이익률은 캡처 축적 전 예시 표시**. narrative 층 — 숫자 파일 무관. 재판정 트리거: ①추정 ▼하향 ②DDR5 현물<계약 롤오버 ③가격>리비전 속도 · **이익률 서열 역전 = 레이어 회전 신호** |
| 즉답 요약 (전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널) | 혼합 | 런타임 파생 | `gamma`·`holdings`+`TARGETS`·`signal_log` (`renderInstantAnswer`) / 전선·다음재채점만 `IA_CFG` 수동 |
| 반도체 사이클 3차트 (D CAPEX · D₂ 메모리매출 · C DDR5) + 종합 판정 1줄 | 혼합 (E 자동) | E: 런타임 / 나머지: 판단 시 | `cycle.json` + worker `/api/fred` (E군집 = `derive-cycle-e.mjs` 파생). ※ 「현재값·임계값 신호 요약」 표는 2026-07-12 제거 — E·B·A는 차트 없이 `cycVerdict` 램프 집계로만 반영 |
| 주도주 4사분면 | 혼합 | alpha 주1회 + 판단 시 | `alpha` → `earnings` → `judgment` · 상단 렌즈 2줄(사분면 분포+`MACRO_GRADE`) · 크기 토글(비중↔적정밴드 갭 `TARGETS`) · **가로축 토글(예상 ↔ 실현 3M `charts.json` 63거래일 초과수익)** · **무게중심 토글(L1~L8 비중가중 평균 좌표 + 오버→언더 한계자본 회전 화살표)** · **궤적 토글(스냅샷들→현재 위치 점선 꼬리, 예상 좌표·라이브 뷰만 — ①↔③ 강등/회복 가시화)** · 각주 기준일 = `alpha.asOf` 자동연동 |
| ↳ 판단 캘리브레이션 패널 | 자동(런타임 파생) | 로드 시 | `snapshots.json`(과거 예상 3M `aN[1]`) × `charts.json`(스냅샷일 이후 실현 경과) → 부호 적중률·편향(예상 과대/과소). 단일종목 시계열 보유분만 매핑(ETF·바스켓 제외) · 경과 <63거래일이면 부분 실현(방향 위주). OPS §1 「침묵하는 오류」 감시 |
| 레이어 파이 (비중) | 혼합 | holdings 주간에 편승 | `holdings.json` |
| γ 테이블 | 자동(cron) + 수동(판단) | 일별 (자동) + 실적/리비전 시 (수동) | `gamma.json` (g 자동 / stage·flagged·override 수동). gamma 테이블은 `renderGamma()` 함수가 `gamma.json`을 직접 소비 |
| signal_log | 수동 | narrative 유입 시 | `signal_log.json` EOF append. 포맷: `{date, at, source, srcs:[{label,url}], items:[{tag,layer,col,html}]}`. 인라인 SIGNAL_LOG(~5/30)는 불변·신규만 외부 파일에 쌓인다 |
| 관통 강물 (RIVERS) | 수동 | 논제 시계 변화 시 | `gamma.json` `RIVERS` 배열. 번호·순서는 라이브 SoT — 하드코딩 금지. Value Chain 종목 칩(`RV_PX`) 주가는 `hover-chart.js`가 **1Y 일봉**으로 표시하며 01 시장 모니터링의 기간 상태(`RG`)와 분리 |

### 05 리밸런싱 (`v-decision`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 결정 보드 | 혼합 | 리밸런싱 실행 시 | `judgment.json` (`decisions` 배열). 매매 방향·게이트·근거·사후 추적 |
| 포트폴리오 테이블 | 자동 + 수동 | holdings 주간 + prices 일별 | `holdings.json` × `prices.json` |
| **종목 채점 라이브 참고(01~04 접속)** — 드로어 「01~04 라이브 참고」 박스(02 스택→종목 클릭 시) + 트래커 행 칩(v-tracker 잔존 뷰) | 자동(런타임) | 드로어 열 때 | `gamma.json`(γ갭·g·stage·override why·**EPS 리비전30d vs 가격30d → 두 시계 판정**·애널 컨센서스·최근 액션) + `signals`(매크로 게이트 G) + `council.json`(종목 레이어 매치 전문가 스탠스·상/하방) + `/api/insights`(티커 매치 채택 관점 수·최신). **초입 5신호 채점은 수동 유지(불변 규율)** — 라이브는 「채점 전 확인」 참고용. GAMMA 로드 후 `renderTracker` 재렌더 훅 |
| 시장 모멘텀 전망 + 추정 리비전 트래커 (`#momOutlook`·`#probEst`) | 자동(런타임) | gamma·signals·charts 일별 | index.html 인라인 IIFE. `renderMom`=signals+삼성 프록시 레짐 · `renderRev`=`gamma.json` `rev`(TP·EPS·주가 리비전·애널·강등 게이트 d30). **강등 게이트 = 30d 주가 − 30d EPS(FY+1) 리비전율**(양수=가격 추월·성숙 강등 후보 / 음수=추정 앞섬·γ open). 관측치·예측 아님 |
| ↳ **「기대수익 점수」 컬럼** (`raer.js` 자가 마운트) | 자동(런타임 파생) | gamma 로드 시 | 추정 리비전 트래커에 위험조정 기대수익(**RAER = 여력 × 실현확률 ÷ 리스크**, 15행 상대 0–100) 컬럼을 종목 다음에 주입 + 점수 내림차순 재정렬 + **현금 행** 추가. 실현확률=EPS 리비전(90d·30d)·애널 상향폭·γ 건전성(하향이면 급감) / 리스크=단계(성숙 1.2·과열 1.45)·90d 급등·γ 소진·고변동 가산. 현금=무위험(한은 기준금리 `RF` 상수)·상승 기대수익 바닥·게이트 잠김 시 배분 실탄. `changelog.js` 부트스트랩이 `loadRaer()`로 `<script defer src="/raer.js">` 주입·index.html·worker.js 무편집·신규 :root 토큰 0·jsdom 배치 검증. **기간은 점수로 안 나눔 — 「언제」는 촉매(실적 D-N)가 답함.** 관측 휴리스틱·예측/투자권유 아님(narrative≠numbers) |

> **σ·μ 추정(`#v-prob` 「AI로 σ·μ 추정」 · 비렌더 뷰).** 2026-07-20부터 **LLM·웹검색을 쓰지 않는다** — `POST /api/estimate` 가 Yahoo 일봉 1년치로 로그수익률 표준편차×√252 를 직접 계산한다(드리프트는 실현 CAGR 을 시장 8%로 수축·−10~+20% 클램프). 심볼 해석 실패(회사명 입력·비상장) 시에만 Sonnet+검색 3회 상한 폴백. 응답 스키마 불변(§6-6).

### 06 모닝 브리핑 (`v-brief` · `brief.js` 자가 마운트)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **텍스트 브리핑** — **9섹션 고정 순서**: ①결론(+근거 불릿) → ②**시장 맥박 리스크 보드** → ③매크로 게이트 3중 AND → ④**한·미 종합지수** → ⑤**보유종목 마감(전체 요약 → 주요 종목만)** → ⑥레이어 갭 표 → ⑦**보유종목 주요 뉴스** → ⑧**다가오는 일정** → ⑨**오늘 리밸런싱 한다면** → 오늘 볼 것 · 액션 아이템 · **스틸맨 반론** | 자동(열 때 생성·R2 날짜 캐시) | 하루 1회분 | `GET /api/brief?part=0` (worker `handleBrief` · `BRIEF_TEXT_SYS`). 입력은 `signals`·`gamma`·`holdings`·`calendar`·`signal_log`·`judgment` **+ `pulse.json`(맥박 축·방향·귀결) · `charts.json`(지수·보유 종가→전일·5거래일 파생) · `earnings.json`(보유 실적 D-N) · `index.html` `TARGETS`(적정밴드)**. `gate[].s`는 충족/미충족만 · `layers[].state`는 오버/언더/적정 · `rebalance.verdict`는 **오늘 실행 가능 여부를 먼저 못박고** rows는 언더웨이트 우선(유한자본 규율) · `actions`는 전부 조건부 AND |
| ↳ 파생 규칙 | 자동 | 매 생성 | **밴드는 브리핑에 다시 정의하지 않는다** — `briefBands()`가 `index.html` `let TARGETS` 를 **정규식으로** 읽는다(Workers 는 `new Function` 이 막혀 슬랙 러너의 `new Function` 경로를 못 쓴다 · §1 임계 중복 정의 금지). 등락은 `briefSeries()`가 `charts.json` 시계열 끝 2점·6점으로 파생 → **입력에 없으면 빈 칸**(지어내지 않는다). **美 10년물은 지수 표에서 제외** — 수준값(%)만 `us10yPct` 로 넘긴다(등락률의 % 표기가 bp 오독을 부름). 텍스트 회차만 `max_tokens` 6500(대담 파트는 4000 유지 — 100s 한도 여유) |
| **오늘 브리핑 듣기** (2인 대담 · 약 5분 · **01 시장 모니터링 정리 회차** · 2026-07-27 개편) | 자동(열 때 생성·R2 캐시) | 하루 1회분 | 전반부 = 결론(매크로 게이트 몇/3 한 문장) → ①다가오는 일정(`upcoming`+`upcomingEarnings` D-N 3~5) → ②지표(한·미 지수 종가·전일대비 · 美10Y 수준값 · DXI 메모리 현물 주간) → ③시장 맥박(위험 축 수 먼저·무거운 2~3축) / 후반부 = ④리스크 보드(3축 상태·판정) → ⑤사이클 판별 보드(AI capex 4지표 — 점등·황색만 짚음) → ⑥관련 기사(매크로 축 요약 2~3) → ⑦종목 뉴스(**주요 보유종목만 2~3건·종목당 한 문장 간략** + 움직임 큰 1~2종목 전일대비 한 문장 · 숫자 파일 불변 명시) → **스틸맨**. 입력 확장(`briefSituation`) = `risk.json`·`gates.json`·`dxi.json`·`news.json`·`news_digest.json` → `riskBoard`·`cycleBoard`·`dxi`·`macroTopics`(축명은 `news.json` `macroTopics` 매핑)·`stockNews`(보유 비중 상위·m≥1·최근 10일·종목당 1건·최대 6건). 보유종목 마감 전 종목 낭독·리밸런싱 가이드는 듣기에서 제외(운영자 지시) — **텍스트 회차(p0) 9섹션은 불변**. 「▶ 오늘 브리핑 듣기」 → `part=1` 먼저 재생 · `part=2`는 재생 중 수신·이어붙임(§ 외부 채널 동일 엔드포인트 재사용). 낭독 = **① 고품질 Gemini 오디오 우선**(`GET /api/brief-audio` · 워커가 대본을 「The Energetic Co-Host」 톤 WAV 로 구움 · R2 캐시 · 말풍선 하이라이트는 글자수 비례 근사) **② 실패 시 브라우저 TTS 2보이스로 자동 폴백**. 말풍선 클릭 = 그 대목부터 재생 · 배속·음소거 |
| ↳ 오디오 굽기 방식(2026-07-20 수정) | 자동 | 최초 재생 시 | `handleBriefAudio` 는 한 파트를 **단발 TTS 로 굽지 않는다** — `BRIEF_TTS_CHUNK_CHARS`(420자·각 청크에 두 화자 포함) 단위로 쪼개 청크마다 스타일 지시를 다시 실어 `Promise.all` 병렬 생성 → 청크별 RMS 를 최대 청크에 맞춰 정규화(피크 리미팅) → `BRIEF_TTS_GAP_MS`(140ms) 무음으로 이어붙여 WAV 서빙. **뒤로 갈수록 성량이 줄고 속도가 빨라지던 프로소디 드리프트 대응**(§9). 총 문자 수 동일 → TTS 과금 변동 없음 |
| **지난 호 (저장분 · 회차)** | 자동 | 상시 | `GET /api/briefs` → R2 `brief_` 키에서 날짜 추출 + 각 날짜 `p0`의 `headline`·`no` 를 읽어 **「제N호 · 날짜 · 제목」 한 줄씩**(뉴스레터 「지난 호」 형식 · 최신순 · 최근 60호까지 제목 조회). **회차 번호 `no`는 p0 생성 시점에 박아 저장**(기존 텍스트 회차 수 +1)하므로 이후 목록이 바뀌어도 불변이고, 옛 회차는 날짜 오름차순 순번으로 폴백한다. 행 클릭 = 그 호 열람(`?d=YYYY-MM-DD`). **보관 자체가 캐시** — 따로 커밋하지 않는다 |
| ↳ **매일성 규칙(2026-07-27)** | 자동 | 매 생성 | 브리핑은 매일 나간다 — ①뉴스·신호는 **최근 1~2일 발생분만**(`recentSignals` 2일 필터 · `stockNews` 컷 10→2일 · `macroNews`=토픽 레이더 MACRO 기사 2일 신규 신설) ②직전 회차 반복 금지 — `prevBrief`(어제~3일 전 p0 캐시 최대 2회분 요지) 입력 신설, LLM은 변화분만 ③신규 없으면 '새 소식 없음' 한 문장 ④지표 확장 — F&G 수치 명시 + `oilWti`·`gasolineRb`(`fetch-prices.mjs` 후보에 `wti` CL=F·`gasoline` RB=F 합류 — 다음 가격 크론부터 채워지며 그 전엔 빈 칸 규율) ⑤대담 ⑥ = '관련 기사'→'토픽 레이더' |
| ↳ 「다시 만들기」 | 수동 | 필요 시 | `part=0&regen=1` — 그날치 **텍스트(p0)만** 새 라이브 값으로 덮어쓴다(대담·오디오는 안 건드림) |
| ↳ 「대담 다시 굽기」 | 수동 | 필요 시 | 대담 대본(`part=1·2&regen=1`)과 오디오(`brief-audio?...&regen=1`)를 강제 재생성 후 재생. 대담·오디오는 그날 최초 열람 때 한 번만 구워져 캐시되고 이를 다시 굽는 UI 가 없었다 → **worker 프롬프트 변경 배포 후 그날 캐시를 새 순서로 다시 굽는 용도.** Claude 대담+Gemini TTS 비용이 들어 텍스트 「다시 만들기」와 분리(별도 버튼) |

> **저장 시점 = 첫 열람 또는 크론 워밍(가동 중).** 06 회차는 첫 열람 때 워커가 생성해 저장하는데, 아침에 아무도 안 열면 그날 회차가 빈다(「지난 호」 결번). 이를 막으려고 **`daily-brief-slack.mjs`(07:45 KST 크론)가 직접 게이트에 로그인(`/__auth`)해 `/api/brief?part=0` 을 선호출**, 오늘 회차를 미리 굽는다(`warmBrief()`). 리포 시크릿 **`SITE_PASSWORD`** + `daily-brief-slack.yml` run 스텝 `env:` 전달 **완료(2026-07-20)** → 워밍 가동 중이다. 워크플로에 **`BRIEF_WARM_PODCAST: "1"`** 이 있어 텍스트 p0 뿐 아니라 **팟캐스트 p1·p2 대본까지 사전 생성**된다(첫 재생 지연 제거). 시크릿·env 가 없으면 워밍은 조용히 건너뛰고 슬랙 본문·링크는 그대로 나간다.
> **narrative ≠ numbers** — 브리핑은 라이브 값을 읽어 말할 뿐 `gamma`·`judgment`·`holdings`·`earnings` 어느 것도 쓰지 않는다.

### 07 메모 (`v-memo`)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 자유 메모 (순간 아이디어·캡처) | 수동(운영자 입력) | 필요 시 | worker `/api/memo`(**R2** · 비밀번호 게이트 뒤) + localStorage 오프라인 캐시(`alphamap_notes_v1`). 노트 스키마 `{id,t,title,body,tags,imgs,imgw,imgmeta,pinned}` — 07 뷰 composer에서 작성·디바운스 PUT. **세션(Claude)은 게이트 밖·네트워크 제한이라 직접 적재 불가 — 운영자 붙여넣기 경로만.** ※ 구 기재 `reviews.json`(주간 점검 기록)은 07 메모 소스가 아니라 비렌더 뷰 `#v-port`의 `#reviewLog` 잔존분(2026-07-27 정정) |

### 외부 채널 — 슬랙 데일리 브리핑 (6탭 밖 · 사이트 미노출)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| **슬랙 데일리 브리핑(뉴스레터 본문)** | 자동(cron) | **07:45 KST 월~금**(US 마감 후) | `daily-brief-slack.yml` · `scripts/daily-brief-slack.mjs` → `chat.postMessage`. 본문 = **①매크로 게이트 보드(3중 AND · 축별 현재값·트립 임계·점등)+등급 판정 한 줄 ②레이어 갭 상위 4(비중 vs 적정밴드·오버/언더 %p) ③지표(나스닥·美 10Y·WTI·코스피·F&G) ④가전 뉴스 5건 ⑤듣기·06 링크**. **임계·밴드·판정식은 러너가 `index.html` 에서 통째로 추출해 쓴다**(`const TH` · `function evalGate` · `let TARGETS` 정규식 → `new Function`) — 슬랙 스크립트에 임계를 **다시 정의하지 않는다**(§1). 파싱 실패 시 판정 블록만 조용히 생략하고 지표·뉴스·링크는 그대로 나간다. CNN F&G는 로컬 `signals.json`(라이브 엔드포인트가 러너 IP를 418 차단) |
| **데일리 브리핑 팟캐스트 (2인 대담 · 약 5분)**(2026-07-19 신설) | 자동(열 때 생성·R2 날짜 캐시) | 하루 1회분(첫 접속 시 생성) | 단독 페이지 **`brief.html`** → `GET /api/brief?part=1\|2` (worker `handleBrief`). 라이브 `signals`·`gamma`·`holdings`·`calendar`·`signal_log`·`judgment`를 워커가 읽어 **진행자(`host`)+애널리스트(`ana`) 2인 대담 대본**(합 18~22발언·군더더기 제거·정보 밀도 유지)을 Claude(opus-4-8)로 생성 → R2 `brief_{YYYY-MM-DD}_p{1,2}.json` 캐시. **파트 분할 이유** = 비스트리밍 1회로 뽑으면 `api.anthropic.com` ~100s 한도에 근접 → part1(맥박·게이트·지수) 먼저 반환해 재생을 시작하고 part2(보유 마감·뉴스·리밸런싱·볼 것·**스틸맨**)는 재생 중 뒤에서 받아 이어붙인다. **대본 = 01 시장 모니터링 정리(2026-07-27 개편)** — 전반부(결론·일정·지표·맥박) / 후반부(리스크 보드·사이클 보드·관련 기사·종목 뉴스[주요 보유종목만 간략]·스틸맨). 텍스트 회차(`part=0`) 9섹션과는 별개 구성이다(§3 06 듣기 행). 낭독 = **① 고품질 Gemini 오디오**(`GET /api/brief-audio?part=1\|2` · worker `handleBriefAudio` — 대본 R2 캐시를 `gemini-3.1-flash-tts-preview` 멀티스피커 「The Energetic Co-Host」 톤·보이스 Puck/Kore 로 구워 **WAV** 로 서빙 · R2 `briefaud_{날짜}_p{n}.wav` 캐시 · 첫 재생 1회만 굽고 이후 즉시 · 모델·보이스는 워커 env `GEMINI_TTS_MODEL`·`GEMINI_VOICE_HOST/ANA` 오버라이드) **② 실패 시 브라우저 TTS 폴백**(ko-KR 품질 점수순 2인 · 진행자 rate 1.12·pitch 1.14 / 애널리스트 rate 1.06·pitch 1.0). `?d=YYYY-MM-DD` 과거분·`?regen=1` 재생성 |
| ↳ **오디오(MP3) 슬랙 첨부판 = 미가동(제안본)** | — | — | `scripts/proposed-workflows/daily-brief-podcast-audio.{yml,md}` + `brief-tts.mjs`. **위 `/api/brief-audio` 는 사이트 안 재생용**(워커 키·R2, 선행 없음). 이 제안본은 그걸 **슬랙 DM 에 파일로 밀어넣는** 별도 경로 — 잠금화면 재생용이며 **선행 3건(슬랙 `files:write`·`SITE_PASSWORD`·Actions `GEMINI_API_KEY`) 전부 운영자 수동**(§8) |

> **규율:** 브리핑 대본은 **narrative 층**이다 — 라이브 게이트 값을 *읽어서 말할* 뿐, `gamma`·`judgment`·`holdings`·`earnings` 어느 것도 쓰지 않는다. 대본 프롬프트에 §1 불변 규율(결론 먼저·AND 게이트·narrative≠numbers·두 시계 분리·강등 트리거=가격 vs EPS 리비전 속도)이 시스템 프롬프트로 박혀 있다.

---

## 4. 케이던스 — 언제 무엇을

| 주기 | 자동 | 수동(운영자/Claude) |
|---|---|---|
| 일별 (06:12·18:12) | 뉴스 수집·스크리닝·요약·digest | signal_log 인테이크(narrative) |
| 일별 (06:05·15:40 예약) | 시세·차트·γ·E군집 업데이트 (`update-prices.yml`) | — |
| 일별 (06:47) | 매크로 신호 업데이트 (`update-signals.yml`) | — |
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
| `update-prices.yml` | cron 06:05·15:40 KST 예약 (저녁분 15:40은 운영자 적용 대기 §8 · 실측지연 ~1~1.5h) | `prices.json` · `charts.json` · `gamma.json` · `cycle.json`(E군집) · `holdings.json` |
| `update-signals.yml` | cron 06:47 KST (1일 1회 · 시세와 push 충돌 분산) | `signals.json` |
| `update-news.yml` | cron 06:12·18:12 세션(각 +30분·+1h 백업 다중 트리거 + 6h 가드) | `news.json` · `news_digest.json` · `news_archive.json` |
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

**원칙 — 결정론 우선 · 복잡 판단은 Opus · 고출력 생성은 Sonnet · 단순 추출은 Haiku · 검색은 상한.**

| # | 규율 | 내용 |
|---|---|---|
| ① | 결정론 우선 | 시세·변동성·수익률·게이트 임계는 **무료 피드 직산**(Yahoo 일봉·네이버·CNN F&G). LLM 은 심볼 해석 실패 등 **폴백 경로에서만** |
| ② | 모델 계층 | **복잡 판단·토론**(원탁 토론, 1인 심층 자문, 베어 케이스) = `claude-opus-4-8` · **고출력 생성·검색형 추론·요약·수치 회수**(브리핑 p0·p1·p2, 인사이트 추출·사이트 반영 패치, 관점 요약 2종, σ·μ 폴백) = `claude-sonnet-5` · **정형 필드 추출**(캘린더 이벤트 파서) = `claude-haiku-4-5-20251001` |
| ③ | 검색 상한 | `web_search` 툴에는 **반드시 `max_uses: 3`**. 검색 턴마다 전체 컨텍스트가 재전송돼 입력이 2차식으로 증가한다 |
| ④ | 출력 상한 | `max_tokens` 는 실제 필요분까지만 — 출력 토큰이 생성비의 대부분이다 |

**실측 근거(2026-07-19 콘솔).** `da-market-insight` 3.72M 토큰 = $1.11(실효 **$0.30/M** · Sonnet+캐시 히트) vs `stock price` 0.25M 토큰 = $2.23(실효 **$8.93/M** · Opus+무제한 검색 7회). **30배 차이의 원인은 토큰량이 아니라 모델·검색 정책이었다.**

**적용 지점(worker.js).** `handleEstimate` = `localVolDrift()` 결정론 경로 우선(비용 0·검색 0회) → 실패 시에만 Sonnet+`max_uses:3` 폴백 · `anthropicText()` = Sonnet+검색 3회 상한(인사이트 추출·사이트 반영 패치) · 브리핑 p0·p1·p2 = Sonnet · 관점 요약 2종(`handleCouncilIntake`·`handleCouncilSummary`) = Sonnet · 캘린더 이벤트 파서 = Haiku.

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

- **문서 절단이 CI에서 안 걸린다.** `claude-pr-gate.yml`은 `index.html`만 크기 하한(150KB)을 검사하고 `OPS.md`·`STYLE_GUIDE.md`에는 가드가 없다 → 2026-07-31~08-03 나흘간 SoT 소실이 침묵으로 통과했다. 두 문서 크기 하한(각 50KB) 검사 추가 필요 — 워크플로 편집은 403이라 운영자 수동.
- **b64 패치 md5 왕복 검증 누락 시 본문 절단 위험.** #567처럼 문서에 b64 패치를 적용할 때 커밋SHA핀 raw 디코드 md5 대조를 건너뛰면 절단을 탐지하지 못한다. 문서 대상 패치도 `index.html`과 동일하게 왕복 검증 의무.
- ~~E-군집 자동화~~ **해소(확인 2026-07-27)**: `update-prices.yml`에 `derive-cycle-e.mjs` 스텝 포함·크론 편승 — 수동 dispatch 불요
- ~~Drive→holdings 동기화 3주째 무갱신~~ **해소(2026-08-08)**: `sync-holdings.mjs` 평단(avg) 추출 가드가 qty·px·cur 중 하나라도 0이면 무조건 throw하도록 짜여 있어, 매도(청산)된 종목(4칸 전부 0)도 스키마 드리프트로 오판했다. 버티브(VRT)가 xlsx 최신 열에서 전부 공란이 되며 `sync-holdings.yml` 24~27회 연속 실패(Actions 확인) → `holdings.json`이 7/18부터 `qtyAsOf`·`fx.asOf` 기준 7/11에 고정된 채 시가평가(`asOf`)만 매일 갱신되는 착시 스테일 상태였다. 4칸 전부 0=매도로 인정하고 avg 미기입+skip, 일부만 빈 경우(진짜 드리프트)는 throw 유지. SimpleorNothing 지시: "없으면 보유하지 않는 것이니 그에 맞춰 처리".
- **`update-calendar.yml` 미등록(수동)**: `derive-calendar.mjs`(01 다가오는 일정 프루닝·asOf) 크론 미등록 — App workflow write 부재(403). 런타임 `renderCalNow()`가 오늘 기준 재계산하므로 표시는 신선(파일 `asOf`만 수동 refresh까지 스테일 가능). 신규 이벤트는 `calendar.json` 수기.
- **⏳ 저녁 시세 크론 예약 15:40 변경 — 운영자 yml 적용 대기**: Actions 큐 실측지연(~1~1.5h) 보정을 위해 예약을 당기는 방식으로 운영 중(현행 라이브 `52 7`=16:52 KST 예약→~18:30 완료). 2026-07-27 지시로 저녁 예약을 `40 6`(15:40 KST·한국 장마감 15:30 직후)로 변경 → 완료 ~16:40~17:10 예상. `.github/workflows/` 403 → **운영자 수동 교체 필요**(적용 전까지 라이브는 16:52 예약). 지연 자체는 계속 모니터링.
- **관점 라이프사이클 LLM 자동 제안 미구현(부분 완화)**: 03 「🕔 라이프사이클」 편집은 **모달 + 필드별 「보기 칩」 선택식**으로, 클라 템플릿(게이트 어휘·8레이어·관점 티커·thesis-break 패턴)이 `hyp`·`trig`·`until` 후보와 `review` 날짜 프리셋을 즉시 제시한다(수동 4연타 부담 해소·오프라인·기존 채택분 전부). 다만 이는 **템플릿**이라 관점 고유 맥락은 못 맞춘다 — `/api/insight`(worker) 추출 시 `hyp`·`until`을 LLM으로 관점별 맞춤 자동 채우는 건 여전히 후속 PR(③). 신규 채택은 `review`=+14d 자동 유지.
- **DXI 자동 피드 없음(2026-07-17)**: DXI 지수는 포털 게이트라 무료 피드 없음 → 매주 금요일 스케줄이 TrendForce 현물가로 `dxi.json` append.
- **브리핑 팟캐스트 오디오판(A안) 대기(2026-07-19)**: MP3를 슬랙에 직접 첨부하려면 ①슬랙 봇 **`files:write`** 스코프 추가 후 재설치 ②리포 시크릿 **`SITE_PASSWORD`** ③리포 시크릿 **`GEMINI_API_KEY`** ④`.github/workflows/` 배치 — **전부 운영자 수동**(App workflows write 403). 제안본은 `scripts/proposed-workflows/daily-brief-podcast-audio.md` 체크리스트. 그 전까지는 링크형(B안)만 가동.
- **모닝 브리핑 크론 워밍 — 가동(2026-07-20 해소)**: `daily-brief-slack.mjs` `warmBrief()`(게이트 `/__auth` 로그인 → `/api/brief?part=0` 선호출) 배선 + 리포 시크릿 `SITE_PASSWORD` + `daily-brief-slack.yml` run 스텝 `env:` 전달까지 **3건 모두 완료** → 07:45 KST 크론이 오늘 회차를 미리 굽는다(「지난 호」 결번 방지). 워크플로에 `BRIEF_WARM_PODCAST: "1"` 도 들어가 **팟캐스트 p1·p2 대본까지 사전 생성**된다(첫 재생 지연 제거·생성비는 매일 발생하나 5분 압축분). 로그인 실패·타임아웃이면 `warmBrief()`는 조용히 건너뛰고 슬랙 본문·링크는 그대로 나간다.
- **브리핑 링크는 비밀번호 게이트 뒤**: 슬랙에서 처음 열면 워커 로그인 화면이 뜬다(기기·인앱 브라우저별 1회). 쿠키 `Max-Age` 만료 시 재로그인.
- `prices.json.warn = lazr chart 43.47 vs quote 41.35` — LAZR 비보유·무시 가능

---

- 2026-07-27 19:30 · **02 aisd ③ 컴퓨팅 4사 합산 차트 인터랙티브 재구현.** 스트레치 SVG 제거 → CSS 픽셀+DPR Canvas, ResizeObserver, 호버·탭 툴팁, CAPEX/매출/FCF/영업이익 토글. `worker.js` aisd 주입 URL 캐시 버전 갱신. 데이터·단일 $축·narrative≠numbers 불변. STYLE_GUIDE §7 체크리스트·§9 동반.
- 2026-07-27 20:50 · **02 aisd ③ FCF·영업이익 수치·이익률 추가.** 온차트 및 툴팁에 FCF·영업이익 `$B (매출 대비 %)` 표시. 이익률은 같은 연도 4사 합산 매출로 계산·정수 반올림, 데이터·판정 불변. STYLE_GUIDE 동반.

- 2026-07-27 21:00 · **02 aisd ③ 시리즈 토글 순서 변경.** `매출 → CAPEX → 영업이익 → FCF`; 렌더·계산·판정 불변. STYLE_GUIDE 동반.

- 2026-07-28 15:28 · **전체 캘린더 동일 날짜 그룹 표시 간소화.** 같은 `d`의 이벤트가 연속될 때 `renderCalFull()`이 첫 행의 날짜·D-N만 노출하고 후속 행은 날짜 칸을 비워 반복을 제거. 고정 날짜 열 폭과 이벤트 본문·KST 시간·정렬·데이터는 유지. STYLE_GUIDE 동반.
- 2026-07-28 13:47 · **전체 캘린더 2차 가독성 수정 — 동적 행 flex 전환.** #513 배포 성공·HTML/JSON no-store 상태에서도 실제 Chromium 화면에서 `.cal-body`가 1글자 폭으로 남는 것을 확인. `#calFull`에 한정해 grid 계산을 제거하고 날짜·분류점 고정 폭 + 본문 잔여 폭 flex로 전환, 760px/640px 분기 명시. 일정 데이터·정적 타임라인·판정 불변. STYLE_GUIDE 동반.
- 2026-07-28 12:58 · **전체 캘린더 본문 열 붕괴 수정 + 빅테크 실적 일정 3건 추가.** `#calFull`·`.cal-row` 전체 폭과 grid 본문 `minmax(0,1fr)`·`.cal-body min-width:0`을 명시해 760px 전후 화면에서 제목·메타가 한 글자씩 꺾이던 문제 해결. Meta Q2 7/29 13:30 PT→7/30 05:30 KST, Amazon Q2·Apple FY26 Q3 7/30 14:00 PT→7/31 06:00 KST를 각사 IR 확정값으로 `calendar.json`·정적 타임라인에 동기화. narrative≠numbers·토큰 불변. STYLE_GUIDE 동반.
- 2026-07-28 08:50 · **02 aisd ③ 차트 라벨 자동 충돌 방지.** 고정 오프셋을 연도별 충돌 해소 큐로 교체해 모든 표시 수치에 최소 22px 수직 간격을 보장하고, 이동 라벨에 연결선을 추가. 기본 420px·모바일 340px 전 연도 좌표 스모크 통과. `worker.js` 주입 캐시 버전 갱신. 재무 데이터·판정·Canvas 실제 크기·인터랙션 불변. STYLE_GUIDE 동반.
- 2026-07-27 23:57 · **02 aisd ③ 온차트 수치 가독성 개선.** 모든 수치 라벨에 패널색 배경·굵은 글씨를 적용하고 영업이익/FCF 라벨을 상·하 전용 레인으로 분리해 2023~26 근접 값 겹침을 제거. 데이터·판정·Canvas 실제 크기·툴팁·토글·리사이즈 동작 불변. STYLE_GUIDE 동반.
- 2026-07-27 23:40 · **02 aisd ③ 4사 재무 숫자·성장률 재산정.** 오류가 있던 입력표를 그대로 사용하지 않고 2023~25 공시 실적, 26E 컨센서스/가이던스, 27~28E 저신뢰 전망으로 층위를 분리. 매출 성장률 24A +14%·25A +15%·26E +19%·27E +17%·28E +13%; CAPEX·FCF·영업이익·회사별 상세·설명·출처 동기화. narrative≠numbers 규율에 따라 과거 signal_log 캡처는 불변. STYLE_GUIDE 동반.

## 9. 갱신 이력

- 2026-08-08 14:05 · **sync-holdings.mjs 매도(청산) 종목 오탐 수정.** 평단 4칸(평가·수량·매입·현재) 전부 0을 스키마 드리프트로 오판해 매번 throw하던 가드를 "전부 0=매도"로 인정하도록 변경(일부만 빈 진짜 드리프트는 throw 유지). 버티브(VRT) 청산으로 7/18부터 3주째 `holdings.json` Drive 동기화가 전부 실패해 수량·환율이 7/11에 고정돼 있던 것을 원상복구 경로 확보. §8에 원인·해소 기록. SimpleorNothing 지시("없으면 보유하지 않는 것이니 그에 맞춰 처리") 반영.
- 2026-08-03 21:30 · **OPS·STYLE_GUIDE 본문 복원.** 7/31 `3b0c9e1`(#567)의 b64 패치가 OPS 본문을 181,274 B→6,698 B로, 8/2 `6f6782a`가 STYLE_GUIDE를 111,759 B→540 B(셸 변수 `$(cat …)` 미확장)로 각각 소실시킨 회귀를 정상 커밋에서 복원했다. 파손 기간(7/31~8/2)에 추가된 갱신 이력 19건은 전부 보존했다. 내용 변경 없음 — 복원만. §8에 재발 방지 2건 등록.
- 2026-07-31 14:04 · **Worker 스테일 전체파일 덮어쓰기 회귀 복구.** 이후 작업이 오래된 worker 원본을 전체 교체해 main에서 ① `signal_log/calendar` 사이트 반영 ② Sonnet 5 빈 JSON 복구 ③ FY/FQ→CY 정규화가 소실된 것을 라이브 오류(`gates.json|risk.json only`)로 확인. 최신 main의 신규 `handleTickerLive`는 보존하고, 마지막 정상 커밋 `ab63120`에서 위 세 구간만 함수 단위로 복원. 허용 파일은 `SITE_APPLY_FILES` 단일 SoT, 오류 응답은 `supported`+`api_version:site-apply-v2`. worker 구문·핵심 마커·유효/펜스/빈/절단 JSON 스모크 통과. 새 커밋으로 Cloudflare 배포 재트리거.

- 2026-07-31 13:07 · **06 「대담 다시 굽기」 진행 상태 시각화.** 기존 대본 p1→p2·오디오 p1→p2 순차 생성과 R2 캐시·재생 흐름은 유지하고, 굽는 동안 실제 호출 순서에 맞춘 4단계(전반 대본·후반 대본·전반 음성·후반 음성), 1초 단위 전체 경과시간, 움직이는 진행 막대, `N/4` 현재 상태를 표시한다. 완료 시 자동으로 기존 플레이어를 열고 실패 시 재시도 안내를 표시한다. `node --check`·문서 정합 검사·DOM 타이머 스모크 통과. 신규 `:root` 토큰 0. narrative≠numbers. (STYLE_GUIDE 동반)

- 2026-07-31 12:23 · **02 「사이트 반영」 Sonnet 5 빈 JSON 자동 복구.** `gates.json`·`risk.json` 보드 갱신 호출이 기존 1,200 출력 예산을 adaptive thinking에 소진해 `claude response not json`으로 실패. 첫 호출은 판단 품질을 위해 thinking 유지+4,000, 유효 객체 JSON이 없을 때만 thinking-off 2,400으로 1회 재시도. 최종 실패 문구를 한국어로 명료화. 유효 JSON·펜스 JSON·빈 응답·절단 JSON 파서 스모크와 worker 구문검사 통과. 숫자 구조 보호·게이지 순서 불변 규율 유지.

- 2026-07-31 11:43 · **02 관점 뽑기 Sonnet 5 빈 응답 자동 복구.** 원인: Sonnet 5 adaptive thinking이 기본 활성화돼 기존 6,000 출력 예산을 사고 토큰이 모두 사용하면 HTTP 200이면서 최종 JSON 텍스트가 비어 클라가 `응답 파싱 실패` 표시. 첫 호출은 추론·web_search 유지+12,000으로 상향, JSON 부재 시에만 `thinking:{type:'disabled'}` 8,000으로 1회 재시도. 서버가 최종 JSON 유효성 검증 후 전달하고, 클라는 빈 본문/JSON 형식 오류를 구분. 구문검사·파서 스모크 통과. 숫자·판단 파일 불변.

- 2026-07-31 09:59 · **Anthropic API 모델 비용 최적화 3건 완료.** 캘린더 이벤트 추출(`/api/calevent-parse`)은 `claude-haiku-4-5-20251001`, 데일리 브리핑 대본(`/api/brief` p0·p1·p2)은 `claude-sonnet-5` 반영 상태를 재검증하고, 남아 있던 공용 인사이트 프록시 `anthropicText()`를 `claude-opus-4-8`→`claude-sonnet-5`로 변경했다. `web_search_20260209`와 `max_uses:3`, 스트리밍, 출력 상한·응답 스키마는 유지해 추론·호환성 조건은 불변. 영향 범위는 `/api/insight`와 같은 프록시를 재사용하는 `/api/site-apply`의 패치 계산이며 원탁·1인 자문·베어 케이스 Opus 경로는 불변. `worker.js` 문법 검사·모델 호출부 정적 검증 통과. UI·CSS·숫자 파일·`:root` 토큰 불변.
- 2026-07-30 15:27 · **02 인사이트 저장 원문 글자수 제한 해제.** `insight.js`의 `MAXRAW=20000` 절단을 제거해 인테이크에 입력된 원문 전체를 `raw`로 저장하고, `/api/insights`의 애플리케이션 단위 16MiB 거부도 제거했다. 분석 입력 120,000자 컷은 Claude 분석 비용·컨텍스트 보호용으로 그대로 유지되며 저장 원문에는 적용하지 않는다. 제한 해제 전에 이미 잘린 자료는 `/api/insights/raw`에서 과거 저장분임을 명시하고 재분석·저장 시 전체 원문이 보존됨을 안내한다. 신규 데이터 스키마·CSS·토큰·숫자 파일 불변. (STYLE_GUIDE 이력 동반)
- 2026-07-31 · **02 인사이트 「사이트 반영」 교차메뉴 확장·FOMC 미반영 수정.** 원인: 프런트 `SITE_SRC`와 서버 화이트리스트가 `gates.json`·`risk.json`에만 묶이고, 수치 없는 narrative가 `siteMatch()` 초입에서 차단돼 FOMC 관점이 01 시장 맥락·D-day에 도달하지 못했다. 수정: `signal_log.json`·`calendar.json`을 반영 코퍼스에 추가하고 `macro`/`calendar` narrative를 관련 보드 판정·맥락 갱신 예외로 허용. 「지금 반영」은 보드 verdict, 시장 맥락 append(중복 차단), 동일 일정 `meta` 결과 업데이트(중복 차단)를 대상별 직접 커밋한다. 숫자 gauge는 확정 근거와 기존 구조 가드가 있을 때만 변경하고 gamma·holdings·earnings·judgment는 불변. FOMC 매칭·시장 맥락 append/중복·일정 갱신 스모크 10/10, `node --check`·`check-docs`·`git diff --check` 통과. (STYLE_GUIDE 동반)
- 2026-07-30 14:40 · **02 인사이트 찾기 주요 문서 형식 전용 추출기.** DOCX·PPTX를 일반 `file.text()`로 읽어 `PK`·`word/document.xml` 압축 바이너리가 textarea에 노출되던 원인을 제거했다. `insight.js`가 확장자를 먼저 검증하고 PDF·이미지·DOCX·PPTX·스프레드시트·RTF·HTML/XML·OpenDocument·HWPX·텍스트/자막/EML을 형식별로 읽는다. DOCX 대형 10-K는 10MB+ XML DOM 구축 대신 OOXML run/문단 단일패스로 추출하고, 네이티브 글자가 없는 이미지형 PPTX는 media 관계를 따라 슬라이드별 OCR한다. 파일 선택 accept·드롭 안내를 주요 형식으로 확장하되 파일당 25MB·분석 입력 120,000자 컷을 명시하며, 구형 DOC/PPT/HWP·암호화/손상 파일은 변환 안내로 차단한다. 실제 `MSFT_FY26Q4_10K.docx` 393,165자 본문과 이미지형 `OutlookFY27Q1.pptx` 6장 OCR 경로, XLSX·HWPX·HTML·RTF 픽스처 스모크 통과. `node --check`·`check-docs` 통과, index.html·CSS·worker·숫자 파일·`:root` 토큰 불변. narrative≠numbers. (STYLE_GUIDE 갱신 이력 동반)
- 2026-07-30 14:47 · **04 AI 수요·공급 로드맵 ③ Meta 26Q2 CAPEX 갱신.** 2026E 범위를 $125~145B→$130~145B, 리비전 표기를 ▲10→▲15로 상향하고 2027E 방향을 →→↑로 전환했다. 2026E 상세에 BlackRock·El Paso 1GW 벤처, 2028E에 Hyperion 5GW 공원 목표를 반영하고 로드맵 갱신일을 07-30으로 동기화했다. 숫자·설명만 갱신했으며 레이아웃·토큰·판정 구조는 불변. (STYLE_GUIDE 이력 동반)
- 2026-07-29 23:35 · **화면별 주가그래프 기본 기간 분리.** 01 시장 모니터링의 지표·종목 뉴스 차트는 6M(126거래일) 기본값으로 복원하고, 04 시장과 실적 전망 Value Chain의 종목 칩은 기존 `hover-chart.js` 1Y 일봉을 유지했다. 01의 `RG`와 04 호버 차트가 독립 경로임을 문서화하고 변경 이력 팝업에 반영. 데이터·판정 파일은 불변. (STYLE_GUIDE §6·이력 동반)
- 2026-07-29 23:16 · **주가그래프 기본 기간을 1Y로 변경.** 01 시장 모니터링의 공통 `RG` 초기값과 종목 뉴스 미니차트 초기 창을 각각 1Y·252거래일로 맞췄다. 사용자가 고른 기간과 Ctrl+휠 확대·축소는 기존대로 유지하며 데이터·판정 파일은 불변. 변경 이력 팝업에도 반영. (STYLE_GUIDE §6·이력 동반)
- 2026-07-29 19:21 · **03 전문가 원탁에 알파맵 자산·01·02·04 최신 컨텍스트 자동 주입.** `council-context.js`가 모든 `/api/council` POST를 가로채 자산현황·시세, 01 신호/사이클/보유 γ/최근 신호/일정, 02 채택 인사이트, 04 CAPEX 게이트/리스크/실적 일정/보유 판단을 12개 소스에서 병렬 수집해 `siteContext`로 첨부한다. worker는 업로드 1차 자료→날짜 표시 알파맵 SoT→편집 현 상황의 근거 우선순위와 출처·기준일 충돌 표기를 강제하고, diagnosis/actions에 관련 보유자산 영향·게이트를 반영한다. 자산·내부 판단의 Anthropic Claude API 처리에 대한 운영자 명시 승인. 60초 캐시·실패 시 기존 현 상황으로 무해 폴백. index.html·숫자 파일·`:root` 토큰 무편집. 검증: `node --check`·jsdom 컨텍스트 결합 10/10. (STYLE_GUIDE 갱신 이력 동반)
- 2026-07-29 18:54 · **03 전문가 원탁에 여러 자료 업로드→전문가별 근거 해석→Gemini 음성 토론 흐름 추가.** `council-material.js` 자가 마운트로 PDF·PPTX·DOCX·텍스트·CSV·자막을 브라우저에서 추출하고 기존 `/api/council` 요청에 `material`로 결합한다. worker는 업로드 자료를 1차 근거로 삼아 같은 자료를 각 패널의 `field/view` 렌즈로 독립 해석하며, 구체 근거·해석·의견·위험을 분리하고 자료에 없는 수치·인용은 금지한다. 결과는 기존 원탁 리포트·이력·Google AI Studio 음성 경로를 재사용한다. 최대 6개·파일당 25MB·통합 10만 자. `index.html`·숫자 파일·`:root` 토큰 무편집. 검증: `node --check`·jsdom 업로드/요청 스모크 8/8·최신 worker 모듈 문법 통과. (STYLE_GUIDE 갱신 이력 동반)
- 2026-07-29 10:40 · **03 전문가 원탁 「음성 토론 재생」을 브라우저 TTS에서 고품질 Gemini(Google AI Studio) 음성으로 전환.** `council-audio.js` 자가 마운트 + worker `POST /api/council-audio`로 발언별 단일 화자 TTS를 생성하고 RMS 정규화·이어붙이기·R2 내용 해시 캐시·발언 시작 시각 동기화를 적용했다. 1인 심층 자문도 `window.COUNCIL.playReport` 오버라이드로 같은 HiFi 경로를 사용한다. 실패 시 기존 브라우저 TTS로 자동 폴백. index.html 무편집·신규 `:root` 토큰 0·narrative≠numbers. `node --check`(worker·client)·worker 순수 로직 7/7·jsdom 클라이언트 23/23·`check-docs` 통과. (STYLE_GUIDE 갱신 이력 동반)
- 2026-07-29 09:20 · **알파벳 26Q2 실적(7/22 AMC) `signal_log` 보강 — 2각도만 추가(중복 회피).** 07-23 엔트리(capex $180~190B→$195~205B 상향·클라우드 +82%·Gemini 3.5 Pro 지연)와 `gates.json`(#530 — 백로그 $514B·capex $195–205B)이 이미 핵심 수치·04 로드맵 ③ 반영을 처리 → 여기선 그 엔트리에 없던 **①TPU 시스템 외부 DC 납품 매출 최초 인식(L2 외판 개시) ②스틸맨·가격시계 경고(FCF −$5.9B·영업마진 미스·시간외 −5% → 리비전 하향 방아쇠는 실적 아닌 조달·마진)** 2항목만 EOF append. **narrative≠numbers — 미보유 상류 종목이므로 gamma·holdings·judgment·earnings 전부 불변, aisd.js(이미 2026E ~$725B·Google 행 ~200 반영)도 무편집**(과거 캡처 기준 패치의 ~$715B/~$185B 수치는 현행 main보다 스테일이라 미반영). `signal_log.json` 유효 JSON 유지(`node -e` 파싱 통과) · UI·토큰 무편집.
- 2026-07-29 08:05 · **02 관점 등급 옆 후속 상태 표시.** 등급(관찰→확신)과 실행 생명주기를 분리해 각 관점·다른 메뉴 스트립에 `승격 대기`/`발동 대기`/`발동`/`유지`/`만료` 배지를 표시한다. 기존 데이터는 g0~g1=`승격 대기`, g2↑=`발동 대기`로 무이전 파생하고, 「🕔 라이프사이클」 모달의 상태 칩 선택을 `lcState`로 R2/localStorage에 저장한다. 확신은 자동 실행이 아니며 발동은 05 리밸런싱 후보라는 §0-5 규율 유지. 신규 `:root` 토큰 0 · narrative≠numbers.
- 2026-07-29 · **02 인사이트 「사이트 반영」을 완전 자동 직접 커밋으로 전환(1/2).** SimpleorNothing 지시("사이트에서 바로 반영되게 해줘" → "완전 자동 — 검증·PR 없이 바로 커밋" 선택) — narrative≠numbers 수기 검증 원칙에 대한 명시적 예외로 승인. **worker.js**: `handleSiteApply` 신설(`POST /api/site-apply`) — GitHub Contents API로 대상 항목을 읽고 Claude(claude-opus-4-8)에 패치 계산만 맡긴 뒤(`{changed,gauge,verdict,srcs_add,reason}`), **구조 가드레일**(gauge 길이·순서·`k` 완전 동일해야 반영·스키마 신설 금지·`changed:false`면 무변경) 통과 시에만 `default_branch`(라이브 해소)에 직접 PUT 커밋(PR 없음). `GITHUB_TOKEN`·`ANTHROPIC_API_KEY` 기설정 확인.
- 2026-07-29 · **(2/2) insight.js/css.** `applyModal`에 「🚀 지금 반영」 버튼 추가 — 매칭 항목마다 `/api/site-apply` 호출, 카드별 결과(✅반영됨/—변경없음/❌실패) 즉시 표시, 성공 시 `siteDone` 자동 세팅. 「📋 반영 지시 복사」는 수동 폴백 유지. `.ins-ap-st` 상태줄(신규 토큰 0). §3 행 갱신. narrative≠numbers는 이 버튼 하나에 한해 예외 — 다른 숫자 파일 경로는 기존 규율(§1·§6) 그대로.

- 2026-07-28 · **02 인사이트 「사이트 반영」 버튼 신설 + 사이클 판별 보드 Google Cloud 잔고 2Q26 반영.** SimpleorNothing 지시. **①이번 건**: `gates.json` ①수주잔고 Google Cloud 잔고 $460B+→$514B(Alphabet 2Q26 10-Q 확정·총 RPO $519.5B·QoQ +$54B·FY26 capex 가이던스 $195–205B 상향) — verdict 3사 합산 ~$1.5T(구글 2Q26 반영·MSFT/AWS 1Q26 기준 혼합분기 명시)·asOf/upd 07-28(#530 squash 7ddb0a0). **②로직**: 관점이 표시 전용 보드(`gates.json`·`risk.json`)의 `keys`와 겹치면(`xkeys` 배제·수치 게이트) 관점 행에 「🔗 반영하기」 — 모달이 대상 카드·현재 게이지·Claude 실행용 「반영 지시」를 제시(복사)하고, **반영은 확정 실적 검증 후 수기 PR**(자동 write 없음). `gates.json` ①keys에 「백로그」 추가(순한글 매칭 보강). `insight.js`(`siteLoad`/`siteMatch`/`applyBtn`/`applyModal` + 5배선)·`insight.css`(`.ins-apply`/`.ins-ap-*`)만 편집·index.html 무패치·신규 :root 토큰 0. §3 02 인사이트 「사이트 반영」 행 신설. narrative≠numbers — 감지·표면화 전용.

- 2026-07-28 23:12 · **01 리스크·사이클 판별 카드 롱프레스 삭제.** 토픽 카드 패턴을 복제해 카드 빈 영역을 600ms 누르면 우상단 삭제 버튼을 표시하고, 4px 이상 이동 시 취소한다. 다른 카드나 조건·근거 버튼을 누르면 삭제 버튼을 숨기며 확인한 카드 id는 보드별 localStorage에 저장해 재접속에도 제외한다. 원본 risk/gates JSON·판정·뉴스 불변. STYLE_GUIDE §6 동기.

- 2026-07-28 22:46 · **01 리스크·사이클 판별 카드 절반 축약.** 두 보드 카드의 상시 본문을 제목·상태·렌즈·게이지만 남기고 점등 조건·레이어 해석·최근 기사·출처 근거를 하단 「조건·근거 보기」 오버레이로 이동. 데스크톱 호버/키보드 포커스, 모바일 탭으로 열며 한 번에 한 카드만 펼친다. 원본 JSON·판정·뉴스 매칭 불변. STYLE_GUIDE §6 동기.

- 2026-07-28 22:32 · **01 지표 카드 통합·NFP 추가·그리드 재정렬.** VIX~원/달러 4게이지와 반도체 수출을 「지표」 그리드로 이동하고 총수출·무역수지 카드를 제거. FRED PAYEMS의 월간 차분으로 미국 비농업고용 증감 그래프를 추가. 데스크톱 HTML5 드래그는 고정 CSS Grid 슬롯 순서를 교환하고 localStorage에 영속하며, 700px 이하 모바일은 드래그 비활성. 기존 토큰·렌즈 2줄·기간 버튼 규약 유지. STYLE_GUIDE §6 동기.

- 2026-07-28 21:05 · **05 추정 리비전 트래커에 테슬라(TSLA) 추가.** gamma.json 추적 대상에 TSLA(가속·γ open)를 추가하고 Yahoo Finance 최신 TP·FY+1 EPS·애널 리비전·주가 변화·강등 게이트를 수집. `fetch-gamma.mjs`에 GAMMA_ONLY 단일 티커 갱신 옵션을 추가해 기존 13종목을 불필요하게 재수집하지 않고 TSLA만 초기화. 트래커·RAER 표시명 연결, 현금 포함 상대 점수 행 14→15. 관측치이며 예측·투자권유 아님. STYLE_GUIDE §9 동기.
- 2026-07-28 20:58 · **01 삭제된 중국 AI 토픽 복구·내용 확대.** china 숨김 상태를 버전 마이그레이션으로 1회 해제해 「중국 AI 부상·반도체 수출통제」 카드를 복원. CXMT·창신메모리뿐 아니라 Kimi K3·Moonshot·DeepSeek·중국 AI 모델 관련 기사도 관세 유입축보다 china 우선. 중국 AI 축의 사이트·카드 보존 폭을 5→12건으로 늘리고 아카이브의 Kimi K3 1건 포함 7건을 즉시 복원. 이후 사용자가 다시 삭제하면 유지됨. 숫자·판단 파일 불변. STYLE_GUIDE §6-5 동기.
- 2026-07-28 18:28 · **01 CXMT 기사를 「트럼프 관세 공급망」→「중국 AI 부상·반도체 수출통제」로 이동.** 검색 쿼리 유입축보다 기사 내용 우선 규칙 신설: `CXMT|창신메모리|창신반도체`가 제목·요약·함의에 있으면 `china`. `index.html axIt()`이 현재 `news.json` 기사 즉시 재분류하고 `isCxmt(m)`가 관세 카드의 스테일 CXMT 다이제스트 요약도 china로 환원. `fetch-news.mjs articleAxis()`가 누적·신규 MACRO `ax`를 저장 전 영구 보정. 숫자·판단 파일 불변. STYLE_GUIDE §6-5 동기.

- 2026-07-28 18:22 · **01 토픽 레이더 롱프레스 삭제 기능.** 헤더 pointerdown 후 600ms 정지 시 `.show-delete`+`삭제` 버튼 표시, 4px 이동 시 타이머 취소. 확인 후 축 키를 `localStorage` `am_topic_radar_hidden_v1`에 추가하고 DOM·좌표 상태에서 제거해 새로고침 후에도 숨김. 뉴스 원본·수집축은 불변. 모바일은 이동 비활성 상태에서 롱프레스 삭제만 허용하고, 데스크톱 드래그·짧은 탭 토글은 유지. STYLE_GUIDE §6-5 동기.

- 2026-07-28 18:15 · **01 「채택한 일정 관점」 수동 삭제 지원.** `strip()`에 일정 전용 `canDelete` 옵션과 `data-strip-rid/cid` 버튼을 추가. 확인 후 `deleteClaim()`이 해당 claim만 제거해 같은 자료의 매크로·레이어 등 다른 관점을 보존하고, claims 0 자료만 함께 제거. 기존 `persist()` 경로로 localStorage 즉시 갱신+R2 PUT 예약. `insight.js?v=20260728-cal-delete`·CSS 링크 버전 동기화. STYLE_GUIDE §6-1 동반.

- 2026-07-28 18:08 · **01 토픽 레이더 모바일 드래그 비활성.** `mobileBoard()`(≤700px)에서 pointerdown 좌표 이동을 차단하고 일반 click으로 펼침·접힘만 실행. 모바일 CSS는 `touch-action:auto`로 스크롤을 복구하고 드래그 핸들 `↕`를 숨긴다. 데스크톱 자유 배치·좌표 영속·키보드 토글은 유지. STYLE_GUIDE §6-5 동기.

- 2026-07-28 18:03 · **01 토픽 레이더 동일 CAPEX 토픽 병합.** 화면에 `상류·하이퍼스케일러 capex`·`빅테크 AI Capex 실적`·`AI 빅테크 캐팩스 부담`·`AI캐팩스 수익성 의구심`이 별도 카드로 중복된 원인은 영문/한글 표기 변형과 고정축 `bn_capex` 격리. 클라·수집 파이프라인의 CAPEX 정규식을 `캐[펙팩]스|케[펙팩]스|자본지출|AI지출`까지 확장하고, CAPEX 고정 병목축만 `capex` 대표키로 예외 병합. 나머지 병목축 독립성은 유지. 기존 `news.json`도 런타임에서 즉시 합쳐 데이터 재작성 없음. STYLE_GUIDE §6-5 동기.

(이하 과거 갱신 이력은 기존과 동일하게 보존됩니다 — §9 하단 나머지 항목은 이번 커밋 전 라이브 상태와 동일합니다.)
