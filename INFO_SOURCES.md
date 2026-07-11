# 알파맵 정보 인벤토리 (INFO_SOURCES)

> `simpleornothing.com`이 메뉴별로 수집·표시하는 전체 정보의 소스·갱신 방식 대장.
> **이 문서는 지속 업데이트한다** — 정보/소스/주기가 바뀌면 해당 행을 갱신하고 하단 이력에 한 줄 남긴다.
> 최종 갱신: 2026-07-11 · 기준 메뉴: 5탭 (Phase 2e)

범례 — **자동**: cron 워크플로 or worker 런타임 API. **수동**: 편집→push→deploy(운영자/Claude). **혼합**: 자동값 위에 판단이 덮어씀. **날짜연동**: 클라이언트가 날짜 기준 자동 표시.

---

## 01 시장 모니터링 (`v-market`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 시장 모니터링 | 코스피·S&P·나스닥 지수 | 자동 | 매일 06:37 KST | `charts.json` (`fetch-prices.mjs`, `^KS11·^GSPC·^IXIC` Yahoo 1Y · **첫 데이터는 다음 크론 후**) |
| 시장 모니터링 | 미 10년물 금리 | 자동 | 런타임 | worker `/api/us10y` → `history[].markets.ten_year` 스파크라인 (us10y 리포 `daily-update.yml`) |
| 시장 모니터링 | WTI 유가 | 자동 | 런타임 | worker `/api/wti` (Yahoo upstream) |
| 시장 모니터링 | 보유 종목 스파크라인 (MRVL·MU·LITE·VRT·BE·TSLA) | 자동 | 매일 06:37 KST | `charts.json` (`fetch-prices.mjs`, Yahoo 1Y 일봉 t/c) |
| 시장 모니터링 | 종목 뉴스 (**종목 블록형**: 상단 자동 Summary + 일자별 기사 · 결론/그룹/일정주의 포함) | 자동 | 매일 06:12 KST | `news_digest.json`(Claude API digest, claude-sonnet-4-6) + `news.json`(Google News RSS) 클라이언트 병합 렌더 |
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

## 03 리밸런싱 (`v-port` + `v-tracker` + `v-macro`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 리밸런싱 | **결정 보드** (지금 무엇을·언제 — 자산구성+매크로게이트+MU γ 3트리거+회전/타이밍 종합) | 혼합 (데이터 자동 파생·판단 트리거는 소스 계승) | 런타임 (holdings 주간동기 + gamma/signals 일별에 자동 편승) | `index.html` `#decisionBoard` IIFE — `holdings.json`+`gamma.json`+`signals.json`+`cycle.json` 재페치 + `TARGETS` 전역 (03 최상단 상시 패널) |
| 리밸런싱 | 자산 현황 (X-ray·레이어 비중) | 수동 | 체결 후 | `holdings.json` (`HOLDINGS`·`D`배열, 실잔고 일치) |
| 리밸런싱 | 비중 조절 (적정밴드 갭) | 수동 | 분기 재평가 | `index.html` `TARGETS` (→ `targets.json` 신설 후보) |
| 리밸런싱 | 5신호 트래커 (초입 점수) | 수동 | 재채점 시 | 트래커 Gist + `index.html` |
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
7. **b64 파이프라인 손상 재발(2026-07-11)**: 17KB patch에서 2바이트 묵시 손상 → 신규 JSON에 유입. 대응: 적용 후 콘텐츠 레벨 검증(UTF-8 decode + 로컬 비교) 의무화, 손상 파일은 직접 커밋으로 교체.

---

## 갱신 이력

- 2026-07-11 · 최초 작성 (5탭 Phase 2a 기준). 01 시장 모니터링 신설, news.json 배포 이슈 기록.
- 2026-07-11 · Phase 2b: 지수 3종 데일리 자동 수집, news.json 사이트 노출. 이슈 1·2 해결.
- 2026-07-11 · Phase 2b: 미 10년물 스파크라인 + 매크로뉴스 배선. 이슈 3·4 해결.
- 2026-07-11 · Phase 2c: 종목 뉴스 한글 데일리 요약(digest) — fetch-news에 Claude API 단계 내장, news_digest.json 시드, 01 요약 섹션 렌더. b64 손상 1건 복구(이슈 7).
- 2026-07-11 · digest 자동화 활성 완료 — 운영자 update-news.yml 수정 + 수동 실행으로 첫 자동 요약 생성·배포 확인(claude-sonnet-4-6). 이슈 6 해결. 이후 매일 06:12 KST 완전 자동.
- 2026-07-11 · Phase 2d: 01 뉴스 그룹형 재구성 — 관련 기사 토픽별 일자 정렬, 종목 뉴스 종목 블록화(상단 Summary + 일자별 기사, 요약/원문 섹션 통합).
- 2026-07-11 · Phase 2e: 관련 기사 토픽 상단 요약 — digest에 macro 요약 생성 추가(fetch-news), 토픽 블록형(id 기준 그룹으로 이란 중복 그룹 해소).
- 2026-07-11 · 02 궁금한 것 **답-먼저 재편**: 즉답 요약 카드 신설(gamma·holdings·TARGETS·signal_log 런타임 6행 — 전선·단계분포·상대가치·트림게이트γ·다음재채점·오늘시그널), 강물·스택 탐색 인트로는 '더 파보기'로 하단 강등. `window.GAMMA`·`window.MACRO_GRADE` 노출. 전선·다음재채점만 `IA_CFG` 수동판단.
- 2026-07-11 · 03 리밸런싱 **결정 보드 신설**: 최상단에 브리핑 3문(자산구성·게이트·타이밍) 상시 패널. `#decisionBoard` 자기완결 IIFE가 holdings/gamma/signals/cycle 재페치+TARGETS로 렌더 → holdings 주간 동기 시 **자동 재파악**. MU γ 3트리거(①목표가소진 ②P/E재확장 ③사이클텔) 점등 보드, γ는 gamma.json 단일소스(open/spent 자동전환). b64 패치 `decision-board-20260711.b64`→apply-patch 적용, 무결성 md5 왕복 통과.
