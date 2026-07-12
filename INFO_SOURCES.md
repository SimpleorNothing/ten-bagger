# 알파맵 정보 인벤토리 (INFO_SOURCES)

> `simpleornothing.com`이 메뉴별로 수집·표시하는 전체 정보의 소스·갱신 방식 대장.
> **이 문서는 지속 업데이트한다** — 정보/소스/주기가 바뀌면 해당 행을 갱신하고 하단 이력에 한 줄 남긴다.
> 최종 갱신: 2026-07-12 · 기준 메뉴: 5탭 (Phase 2g + 01 카드 렌즈)

범례 — **자동**: cron 워크플로 or worker 런타임 API. **수동**: 편집→push→deploy(운영자/Claude). **혼합**: 자동값 위에 판단이 덮어씀. **날짜연동**: 클라이언트가 날짜 기준 자동 표시.

---

## 01 시장 모니터링 (`v-market`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 시장 모니터링 | 코스피·S&P·나스닥 지수 | 자동 | 매일 06:37 KST | `charts.json` (`fetch-prices.mjs`, `^KS11·^GSPC·^IXIC` Yahoo 1Y · **첫 데이터는 다음 크론 후**) |
| 시장 모니터링 | 미 10년물 금리 | 자동 | 런타임 | worker `/api/us10y` → `history[].markets.ten_year` 스파크라인 (us10y 리포 `daily-update.yml`) |
| 시장 모니터링 | WTI 유가 | 자동 | 런타임 | worker `/api/wti` (Yahoo upstream) |
| 시장 모니터링 | 보유 종목 스파크라인 (MRVL·MU·LITE·VRT·BE·TSLA) | 자동 | 매일 06:37 KST | `charts.json` (`fetch-prices.mjs`, Yahoo 1Y 일봉 t/c) |
| 시장 모니터링 | **카드 렌즈 요약 2줄** (지표·보유 각 그래프 위 — l1=이 그래프가 판정하는 프레임 / l2=라이브 수치 → 판정. 보유=레이어·stage·γ·목표가 + 고점·평단 → 두 시계 판정 · 지수=게이트 깊이축(나스닥)·공포축(S&P)·KR 속도 정찰(코스피) · 10년물=할인율 · WTI=인플레→연준 경로) | 자동 (런타임 파생) | 런타임 (gamma·signals 일별 · holdings 주간에 자동 편승) | `gamma.json`(γ·stage·pct·flagged) + `signals.json`(게이트 — `window.macroEval` 단일소스 재사용) + `holdings.json`(layer·avg 평단) + `charts.json`(6M 시계열) 클라 파생 |
| 시장 모니터링 | 종목 뉴스 (**종목 블록형**: 상단 Summary + 일자별 기사 + **보유 기사별 내용·의미·영향 한줄 분석**(arts) + **우측 인터랙티브 주가 차트**(호버·Ctrl+휠 기간) · 결론/그룹/일정주의) | 자동 | 매일 06:12 KST(뉴스·digest) / 06:37(차트) | `news_digest.json`(digest+arts, claude-sonnet-4-6) + `news.json` + `charts.json`(1Y 일봉, 한국종목 별칭 sec·sem·ddk·twng) 클라이언트 병합 렌더 |
| 시장 모니터링 | 관련 기사 (매크로 · **토픽 블록형**: 상단 자동 Summary + 일자별 기사, id 기준 그룹) | 자동 | 매일 06:12 KST | `news_digest.json` `macro`(Claude API digest) + `news.json` `MACRO` 항목 병합 렌더 |

---

