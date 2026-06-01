# OPS — 알파맵 운영 매뉴얼

> 初入 Observatory · Alpha Map 운영 기준 문서.
> `.assetsignore`에 `*.md`가 있어 **사이트에는 배포되지 않고 리포에만 남습니다.**
> 목적: "언제 / 무엇을 / 누가" 갱신하는지를 한 곳에 고정.

---

## 0. 멘탈 모델 — 자동 2층 vs 판단 2층 (+ 보조 입력)

시스템은 데이터 4층 + 보조 입력 2개(뉴스·장중 신호)다. 운영의 핵심은 **자동층은 방치하고, 판단층만 적시에 갱신·정리**하는 것.

| 층 | 파일 | 성격 | 갱신 주체 | 차트 반영 |
|----|------|------|-----------|-----------|
| 시세 | `prices.json` | 자동 | 크론(매일 06:37 KST) | O |
| 자동 알파 | `alpha.json` | 자동(momentum 휴리스틱) | 크론(주1회 토 08:30 KST) + Actions 수동 | O |
| 실적 크기 | `earnings.json` | **판단+데이터** | 운영자/Claude | O(번개) |
| 판단 알파 | `judgment.json` | **판단** | 운영자/Claude | O(점 위치) |
| 뉴스 피드 | `news.json` | 자동 수집·**미선별** | 크론(매일 06:37 KST) | X (리포 전용 검토자료) |
| 매크로 신호 | `signals.json` | 자동(VIX·S&P·CNN F&G) | 크론(`update-signals.yml`, 매일 06:37 KST 1일 1회) — 사이트 수동 입력폼은 제거(2026-05-31, cron 일원화) | X (01 매크로 매매 신호등 전용) |

병합 순서(차트 렌더 시): **alpha.json → earnings.json → judgment.json** (판단이 자동을 이김, 마지막에 덮어씀). 봇이 `alpha.json`을 재계산해도 판단은 매번 그 위에 다시 얹힌다. `news.json`은 차트에 안 쓰이고 사람/Claude의 큐레이션 입력일 뿐.

---

## 1. 핵심 원칙 — 판단의 유효기간 (가장 중요)

이 시스템의 유일한 진짜 리스크는 **침묵하는 오류**다. 자동층은 안 틀리지만 **판단층은 방치하면 썩는다.**

- `judgment.json`의 모든 override는 `why`(조건)에 묶여 있다. **조건이 소멸하면 즉시 폐기/갱신.**
  - 예: `MRVL wk 0.5`는 "실적 방향 예측불가"가 전제. 5/27 실적이 지나면 방향이 정해져 이 값은 틀린 채로 차트를 오염시킨다 → D+1에 폐기 또는 실제 방향으로 교체.
- `earnings.json`의 실적은 **경과하면 제거**(이벤트 끝나면 expected move 의미 없음).
- `index.html`의 `D` 배열·`HOLDINGS` 비중은 **실제 잔고와 항상 일치**시킨다. 리밸런싱 후 동기화는 필수.
- **판단(4사분면)을 갱신할 때마다 `snapshots.json`에 시점 스냅샷을 1건 append.** 차트 우하단 "시점" 셀렉터로 과거 배치를 재현·비교하고, 각 시점의 갱신 사유(`reason`)를 누적 추적하기 위함. 절차: `judgment.json` 수정 → 사이트에서 브라우저 콘솔에 `dumpSnap()` 입력 → 출력 JSON을 `snapshots.json`의 `snapshots[]` 끝에 붙여넣고 `asOf`·`label`·`reason` 기입(배열 끝이 최신). 스냅샷은 자기완결(전 종목 aN·aK·stage 포함)이라 D 배열이 바뀌어도 과거 배치가 보존된다.
- 2026-05-30: CASCADES cpu/memory의 '메모리 인터페이스칩' 노드 초입→가속, cpu의 'FC-BGA' 노드 초입→과열. WATCH(5/22 강등) 정합화. gpu CoWoS(초입)는 의도적 유지(캐파 병목 γ).
- 2026-06-01: L7 **800V HVDC 변환** 노드 명명 5종목(Navitas·Infineon·ROHM·ST·TI) 차트 위치 검증 완료 → **전부 52주 고점권**. NVTS 1년+994%·EPS음수·포물선(S5=0)=추격경고, IFX·STM 신고가·EPS상향 동반(과열), ROHM ¥5,078(고점−4%·저점比+232%)·평균목표가 +73% 상회·FY25 SiC감손 적자 → **'펀더 훼손형 저점' 기각**(가격이 추정 추월=초입 아님). 결론: 노드는 기술 초입이나 **안-과열 공개 비히클 부재 → cand:null 유지**(L4 CoWoS와 동일), 단계 배지 '검증 전 보류' 해제. SIGNAL_LOG 1건 추가.
- 2026-05-31: 전력 반도체(VPD) 차트 검증 → VICR 가속→**과열**(1년+600%·ATH·P/E110x·내부자매도, 가격이 매출 추월), MPS 가속→**성숙 경계**(fwd61x·GM캡, 단 추정 상향이 받쳐 덜 극단). CASCADES(cpu/gpu/power VPD 노드)·vicr 드로어·차트 점 일괄 정합화. power 캐스케이드에 **800V HVDC 변환(SiC/GaN)** 노드 신설 — Navitas/NVTS 등 VPD 상류·더 초입 후보지만 **차트 위치 검증 전 결론 금지**(리서치 영역 표기, 단계 배지 보류). 상대가치 결론: VPD=합의 반영 → 다음 자본은 L4·L8 또는 검증 통과 시 NVTS. SIGNAL_LOG 1건 추가.

