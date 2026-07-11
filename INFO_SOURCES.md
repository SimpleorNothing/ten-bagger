# 알파맵 정보 인벤토리 (INFO_SOURCES)

> `simpleornothing.com`이 메뉴별로 수집·표시하는 전체 정보의 소스·갱신 방식 대장.
> **이 문서는 지속 업데이트한다** — 정보/소스/주기가 바뀌면 해당 행을 갱신하고 하단 이력에 한 줄 남긴다.
> 최종 갱신: 2026-07-11 · 기준 메뉴: 5탭 (Phase 2a)

범례 — **자동**: cron 워크플로 or worker 런타임 API. **수동**: 편집→push→deploy(운영자/Claude). **혼합**: 자동값 위에 판단이 덮어씀. **날짜연동**: 클라이언트가 날짜 기준 자동 표시.

---

## 01 시장 모니터링 (`v-market`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 시장 모니터링 | 코스피·S&P·나스닥 지수 | 자동 *(예정)* | 매일 06:37 KST | `fetch-prices.mjs`에 `^KS11·^GSPC·^IXIC` 추가 예정 → `charts.json`/`prices.json` |
| 시장 모니터링 | 미 10년물 금리 | 자동 | 런타임 | worker `/api/us10y` (프록시 → us10y 리포 `daily-update.yml`) *스파크라인 스키마 확정 대기* |
| 시장 모니터링 | WTI 유가 | 자동 | 런타임 | worker `/api/wti` (Yahoo upstream) |
| 시장 모니터링 | 보유 종목 스파크라인 (MRVL·MU·LITE·VRT·BE·TSLA) | 자동 | 매일 06:37 KST | `charts.json` (`fetch-prices.mjs`, Yahoo 1Y 일봉 t/c) |
| 시장 모니터링 | 종목 뉴스 피드 | 자동 | 매일 06:37 KST | `news.json` (`fetch-news.mjs`, Google News RSS) — ⚠️ **아래 이슈 참조** |
| 시장 모니터링 | 관련 기사 (매크로·이란) | 자동 *(예정)* | 매일 | 구글뉴스 RSS 키워드(이란·호르무즈·FOMC·관세) 수집 예정 |

---

## 02 궁금한 것 (`v-cycle` + `v-alpha` + `v-thread`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
| 궁금한 것 | 반도체 사이클 신호등 (D·C·E·B·A) | 혼합 (E자동·나머지 수동) | E: 런타임 / D·C·B·A: 판단 시 | `cycle.json` + worker `/api/fred`(E군집 파생) |
| 궁금한 것 | 주도주 4사분면 (벤치 대비 알파) | 혼합 | alpha 주1회 + 판단 갱신 | `alpha.json` → `earnings.json` → `judgment.json` (판단이 덮음) |
| 궁금한 것 | 강물(병목 이동)·8레이어 스택·24종목 매트릭스 | 수동 | 콘텐츠 변경 시 | `index.html` 인라인 (`RIVERS`·`C`배열·`CASCADES`) |
| 궁금한 것 | 모멘텀 (미/한 벤치 대비) | 자동 | 주1회 토 08:30 KST | `alpha.json` (`compute-alpha.mjs`, momentum 휴리스틱 + 트래커 Gist) |

---

## 03 리밸런싱 (`v-port` + `v-tracker` + `v-macro`)

| 메뉴 | 정보명 | 자동/수동 | 업데이트 주기 | 정보 소스 |
|---|---|---|---|---|
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
| 메모 | 개인 메모 | 수동 | 작성 시 | localStorage (`alphamap_notes_v1`) + GitHub 동기화 (worker `/api/memo`) |

---

## 보조 데이터 (뷰에 직접 노출 안 되거나 파이프라인 내부)

| 정보명 | 자동/수동 | 주기 | 소스 |
|---|---|---|---|
| 시그널 로그 (누적 판단 컨텍스트) | 수동 | 시그널 포착 시 | `signal_log.json` (Claude/운영자, EOF append) |
| CPI (전년비) | 자동 | 갱신 시 | `cpi.json` (FRED via worker `/api/fred`) |
| 호르무즈 해협 물동량 | 자동 | 일별 | worker `/api/hormuz` (IMF PortWatch) · `hormuz.json`(폴백) |
| 시세 (종목 현재가) | 자동 | 매일 06:37 KST | `prices.json` (`fetch-prices.mjs`, Yahoo) |

---

## ⚠️ 알려진 이슈 · 예정 작업

1. **`news.json` 사이트 미배포** — `.assetsignore` + deploy `paths-ignore`로 사이트에 배포되지 않는 리포 전용 파일. 01 시장 모니터링의 종목 뉴스 fetch가 `simpleornothing.com/news.json`에서 404날 수 있음. 해결안: (a) `.assetsignore`에서 news.json 제외, 또는 (b) worker에 `/api/news` 추가.
2. **지수 수집** — 코스피·S&P·나스닥은 아직 데이터 없음. `fetch-prices.mjs`에 지수 심볼 추가 예정(데일리 자동).
3. **10년물 스파크라인** — `/api/us10y` history의 값 필드 확정 후 연결.
4. **매크로 뉴스** — 구글뉴스 RSS 키워드 수집 파이프라인 신설 예정.
5. **watching list** — 뉴스 행 버튼 → watching 추가(GitHub 동기화) 미구현.

---

## 갱신 이력

- 2026-07-11 · 최초 작성 (5탭 Phase 2a 기준). 01 시장 모니터링 신설 반영, news.json 배포 이슈 기록.