## 02 궁금한 것 (`v-cycle` + `v-alpha` + `v-thread`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 궁금한 것 | **즉답 요약** (답-먼저 카드: 전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널) | 혼합 (수치 런타임·전선/다음재채점 수동) | 런타임 파생 | `gamma.json`·`holdings.json`+`TARGETS`·`signal_log.json` 런타임(`renderInstantAnswer`) / 전선·다음재채점만 `IA_CFG` 수동 |
| 궁금한 것 | 반도체 사이클 신호등 (D·C·E·B·A) | 혼합 (E자동·나머지 수동) | E: 런타임 / D·C·B·A: 판단 시 | `cycle.json` + worker `/api/fred`(E군집 파생) |
| 궁금한 것 | 주도주 4사분면 (벤치 대비 알파) | 혼합 | alpha 주1회 + 판단 갱신 | `alpha.json` → `earnings.json` → `judgment.json` (판단이 덮음) |
| 궁금한 것 | 강물(병목 이동)·8레이어 스택·24종목 매트릭스 *(답-먼저 재편으로 '더 파보기'로 하단 강등)* | 수동 | 콘텐츠 변경 시 | `index.html` 인라인 (`RIVERS`·`C`배열·`CASCADES`) |
| 궁금한 것 | 모멘텀 (미/한 벤치 대비) | 자동 | 주1회 토 08:30 KST | `alpha.json` (`compute-alpha.mjs`, momentum 휴리스틱 + 트래커 Gist) |

---

## 03 리밸런싱 (`v-decision` — 결정보드 + 시장 모멘텀 전망 + 방향 확률 추정 · `v-port`/`v-tracker`/`v-macro`는 2026-07-11 재편으로 뷰서 제외·코드 잔존)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 리밸런싱 | **결정 보드** (지금 무엇을·언제 — 자산구성+**적정밴드 오버레이**+매크로게이트+MU γ 3트리거+회전/타이밍 종합) | 혼합 (데이터 자동 파생·판단 트리거는 소스 계승) | 런타임 (holdings 주간동기 + gamma/signals 일별에 자동 편승) | `index.html` `#decisionBoard` IIFE (`v-decision` 최상단) — `holdings.json`+`gamma.json`+`signals.json`+`cycle.json` 재페치 + `TARGETS` 전역 |
| 리밸런싱 | **시장 모멘텀 전망** (미/한 레짐: 추세·변동성·심리 + 향후 조건부 판정) | 자동 | 런타임 | `index.html` `#momOutlook` IIFE — 미: `signals.json`(40주선·갭·DD·VIX·F&G) · 한: `charts.json`(삼성 프록시 추세)+`signals.json`(서킷/사이드카). 지수 시계열 미수집→삼성 근사 |
| 리밸런싱 | **방향 확률 추정** (포지션·지수 다음주/1달/3개월 P(상승/유지/하락)) | 자동 (추정치·투자권유 아님) | 런타임 | `index.html` `#probEst` IIFE — GBM(로그정규): σ=프리셋(확률랩 계승)·μ=프리셋+`charts.json` 최근 모멘텀 50:50 블렌드. 추세부호는 `charts.json`(폴백 `prices.json`) |
| 리밸런싱 | ~~자산 현황 (X-ray)~~ · ~~5신호 트래커~~ · ~~매크로 룰북~~ | — | **뷰서 제외(2026-07-11 재편)** | `v-port`/`v-tracker`/`v-macro` 코드 잔존·그룹서 분리(되돌리기 용이). 데이터(`holdings`/`signals`)는 계속 갱신되어 결정보드가 소비 |
| 리밸런싱 | 매매 타이밍 (매크로 게이트 lamp) | 자동 | 매일 06:37 KST | `signals.json` (`fetch-signals.mjs`; VIX·S&P·CNN F&G·나스닥 드로다운·40주선) |
| 리밸런싱 | γ · stage | 혼합 (g자동·stage수동) | g: 매일 / stage: 판단 시 | `gamma.json` (auto price-vs-target + judgment) |

---

## 04 캘린더 (`v-cal`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 캘린더 | 거시·실적·이벤트 일정 (FOMC·CPI/PCE·금통위·메가이벤트·워치리스트) | 수동 (정적) | 콘텐츠 변경 시 (`VIEW_UPDATED`) | `index.html` 인라인 (→ `calendar.json` 동적화 후보) |
| 캘린더 | 실적 D-N 카운트다운·펄스링 | 날짜연동 (클라 자동) | 실시간 표시 | `earnings.json` `playbook` (확정=굵게·추정=점선) |