---

## 2. 갱신 주기 (cadence)

### 매일 — 손은 거의 안 댐
시세·뉴스는 크론 자동. 사이트의 **실적 운영 캘린더**에 `● 오늘`이 뜨면 그게 신호. 시간 날 때 `news.json`을 훑어 신호만 골라 `SIGNAL_LOG`에 기록(§4).

### 실적마다 (주 루프) — 캘린더가 자동으로 호출
가장 임박한 실적의 D-N에 따라 플레이북이 점등된다(§3).

### 주 1회 — 알파맵은 자동
1. `alpha.json` momentum 재계산은 **크론 자동**(매주 토 08:30 KST, `Compute alpha map`). 필요 시 Actions 탭에서 수동 실행도 가능.
2. `judgment.json` override가 아직 유효한지 점검(조건 살아있나). *Claude와 함께.*

### 분기 1회
1. 앱 **트래커에서 초입 5신호 재채점**(셀 클릭, 자동 저장). *운영자 단독.*
2. stage 재평가 + **리밸런싱 했으면 `D` 배열·`HOLDINGS`를 새 자산현황과 동기화.** *Claude와 함께.*
3. 낡은 실적·판단 일괄 정리.
4. `judgment.json` 갱신 **전** `history/judgment_YYMMDD.json`로 스냅샷 보존. 갱신 후 `node scripts/judgment-diff.mjs <이전> judgment.json`로 사분면 변동이력(종목별 wk·m3 델타·전이·why)을 기록. *Claude와 함께.*

### 수시 (이벤트성)
- 큰 실적콜·뉴스 -> `SIGNAL_LOG`에 출처와 함께 추가.
- 신규 편입·편출 -> `D` 배열(보유) 또는 후보(cand) 갱신.
- 재료 없는 급등락 -> `judgment.json` C2 조건부반전 검토.

---

## 3. D-N 실적 플레이북

`earnings.json`의 `playbook` 배열에 데이터로 박혀 있다(**문구 수정은 코드 아닌 earnings.json 편집**). 사이트 캘린더가 가장 임박한 실적의 D-N에 맞춰 자동 점등.

| 시점 | 할 일 |
|------|-------|
| **D-7** | 추정 실적일이면 IR 캘린더로 확정. `basis:"hist"`면 event-iv 갱신 준비. |
| **D-3** | 옵션 IV로 expected move 갱신(이벤트/베이스 분산분해 또는 프런트 스트래들). `pct`·`basis` 업데이트. |
| **D-1** | 프런트 위클리 ATM 스트래들로 expected move 최종 확정. |
| **D-Day** | 실적 당일(AMC/BMO 확인). 방향 예측 불가 -> judgment의 다음주(wk)는 중립(≈0) 유지. 포지션·헤지 점검. |
| **D+1** | 실제 방향 확정 -> judgment wk 갱신/폐기 · earnings에서 해당 종목 제거 · 시그널 로그 기록 · stage·5신호 재평가. |

**방향 ≠ 크기:** earnings.json은 C1의 '크기(불확실성 폭)'만, judgment.json은 '방향(알파)'만 다룬다. 둘은 곱하지 않고 따로 표시(번개=크기, 점 위치=방향).

---

## 4. 뉴스 수집 & 일일 인테이크 루프

