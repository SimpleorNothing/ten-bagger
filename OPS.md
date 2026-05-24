# OPS — 알파맵 운영 매뉴얼

> 初入 Observatory · Alpha Map 운영 기준 문서.
> `.assetsignore`에 `*.md`가 있어 **사이트에는 배포되지 않고 리포에만 남습니다.**
> 목적: "언제 / 무엇을 / 누가" 갱신하는지를 한 곳에 고정.

---

## 0. 멘탈 모델 — 자동 2층 vs 판단 2층 (+ 보조 입력)

시스템은 데이터 4층 + 보조 입력 1개다. 운영의 핵심은 **자동층은 방치하고, 판단층만 적시에 갱신·정리**하는 것.

| 층 | 파일 | 성격 | 갱신 주체 | 차트 반영 |
|----|------|------|-----------|-----------|
| 시세 | `prices.json` | 자동 | 크론(매일) | O |
| 자동 알파 | `alpha.json` | 자동(momentum 휴리스틱) | Actions 수동 실행 | O |
| 실적 크기 | `earnings.json` | **판단+데이터** | 운영자/Claude | O(번개) |
| 판단 알파 | `judgment.json` | **판단** | 운영자/Claude | O(점 위치) |
| 뉴스 피드 | `news.json` | 자동 수집·**미선별** | 크론(매일) | X (리포 전용 검토자료) |

병합 순서(차트 렌더 시): **alpha.json → earnings.json → judgment.json** (판단이 자동을 이김, 마지막에 덮어씀). 봇이 `alpha.json`을 재계산해도 판단은 매번 그 위에 다시 얹힌다. `news.json`은 차트에 안 쓰이고 사람/Claude의 큐레이션 입력일 뿐.

---

## 1. 핵심 원칙 — 판단의 유효기간 (가장 중요)

이 시스템의 유일한 진짜 리스크는 **침묵하는 오류**다. 자동층은 안 틀리지만 **판단층은 방치하면 썩는다.**

- `judgment.json`의 모든 override는 `why`(조건)에 묶여 있다. **조건이 소멸하면 즉시 폐기/갱신.**
  - 예: `MRVL wk 0.5`는 "실적 방향 예측불가"가 전제. 5/27 실적이 지나면 방향이 정해져 이 값은 틀린 채로 차트를 오염시킨다 → D+1에 폐기 또는 실제 방향으로 교체.
- `earnings.json`의 실적은 **경과하면 제거**(이벤트 끝나면 expected move 의미 없음).
- `index.html`의 `D` 배열·`HOLDINGS` 비중은 **실제 잔고와 항상 일치**시킨다. 리밸런싱 후 동기화는 필수.

---

## 2. 갱신 주기 (cadence)

### 매일 — 손은 거의 안 댐
시세·뉴스는 크론 자동. 사이트의 **실적 운영 캘린더**에 `● 오늘`이 뜨면 그게 신호. 시간 날 때 `news.json`을 훑어 신호만 골라 `SIGNAL_LOG`에 기록(§4).

### 실적마다 (주 루프) — 캘린더가 자동으로 호출
가장 임박한 실적의 D-N에 따라 플레이북이 점등된다(§3).

### 월 1회쯤
1. GitHub **Actions 탭 -> `Compute alpha map` -> Run** (momentum 새로고침). *운영자 단독, 클릭 1번.*
2. `judgment.json` override가 아직 유효한지 점검(조건 살아있나). *Claude와 함께.*

### 분기 1회
1. 앱 **트래커에서 초입 5신호 재채점**(셀 클릭, 자동 저장). *운영자 단독.*
2. stage 재평가 + **리밸런싱 했으면 `D` 배열·`HOLDINGS`를 새 자산현황과 동기화.** *Claude와 함께.*
3. 낡은 실적·판단 일괄 정리.

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

---

*마지막 갱신: 2026-05-24 · 가장 임박 실무: MRVL 5/27 AMC (D-3, ±11.5% event-iv)*