---

## 05 메모 (`v-memo`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 메모 | 개인 메모 | 수동 | 작성 시 | localStorage (`alphamap_notes_v1`) + GitHub 동기화 (worker `/api/memo`, R2) |

---

## 보조 데이터 (뷰에 직접 노출 안 되거나 파이프라인 내부)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 시그널 로그 (누적 판단 컨텍스트) | 수동 | 시그널 포착 시 | `signal_log.json` (Claude/운영자, EOF append) |
| CPI (전년비) | 자동 | 갱신 시 | `cpi.json` (FRED via worker `/api/fred`) |
| 호르무즈 해협 물동량 | 자동 | 일별 | worker `/api/hormuz` (IMF PortWatch) · `hormuz.json`(폴백) |
| 시세 (종목 현재가·지수) | 자동 | 매일 06:37 KST | `prices.json` (`fetch-prices.mjs`, Yahoo/Naver) |

---

## ⚠️ 알려진 이슈 · 예정 작업

1. ~~`news.json` 사이트 미배포~~ → **해결(2026-07-11)**: `.assetsignore`에서 news.json 제외.
2. ~~지수 수집~~ → **완료(2026-07-11)**: `fetch-prices.mjs` `^KS11·^GSPC·^IXIC` + v-market 배선. 첫 데이터는 다음 06:37 크론 후.
3. ~~10년물 스파크라인~~ → **완료(2026-07-11)**: `/api/us10y` `ten_year` 배선.
4. ~~매크로 뉴스~~ → **완료(2026-07-11)**: `MACRO_TOPICS` + 수동 시드 6건.
5. **watching list** — 뉴스 행 버튼 → watching 추가(worker `/api/watching` R2 + 02 리스트) 미구현.
6. ~~digest 자동화 활성 대기~~ → **해결(2026-07-11)**: 운영자가 update-news.yml에 ANTHROPIC_API_KEY env·커밋 대상(news_digest.json) 추가, 수동 dispatch로 첫 자동 digest 생성 확인(model=claude-sonnet-4-6, groups=4). 이후 매일 06:12 KST 완전 자동.
7. **b64 파이프라인 손상 재발(2026-07-11)**: 17KB patch에서 2바이트 묵시 손상 → 신규 JSON에 유입. 대응: 적용 후 콘텐츠 레벨 검증(UTF-8 decode + 로컬 비교) 의무화, 손상 파일은 직접 커밋으로 교체. Phase 2g에서 전사 손상 2회 추가 관측 → **미니파이 + 한줄 b64(base64 -w0) + 푸시 직후 디코드 md5 검증**을 표준 절차로 확립.

---

## 갱신 이력