### 수집(자동) — `scripts/fetch-news.mjs` + `update-news.yml`
매일 08:00 KST, 보유/후보 종목별 Google News RSS를 긁어 `news.json`에 **원시 헤드라인**을 누적(10일 경과·중복 자동 삭제, 최대 150건). ETF는 스킵. **차트엔 안 쓰이고 배포도 안 한다**(`.assetsignore` + deploy `paths-ignore`). 이건 "모으기"까지만 — 신호/소음 판단도 숫자 변경도 안 한다(노이즈 오염 방지).

### 선별(반자동) — 사람/Claude
> 새 대화 -> 리포(또는 `news.json`) 업로드 -> "오늘 시그널 정리해줘"
> -> (1) 소음 거르고 (2) `SIGNAL_LOG` 항목 형식으로 만들고 (3) 숫자 바꿀 임계점이면 어느 파일을 어떻게 고칠지 플래그.

### 뉴스 -> 무엇을 바꾸나 (필터)
```
실적 변동폭 변화        -> earnings.json
방향·반전·런웨이 변화    -> judgment.json
단계(stage) 변화        -> index.html C배열 stage + 트래커
편입·편출              -> D배열 / C배열
그 외 전부             -> SIGNAL_LOG만 (숫자 불변)
```
핵심 필터는 **상대가치**: "X에 호재인가?"가 아니라 "어느 층이 싸고 비싼지를 바꾸나?". 이미 비싼 쪽 호재면 로그만, 공포에 눌린 쪽이면 비중 이전 근거로 격상.

### SIGNAL_LOG 항목 템플릿 (index.html, `/* ▼ 신규 시그널은 여기에 */`)
```js
{date:'2026-05-25', at:'2026-05-25T22:00+09:00', source:'기사/이벤트 제목',
 srcs:[{label:'매체명', url:'https://...'}],
 items:[
   {tag:'L6·연결', layer:'L6', col:'#1c7ed6',
    html:'<b>핵심 한 줄</b> — 어느 층 수요/공급을 바꾸는지 + 상대가치 함의.'},
 ]},
```
`at`이 사이트 우상단 **"정보" 타임스탬프**(`infoAsof()`)를 끌어올린다 -> 로그 갱신 = 사이트 신선도 갱신. `layer`를 넣으면 태그 클릭 시 8레이어 스택으로 점프. `col`: 긍정 `#0ca678` / 경고·강등 `#e03131` / 중립=레이어색.

---

## 5. 누가 하나 — 단독 vs Claude 호출

**운영자 단독 (텍스트/클릭만):**
- `Compute alpha map` / `Update news feed` 워크플로 실행
- 트래커 5신호 채점
- `earnings.json` 실적일 IR 확정·경과 종목 삭제·플레이북 문구 수정

**Claude 호출 (조회·판단 필요):**
- 새 expected move IV 계산(옵션 데이터 조회)
- judgment 반전·forward 런웨이 판단
- `news.json` 선별 -> SIGNAL_LOG 작성
- 신규 후보 분석·stage 채점, 큰 뉴스 해석, 방법론 변경

---

## 6. Claude 재호출 방법

이 Project에서 새 대화 -> **현재 리포 업로드**(또는 바뀐 json만) -> 트리거 한 줄:
- "오늘 시그널 정리해줘" (news.json 첨부)
- "MRVL 실적 끝났어, 정리"
- "분기 5신호 재채점하자"
- "리밸런싱 했어, 비중 갱신"
- "MU 6월말 다가온다, event-IV로"

Project 메모리 + 리포가 source of truth라 어디서 멈췄든 이어받는다.

---

## 7. 아키텍처 불변식 (편집 전 반드시 인지)

- **차트는 `aN`만 쓴다.** 코스피 토글은 `aN - Δ` 평행이동(순위·간격 불변). `aK`는 사실상 vestigial — 판단 갱신 시 `aN`만 건드린다.
- 축: **X = 3개월(m3), Y = 다음주(wk).** 사분면 (1)알파(우상) (2)중기알파(우하) (3)벤치마크이하(좌하) (4)단기만(좌상).
- **현금은 점 하나**(궤적 아님). 평균회귀 미사용 — raw 알파.
- override/merge는 **티커(`d.t`) 키 매칭.** 여러 ETF가 `t:'ETF'`를 공유 -> alpha.json·judgment에 `'ETF'` 키 없음 -> 이들은 `D` 폴백값 유지. 고유 키: `MRVL·MU·005930·LITE·TSLA·VRT·BE·한국 ETF` 등.
- `judgment.json` override의 `null` 칸 = 해당 호라이즌 자동값 유지(외과적 부분 덮어쓰기).
- compute-alpha.mjs / fetch-news.mjs의 제외 목록(ETF·방어 등)은 자동 처리에서 빠진다.
- **메뉴 6탭(2026-06-01 재편):** 01 투자 캘린더(`cal`, 기본 표시) / 02 시그널 로그(`siglog`, 신규) / 03 알파 찾기(`thread`, 구 관통 흐름 이름 변경) / 04 알파 맵(`alpha`) / 05 매크로 매매(`macro`) / 06 포트폴리오 X-레이(`port`). **`data-v` 키 = 섹션 id(`v-{data-v}`)·탭전환 로직의 매칭 키.** 기본 표시 탭은 `v-cal`(`.view on`). 02 시그널 로그=`v-siglog`(구 `v-alpha` 안에 있던 `#signalLog`를 독립 메뉴로 분리·이동 — `SIGNAL_LOG`/`renderSignalLog()` 그대로, 마크업만 이동). 04 알파 맵=`v-alpha`(4사분면, 시그널 로그 빠짐). 05 매크로 매매=`v-macro`(정적 룰북, `signals.json` 신호등). **01 투자 캘린더=`v-cal`(정적 일정 관제: 거시 FOMC·CPI/PCE·한국 금통위·美 중간선거 / 보유·후보 실적 / SpaceX 등 메가이벤트 / 글로벌 워치리스트). 차트 없음 → 탭전환 자동 작동(`map`만 특수처리). 프린트 `order` 배열엔 미포함(macro와 동일 — 도구 페이지는 리포트 출력 제외).** 향후 동적화 시 `calendar.json`(상태·유효기간·트리거) 신설 후보 — signals.json 폴백 패턴 준용, paths-ignore 금지(배포 필요).
- **메뉴별 업데이트 시점 배지(`.updstamp`):** 각 뷰의 주요 정보 블록 우측 상단에 `update : <KST>` 표기. **전부 자동** — 손으로 시각을 박지 않는다.
  - 정적(수기 큐레이션) 뷰(`updCal`·`updThread`·`updPort`)는 `VIEW_UPDATED` = `document.lastModified`(Cloudflare 자산 Last-Modified)를 KST로 포맷. **콘텐츠를 고쳐 배포할 때마다 자동 갱신.** 시세·뉴스 크론 커밋은 `deploy.yml`의 `paths-ignore`라 재배포가 안 일어나 시각이 안 튄다(실제 콘텐츠 배포 때만 갱신).
  - 자동 데이터 뷰는 데이터 파일 타임스탬프 연동: `updAlpha`=`alpha.json` asOf, `updMacro`=`signals.json` asOf, 시그널 로그 헤더=`infoAsof()`(최신 `SIGNAL_LOG` at).
  - 포맷 헬퍼 `fmtUpd()`/`stampText()` (ISO·날짜만·KST 문자열 모두 처리).
- **03 관통 흐름 = `v-thread` 한 섹션 안에 트리(`#threadTree`)로 2개 `.subview` 통합**: `sub-flow`(강물) / `sub-stack`(구 `v-stack` 스택+24종목 매트릭스). 트리 노드 = ① 강물 / ② 8레이어 통합. **파생 체인(구 04/sub-casc)은 별도 탭·서브뷰 없이 강물 페이지에 흡수** — `threadDetail`의 value-chain 레이어 카드(`.dstrip`)를 누르면 그 레이어의 2·3차 파생 가치사슬이 카드 바로 아래 인라인(`.dchain`)으로 펼쳐진다. 강물 곡선 노드(`.river-node`) 클릭도 해당 레이어 카드를 펼치고 스크롤.
  - 인라인 드릴다운은 **`CASCADES` 데이터 + `cascadeHTML(c)`/`layerChainHTML(layer)`** 헬퍼로 렌더(구 `renderCascade`·`cascPick`·`cascView` 제거). `CASCADES`에 없는 레이어(L1·L4)는 `lc-empty` 안내문으로 폴백. 파생 노드의 `cand`는 `openDrawer(id)`로 종목 드로어.
  - 내부 ID(`threadSvg·stackList·legendStack·mxRoot` 등) **불변** → `renderThread/renderStack` 본문 무수정. 외부/로그에서 8레이어로 점프는 **`gotoStack(layerId)`**(구 `.tab[data-v="stack"]` click 대체 — 03 탭→`sub-stack` 전환 후 `lay-*` 스크롤). 프린트 `order`=`['alpha','macro','cal','thread','map','port']`.