- 2026-07-11 · 최초 작성 (5탭 Phase 2a 기준). 01 시장 모니터링 신설, news.json 배포 이슈 기록.
- 2026-07-11 · Phase 2b: 지수 3종 데일리 자동 수집, news.json 사이트 노출. 이슈 1·2 해결.
- 2026-07-11 · Phase 2b: 미 10년물 스파크라인 + 매크로뉴스 배선. 이슈 3·4 해결.
- 2026-07-11 · Phase 2c: 종목 뉴스 한글 데일리 요약(digest) — fetch-news에 Claude API 단계 내장, news_digest.json 시드, 01 요약 섹션 렌더. b64 손상 1건 복구(이슈 7).
- 2026-07-11 · digest 자동화 활성 완료 — 운영자 update-news.yml 수정 + 수동 실행으로 첫 자동 요약 생성·배포 확인(claude-sonnet-4-6). 이슈 6 해결. 이후 매일 06:12 KST 완전 자동.
- 2026-07-11 · Phase 2d: 01 뉴스 그룹형 재구성 — 관련 기사 토픽별 일자 정렬, 종목 뉴스 종목 블록화(상단 Summary + 일자별 기사, 요약/원문 섹션 통합).
- 2026-07-11 · Phase 2e: 관련 기사 토픽 상단 요약 — digest에 macro 요약 생성 추가(fetch-news), 토픽 블록형(id 기준 그룹으로 이란 중복 그룹 해소).
- 2026-07-11 · Phase 2f: 보유 기사별 내용→의미→영향 한줄 분석(arts) — digest 프롬프트에 보유 기사 번호 목록 추가, n→link 매핑, 기사 행 아래 회색 소자 렌더. max_tokens 6000.
- 2026-07-11 · Phase 2g: 종목 블록 우측 인터랙티브 주가 차트 — charts.json 3중 병합, 캔버스 직접 렌더(DPR·호버 크로스헤어·Ctrl+휠 20일~1Y 줌), 모바일 세로 스택. b64 전사 손상 2회 → 미니파이+한줄 b64로 해소, 디코드 md5·콘텐츠 바이트 일치 확인(apply e2c1987).
- 2026-07-11 · 02 궁금한 것 **답-먼저 재편**: 즉답 요약 카드 신설(gamma·holdings·TARGETS·signal_log 런타임 6행 — 전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널), 강물·스택 탐색 인트로는 '더 파보기'로 하단 강등. `window.GAMMA`·`window.MACRO_GRADE` 노출. 전선·다음재채점만 `IA_CFG` 수동판단.
- 2026-07-11 · 03 리밸런싱 **결정 보드 신설**: 최상단에 브리핑 3문(자산구성·게이트·타이밍) 상시 패널. `#decisionBoard` 자기완결 IIFE가 holdings/gamma/signals/cycle 재페치+TARGETS로 렌더 → holdings 주간 동기 시 **자동 재파악**. MU γ 3트리거(①목표가소진 ②P/E재확장 ③사이클텔) 점등 보드, γ는 gamma.json 단일소스(open/spent 자동전환). b64 패치 `decision-board-20260711.b64`→apply-patch 적용, 무결성 md5 왕복 통과.
- 2026-07-11 · 03 리밸런싱 **재편**: `v-decision` 전용 섹션 신설(결정보드 이동) + **시장 모멘텀 전망**(미 signals 레짐·한 삼성 프록시) + **방향 확률 추정**(GBM: σ 프리셋·μ 프리셋+charts 모멘텀 블렌드, 다음주/1달/3개월 P상승·유지·하락). 그룹 `port:['decision']`으로 매크로룰북·X레이·트래커 뷰서 제외(코드 잔존). 결정보드 ①엔 적정밴드 오버레이 추가. 소스 `charts.json`·`prices.json` 03 신규 소비. b64 `decision-board-momprob-20260711.b64`→apply-patch 적용, 초회 인라인 손상(1B 공백)→교체 재푸시 후 md5 왕복 통과(commit 63a1da97).
- 2026-07-12 · 01 시장 모니터링 **카드 렌즈 요약 2줄** 신설 — 각 그래프 위에 '논제 시계(γ·stage·목표가) / 가격 시계(고점 대비·평단 대비)' 분리 판정. 보유 6종은 `gamma.json` 단일소스(`flagged`=모호밴드→직전값 홀드를 문구로 명시), 지수 5종은 매크로 게이트 렌즈(나스닥 깊이축·S&P 공포축·코스피 속도 정찰·10년물 할인율·WTI 인플레). **게이트 판정 로직 단일소스화**: `v-macro` 내부 파생부를 `evalGate()`로 추출하고 `window.macroEval` 노출 → 01 렌즈가 재사용(임계 `TH` 중복 정의 제거 = 침묵하는 오류 차단). b64 전사 손상 2회(CSS 중괄호 1B·한글 1자) → 커밋SHA핀 md5 왕복으로 검출 후 교정 패치 적용(apply `2fb02cb`).