- **X-레이(`v-port`)에 `TARGETS`(적정밴드)·`#portGap` 표·`tgtOverlay`(pbar 밴드/중앙선) 추가.** 밴드는 프레임 도출(8레이어·단계·γ·유한자본/상대가치) — **매매 권유 아님**, `dir=trim/add/hold`·`gate=AND` 선결. 분기 재평가 시 `TARGETS`(또는 후속 `targets.json`) 갱신. `xrayHero`·`portSub`는 `HOLDINGS` 구동(스테일 5/16·898M·35.7% 리터럴 제거). `HOLDINGS`·`D` 배열은 불변(실잔고 일치).
- 배포: `claude/wizardly-rubin-SubA1` 푸시 -> `deploy.yml` 자동 wrangler deploy. `prices.json`·`news.json` 커밋은 `paths-ignore`로 배포 생략.

---

## 8. 데이터 스키마 요약

**judgment.json**
```
{ asOf, method, benchmark, shelfLife,
  overrides: { TICKER: { aN:[wk,m3,y1] (null=자동유지), why } } }
```

**earnings.json**
```
{ asOf, source, note,
  playbook: [ { dn, at, do } ],
  moves: { TICKER: { pct, axis:'wk'|'m3', off?, date, basis:'event-iv'|'hist', src } } }
```

**news.json** (자동 생성·리포 전용)
```
{ asOf, source, note, count,
  items: [ { id, ticker, name, title, link, published, source } ] }   // 최신순
```

**history/judgment_YYMMDD.json** — 판단층 시점 스냅샷(리포 전용, `.assetsignore`로 사이트 미배포). `judgment.json` 덮어쓰기 전 복사본. `scripts/judgment-diff.mjs`로 두 스냅샷 간 사분면 궤적(wk·m3 델타·전이) 추출.

---

*마지막 갱신: 2026-05-31 · 8레이어 스택 value chain 깊이 컨트롤(1/2/3): 1=레이어 헤더만(카드 접힘)·2=+종목 칩·3=+2·3차 가치사슬, 단계 범례 우측(.stack-bar·#vcDepth·applyVcDepth) · RIVER_CHAINS[3·4·5](강물 임대→주권/스케일→효율/디지털→피지컬) 2·3차 cos를 종목별 단계 배지+★보유로 통일(강물 2~5 전부 배지 완성) · 01 매크로 신호값 수동 입력폼(sig-edit) 제거 — signals.json은 update-signals 크론으로 자동 일원화(신호등 표시 로직·signals.json 연동 유지). 오배포된 프로브 파일(__probe_signals_form_removal.txt) 정리 · RIVER_CHAINS[2](강물2 데이터→RL·합성) cos를 종목별 단계 배지로 업그레이드(Appen 함정·HUD·Mostly AI·PLTR 과열·인접 반영, 대부분 비상장) · CASCADES 전 캐스케이드(cpu·gpu·memory·optical·power·grid·physical) 노드 cos를 [[종목,단계,보유]] 배지 배열로 — 종목별 단계(노드≠종목, 예 Lumentum·Vertiv=성숙·노드는 가속)·★보유 표기, primary 1차주에도 ★ · cpu/memory '메모리 인터페이스칩' 초입→가속·cpu 'FC-BGA' 초입→과열 WATCH 정합화(+SIGNAL_LOG 1건) · 03 관통흐름 트리 2노드로 축소(① 강물 / ② 8레이어) — 파생 체인을 강물 value-chain 카드 인라인 드릴다운(.dchain)으로 흡수(cascadeHTML/layerChainHTML, renderCascade 제거) · 메뉴 6탭 유지 · 02 투자 캘린더(`v-cal` 정적 일정 관제) · 01 매크로 매매(signals.json) · 07→05 X-레이에 TARGETS 적정밴드·회전 갭표, xrayHero/portSub HOLDINGS 구동 동기화 · 가장 임박 실무: MU 6/25 (hist ±6.5%, 6/18경 event-iv 갱신) · MRVL 5/27 경과로 제거*

*v-macro 패치 v3: 선반영 소진 게이트·둔감화 곡선(반복 회차) 블록 추가, 현재 권고 5/31 갱신(KOSPI 신고가 회복), signals.json 현재값(VIX 15.3·fearGreed null) 입력. ⚠️ 운영자 확인: 블록7 `MU 6/24` vs earnings.json/OPS `MU 6/25(±6.5%)` 불일치 — 최소변경 원칙상 이번엔 6/24 유지, 실제 IR일 확정 시 별도 정정 필요.*
