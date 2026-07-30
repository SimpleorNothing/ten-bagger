**최종 갱신: 2026-07-30 14:55 (KST)**

# STYLE_GUIDE — 알파맵 디자인 시스템

> **SoT = 이 파일(리포 `main`).** Claude Project 지식파일·과거 캡처는 폴백이며, 충돌하면 리포가 이긴다.
> **짝 문서 = `OPS.md`(운영 가이드).** 이 리포의 지속 갱신 문서는 이 둘뿐이다 — 디자인은 여기, 정보·운영 로직은 OPS.
> `.assetsignore`에 `*.md` → 사이트에 배포되지 않고 리포에만 남는다.
> **토큰 표는 손으로 고치지 않는다.** `node scripts/check-docs.mjs --fix` 가 `index.html` `:root` + `pantone.css` 오버라이드에서 실측해 재생성한다.
> **신규 메뉴·컴포넌트는 §6 「01 시장 모니터링 = 레퍼런스 구현」을 복제해 만든다.**
> 버전: **v3.2** (레퍼런스 구현 §6 · 신규 메뉴 체크리스트 §7 · 상단 타임스탬프 규칙 · **06 캘린더 삭제→01 「다가오는 일정」 흡수**)
> **문서 맨 위 「최종 갱신」은 연월일+시분(KST). 이 문서를 고치면 그 줄을 반드시 함께 갱신한다.**

---

## 0. 토큰 체인 (읽는 순서)

```
index.html :root        ← 기본값 (해도 테마)
  ↓ 덮어씀
pantone.css :root       ← 현행 팔레트 (팬튼 A안, index.html 하단 <link>로 로드)
  ↓ 뷰별 스코프
#v-alpha --a-* · #v-cal --pt-*/--cat-*   ← 뷰 전용 토큰
```

**규율:** 색을 새로 쓸 일이 생기면 하드코딩(`#496176`) 금지 → **토큰 참조**(`var(--dawn)`). 토큰이 없으면 토큰을 먼저 만든다.
`index.html`의 `:root` 값만 보고 판단하면 틀린다 — **`pantone.css`가 나중에 로드돼 이긴다.**

---

## 1. 유효 토큰 (실측 · 자동 생성 구역)

<!-- TOKENS:BEGIN — 자동 생성. 직접 편집 금지. `node scripts/check-docs.mjs --fix` 로 갱신. -->
| 토큰 | 유효값 | 출처 | 용도 |
|---|---|---|---|
| `--ink` | `#F0EFEB` | pantone | 페이지 배경 (Cloud Dancer) |
| `--ink2` | `#ECEAE3` | pantone | 배경 변주·바 트랙 |
| `--panel` | `#ffffff` | pantone | 카드 바탕 |
| `--panel2` | `#E9E7E0` | pantone | 카드 내부 요소·입력창 |
| `--line` | `#dedbd3` | pantone | 기본 테두리·구분선 |
| `--line2` | `#cbc7bd` | pantone | 강한 테두리·점선 |
| `--txt` | `#3d3935` | pantone | 본문·제목 (잉크) |
| `--dim` | `#746F69` | pantone | 보조 설명 (Hematite) |
| `--faint` | `#989292` | pantone | 최약 라벨·주석 (Cloud Cover) |
| `--dawn` | `#496176` | pantone | 강조·활성 (Blue Fusion) |
| `--accel` | `#496176` | pantone | 강조 (팬튼에서 단색 통합) |
| `--hot` | `#496176` | pantone | 강조 (팬튼에서 단색 통합) |
| `--nascent` | `#496176` | pantone | 강조 (팬튼에서 단색 통합) |
| `--mature` | `#746F69` | pantone | 비활성·약화 |
| `--onacc` | `#ffffff` | pantone | 강조 배경 위 글자 |
| `--st-nascent` | `#6b5a9e` | index | **기능색** 단계=태동 |
| `--st-dawn` | `#2f7d63` | index | **기능색** 단계=여명/초입 |
| `--st-accel` | `#2a6f97` | index | **기능색** 단계=가속 |
| `--st-mature` | `#9a7b2f` | index | **기능색** 단계=성숙 |
| `--st-hot` | `#b4472f` | index | **기능색** 단계=과열 |
| `--glow` | `none` | index | 글로우 비활성 |
| `--serif` | `'Pretendard Variable','Pretendard',system-ui,…` | index | 전 서체 (단일 패밀리) |
| `--mono` | `var(--serif)` | index | 데이터·수치 (별도 고정폭 없음) |
| `--sans` | `var(--serif)` | index | 본문 |

웹폰트: Pretendard Variable **v1.3.9** (jsDelivr `orioncactus/pretendard`, dynamic-subset)
<!-- TOKENS:FP {"font":"v1.3.9","eff":{"--ink":"#F0EFEB","--ink2":"#ECEAE3","--panel":"#ffffff","--panel2":"#E9E7E0","--line":"#dedbd3","--line2":"#cbc7bd","--txt":"#3d3935","--dim":"#746F69","--faint":"#989292","--dawn":"#496176","--accel":"#496176","--hot":"#496176","--nascent":"#496176","--mature":"#746F69","--onacc":"#ffffff","--st-nascent":"#6b5a9e","--st-dawn":"#2f7d63","--st-accel":"#2a6f97","--st-mature":"#9a7b2f","--st-hot":"#b4472f","--glow":"none","--serif":"'Pretendard Variable','Pretendard',system-ui,-apple-system,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',sans-serif","--mono":"var(--serif)","--sans":"var(--serif)"}} -->
<!-- TOKENS:END -->

**장식색 vs 기능색 — 절대 규칙**
- **장식·브랜드색**(`--dawn`/`--accel`/`--hot`/`--nascent`)은 팬튼에서 **Blue Fusion 단색으로 통합**됐다. 이름이 단계처럼 보여도 **의미가 없다.**
- **단계 의미는 `--st-*` 만이 나른다.** 단계 배지·차트 점·범례는 반드시 `--st-nascent|dawn|accel|mature|hot`.
- 적색(`--st-hot`)은 **과열·경고·상승(등락)에만**. 장식으로 쓰지 않는다.

---

## 2. 서체

- **Pretendard 단일 패밀리.** 표제·데이터·본문 모두 같은 폰트 — 위계는 **굵기·자간·크기로만** 만든다.
- `--mono`는 `--serif`의 별칭이다. 고정폭이 아니다. 숫자 정렬이 필요하면 `font-variant-numeric: tabular-nums`.
- **크기 하한(절대 — 폼·보조 뷰 예외 없음):** **읽는 글(문장) = 14px 하한** · **폼 컨트롤(`input·textarea·select·button`)도 14px 하한** · **메타 라벨(날짜·기간·칩·눈금·집계 수, `--mono`) = 12px 하한.** 12px 미만은 어디에도 쓰지 않는다. **뷰 부제(`.vsub` 15px)가 있는 화면에선 그 아래 읽는 글이 부제보다 작아 보이면 안 된다** — 그 뷰의 본문·폼은 `.vsub`와 같은 **15px**로 맞춘다(예: 02 인사이트 찾기 `insight.css`). 위계는 크기를 하한 밑으로 낮춰서가 아니라 굵기·색으로 만든다.
- 스케일: 뷰 제목 30px/700(-.02em) · 섹션 제목 20px/700(-.3px) · **블록 제목·카드명 15px/700** · **값(강조 수치) 17px/700** · **본문·기사·요약·렌즈 14px/1.5–1.6** · **메타 라벨 12px**(`--mono`, .04em).
- 같은 14px 안에서 위계는 **굵기·색으로만** 만든다(제목 600/`--txt` · 부연 400–500/`--dim` · 최약 `--faint`). 크기를 12px로 낮춰 위계를 만들지 않는다.

---

## 3. 해도(海圖) 레이어 — 사이트의 시그니처

색보다 먼저 이 3개가 알파맵을 알파맵으로 만든다. **신규 메뉴도 이 규칙 안에서 그린다.**

| 요소 | 규칙 |
|---|---|
| 용지 | `body` 등간격 괘선 격자(31/32px repeating-gradient, `background-attachment:fixed`) |
| 도곽선 | `header` 하단 잉크 실선 + `header::after` 경위도 눈금자(16px 반복) |
| **형태가 역할을 말한다** | **면(카드·패널·블록·탭) = radius 3px(각짐)** · **부표(배지·칩·pill) = radius 20px(둥글게)** |
| 숫자 | `.wpx·.pc .pct·.excell·.trow td·.lstage·.t-stage` → `tabular-nums` |
| 인쇄 | `@media print` 격자·눈금자 제거(백지 도판) |

⚠️ **함정:** 컴포넌트 CSS에 `border-radius:14px`라고 써 있어도 **해도 레이어의 3px 셀렉터 목록에 들어가면 실효 3px**다. 새 면(面) 컴포넌트를 만들면 **그 셀렉터를 3px 목록에 추가**해야 결이 맞는다(`index.html` `/* 형태가 역할을 말한다 */` 블록).

---

## 4. 컴포넌트 관행 (전역)

| 항목 | 값 |
|---|---|
| 페이지 폭 | `main.wrap` max **1340px** · padding `0 22px` |
| 뷰 전환 | `section.view#v-{key}` + `.view.on{display:block}` · nav `.tab[data-v="{key}"]` |
| 뷰 머리 | `.vhead` → `.vkick`(mono 13px, uppercase, .14em, 앞에 18px 선) → `.vtitle`(30px/700, 강조는 `<em>` = `--dawn`) → `.vsub`(15px `--dim`, max 820px) |
| 갱신 배지 | `.updstamp`(mono 11.5px `--faint`) · 우상단 고정은 `.updstamp.abs` · 비면 자동 숨김 · **01 헤더 `.mkt-upd` 배지 = 라이브 데이터 시각(`pulse.json` asOf, `changelog.js`) — 클릭 팝업만 사이트 변경 로그** |
| 카드 | `background:var(--panel); border:1px solid var(--line)` (실효 radius 3px) |
| 버튼(기본) | `--panel2` 바탕 + `--line2` 테두리 + `--txt` 글자 |
| 버튼(주) | `--txt` 또는 `--dawn` 바탕 + `--onacc` 글자 |
| 비활성 | `opacity:.45` |
| 스틸맨·인용 | 좌측 2px `--line2` 보더 + `--dim` 글자 |
| hover | `border-color:var(--line2)` + `box-shadow:0 4px 14px rgba(22,36,45,.06)` · transition `.12~.15s` |
| 포커스 | 클릭 가능한 카드는 `:focus-visible{outline:2px solid var(--st-accel);outline-offset:2px}` |
| 모바일 | 카드 그리드 → 2열 또는 세로 스택. 표는 **가로 스크롤 금지**, 열 축약. |

**등락색 규약(절대):** **상승 = `--st-hot`(적) · 하락 = `--st-accel`(청)** — 한국식. 미국식으로 뒤집지 않는다(`.mkt-chg.up/.dn`).

---

### 4-1. 단독 페이지 (`brief.html` · `prob.html`)

`index.html` 밖에 사는 단일 문서다. 탭 골격(`section.view`)·`pantone.css` 링크가 없으므로 **`:root` 를 자체 선언**하되 규약은 같다.

| 항목 | 규약 |
|---|---|
| 토큰 | §1 토큰 표의 **값을 그대로 복제**한다. **신규 토큰을 만들지 않는다**(만들면 `check-docs` 대상 밖이라 조용히 갈라진다) |
| 서체 | Pretendard Variable(jsDelivr dynamic-subset) — index와 동일 링크 |
| 폭 | 단독 페이지는 **읽기 폭 720px**(index의 1340px 격자가 없으므로) · padding `0 16px` |
| 카드·버튼·hover·포커스 | §4 전역 관행 그대로(면 `--panel`/`--line`, 주 버튼 `--dawn`/`--onacc`) |
| 하단 고정 바 | `padding-bottom: calc(12px + env(safe-area-inset-bottom))` — 모바일 홈 인디케이터 회피 |

**06 모닝 브리핑(`#v-brief` · `brief.js`) 규약:** 단독 페이지가 아니라 **뷰**다 — §6 레퍼런스(`.vhead`→`.vkick`→`.vtitle`→`.vsub`) 골격을 그대로 쓰고, 카드는 전역 관행(`--panel`/`--line`)을 따른다. 스타일은 **`brief.js`가 `<style id="brief-css">`로 주입**하고 전 선택자를 `#v-brief` 로 스코프한다(별도 `.css` 파일·**신규 `:root` 토큰 0**). 기능색은 기존 것만: 게이트 충족 `--st-hot` · 레이어 오버 `--st-mature` · 언더 `--st-dawn`. **9섹션 구성(2026-07-20)** 은 카드(`.br-card`) 반복이 골격이고, 표는 전부 `.br-t` 하나를 재사용한다(지수·마감·뉴스·일정·리밸런싱에 새 표 컴포넌트를 만들지 않는다). 맥박 리스크 보드만 카드 그리드(`.br-risks`/`.br-r`, `minmax(232px,1fr)`)를 쓰고 방향 배지 `.br-dir` 는 **위험 `--st-mature` · 기회 `--st-dawn` · 중립 무채색**(`--dim`). 등락 셀은 **부호가 있을 때만** 색을 입힌다(`.up`=`--st-dawn` · `.dn`=`--st-mature` · 부호 없으면 기본색 — 방향을 지어내지 않는다). 리밸런싱 판정 줄은 `.br-verdict`, 실행 불가면 `.warn`(`--st-mature`). 대담 말풍선은 `brief.html` 과 같은 규약(진행자 우측·애널리스트 좌측, 낭독 중 `--dawn` 인셋 링, 완료 `opacity:.72`).

**`brief.html`(데일리 브리핑 팟캐스트) 고유 규약:** 화자 2인은 **정렬로 구분**한다(`.msg.host` = 우측 정렬 `--panel2`/`--line2` · `.msg.ana` = 좌측 `--panel`/`--line`), 아바타 색은 `--dawn`(진행자)·`--mature`(애널리스트). 낭독 중 말풍선은 `--dawn` 인셋 링, 끝난 말풍선은 `opacity:.72`. 말풍선 본문은 **음성 원문 그대로**를 쓰되 숫자·퍼센트·규율어(`매크로 게이트`·`스틸맨`)만 `<b>` 로 자동 강조한다(화면용 별도 대본을 두지 않아 음성·화면이 갈라지지 않는다).

---

## 5. 뷰 전용 토큰 (스코프)

- `#v-alpha` → `--a-surface/-2 · --a-line/-2 · --a-txt · --a-dim · --a-faint · --a-brand`
  ⚠️ `index.html` 안의 `--a-*` 기본값(`#f6f7f9`·`#1a1d21`·`#1257d6` 등)은 **팬튼이 덮는 레거시**다. 이 값들을 근거로 새 UI를 만들면 안 된다.
- ~~`#v-cal`~~ **2026-07-17 06 캘린더 삭제.** `#v-cal` CSS(`cal-*`·`watch-*`·`fomc-*` 등)는 `v-port`식 비활성 잔존(매칭 DOM 없음). 「임박 이벤트」만 01로 이관.
- **카테고리색 `--cat-macro|infl|earn|event|pol|watch`는 `#v-market`으로 이관** — 「다가오는 일정」 D-N 카드/범례의 **데이터(카테고리) 인코딩**(6색 정성 팔레트가 전역 토큰에 없어 예외 존치 · 신규 토큰 아님, `#v-cal`서 이동만). `.now-card::before` 3px 스트라이프=`--c:var(--cat-{cat})`. 등락색(§4)·단계색(`--st-*`)과 **의미 다름, 혼용 금지**.
- 신규 뷰는 **전용 토큰을 새로 파지 않는다**(01은 전역 토큰 + 위 카테고리 인코딩만). `#v-alpha` `--a-*`는 레거시.

---

## 6. 01 시장 모니터링(`#v-market`) = 레퍼런스 구현

**신규 메뉴는 이 뷰를 복제한다.** 여기 없는 패턴을 새로 발명하지 않는다.

### 6-1. 골격

```html
<section class="view on" id="v-market">
  <div class="vhead">
    <div class="vkick">Market · 시장 모니터링</div>
    <h1 class="vtitle">한눈에 보는 <em>시장</em> — 증시·금리·유가·뉴스</h1>
  </div>
  <h2 class="msec">다가오는 일정 <span class="mnote">거시·실적 게이트 · D-카운트다운 · 기준일 … · 지난 이벤트 자동 제거</span></h2>
  <div class="cal-legend"> … 6색 카테고리 범례(--cat-*) … </div>
  <div class="cal-now" id="calNow"> … .now-card × 최대 8(renderCalNow) … </div>
  <h2 class="msec">지표 <span class="mnote">6개월</span></h2>
  <div class="mkt-grid"> … .mkt-card … </div>
  <h2 class="msec">리스크 보드 <span class="mnote">3축 · 상태 · 점등 조건 · 관련 기사 자동 반영</span></h2>
  <div id="riskLens"> … 보드에서 뽑은 인사이트 렌즈 2줄(l1=상태 집계 자동 파생 · l2=해석) … </div>
  <div class="mkt-grid" id="riskBoard"> … .mkt-card × 3(risk.js) … </div>
  <h2 class="msec">관련 기사 <span class="mnote">토픽 · 일자별</span></h2>
  <h2 class="msec">종목 뉴스 <span class="mnote" id="mktDigestAsof">요약 · 일자별</span></h2>
</section>
```

- **섹션 리듬:** `h2.msec`(20px/700, margin `26px 0 12px`) + 조건 배지 = 「제목 + 조건(기간·정렬)」. 조건이 **고정 텍스트**면 `span.mnote`(mono 11px `--faint`, .04em), **선택형**이면 `span.mrng`(세그먼트 버튼군 — `.rbtn` 5개 = 1M/6M/1Y/3Y/5Y, 활성 `.on`). 부제 문단을 길게 쓰지 않는다.
  - 기간 선택군(`.mrng`)은 지표·보유 두 헤더에 각각 두되 **공통 상태(`RG`)** 로 동기화 — 한쪽을 누르면 두 그룹 배지·모든 카드가 함께 재슬라이스된다. **01 시장 모니터링의 기본 기간은 6M**이며 거래일 근사: 1M≈21·6M≈126·1Y≈252·3Y≈756·5Y≈1260, `slice6()` 단일 경로. 01 종목 뉴스 미니차트도 처음 열 때 6M(126거래일)를 기본으로 표시한다. **04 시장과 실적 전망의 Value Chain 종목 칩은 별도 `hover-chart.js` 경로로 1Y 일봉을 표시**하며 01의 `RG`와 연동하지 않는다. charts.json은 `fetch-prices.mjs`가 **Yahoo/Naver 5Y 일봉**으로 채운다(매 실행 창 전체 교체) → 5Y 버튼까지 실데이터. 신규 상장 등 확보분이 창보다 짧으면 자동 클램프. WTI(`/api/wti`)·미국 가솔린(`/api/gasoline`, RB=F $/gal)은 2020~ · **US10Y도 `charts.json.us10y`(`^TNX` 5Y) 1순위 · `/api/us10y` 폴백**(외부 피드 ~2개월뿐이라 단독 사용 시 기간버튼 무반응 — 2026-07-16 수리, PR #345).
- **02 인사이트 찾기의 채택 매크로 관점 스트립(`insStripMarket`)은 「관련 기사」 섹션 안에 산다(2026-07-18):** `insight.js mount()`가 `#v-market` 최상단(`.vhead` 뒤)이 아니라 **`#mktMacroNews` 바로 앞**(「관련 기사」 h2 아래·자동 수집 뉴스 위)에 마운트한다. 큐레이션 관점(등급·출처·라이프사이클 메타 보존)과 자동 매크로 뉴스가 한 묶음으로 읽힌다. 뉴스 `.arow`로 평탄화하지 않는다(narrative≠numbers · 스트립 컴포넌트 그대로). `insStripCal`(채택 일정 관점)은 `.vhead` 뒤에 렌더하며 비면 렌더 0. 각 `.ins-si` 우측에는 12px `삭제` 버튼(`.ins-strip-del`)을 두고, 확인 후 해당 claim만 제거한다. 버튼은 면 역할이라 radius 3px·기존 토큰만 사용하며, 마지막 claim이 삭제된 빈 자료는 함께 정리한다.
- 뷰 안에서 정보 밀도는 **섹션 4개 안팎**으로 끊는다.
- **「리스크 보드」(2026-07-25 · 구 「보유 종목」 스파크라인 자리):** 「무엇이 올랐나」가 아니라 **「무엇이 이 판을 끝낼 수 있나」**를 상시로 못 박는 자리다. `risk.js` 자가 마운트 — 런타임에 `보유 종목` h2+`#mktHoldings`를 제거하고 그 위치에 `h2.msec` + `#riskLens` + `.mkt-grid#riskBoard`(카드 3장)를 넣는다(**index.html 무편집**). 그리드는 텍스트 밀도가 높아 `minmax(300px,1fr)`로 스코프 오버라이드(600px 이하 1열). 카드 상시 영역은 `.rk-hd` → **렌즈 2줄** → 게이지 `.rk-g`까지만 두어 기존 대비 약 절반 높이로 축약한다. 점등 조건 `.rk-tr`·레이어 리드스루 `.rk-rd`·최근 기사 `.rk-nw`·근거 `.rk-src`는 하단 `.rk-morebox`의 절대 오버레이 `.rk-detail`로 옮긴다. 하단 버튼 호버/키보드 focus-within/탭 `.show-detail`에서만 표시하며 최대 높이 68vh·내부 스크롤, 한 번에 한 카드만 연다. 사이클 판별 보드는 같은 규칙을 `gt-*`로 복제한다. 두 보드 카드 빈 영역은 토픽 카드와 같은 600ms 롱프레스 삭제를 지원한다(4px 이동 취소·다른 카드/상세 버튼 동작 시 버튼 해제·확인 모달). 삭제 버튼은 우상단 12px/radius 3px 경고 기능색이며, id는 각각 `am_risk_board_hidden_v1`·`am_cycle_board_hidden_v1`에 저장해 재렌더에서도 숨긴다. 원본 JSON은 삭제하지 않는다. **상태 배지는 부표(pill 20px §3)이고 색은 판정 기능색만 재사용** — 점등 `--st-hot`(`wn`) · 연기 `--st-mature`(`nt`) · 완화·반전 `--st-dawn`(`ok`), §6-4 `.ok/.wn/.nt`와 같은 어휘라 렌즈와 배지가 갈라지지 않는다. 게이지 값은 등락색 규약(§4) 그대로 상승 적·하락 청. **보드 위 인사이트는 렌즈 2줄 컴포넌트를 그대로 쓰되 l1을 런타임 파생**(점등/연기/반전 집계 + 켜진 축 이름)해 보드와 문장이 어긋나지 않게 한다. 매칭 기사 0건이면 §6-6대로 대기 사유를 적는다. 신규 `:root` 토큰 0 · 스타일은 `risk.js`가 `<style id="risk-css">`로 주입하고 전 선택자를 `#riskBoard`/`#riskLens`로 스코프(brief.js 패턴).
- **「다가오는 일정」(06 흡수, 2026-07-17):** `.cal-now`(4열·모바일 2열)+`.now-card`(D-N + `.when`·`.lbl`·`.meta` · 좌측 3px `--cat-*` 스트라이프·radius 3px). `renderCalNow()`가 `calendar.json`+`earnings.json` moves를 오늘 기준 병합·프루닝, 임박 8개. `.meta`가 프레임→게이트 판정을 나르므로 §6-4 렌즈에 부합(숫자만 카드 아님). `#v-cal`서 이동 — 신규 클래스 0.
- **「오늘의 투자 명언」 스트립(2026-07-26 · `quote.js` 자가 마운트):** `#v-market` **첫 자식**(`.vhead` 위 = nav 바로 아래)에 `#mktQuote` 스트립을 끼운다(index.html 무편집 · 로더=changelog.js). 면 규약 = `--panel`+`1px --line`·**radius 3px 직접 지정**(§3). 명언 15px/600(`--txt`·따옴표 장식 `--dawn`) · 출처·레짐 칩 mono 12px `--faint`(§2 하한). 레짐 워드만 등락색 규약 준용 — 공포=하락측 청(`--st-accel`)·과열=상승측 적(`--st-hot`)·중립 무채(`--dim`), 기능색 `--st-*` 단계 의미로 쓰지 않는다. 클릭=같은 레짐 풀 안 랜덤 교체. ≤600px에서 칩은 줄바꿈 full-width. 신규 `:root` 토큰·전역 클래스 0(`<style id="quote-css">` 스코프).
- **「다가오는 일정」 운영자 오버레이(2026-07-26):** 카드 롱프레스(600ms) → 우상단 `.now-del`(중립 칩 — `--panel2`/`--line2` · 기능색 미사용, §5 혼용 금지 준수), 그리드 막내 `.now-add`(점선 타일 · hover `--dawn`) → `#calEvModal`(`.cev-*` — `--panel` 시트 · 필드 `--panel2` · 주 버튼 `--dawn`/`--onacc` · 폼 14px·메타 12px §2 하한 준수). 카드에 `user-select:none`. 신규 `:root` 토큰·전역 클래스 0.

### 6-2. 카드 그리드

| 항목 | 값 |
|---|---|
| `.mkt-grid` | `repeat(auto-fill, minmax(224px, 1fr))` · gap 12px |
| `.mkt-card` | `--panel` + `1px --line` · padding `15px 16px` · min-height 128px · 실효 radius 3px |
| hover | `--line2` 테두리 + `0 4px 14px rgba(22,36,45,.06)` |
| 클릭형 | `.mkt-card-lk` — cursor pointer · `:active{translateY(1px)}` · focus-visible outline · 기간 라벨 뒤 `· 기사 →` 자동 접미 |
| 모바일 | `@media(max-width:600px)` → `repeat(2,1fr)` |

### 6-3. 카드 내부 순서 (고정)

```
.mkt-nm    종목·지표명            15px/700 --txt
.mkt-lens  렌즈 2줄 (핵심)        14px  (칩 .l1 b = mono 12px)
.mkt-val   값                    mono 17px/700
.mkt-chg   등락(6개월)           14px/600 · up=--st-hot / dn=--st-accel
.mkt-dod   전일대비              mono 12px/600 · `전일 ` 접두(--faint) · up=--st-hot / dn=--st-accel · 값 옆 병기
.mkt-chart 그래프 래퍼           position:relative · padding-top:28px · **margin-top:auto**(카드 간 그래프 하단 정렬=수평 위치 일치)
 └ .spark  스파크라인            height 54px, width 100%
 └ .spv    끝점 수치 오버레이     mono 11px/600 --dim · 실제 끝점 y에 붙여 그 **위**에 표기(X축 아님) · 좌=.spv-s / 우=.spv-e · **배경 투명**(선 안 가림) · margin-top:-8px로 끝점에서 **더 띄움**(선 겹침 회피, halo 대신 여백) · 수치 포맷 = **fmtNum**(≥10 정수 콤마·<10 1자리, 종목 뉴스 fv와 동일). **헤더 .mkt-val 은 정밀값 유지**(그래프 라벨만 fmtNum)
.mkt-axis  X축 날짜              mono 11px · 좌=시작일 / 우=마지막일 (.ax-dt=--dim/600) · space-between
.mkt-span  기간 라벨             mono 12px --faint
```

> **.mkt-card = flex column.** 위(이름·값·렌즈)는 상단, `.mkt-chart`부터는 `margin-top:auto`로 하단에 붙어 렌즈 줄 수가 달라도 **카드 간 그래프 세로 위치가 일치**한다.
> **끝점 수치는 그래프 위(`.spv`)**, **날짜는 X축(`.mkt-axis`)** — 값과 날짜의 자리를 분리한다.

### 6-3-1. 통합 지표 카드 재정렬

「지표」는 VIX·CNN F&G·원/달러·한국 반도체 수출·미국 NFP를 포함한 단일 `.mkt-grid`다. 한국 반도체 수출도 공통 카드 순서인 `이름 → 값·변화 → 렌즈 2줄 → .mkt-chart → 출처`를 따르며, 판정 멘트는 그래프 위에 두고 그래프는 카드 하단에 정렬한다. VIX·원/달러의 3Y 선택은 `market_history.json`의 최근 3년 거래일 관측치를 실제 날짜로 자르고 스파크라인·시작/끝 날짜·툴팁을 표시한다. 실시간 값은 같은 날짜의 백필보다 우선한다. NFP의 6M 선택은 양수·음수를 0선 기준 막대로 표시하고, 그 외 기간은 선 그래프를 유지한다. NFP의 3Y 선택은 최근 36개 월별 증감 관측치를 모두 표시하며, 실시간 FRED 실패 시 동일 BLS 계열의 `nfp.json` 백필을 사용한다. 데스크톱(701px+)에서 카드 전체를 드래그하면 **자유 좌표가 아니라 고정 그리드 슬롯 순서**를 교환하며, 축별 `data-indicator-key`/id 순서를 `localStorage` `am_market_indicator_order_v1`에 저장한다. 드래그 중에는 반투명·윤곽선 피드백만 사용하고 신규 토큰을 만들지 않는다. 모바일(700px 이하)은 `draggable=false`로 두어 스크롤을 방해하지 않는다. 동적으로 들어오는 게이지·반도체 카드도 같은 순서 상태에 합류한다.

### 6-4. **렌즈 2줄** — 알파맵의 정보 규약 (가장 중요)

모든 그래프·카드 **위**에 「이 그림이 무엇을 판정하는가」를 2줄로 못 박는다. 숫자만 던지는 카드는 만들지 않는다.

- `.l1` = **이 그래프가 판정하는 프레임** (`--txt`/600) + 앞머리 `<b>` 칩(mono 10px, `--panel2` 배경 + `--line` 테두리, radius 6px) — 예: `L3 · 가속`, `게이트 · 깊이축`
- `.l2` = **라이브 수치 → 판정** (`--faint`) — 예: `γ 0.86 · 고점 −7% · 평단 +41% → 논제 유지, 가격시계 과열`
- 판정 색: `.ok`(`--st-dawn`, 정상·양호) · `.wn`(`--st-hot`, 경고·과열) · `.nt`(`--st-mature`, 중립·보류)
- **두 시계 분리를 UI에서도 지킨다:** l1=논제 시계(레이어·stage·γ·목표가) / l2 후단=가격 시계(고점 대비·평단 대비).

### 6-5. 리스트·블록

| 컴포넌트 | 규칙 |
|---|---|
| `.nlist` / `.nrow` | `--line` 배경 + gap 1px = **헤어라인 구분선**. 행 hover `--panel2`. 티커 `.ntk`(mono 11px `--dawn`, 54px 고정) · 날짜 `.ndt`(40px) |
| `.stk-blk` | 종목 블록 = `.stk-hd`(`--panel2` 머리) + `.stk-sum`(요약) + `.arow`×N(기사) + `.amore`(더보기) |
| **종목 순서** | **보유 종목 뉴스 블록 = `holdings.json` `detail[].w`(보유 비중) 내림차순.** `byHeld()`가 렌더 시점에 재정렬 — digest 원순서·크론 재생성과 무관. 미보유는 비중0으로 원순서 유지(안정 정렬) → 워치리스트·기타 그룹 보존 |
| `.arow` | `.adt`(날짜 40px) + `.asum`(내용 12.5px/600) + `.aimp`(의미·영향 — `.aar` 화살표 `--dawn`/700) |
| **`.arow .anew` (NEW 배지)** | 최근 3일(72h · `isNewDt`) + 미열람 기사 우상단 `NEW` 부표. **pill 20px**(§3) · `--dawn`/`--onacc`(mono 700 11px) — 단계색 `--st-*` 금지(신선도 큐). **3초 호버 or 클릭**(`dismissNew`)→`NEWSEEN`(localStorage `am_news_seen_v1`·키=link) 영속. `#mktDigest` 위임. 신규 `:root` 토큰 0 |
| `.stk-body` | 좌 `.stk-left`(62%) / 우 `.stk-chart`(36%, 좌측 보더 · `justify-content:flex-start` = **상단 정렬**, 카드 최상단부터 그래프 배치). 차트 열 = `.stk-cv`(캔버스) 단독. **캔버스는 190px 고정**(`.stk-cv{flex:0 0 190px}`) — 기사 수에 따라 늘어나지 않는다(종목 간 그래프 높이 통일). `@media(max-width:700px)` → 세로 스택, 캔버스 150px 고정 |
| 차트 값 오버레이 | `dr()`가 캔버스 내부에 직접 그린다. **처음·마지막 값은 각 끝점에 붙여 위/아래**(`lblY()` — 상단 근접이면 아래 `+12`, 아니면 위 `−5`로 캔버스 밖 클리핑 방지) · `fv()`·`bold`·라인 색. 처음=시작점 좌(left-align x=6) / 마지막=끝점 우(right-align w−6). **모든 캔버스 텍스트 라벨은 `halo()` (흰 외곽선 `lineWidth 3` → 채움)로 그려 라인 위에 겹쳐도 읽힌다** — 끝점 값·호버 툴팁·평단 공통(빨/청 라인 위 같은 색 글씨가 묻히는 문제 방지). **기간별 증감률(%·N일)은 좌상단**(라인 색). **하단 눈금줄(`H−4`)엔 시작·끝 날짜만**(`fd()`·`#868e96`) — 창이 여러 해에 걸치면(`spanYr`) `YY-MM-DD`, 한 해 안이면 `MM-DD`(호버 툴팁 공통). **수치 포맷 `fv()` = 10 미만 소수 1자리 / 10 이상 정수(콤마)** — 처음·마지막·호버·평단 공통. Ctrl+휠·호버 시 창과 함께 동기 갱신. 라인 색 = 상승 `--st-hot` / 하락 `--st-accel`. **Ctrl+휠 안내 텍스트는 두지 않는다**(기능은 유지) |
| ↳ 중간 고점 MDD | 창 내부(첫·끝 아닌)에 최고가 + 현재가 고점 대비 1%+ 밀림(`mxi>0&&mxi<k-1&&dd≤−1`) → 고점 점 + `고점 {정수} ({정수%})`(소수점 없음·`--st-accel`·`halo`·점 아래 +12·좌우 클램프). 낙폭(MDD)=`Math.round((v[k-1]/mx−1)*100)`(가격 시계). 호버 중 숨김(평단·툴팁 양보) |
| 노이즈 | `.arow.is-noise` → 회색·비굵게(표시는 하되 눌러 둔다) |
| **매크로 토픽 초기 배치** | 저장 좌표가 없는 첫 렌더만 12px 간격의 2열 시작 위치를 계산한다. 이후 DOM 순서·그리드 슬롯에 맞추지 않고 각 카드의 자유 좌표를 사용한다. 700px 이하는 1열 시작 위치와 카드 폭 100%를 사용한다. 빈 상태 `.mkt-ph`는 정적 흐름으로 표시한다. |
| **매크로 토픽 자유 배치** | 토픽 블록은 기본 접힘(`.is-collapsed`)이며 헤더 클릭 또는 Enter/Space로 펼친다(`aria-expanded`). `#mktMacroNews`는 `position:relative`, 카드는 절대 좌표로 배치한다. 헤더를 포인터로 드래그하면 카드별 `x/y`가 연속 이동하며 축 키별 좌표를 `localStorage` `am_topic_radar_positions_v1`에 저장한다. 빈 공간·카드 사이·겹침 위치 모두 허용하고 선택 카드는 최상단으로 올린다. 보드 높이는 카드 최하단에 맞춰 자동 확장하며, 리사이즈 때 가로 좌표를 비율 보정·경계 안으로 제한한다. 700px 이하는 카드 폭 100%·드래그 비활성(`touch-action:auto`)이며 기존 저장 좌표를 1열로 표시한다. 모바일 헤더 탭은 펼침·접힘만 수행하고 이동 핸들 `↕`는 숨긴다. 데스크톱에서만 `↕`를 이동 핸들로 표시하며 `＋/−`는 양쪽 모두 상태 표시다. 동일 의미의 CAPEX 축(영문 `capex`, 한글 캐펙스·캐팩스·케펙스·케팩스, 자본지출·AI 지출, 고정축 `bn_capex`)은 대표키 `capex` 한 카드로 합쳐 중복 면을 만들지 않는다. 헤더를 600ms 롱프레스하면 `삭제` 버튼(`.stk-topic-del`, 12px·radius 3px·경고 기능색)이 나타나며 4px 이상 이동하면 롱프레스를 취소한다. 삭제 버튼을 누르지 않고 카드 헤더를 다시 누르거나 Enter/Space로 펼침·접힘하면 모든 삭제 버튼을 즉시 숨긴다. 삭제된 축 키는 `am_topic_radar_hidden_v1`에 저장해 재렌더·새로고침에서도 숨긴다. 카드 분류는 검색 유입축보다 명시적 내용 규칙이 우선하며, `CXMT|창신메모리|창신반도체|Kimi K3|Moonshot|DeepSeek|중국 AI` 기사·요약은 항상 `china` 카드에 렌더한다. `china` 카드는 한 번만 기존 숨김 상태를 해제해 복원하고(복원 뒤 재삭제는 유지), 표시명은 「중국 AI 부상·반도체 수출통제」로 고정하며 최신 12건을 보여준다. |
| **매크로 기사 행 = `.arow`(종목 뉴스와 동일)** | 관련 기사 개별 기사도 종목 뉴스처럼 **`.arow`**로 그린다 — `.adt`(일자) + `.atx`(`.asum` 요약 `a` + `.aimp` `→` 의미 `w`). 구 `.nrow`(날짜+제목) 폐기. **신규 클래스·토큰 0**(기존 `.arow` 재사용 → check-docs 무영향). `.nlist` 래퍼 없이 `.stk-sum` 아래 `.arow`를 직접 나열(각 행 `border-top`이 헤어라인 구분). `a`가 없는 기사는 제목으로 폴백(요약 데이터가 다음 크론에 채워지기 전까지) |

### 6-6. 빈 상태 (필수)

데이터가 없을 때 **빈 화면을 두지 않는다.** `.mkt-ph`(인라인 12px `--faint` 중앙) 또는 `.mkt-ph-box`(점선 `--line2` 박스)로 **왜 비었는지**를 적는다 — `지수 수집 대기`, `스키마 확정 대기`, `로딩…`. 「대기 사유」가 곧 운영 로그다.

대기 중에도 **렌즈 l1 은 남긴다**(WTI 표준: l2 만 `수집 대기 → 판정 보류`). 요약이 없으면 `.stk-sum.ph` 로 대기 사유를 적는다.

---

## 7. 신규 메뉴 체크리스트 (이대로 하면 01과 결이 맞는다)

1. `nav`에 `.tab[data-v="{key}"]` 추가(번호 `<span class="n">`) → `section.view#v-{key}` 생성.
2. `.vhead` = `.vkick`(영문·한글 병기) + `.vtitle`(강조어만 `<em>`) [+ `.vsub` 필요 시].
3. 우상단 `.updstamp.abs` 배치 → 자동 데이터면 파일 `asOf`, 정적이면 `VIEW_UPDATED` 연동(§OPS).
4. 섹션은 `h2.msec` + `.mnote`(조건) 리듬으로 끊는다.
5. 요약 카드는 `.mkt-grid` + `.mkt-card` 복제 — **새 그리드/카드 클래스를 만들지 않는다.**
6. 모든 그래프·카드 위에 **렌즈 2줄**(§6-4). 숫자만 있는 카드 금지.
7. 색은 토큰만. 등락은 적=상승·청=하락. 단계는 `--st-*`.
8. 새 면(面) 컴포넌트면 해도 **3px 셀렉터 목록에 추가**(§3).
9. 빈 상태 문구 필수(§6-6).
10. 모바일 600/700 브레이크포인트 확인 → 가로 스크롤 0.
11. **글자 크기는 §2 하한을 지킨다(읽는 글·폼 14px · 메타 12px · 12px 미만 금지).** UI/CSS를 건드렸으면 **`node scripts/check-docs.mjs` 통과** + 이 문서 **맨 위 「최종 갱신: YYYY-MM-DD HH:MM (KST)」 갱신** + 갱신 이력 한 줄.

---

## 8. 원복 경로

`index.html`의 `<link rel="stylesheet" href="/pantone.css">` 한 줄을 지우면 해도(海圖) 테마 원본으로 돌아간다. 레이아웃·radius·타이포는 팬튼이 건드리지 않는다(색만 교체).

---

## 갱신 이력

- 2026-07-30 14:40 · **02 인사이트 찾기 주요 문서 첨부 인식 정상화.** 인테이크 드롭존 카피를 「PDF·Word·PowerPoint·Excel·HWPX·TXT·이미지」로 확장하고 숨김 file input의 `accept`를 DOCX·PPTX·XLSX/XLS/XLSM/XLSB·RTF·HTML/XML·ODT/ODS/ODP·HWPX·EML·TSV/YAML/자막까지 맞췄다. 형식별 전용 추출로 바이너리 노출을 차단하고, 이미지형 PPTX는 기존 Tesseract 진행 상태줄(`.ins-msg`)로 슬라이드 OCR 진행을 표시한다. 파일당 25MB·분석 입력 120,000자 컷과 구형/암호화 문서 안내도 같은 기존 상태줄로 전달한다. **신규 DOM 컴포넌트·CSS 클래스·`:root` 토큰 0** — 기존 `.ins-drop`·`.ins-msg`·`.ins-ta`·14px 폼 하한·radius 규약 불변. 실제 DOCX/PPTX·XLSX·HWPX·HTML·RTF 스모크와 `node --check`·`check-docs` 통과. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-30 14:47 · **04 AI 수요·공급 로드맵 ③ Meta 행 수치·설명 갱신.** 기존 `ds-mtx`·`ds-rev`·`ds-yrp` 구조와 상향 기능색을 그대로 사용해 2026E 범위·리비전, 2027E 상향 방향, BlackRock·El Paso 1GW 벤처와 Hyperion 5GW 공원 목표를 반영했다. **신규 `:root` 토큰·CSS 클래스·레이아웃 변경 0** — TOKENS·본문/메타 크기·면 규약 불변. (OPS §3·§9 동반)
- 2026-07-29 23:35 · **화면별 주가그래프 기본 기간 분리.** 01 시장 모니터링의 공통 `RG`와 종목 뉴스 미니차트 초기 창은 6M(126거래일)으로 복원하고, 04 시장과 실적 전망 Value Chain 종목 칩은 별도 `hover-chart.js`의 1Y 일봉을 유지. 01 기간 버튼·Ctrl+휠·04 호버 차트 컴포넌트·토큰은 불변. (OPS §3·§9 동반)
- 2026-07-29 23:16 · **주가그래프 기본 기간 1Y.** 01 시장 모니터링 공통 기간 상태(`RG`)와 종목 뉴스 미니차트 초기 창을 6M(126거래일)→1Y(252거래일)로 변경. 기간 버튼·Ctrl+휠·5Y 데이터·차트 컴포넌트·토큰은 불변. (OPS §3·§9 동반)
- 2026-07-29 19:21 · **03 전문가 원탁 알파맵 기본 컨텍스트 상태 안내(`council-context.js` 자가 마운트).** 「현 상황」 입력(`#clCtx`) 아래에 `#clAutoCtxStatus`를 삽입해 자산·01 시장·02 인사이트·04 시장/실적 전망을 토론 시작 시 최신 갱신한다는 사실과 수집 진행/완료/부분 실패를 표시한다. 기존 `.cl-note`만 재사용하고 실패색도 기존 `--st-hot`·`--dim` 토큰을 사용한다. **신규 `:root` 토큰·CSS 클래스·index.html 편집 0** — 본문·메타 크기와 면 규약 무변. TOKENS 무변·`node --check` 통과·jsdom 컨텍스트 결합/상태 안내 스모크 10/10. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-29 18:54 · **03 전문가 원탁 「분석 자료」 업로드 UI(`council-material.js` 자가 마운트).** 「토론 주제」 위에 `#clMaterial`을 삽입하고 기존 `.msec`/`.mnote`/`.cl-drop`/`.cl-blk`/`.cl-chip`/`.cl-note`/`.cl-btn`만 재사용한다. 드롭존은 클릭·드래그와 Enter/Space를 지원하고, 파일별 형식·이름·추출 글자수·오류·삭제를 목록으로 표시한다. 리포트에는 기존 `.cl-note`·`.cl-chip`으로 사용 자료를 표시하며 전문가 발언·기존 `.cl-*` 음성 플레이어는 무변경. PDF.js·JSZip·Mammoth는 해당 형식 업로드 시에만 지연 로드한다. **신규 `:root` 토큰·CSS 클래스·index.html 편집 0** — 면 radius 3px·본문 14px·메타 12px 규약 유지. TOKENS 무변·`node --check` 통과·jsdom 업로드→`material` 요청 스모크 8/8. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-29 10:40 · **03 전문가 원탁 음성 토론 HiFi 전환(Google AI Studio Gemini TTS).** `council-audio.js`는 새 플레이어를 만들지 않고 기존 `.cl-play`/`.cl-psheet`/`.cl-pmsg`/`.cl-pbub`/`.cl-pcall`/`.cl-ptype` 구조와 `window.COUNCIL.playReport`를 재사용한다. 원탁 버튼은 캡처 단계에서 가로채 DOM의 발언 순서를 복원하고, 서버가 반환한 단일 WAV의 발언 시작 시각에 맞춰 기존 말풍선 강조 상태를 동기화한다. 1인 심층 자문도 같은 HiFi 경로를 사용하며 실패 시 기존 브라우저 TTS로 폴백한다. **신규 `:root` 토큰·CSS 클래스·index.html 편집 0** — worker의 `<script defer>` 자가 마운트만 추가. 면 radius 3px·부표 20px·본문 14px·메타 12px 규약 유지. TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 스모크 23/23. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-29 08:05 · **02 관점 후속 상태 배지.** 등급 배지(`.ins-gr`) 바로 뒤에 별도 pill `.ins-lcs`를 배치해 `승격 대기`·`발동 대기`·`발동`·`유지`·`만료`를 표시한다. 상태색은 기존 기능 토큰만 재사용(wait=`--st-mature`, active=`--st-hot`, keep=`--st-dawn`, dormant/expired=`--faint`)하고 만료는 취소선으로 구분한다. 라이프사이클 모달은 기존 `.ins-lc-chip`을 재사용해 상태를 선택한다. **신규 `:root` 토큰 0**, 메타 12px·pill radius 20px 규약 준수. (OPS §3·§9 동반)
- 2026-07-29 · **02 인사이트 「사이트 반영」 모달에 「🚀 지금 반영」(완전 자동 직접 커밋) 추가.** SimpleorNothing 지시(narrative≠numbers 수기 검증 원칙에 대한 명시적 예외 승인). `applyModal`의 카드마다 상태줄 `.ins-ap-st`(신규·mono 12px·`--dim`)를 붙이고, 기존 「📋 반영 지시 복사」 버튼 앞에 primary 버튼 「🚀 지금 반영」을 추가(기존 `.ins-btn primary` 재사용) — 클릭 시 `/api/site-apply`(worker 신설, Claude가 패치 계산 후 GitHub에 직접 PUT)를 카드마다 호출하고 결과를 그 자리 상태줄에 표시(✅반영됨/—변경없음/❌실패). **신규 `:root` 토큰 0**(`.ins-ap-st`는 `--dim`/`--mono` 재사용) → TOKENS 무변·`check-docs` 통과·`node --check` 통과. 복사 버튼은 수동 폴백으로 유지. (OPS §3·§9 동반)

- 2026-07-28 · **02 인사이트 「사이트 반영」 — 관점이 표시 전용 보드와 겹치면 「🔗 반영하기」.** SimpleorNothing 지시(구글 2Q26 RPO → 사이클 판별 보드 ①수주잔고 자동 감지). 관점 추출·저장목록 행에서 `gates.json`·`risk.json`의 `keys`/`xkeys`로 매칭 → 버튼 `.ins-apply`(`--dawn` 테두리·처리분 `.done`=`--line2`/`--dim`). 모달은 **라이프사이클 모달(`.ins-lc-ov`/`.ins-lc-sheet`/`.ins-lc-hd`/`.ins-lc-ti`/`.ins-lc-x`/`.ins-lc-bd`/`.ins-lc-ft`/`.ins-lc-note`) 전면 재사용** + 신규 `.ins-ap-card`/`.ins-ap-h`/`.ins-ap-f`(mono 11px 파일명)/`.ins-ap-v`/`.ins-ap-g`/`.ins-ap-note`/`.ins-ap-ta`(대상 카드·현재 게이지·「반영 지시」 복사 textarea). **신규 `:root` 토큰 0**(`--dawn`/`--dim`/`--line`/`--line2`/`--faint`/`--mono`/`--panel2`/`--txt` 재사용) → TOKENS 무변·`check-docs` 통과(토큰 24종·폰트 v1.3.9)·`node --check` 통과·매처 스모크(구글 RPO→①수주잔고 매칭·수출통제 `xkeys` 배제·수치 없는 관점 무매칭·양보드 교차). 면 radius 3px·본문 13~15px·라벨 mono 11~12px(§2 하한·§3 면 결). **자동 write 없음** — 반영은 수기 PR(OPS §6). narrative≠numbers. (OPS §3·§9 동반)

- 2026-07-28 23:12 · **01 리스크·사이클 카드 롱프레스 삭제.** 카드 빈 영역 600ms 정지→우상단 삭제, 4px 이동 취소, 다른 카드·상세 버튼 동작 시 해제. 보드별 숨김 id를 localStorage에 영속하고 원본 JSON은 보존. 토픽 카드 조작 규약·12px/radius 3px 경고 버튼 재사용, 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 22:46 · **01 리스크·사이클 판별 카드 상시 본문 절반 축약.** 제목·상태·렌즈·게이지만 상시 표시하고 조건·리드스루·기사·근거는 하단 호버/포커스/탭 오버레이로 이동. 최대 68vh 내부 스크롤·단일 카드 탭 전개·ARIA expanded 적용. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 22:32 · **01 통합 지표 그리드·NFP·고정 슬롯 드래그.** 게이지 4종과 반도체 수출을 기존 지표 카드에 합치고 총수출·무역수지를 제거. NFP는 PAYEMS 월간 차분을 기존 스파크라인·렌즈 2줄 규약으로 표시. 701px+ 카드 드래그 순서를 로컬 저장하고 모바일은 비활성. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)
- 2026-07-28 21:05 · **추정 리비전 트래커 TSLA 행 추가.** gamma.json에 테슬라의 라이브 TP·FY+1 EPS·30/90일 리비전·애널 상하향·주가 변화·강등 게이트를 추가하고 트래커/RAER 표시명을 「테슬라」로 연결. 현금 포함 기대수익 점수 상대 행은 14→15. 기존 표 결·정렬·토큰 불변. SimpleorNothing 지시. (OPS §3·§9)
- 2026-07-28 20:58 · **삭제된 중국 AI 토픽 복구·내용 확대.** china 숨김 상태를 버전 마이그레이션으로 1회 해제해 카드를 복원하고 표시명을 「중국 AI 부상·반도체 수출통제」로 확정. CXMT·Kimi K3·Moonshot·DeepSeek·중국 AI 내용은 관세 유입축보다 china 우선이며 최신 12건을 표시한다. 복원 후 사용자 재삭제·자유 배치·모바일 드래그 비활성은 유지. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)
- 2026-07-28 18:42 · **토픽 삭제 버튼 자동 해제.** 롱프레스로 삭제 버튼이 나타난 뒤 실제 삭제 대신 다른 카드 헤더를 누르거나 키보드 Enter/Space로 펼침·접힘하면 모든 `show-delete` 상태를 즉시 제거한다. 삭제 확인·자유 배치·모바일 드래그 비활성은 불변. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)
- 2026-07-28 18:28 · **토픽 레이더 CXMT 내용축 교정.** 관세 검색으로 유입된 CXMT 기사 5건과 CXMT 다이제스트 요약을 내용 우선 규칙으로 `china` 카드에 이동. 카드 외형·자유 배치·접힘·롱프레스 삭제는 불변이며, 기존 `china` 카드 좌표를 그대로 사용한다. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 18:22 · **토픽 레이더 롱프레스 삭제.** 카드 헤더를 600ms 누르면 12px `삭제` 버튼(`.stk-topic-del`, radius 3px·`--st-hot`)을 노출하고 4px 이상 이동 시 취소해 데스크톱 드래그·모바일 스크롤과 충돌 방지. 확인 후 축 키를 `am_topic_radar_hidden_v1`에 저장해 재렌더·새로고침에서도 숨기고 위치 좌표에서도 제거. 짧은 탭 펼침·접힘, 데스크톱 자유 배치, 모바일 이동 비활성은 유지. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 18:15 · **01 「채택한 일정 관점」 항목별 삭제 버튼.** 각 `.ins-si` 우측에 12px `삭제` 면 버튼(`.ins-strip-del`, radius 3px·기존 토큰)을 추가. 확인 후 해당 일정 claim만 제거하고 다른 관점은 보존하며, 마지막 claim이 사라진 빈 자료만 함께 정리한다. `persist()`로 로컬+R2 동시 반영. `insight.js/css` 캐시 버전 갱신. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 18:08 · **토픽 레이더 모바일 드래그 비활성.** 700px 이하에서 카드·헤더 `touch-action:auto`, 이동 커서 제거, `↕` 핸들 숨김. 모바일 포인터는 좌표 드래그 경로에 진입하지 않고 일반 click으로 펼침·접힘만 수행한다. 데스크톱 자유 배치·저장 좌표·키보드 접근성은 불변. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 18:03 · **01 토픽 레이더 동일 CAPEX 카드 병합.** 영문/한글 CAPEX 표기 변형과 고정 병목축 `bn_capex`를 대표키 `capex`로 환원해 중복 카드를 하나로 통합. 자유 배치 좌표는 대표 카드의 `capex` 키를 사용하고 사라진 중복 키 좌표는 렌더하지 않는다. 다른 병목축·카드 디자인·접힘·드래그 규칙은 불변. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 17:45 · **01 토픽 레이더 순서형 드래그→화이트보드식 자유 배치.** 2열 CSS Grid/HTML5 drop 순서 교환을 상대 보드+절대 카드 좌표와 Pointer Events로 교체. 카드별 `x/y/bw/cw`를 `am_topic_radar_positions_v1`에 저장해 빈 공간·사이·겹침 위치를 유지하고, 드래그 중 보드 높이 자동 확장·선택 카드 z-index 상승·리사이즈 가로 비율 보정·모바일 경계 제한을 적용. 기본 접힘·클릭/키보드 펼침·기사 링크는 유지. 신규 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 17:28 · **01 토픽 레이더 기본 접힘 + 헤더 클릭 펼침 + 마우스 드래그 순서 변경.** 축 키 기반 `localStorage` 영속, 새 축 안정 합류, 키보드(Enter/Space)·`aria-expanded` 지원. 헤더에 기존 토큰 기반 `↕`·`＋/−` 상태 표시, 드래그 피드백 추가. 신규 `:root` 토큰 0. SimpleorNothing 지시. (OPS §3·§9)

- 2026-07-28 15:28 · **`#calFull` 동일 날짜 반복 표기 제거.** `renderCalFull()`이 정렬된 이벤트의 직전 `d`를 기억해, 같은 날짜 묶음은 첫 행에만 날짜·D-N을 표시하고 후속 행은 동일 폭의 빈 `.date-chip[aria-hidden]`을 렌더. 이벤트 제목·시간·분류점·행 정렬은 유지하며 날짜가 바뀌면 다시 표시. 데이터·토큰 불변. (OPS §9 동반)
- 2026-07-28 13:47 · **`#calFull` 동적 이벤트 행 grid→flex 강제 전환.** 배포 성공·no-store 확인 후에도 Chromium 760px 전후에서 grid 3열의 본문 트랙이 1글자 폭으로 붕괴하는 실화면 재현이 남아, 동적 구역만 날짜 78px(≤760:70px)·점 9px 고정 flex + 본문 `flex:1 1 0;min-width:0`으로 교체. ≤640px는 기존 block 스택을 고특이도 규칙으로 보존. 정적 타임라인·데이터·토큰 불변. (OPS §9 동반)
- 2026-07-28 12:58 · **전체 캘린더 가독성 복구 + META·AMZN·AAPL 확정 실적 일정.** `#calFull`과 `.cal-row`에 `width:100%`·`min-width:0`, 본문 열에 `minmax(0,1fr)`, `.cal-body`에 keep-all/안전 줄바꿈을 적용해 한 글자 단위 세로 줄바꿈을 제거. 정적 7월 클러스터와 `calendar.json`에 Meta 7/30 05:30 KST·Amazon/Apple 7/31 06:00 KST를 회사 IR 확정 일정으로 추가. 모바일 기존 block 전환·토큰 불변. (OPS §9 동반)
- 2026-07-28 08:50 · **02 aisd ③ 차트 라벨 자동 충돌 방지.** 연도별 라벨 큐를 도입해 매출·성장률·CAPEX·영업이익·FCF 수치 사이에 최소 22px 간격을 강제하고, 원래 점에서 13px 이상 이동한 라벨에는 토큰 기반 연결선을 표시. 340px 모바일·420px 기본 높이 좌표 스모크로 전 연도 무충돌 확인. `worker.js` 주입 캐시 버전 갱신. 데이터·원형 마커·툴팁·토글·ResizeObserver 불변, 신규 토큰 0. (OPS §9 동반)
- 2026-07-27 23:57 · **02 aisd ③ 온차트 수치 가독성 개선.** 매출·CAPEX·영업이익·FCF 라벨에 패널색 불투명 배경과 굵은 글씨를 적용하고, 영업이익은 점 위쪽·FCF는 아래쪽 전용 레인으로 분리해 근접 값의 겹침을 방지. CSS 픽셀+DPR Canvas·원형 마커·툴팁·토글·반응형 동작 불변. 신규 토큰 0. (OPS §9 동반)
- 2026-07-27 23:40 · **02 aisd ③ 하이퍼스케일러 재무 데이터 전면 재산정.** 2023~25는 AMZN·GOOGL·MSFT(FY6월)·META 공시/Yahoo 연간치 합산, 26E는 S&P Global 컨센서스·회사 CAPEX 가이던스, 27~28E는 전망으로 명시 분리. 매출 `$1.229T→$1.398T(+14%)→$1.602T(+15%)→$1.904T(+19%)→$2.224T(+17%)→$2.511T(+13%)`; CAPEX·FCF·영업이익·회사별 CAPEX와 렌즈·트랙·툴팁 동기화. Canvas 단일 $축 상한 $2.65T, 원형 마커·토글 불변. (OPS §9 동반)

- 2026-07-27 21:00 · **02 aisd ③ 차트 토글 순서.** 좌상단 시리즈 버튼을 정보 우선순위에 맞춰 `매출 → CAPEX → 영업이익 → FCF`로 재배열. 기능·데이터·색·토큰 불변. (OPS §9 동반)

- 2026-07-27 20:50 · **02 aisd ③ FCF·영업이익 온차트 수치·이익률 라벨.** FCF 2023~26E·영업이익 2023~27E 각 마커에 `$B (매출 대비 %)`를 함께 표기하고, 밀집 저점 구간은 영업이익 위/FCF 아래(0은 위)로 분리. 툴팁에도 동일 이익률 병기. 12px 메타 하한·시리즈 기능색·Canvas 원형 마커 유지, 신규 토큰·CSS 0. (OPS §9 동반)

- 2026-07-27 19:30 · **02 aisd ③ CAPEX·매출·FCF·영업이익 반응형 인터랙티브 차트.** `preserveAspectRatio="none"` SVG와 HTML 좌표 라벨을 실제 CSS 픽셀·devicePixelRatio 기준 Canvas 렌더로 교체 — 원형 마커 무왜곡, ResizeObserver 리사이즈, 포인터 호버·탭 툴팁, 4개 시리즈 토글. 단일 $축·실적 실선/추정 점선·기존 기능색·3px 면·12px 메타 하한 유지. worker.js의 aisd 주입 URL에 캐시 버전 추가, 신규 `:root` 토큰 0. (OPS §9 동반)`n

- 2026-07-27 14:10 · **02 aisd ③ 라인 값 라벨 규칙.** 스트레치 SVG(preserveAspectRatio:none) 내부 <text> 금지(글리프 왜곡) — 값 라벨은 컨테이너 기준 HTML 절대배치 span(left=cx/vbW%, top=cy/vbH%, translate(-50%,-130%))로. 폰트 mono 10px·시리즈 색 동일. 현재 매출 라인만 적용(밀집 시리즈는 트랙 행으로 충분). (OPS §9 동반)
- 2026-07-27 12:55 · **01 「사이클 판별 보드」(`gates.js` 자가 마운트 · `#gatesBoard` · 리스크 보드 다음).** §6 레퍼런스·리스크 보드 결 복제(`mkt-grid`/`mkt-card`·렌즈 2줄 §6-4·빈 상태 §6-6). 상태 배지 `.gt-st`(wn=`--st-hot`/nt=`--st-mature`/ok=`--st-dawn` · radius 20px §3) · 등락색 §4 · 본문 14px/메타 12px §2. **신규 `:root` 토큰·전역 클래스 0**(`gates-css` `#gatesBoard` 스코프 · `rk-*`→`gt-*`) → TOKENS 무변·check-docs 통과. index.html 무편집(`changelog.js` 로더 1개·신규 2파일만). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-27 13:20 · **02 aisd ③ 영업이익 라인 + 높이 1.5×.** 라인 3종 팔레트 확정: 매출=`--st-dawn`·FCF=`--st-hot`·영업이익=`--st-mature`(기존 전역 토큰만, 신규 0). 특정 차트만 키울 땐 공용 `.ds-bars` CSS 대신 인라인 height(255px) — `preserveAspectRatio:none` SVG는 좌표 재계산 없이 스트레치. 교차 서사(CAPEX>영업이익 역전)는 렌즈 ds-wn + 트랙 rtv로 이중 표기. (OPS §3·§9 동반)
- 2026-07-27 12:20 · **02 aisd ③ 차트 축 통일.** 이중 축(매출 독립) 폐지 — 한 차트의 막대·라인 전 시리즈는 단일 $축 원칙(운영자 지시). 스케일 1px=$14B(상한 ~$2.55T), 막대 height%=V/25.48로 라인과 픽셀 정합 · 교차 이벤트(2024 FCF≈CAPEX)는 막대 상단 접점으로 표현 · 축 표기는 ds-rtl·ds-fn에 명기. 토큰·클래스 무변. (OPS §3·§9 동반)
- 2026-07-27 · **02 aisd.js — ③ CAPEX 막대 차트에 매출·FCF 라인 오버레이(SVG 절대배치 · `ds-bars` `position:relative` 인라인).** 라인 규약 = 막대 실적·추정 규약의 라인 판: **실선=실적 · 점선(5 4)=추정** · 점 채움=실적/`--panel2`+색 테두리=추정. 색은 기능색만 재사용 — 매출 `--st-dawn`(ok) · FCF `--st-hot`(wn) · FCF ▼판정=등락색 하락 청(`--st-accel`). 축 2원화는 07-24 「3개 독립 축」 선례 계승 — 매출=독립 축·FCF=CAPEX 동일 $축(교차 시각화), 축 구분은 `ds-fn`·`ds-rtl`에 명기. 값 표기는 SVG 텍스트 금지(§2 12px 하한·`preserveAspectRatio:none` 왜곡) → `ds-rt` 값 트랙 2줄(범례 ━ 스와치=`ds-rtl` 안 인라인 span). 신규 `:root` 토큰·CSS 클래스 0(SVG 전부 인라인·기존 `ds-*` 재사용) → TOKENS 무변·check-docs 통과·node --check 통과·jsdom 스모크. (OPS §3·§9 동반)
- 2026-07-26 20:05 · **#v-cal 모바일(≤640px) 칩 행 2차 픽스 — grid·flex 폭 계산 제거, 블록 플로.** D-N 하이픈 꺾임·분류점 날짜 겹침(스크린샷) 해소. `.cal-row` block(`:not(.cal-past)` 폴드 보존) · 칩 inline · D-N `white-space:nowrap` · `.cat-dot` inline-block · 본문 full-width. 한 행 = 「날짜 D-N ●」+본문 2행 구조. 신규 토큰·클래스 0 → TOKENS 무변·check-docs 통과. SimpleorNothing 리포트. (OPS §9 동반)
- 2026-07-26 14:35 · **01 뷰 최상단 「오늘의 투자 명언」 스트립(`#mktQuote` · `quote.js` 자가 마운트).** §6-1에 위치·면(3px)·타이포(15px/12px 하한)·레짐 칩 색 규약(등락색 준용 — 공포 청·과열 적·중립 무채) 명문화. 신규 `:root` 토큰·전역 클래스 0 → TOKENS 무변·check-docs 통과. (OPS §3·§9 동반)
- 2026-07-26 12:40 · **#v-cal 모바일(≤640px) `.cal-row` 스택 레이아웃.** 3열 그리드 유지하되 `.cal-body`를 `grid-column:1/-1`로 내려 full-width, 날짜칩 좌정렬+D-N 인라인(`br` 숨김), 본문 폰트 상향(.ti 15.5px·.mt 14px·line-height 1.6), `word-break:keep-all`·`overflow-wrap:anywhere`. 데스크톱 무변·신규 토큰·클래스 0 → TOKENS 무변·check-docs 통과. SimpleorNothing 리포트(모바일 글자 세로 줄바꿈) 해소. (OPS §9 동반)
- 2026-07-26 11:30 · **#v-cal에 동적 「다가오는 이벤트」 구역(`#calFull`·`renderCalFull()`) 신설 — 01 8칸(`CAL_NOW_MAX`) 밖 먼 일정 표시.** 소스는 renderCalNow와 동일(`CAL_NOW`+실적무브+`CAL_OVR.added`)이되 8칸 컷 없이 월별 렌더. `#v-cal` 기존 클래스 재사용 → 신규 토큰·클래스 0·check-docs 통과·jsdom 9검사. SimpleorNothing 리포트(9월 일정 미표시) 해소. (OPS §3·§9 동반)
- 2026-07-26 05:45 · **01 「다가오는 일정」 운영자 오버레이 UI — 롱프레스 삭제 칩·「＋ 이벤트 추가」 점선 타일·입력 모달.** 전부 `#v-market` 스코프 CSS — 삭제 칩은 데이터 인코딩(`--cat-*`)·단계색과 분리된 중립 크롬, 모달은 기존 토큰만 사용. **신규 `:root` 토큰·전역 클래스 0** → TOKENS 무변·check-docs 통과. 카드에 `user-select:none`(롱프레스 오선택 방지). jsdom 스모크 10검사 통과. SimpleorNothing 지시. (OPS §3·§9 동반)
- 2026-07-26 · **01 지표 7번째 카드 「미국 가솔린」 추가.** §6 레퍼런스 복제 — `.mkt-card`+`card()`/`chart()`/`lens()` 재사용(`loadGas`/`lensGas`), 렌즈 2줄(l1=인플레·WTI 하류 / l2=$/gal·기간% → 판정), WTI 카드 바로 다음 배치. 표기 소수 2자리($/gal). **신규 `:root` 토큰·CSS 0** → TOKENS 무변·check-docs 통과. 등락색·기간버튼(RG) 규약 유지. 데이터=worker `/api/gasoline`(RB=F, `handleWti` 재사용). (OPS §3·§9 동반)
- 2026-07-25 14:20 · **01 「보유 종목」 스파크라인 삭제 → 「리스크 보드」(3축) 신설(`risk.js` 자가 마운트).** SimpleorNothing 지시. §6 레퍼런스 승계 — `h2.msec`+`.mnote` · `.mkt-grid`/`.mkt-card` 복제 · **렌즈 2줄**(§6-4) · 기사 행은 **`.arow` 재사용** · 빈 상태 문구(§6-6). 상태 배지 `.rk-st` = 부표 20px(§3), 색은 판정 기능색만(`--st-hot` 점등 · `--st-mature` 연기 · `--st-dawn` 반전 = `wn/nt/ok` 어휘 동일). 게이지 값 = 등락색 규약(§4) + `tabular-nums`. 면 `#riskLens` radius 3px 직접 지정. 그리드만 `minmax(300px,1fr)` 스코프 오버라이드(600px 이하 1열). §2 하한 준수(12px 미만 0). **신규 `:root` 토큰·전역 CSS 클래스 0** — `risk.js`가 `<style id="risk-css">` 주입·`#riskBoard`/`#riskLens` 스코프(brief.js 패턴), index.html·pantone.css·worker.js 무편집 → TOKENS 무변·check-docs 통과·jsdom 스모크 통과. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-24 00:30 · **02 aisd.js — ③ 「CAPEX 실현 검증」 3종을 `ds-rt` 텍스트 트랙 → `ds-bars` 막대차트 3개로 교체.** SimpleorNothing 지시(막대그래프化·2023~2028). CAPEX 막대와 동일 컴포넌트 재사용 — 각 지표(가속기 NVDA DC매출 $B·HBM 시장 $B·글로벌 DC전력 TWh)를 `ds-l1`(라벨+`ds-note` 단위/시계) + `ds-bars`(높이 인라인 118px) + `ds-bc`/`ds-bv`/`ds-bar(.est)` 6막대 + `ds-bx`(2023~2028E 연도축)로. 채운 막대=실적·`.est` 테두리=추정/보간(CAPEX 막대 규약 계승)·빈칸은 `ds-bar` 없이 `ds-bv` `—`만(빈 `ds-bc`는 `justify-content:flex-end`로 축에 정렬). 단위가 지표마다 달라 **3개 독립 축**(막대 높이=지표별 최대값 정규화). **신규 CSS 클래스·:root 토큰 0**(전부 기존 `ds-*` 재사용·높이만 인라인) → TOKENS 무변·`check-docs` 통과(토큰 24종)·`node --check` 통과·소스 스모크(ds-bc 18·ds-bars 3·빈칸 2). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-24 00:10 · **02 aisd.js — ③ CAPEX 리비전 트랙 아래 「CAPEX 실현 검증 — 3종 동행 지표」 트랙 추가.** SimpleorNothing 지시(CAPEX 외 파악 지표 — 가속기·메모리 시장규모 등). §6-1 레퍼런스 결 승계 — `ds-lens`(§6-4 렌즈 2줄 l1=프레임·l2=판정) + `ds-card` 면(3px) 안에 기존 `ds-rt`(리비전 트랙) 3줄: 가속기 L2(NVDA DC매출·명목$ 시계)·메모리 L3(HBM시장·비트·계약가·물량+가격 시계)·전력 L8(GW·PPA·커밋 실물 시계). 각 트랙은 `ds-rtl`(라벨·`<br>` 부제) + `ds-rts`(캡처값·`<i>` 시점) + `ds-rta`(→) + `ds-rev.up`(▲ 상향=`--st-hot`) + `ds-rtv.up`(판정), 하단 `ds-fn`. 렌즈 l2의 3층 표기는 기능색 재사용(가속기=`ds-ok`/`--st-dawn`·메모리=`ds-nt`/`--st-mature`·전력=`ds-wn`/`--st-hot`). **신규 CSS 클래스·:root 토큰 0**(전부 기존 `ds-*` 재사용) → TOKENS 무변·`check-docs` 통과(토큰 24종)·`node --check` 통과·소스 스모크(ds-rt 6개=리비전3+신규3·트랙 위치·문자열). narrative≠numbers — 시장규모 방향성 텍스트일 뿐 숫자 파일 불변. (OPS §3·§9 동반)
- 2026-07-21 22:29 · **02 AI 수요·공급 로드맵 ④에 「칩 제조사별 Capex」 표 추가(삼성·SK·마이크론·TSMC).** SimpleorNothing 지시(한경 07-20 기사 반영·칩 4사 구분). 신규 표는 §6-1 레퍼런스 결을 그대로 승계 — `ds-sec`+`ds-note` 헤더 · `ds-lens`(§6-4 렌즈 2줄 l1=프레임·l2=판정) · `ds-card` 면(3px) · `ds-mtx.plan` 표(기존 구성요소별 표와 동일 폭·모바일 ~2025 열 자동 숨김 상속). 회사 역할 구분은 `ds-co small`(메모리·파운드리) + `ds-lb.sem` 배지(L3·L2/L3/L2·L4)로 표기 — 등락 규약(상향 ▲=`--st-hot`=`.ds-rev.up`) 재사용. **신규 CSS 클래스·:root 토큰 0**(전부 기존 `ds-*` 재사용) → TOKENS 무변·`check-docs` 통과(토큰 24종)·`node --check` 통과·jsdom 스모크(4행+sumrow·셀 수·배지). narrative≠numbers — 발표·로드맵 텍스트일 뿐 숫자 파일 불변. (OPS §3·§9 동반)
- 2026-07-20 22:10 · **02 인사이트 찾기 헤더 정리 — 뷰 설명(`.vsub`) 하단 이동·인테이크 placeholder 힌트 삭제·시세/정보 스탬프 02 숨김.** SimpleorNothing 지시(스크린샷 3점). 뷰 부제 `.vsub`(15px `--dim`)를 `.vhead`에서 빼 **뷰 맨 아래**(`#insSigRest` 뒤·`.ins-wrap` 막내)로 옮기고 `border-top:1px solid var(--line)`로 구분 — 문단 내용·15px 규약 불변(§2 하한 유지 · `.vhead`는 이제 `.vkick`+`.vtitle`+`updIns`만). 인테이크 URL·본문·드롭 placeholder는 예시·힌트를 지우고 최소 라벨만(폼 14px 하한 §2 유지). 전 페이지 공통 `#asofBox`는 02에서만 숨김(`insight.js mount()` nav 리스너가 insight 탭일 때 `display:none` · 자가 마운트라 index.html 핸들러 뒤 등록 → 우선 · **index.html 무편집** · `#asofBox`가 `#v-insight`보다 앞이라 CSS `~` 불가). **신규 `:root` 토큰·CSS 클래스 0**(인라인 `var(--line)` 구분선만 · `insight.css` 무편집) → TOKENS 무변·`check-docs` 통과·`node --check` 통과. narrative≠numbers. (OPS §3·§9 동반)

- 2026-07-20 22:02 · **06 투자 캘린더(`#v-cal`) 「지나간 일정 접기」 복원 — orphan 됐던 `foldPastCal()` 재배선.** SimpleorNothing 지시(지난 일정 접고 클릭 시 펼침). 기능·CSS(`.cal-fold-bar`·`.cal-past{display:none}`·`.cal-open`)·헬퍼(`calChipEnd`/`calDDiff`)는 이미 있었으나 06 탭 삭제(2026-07-17) 때 호출부가 사라져 미동작이었음 → `.cal-jump` 위임 핸들러가 `#v-cal`을 열 때 `foldPastCal()` 호출(멱등 가드 있음). 오늘(KST) 기준 과거 행에 `.cal-past` 부여·기본 접힘, 「지나간 일정 N건 · 펼치기」 바 클릭 토글. **신규 `:root` 토큰·CSS·함수 0**(1줄 배선) → TOKENS 무변·check-docs 통과 · Playwright 스모크(과거 26건 접힘·6월 past·12월 미래·바 토글·pageerror 0) 통과. (OPS §9 동반)

- 2026-07-20 21:20 · **01 「다가오는 일정」 헤더 우측 「전체 캘린더 →」 링크(`.cal-jump`) — 삭제(nav 제외)된 06 투자 캘린더(`#v-cal`) 상세 타임라인 재연결.** SimpleorNothing 지시. `.msec` 우측 `--dawn`/`--mono` 링크 + v-cal 하단 「← 01」 역링크 · `document` 위임 핸들러로 `.tab`/`.view` 토글. 신규 `:root` 토큰 0 → check-docs 통과 · Playwright 스모크 통과. (OPS §9 동반)

- 2026-07-20 14:30 · **06 「대담 다시 굽기」 신뢰성 수정 — 대본만 새로 나오고 오디오는 옛것이던 문제 해소.** SimpleorNothing 리포트(대본은 새 순서인데 듣기는 기존 오디오). 원인 = 앞 버전이 재생 흐름에 얹혀 **part2 오디오는 재생 완료 후에야 굽히고**(끝까지 안 들으면 옛 WAV 잔존) **part1 굽기도 재생 중단으로 끊길 수 있어** 대본 캐시만 갱신되고 WAV 는 옛것이 남았다. 수정 = `regenDialogue()` 로 재생과 분리 — 대본(`part=1→2 regen`)·오디오(`brief-audio part=1,2 regen`)를 **순서대로 각 fetch 완주**(worker 가 R2 put 후 응답)시켜 두 파트 WAV 를 확실히 덮은 **뒤에야** 플레이어를 연다(캐시 우선). 버튼은 굽는 동안 「굽는 중…」·disabled. `openPlayer(regen)`/`regenPlay` 세션 플래그는 제거(더는 재생 경로가 regen 하지 않음) · `ensureAudio` 는 항상 캐시 우선. **신규 `:root` 토큰 0** · check-docs 통과 · node --check 통과 · DOM 스텁 스모크(대담 다시 굽기=대본 p1·2 + 오디오 p1·2 전부 regen=1 순차 · 듣기=regen 없음) 통과. narrative≠numbers. (OPS §3 동반)
- 2026-07-20 13:10 · **06 듣기 «대담 다시 굽기» 버튼 신설 — 대담(p1·2)·오디오만 강제 재생성(텍스트 「다시 만들기」와 분리).** SimpleorNothing 지시. 대담 대본·오디오 WAV 는 그날 최초 열람 때 한 번만 구워져 R2 캐시되고 이를 다시 굽는 UI 가 없었다(worker 프롬프트를 바꿔 배포해도 옛 순서 캐시가 그대로 재생됨). 상단 바에 `.br-btn`(기존 클래스 재사용·**신규 `:root` 토큰 0**) 버튼을 추가하고, `openPlayer(regen)` 세션 플래그 `regenPlay` 로 `api(1·2, true)`(대본)와 `audUrl(part,true)`(WAV) 에 `regen=1` 을 실어 강제 재생성한다 — 파트당 `aURL` 캐시가 재요청을 막아 이중 과금 없음. 비용(Claude 대담+Gemini TTS)이 드는 액션이라 텍스트 「다시 만들기」에 합치지 않고 **분리 버튼**으로 둔다. 부수로 `brListen.onclick = openPlayer`(이벤트 객체가 첫 인자로 넘어가 regen 이 항상 truthy 가 되던 잠재 버그)를 `openPlayer(false)` 래핑으로 수정. `brief.html`·`pantone.css`·index.html 무편집 → TOKENS 무변·`check-docs` 통과·`node --check` 통과. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-20 12:40 · **06 듣기 대담 = 텍스트 회차와 같은 7섹션 순서(대본 규약만·화면 무변).** SimpleorNothing 지시. 말풍선·플레이어·「2인 대담 · 약 5분」 라벨·배속·음소거 UI 는 **그대로**이고, 바뀐 건 `BRIEF_PART[1·2]` 대본 흐름뿐이다 — 듣기(음성)와 훑기(텍스트)가 **같은 순서를 말하도록** 맞춘 것이라 화면 규약·토큰·스타일 변경이 없다. `brief.js`·`brief.html`·`pantone.css` 무편집 · **신규 `:root` 토큰 0** → TOKENS 무변·`check-docs` 통과. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-20 11:20 · **06 모닝 브리핑 9섹션 개편 — 맥박 카드 그리드·표 재사용·등락 색 규약.** SimpleorNothing 지시(수기 브리핑 구성을 정식 회차 포맷으로). 신설 섹션(지수·보유 마감·뉴스·일정·리밸런싱)은 **새 표 컴포넌트를 만들지 않고 `.br-t` 하나를 재사용**한다 — 열 수만 다르다. 맥박 리스크 보드만 카드 그리드(`.br-risks`/`.br-r` · `minmax(232px,1fr)`)이고 방향 배지 `.br-dir` 는 위험 `--st-mature` · 기회 `--st-dawn` · 중립 `--dim` 무채색. 등락 셀은 **부호가 있을 때만** 색(`.up`=`--st-dawn`·`.dn`=`--st-mature`) — 부호 없는 값에 방향색을 입히면 없는 판단을 만든다. 리밸런싱 판정 줄 `.br-verdict.warn`(실행 불가 = `--st-mature`), 결론 근거 불릿 `.br-lead`, 보유 전체 요약 `.br-sum`. **신규 `:root` 토큰 0** — `.br-*` 스코프 스타일만 추가(`brief.js` `<style id="brief-css">` 주입 유지) → TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 스모크(섹션 9개·순서·색 클래스·구 스키마 하위호환·에러 경로). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-20 00:20 · **06 모닝 브리핑 「지난 호」 = 날짜 칩 → 회차 리스트(`.br-iss`).** SimpleorNothing 지시(뉴스레터 취지). 칩 나열은 회차가 쌓이면 못 읽는다 → **한 줄 = 한 호**(`제N호` `--dim` 12px/700 고정폭 46px · 날짜 `--faint` 12px · 제목 13.5px/600 flex) 리스트로 교체, 구분은 `border-bottom:1px solid var(--line)`(마지막 행 제거), hover `--panel2`, 활성 호는 번호·제목만 `--dawn`. 700px 이하에서는 제목이 `flex:1 0 100%` 로 아래줄에 떨어진다. **신규 `:root` 토큰 0** — `.br-*` 스코프 스타일만 추가(`brief.js` `<style id="brief-css">` 주입 방식 유지) → TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 스모크(3행·제목 없는 호 폴백 문구·활성·전환). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-19 23:05 · **06 모닝 브리핑 뷰(`#v-brief` · `brief.js` 자가 마운트) — §4-1에 뷰판 규약 추가.** SimpleorNothing 지시(모닝 브리핑 메뉴 추가·매일 저장·텍스트 정리 + 듣기). 단독 페이지(`brief.html`)와 달리 **뷰**이므로 §6 레퍼런스 골격(`.vhead`/`.vkick`/`.vtitle`/`.vsub`)을 그대로 복제하고 카드는 전역 관행(`--panel`/`--line`). 스타일은 `brief.js` 가 `<style id="brief-css">` 로 주입하고 **전 선택자를 `#v-brief` 로 스코프**(별도 css 파일 없음 = 파일 1개로 끝나는 자가 마운트 모듈). 기능색은 기존 것만 재사용 — 게이트 충족 `--st-hot` · 레이어 오버 `--st-mature` · 언더 `--st-dawn` · 게이트 판정 줄 `--dawn`. 대담 말풍선은 `brief.html` 규약 동일(진행자 우측 `--panel2`/`--line2` · 애널리스트 좌측 `--panel`/`--line` · 낭독 중 `--dawn` 인셋 링 · 완료 `opacity:.72`). 탭은 `data-v="brief"` 를 메모 앞에 넣고 01~07 재번호(멱등). **신규 `:root` 토큰 0** · index.html·pantone.css·insight.css 무편집 → TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 스모크(탭 순서·뷰 위치·게이트 3칸·오버/언더 색·보관분·대담 이어붙임). narrative≠numbers. (OPS §3 06 신설·§8·§9 동반)
- 2026-07-19 21:40 · **§4-1 「단독 페이지」 규약 신설 + 데일리 브리핑 팟캐스트 `brief.html`.** SimpleorNothing 지시(슬랙 문자 요약 → 팟캐스트 형식). index.html 밖 단독 문서(`brief.html`·기존 `prob.html`)가 `pantone.css` 없이 `:root` 를 자체 선언하는 탓에 **토큰이 조용히 갈라질 수 있는 사각**이 있었다 → §1 토큰 값 복제·신규 토큰 금지·읽기 폭 720px·safe-area 하단 바를 규약으로 명문화. `brief.html` 고유: 화자 2인을 **정렬로 구분**(`.msg.host` 우측 `--panel2`/`--line2` · `.msg.ana` 좌측 `--panel`/`--line`), 아바타 `--dawn`/`--mature`, 낭독 중 `--dawn` 인셋 링·완료 `opacity:.72`, 말풍선은 **음성 원문 그대로** + 숫자·규율어만 `<b>` 자동 강조(음성·화면 대본 이원화 방지). **신규 `:root` 토큰 0**(§1 값 복제) · index.html·pantone.css·insight.css 무편집 → TOKENS 무변·`check-docs` 통과. narrative≠numbers. (OPS §3 외부 채널·§8·§9 동반)
- 2026-07-19 10:56 · **03 전문가 원탁 「패널 관리」 모달(`council-roster.js` 자가 마운트).** SimpleorNothing 지시(전문가 패널 추가·삭제·편집). vhead 「패널 관리」(`#clRosterBtn` = 기존 `.cl-btn`)로 여는 관리 모달은 **기존 `.cl-modal`/`.cl-sheet`(면 3px)·`.cl-blk`(목록 행)·`.cl-eye`(라벨)·`.cl-pill`(stance 기능색)·`.cl-chip`(태그·시계·추가 배지)·`.cl-in`/`.cl-ta`(폼)·`.cl-btn`/`.cl-btnp`(액션) 전면 재사용** — 신규 컴포넌트 0. 아바타는 렌더된 카드 SVG 클론(없으면 disc 색+이니셜 폴백), 프리셋 선택은 disc 색 원형 버튼(부표 radius 20px §3). 폼 라벨=`.cl-eye` 12px·입력=14px(§2 하한). 목록/폼은 모달 본문 토글(별도 시트 없음). **신규 `:root` 토큰·CSS 클래스 0** — index.html은 인라인 COUNCIL 반환에 훅 3개(`getExperts`/`setExperts`/`reRender`)만 추가(마크업·CSS 무변), worker가 `<script defer src="/council-roster.js">` 주입 → TOKENS 무변·`check-docs` 통과·`node --check`(인라인 10블록 포함) 통과·jsdom 스모크(버튼·추가·삭제·편집·복원). 로스터는 R2 `council_roster.json`(OPS §3)·뷰/스탠스는 council_log 채널로 일원화. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-19 09:37 · **03 전문가 원탁 「1인 심층 자문」 리포트(`council-ask.js` 자가 마운트).** SimpleorNothing 지시. 카드 1인 선택 시 하단 바(`#clBar`)에 뜨는 「심층 자문」(`#clAsk` = 기존 `.cl-btnp` 주 버튼 재사용)으로 `/api/council-ask` 결과를 `#clResult`에 렌더 — **기존 `.cl-*` 전면 재사용**: `.cl-rep`(면 3px) 컨테이너·`.cl-eye`(라벨)·아바타 SVG(선택 카드에서 클론)·`.cl-pill`(stance 기능색 `--st-*`)·`.cl-diag`(진단)·`.cl-blk`/`.cl-two`(진단 근거·실행 조언 2열)·`.cl-steel`(자기 반증 `watch`·질문 답 — 좌측 3px 보더, 답은 `--dawn` 강조)·`.cl-note`(고지). 실행 조언 블록은 stance 기능색 좌측 3px 보더로 렌즈 정체성 표시. 본문 14px·라벨(`.cl-eye`) 12px(§2 하한). **신규 `:root` 토큰·CSS 클래스 0** — index.html·pantone.css·insight.css 무편집, worker가 `<script defer src="/council-ask.js">` 주입(flags/aisd 패턴) → TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 스모크(버튼 노출/숨김·리포트 렌더·순수 렌즈 음성). 카드 선택 상태는 `.cl-card.on` DOM으로 감지(신규 UI 요소는 버튼 1개뿐). 음성은 `window.COUNCIL.playReport` 재사용(diagnosis 비워 좌장 배제·board를 그 전문가 목소리로). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-18 22:18 · **「숫자 반영 대기」 스트립(`insStripDec`)을 05 리밸런싱→04 시장과 실적 전망 최상단으로 이동.** SimpleorNothing 지시(ASML 2Q 실적 서프라이즈+매출 전망 상향 카드). `insight.js mount()` 앵커만 `#v-decision`(before `#decisionBoard`)→`#v-thread`(before 최상단 `.vhead`)로 변경 — 로드맵(`#dsAisd`) 아래·강물 탐색 위에 뜬다. **스트립 컴포넌트(`.ins-strip`/`.ins-si`)·신규 `:root` 토큰·CSS 0** → TOKENS 무변·check-docs 통과(토큰 24종). 스트립 note의 스테일 「03에서 반영 완료」→「02 인사이트 찾기에서 반영 완료」 정정. jsdom 렌더 검증(insStripDec `#v-thread` 내부·순서 일치). narrative≠numbers — 표시 위치만. (OPS §3·§9 동반)
- 2026-07-19 11:02 · **02 인사이트 찾기 L1 자료 힌트도 클릭 = 그 자료 관점을 그 자리 펼침(전체 레벨 독립·중첩 드릴).** SimpleorNothing 지시(스크린샷 L1 「L2·L3로 펼치기」 지목). 직전(07-18 20:29)이 관점 밑 `.ins-sighint`를 클릭 토글로 만든 데 이어, **자료 카드 밑 `.ins-lvhint`**(구 「L2·L3로 펼치기」 정적 문구)도 클릭 토글로 — `data-rec`+`role=button`+`tabindex`+`aria-expanded`, CTA `.ins-lv-cta`(`--dawn`/700) 「펼치기 ▾」↔「접기 ▴」, 관점 묶음은 접이식 `.ins-recwrap`(hidden 토글). L1에서 자료만 보다가 힌트를 누르면 그 자료의 관점(claims)이 그 자리에 펼쳐지고, 각 관점의 시그널 힌트를 또 눌러 로그까지 **중첩 드릴다운**(자료→관점→시그널) — 상단 레벨 버튼과 독립. `renderList` L1 분기에서 관점을 hidden `.ins-recwrap`로 렌더 + `[data-rec]` 클릭/Enter 핸들러. **신규 `:root` 토큰 0**(`--dawn`/`--st-accel`/`--dim` 재사용)·`.ins-lvhint` cursor/hover/focus + `.ins-lv-cta`/`.ins-recwrap[hidden]`만 추가 → TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 검증(L1 접힘→클릭 펼침→중첩 시그널 펼침→재클릭 접힘·Enter·L2 직접노출). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-18 20:29 · **02 인사이트 찾기 「채택한 관점」 시그널 힌트 클릭 = 그 자리 펼침(전체 레벨 독립).** SimpleorNothing 지시(스크린샷 「L3에서 펼치기」 지목). 자료 카드 밑 `.ins-sighint`(구 정적 문구)를 **클릭 토글**로 — `data-sig`+`role=button`+`tabindex`+`aria-expanded`, CTA `.ins-sig-cta`(`--dawn`/700) 「펼치기 ▾」↔「접기 ▴」, 로그 본문은 접이식 `.ins-sigwrap`(hidden 토글·`sigBlock` 재사용). L2에선 기본 접힘·클릭 펼침 / L3에선 기본 펼침·개별 접기 — **전체 표시 레벨(lvl)과 독립**(한 관점만 그 자리에서 편다). `sigHint()`→`sigSection(c,open)` 교체·`renderList` 클릭/Enter 핸들러. **신규 `:root` 토큰 0**(기존 `--dawn`/`--st-accel`/`--dim` 재사용)·`.ins-sighint`에 cursor/hover/focus + `.ins-sig-cta`/`.ins-sigwrap[hidden]`만 추가 → TOKENS 무변·`check-docs` 통과·`node --check` 통과·jsdom 토글 검증(L2 접힘→클릭 펼침→재클릭 접힘·L3 기본 펼침·개별 접기·Enter). narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-18 16:10 · **02 인사이트 찾기 「채택한 관점」 목록에 표시 레벨(뎁스) 접기 — L1 자료·L2 관점·L3 시그널(기본 L1).** SimpleorNothing 지시. 「채택한 관점」 목록을 3단계 아웃라인으로 접는다 — L1=자료(소스) 카드만(접힌 관점·시그널 건수 힌트) · L2=+관점(claims, 시그널은 건수 힌트) · L3=+관련 시그널 로그·미연결 시그널 펼침. 상단 `.ins-lv` 버튼군(`.ins-lvbtn` — 면 radius 3px §3 탭 결 · 활성=주 버튼 `--dawn`/`--onacc` §4 · 서브라벨 mono 12px). 접힘 안내 `.ins-lvhint`(L1 자료 밑)·`.ins-sighint`(L2 관점 밑 · 좌측 2px `--line2` 룰로 종속 표시, `.ins-sig` 결 일치). 등급 보드·검색·라우트 필터와 **직교**(무엇을 펼칠지만). **신규 `:root` 토큰 0**(기존 `--panel2`/`--line2`/`--dawn`/`--onacc`/`--dim`/`--faint`/`--mono`/`--st-accel` 재사용) → TOKENS 무변·`check-docs` 통과. `insight.js`(`renderLevel()`·`renderList` 뎁스 분기·`claimLine` `showSig` 파라미터·`sigHint()`·`renderSigRest` lvl 게이트)·`insight.css`만 편집, index.html 무패치. `node --check` 통과·jsdom 3단계 렌더 검증. narrative≠numbers. (코드는 #432 선반영 · squash 92ded49 · 문서 후속 착지)
- 2026-07-18 15:18 · **상단 메뉴 재배열·개명(01 시장 모니터링 · 02 인사이트 찾기 · 03 전문가 원탁 · 04 시장과 실적 전망 · 05 리밸런싱 · 06 메모).** SimpleorNothing 지시. **`index.html` 무편집** — `insight.js mount()`가 정적 nav(market·cycle·port·council·memo)를 런타임 재구성(`insight` 탭 `market` 뒤 주입 · `council`을 `cycle` 앞 이동 · `cycle` 라벨 「궁금한 것」→「시장과 실적 전망」 개명 · index 순 재번호). 탭 라벨 「인사이트 찾기」·`vkick` 「Insight · 인사이트 찾기」. 04 뷰 제목 개명 불필요(#424가 옛 vhead 삭제). **신규 `:root` 토큰·CSS 0** → TOKENS 무변·`check-docs` 통과. jsdom nav 렌더 검증(6탭 순서·번호·라벨). §6-1 스트립 서술 번호 정정 · §2 예시 번호 정정. (OPS §0-5·§3·§9 동반) narrative≠numbers.
- 2026-07-18 15:15 · **05 드로어 「01~04 라이브 참고」 + aisd v6 선행 시그널(문서 재착지).** 드로어=기존 `.dr-sec`/`.cgrid`/`.cbox` 재사용 · 행 칩=`.t-sub` 인라인 mono 12px · aisd v6=`.ds-dtxt` 텍스트만. **신규 :root 토큰·클래스 0** → TOKENS 무변·check-docs 통과. (OPS §3·§9 동반)
- 2026-07-18 14:35 · **05 리밸런싱 추정 리비전 트래커에 「기대수익 점수」 컬럼(`raer.js` 자가 마운트 · PR #423).** SimpleorNothing 지시. `#probEst .pe-tbl`에 위험조정 기대수익(RAER = 여력×실현확률÷리스크, 15행 상대 0–100) 컬럼을 종목 다음(2번째)에 주입, 점수 내림차순 재정렬, **현금 행**을 종목으로 추가. index.html·worker.js·pantone.css 무편집 — 이미 로드되는 `changelog.js` 부트스트랩이 `loadRaer()`로 `<script defer src="/raer.js">` 주입(flags.js·aisd.js 패턴). CSS는 JS 주입(`.raer-sc`/`.raer-bar` — `pe-bar` 결 계승·면/부표 radius 규약 준수). 점수 tier 색은 기능색 재사용(≥60 `--st-dawn`·≥40 `--st-mature`·<40 `--st-hot`·현금 `--faint` — insight 등급·aisd 판정 선례). **신규 `:root` 토큰 0** → TOKENS 무변·check-docs 통과. 값 15px·메타 12px(§2 하한). MutationObserver로 트래커 재렌더 시 컬럼 유지. narrative≠numbers·관측 휴리스틱(예측·투자권유 아님). (OPS §3·§9 동반)
- 2026-07-18 14:24 · **02 간소화 — 박스1(즉답 요약+관점 스트립) 삭제·v-cycle·v-alpha 뷰 렌더 제외.** SimpleorNothing 지시(박스1 삭제·박스2 유지·박스3 이하 삭제). 탭 매핑 `cycle:['thread']`(orphan 잔존)·`#instantAnswer` DOM 삭제·`insStripThread` 앵커 제거·#dsAisd 유지. 신규 토큰·CSS 0. (OPS 동반)
- 2026-07-18 14:20 · **02 aisd.js ③ Meta 상세에 조달 구조 박스.** 신규 컴포넌트 없음 — 기존 `.ds-vco`(점선 박스)를 `tr.dtl` 내 `.ds-yrp` 아래에 재사용, 본문은 `<b>`+`<br>▸` 3줄 구조. 매트릭스 `.nt`·`.ds-yt` 텍스트만 갱신. **신규 CSS·`:root` 토큰 0 → check-docs 무관.** (OPS 동반)
- 2026-07-18 13:45 · **03 관점과 정보 얻기에 유튜브 URL 스크립트 추출(04 원탁 경로 이식).** UI 카피만 변경 — `insUrl`·`insText` placeholder를 「유튜브 링크는 Gemini가 영상을 인식해 스크립트를 뽑는다」로 갱신, 「관점 뽑기」에서 유튜브 URL만 넣으면 `insight.js ytExtract`가 `/api/yt-view`(`mode:'insight'`)로 영상을 전사→textarea 채움→관점 추출. **신규 `:root` 토큰·CSS 클래스 0**(기존 `.ins-in`/`.ins-ta`/`.ins-msg` 재사용, 새 컴포넌트 없음) → TOKENS 무변·`check-docs` 통과. index.html·insight.css 무편집(insight.js/worker.js만). 진행·폴백 안내는 기존 `.ins-msg` 인라인 문구. SimpleorNothing 지시. narrative≠numbers. (OPS §3·§9 동반)
- 2026-07-18 12:49 · **02 aisd.js v5 — 이익률 추이 매트릭스(병목의 온도계).** `ds-mtx`+`tr.exp/dtl` 재사용 — 상세 셀 `.ds-dtxt`(패딩 텍스트) · 판정 배지 `.ds-jd`(pill 20px · 구조적=st-dawn·혼합=st-mature·사이클=st-accel·병목 아님=faint — 기능색 재사용). **신규 :root 토큰 0** → TOKENS 무변·check-docs 통과. (OPS §3·§9 동반)
- 2026-07-18 12:37 · **01 종목 뉴스 행 `NEW` 배지(`.arow .anew`).** 최근 3일(72h·`isNewDt`)+미열람 기사에 `--dawn`/`--onacc` pill 20px(단계색 미사용=신선도 큐). **3초 호버 or 클릭 시 제거**(`dismissNew`→localStorage `am_news_seen_v1` 영속·키=link·재렌더 재출현 없음). `loadStockNews` `rowHTML()` 경로(종목+「더 보기」)·`#mktDigest` 위임. 매크로 「관련 기사」는 별도 템플릿이라 미적용(범위=보유 종목). 신규 `:root` 토큰 0→check-docs 통과. §6-5 행 신설. SimpleorNothing 지시. (OPS §3·§9)
- 2026-07-18 12:16 · **02 aisd.js v3+v4 — ③ 통합·④ 구성요소별·티어 손익 스트립(`.ds-vces`).** ③은 한 `ds-sec` 아래 렌즈 2조+카드 2장. ④ plan 테이블 행을 구성요소(업체군 `small`+`ds-lb` 레이어 배지)로 교체. 티어 카드 하단 **손익 스트립 `.ds-vces`**(점선 상단 룰 · `.k` mono 12px 라벨 · 흑자=`.pf-ok`(st-dawn)·적자=`.pf-no`(st-hot)·중립=`.pf-mid`(st-mature) — 기능색 재사용, 리비전 ▲▼는 등락색 규약). **신규 :root 토큰 0** → TOKENS 무변·check-docs 통과. 본문 14px/메타 12~13px. (OPS §3·§9 동반)
- 2026-07-18 11:17 · **02 aisd.js v2 — 밸류체인 구조도(`ds-vc*`)·② AI 판매자 매트릭스 추가(PR #413).** 티어 카드(`.ds-vct.t1~t4` — 좌측 3px 단계색 룰·기능색 재사용) + 층간 흐름 행(`.ds-vcf`) + 그룹(`.ds-vcg` panel2 면 3px) + 칩(`.ds-chip` 20px 부표·보유=`--dawn` 테두리) + 레이어 배지(`.ds-lb` sem/pow) + 관측 위치 박스(`.ds-vco` 점선). **신규 :root 토큰 0** → TOKENS 무변·check-docs 통과. 본문 14px/메타 12px·모바일 760px 세로 스택. (OPS §3·§9 동반)
- 2026-07-18 10:37 · **01 「채택한 매크로 관점」 스트립을 상단→「관련 기사」 섹션으로 이동.** `insight.js mount()` 앵커 `insStripMarket`을 `#v-market` `.vhead` 뒤(최상단)에서 `#mktMacroNews` 앞(관련 기사 h2 아래)으로 변경 — 큐레이션 관점이 자동 매크로 뉴스와 한 묶음. **신규 `:root` 토큰·CSS 0**(스트립 컴포넌트·insight.css 재사용) → TOKENS 무변·check-docs 무영향. jsdom 배치 검증(prev=관련 기사 h2·next=#mktMacroNews·상단 미잔존). §6-1 규칙 추가. SimpleorNothing 지시. narrative≠numbers 유지. (OPS §3·§9 동반)
- 2026-07-18 10:20 · **02 궁금한 것 맨위 「AI 수요·공급 로드맵」 블록(`aisd.js` 자가 마운트 · `#dsAisd`).** **신규 `:root` 토큰 0**(전역 토큰만 · `ds-*` 스코프 CSS를 JS가 주입) → TOKENS 무변·check-docs 통과. 면(카드·테이블·트랙)=3px · 부표(역할·단계 배지)=20px(§3) · 등락 규약(상향 ▲=`--st-hot`·하향 ▼=`--st-accel`) · 렌즈 2줄(§6-4) 각 섹션 적용 · 본문 14px/메타 12px(§2) · 모바일 760px 1열·열 축약. 업체 클릭 확장 행은 focus-visible·키보드 토글 포함. index.html·pantone.css 무편집(worker 주입 = flags.js 패턴). (OPS §3·§9 동반)
- 2026-07-18 09:46 · **01 다가오는 일정 카드 틴트 강도 상향.** 바탕 8→18%·테두리 24→48%(카테고리 구별성). 신규 토큰·CSS 0·check-docs 통과. SimpleorNothing 지시.
- 2026-07-18 08:46 · **01 다가오는 일정 카드 배경을 카테고리색 틴트로.** `.now-card` 바탕 `--panel`→`color-mix(var(--c) 8%)`·테두리 `var(--c) 24%`(6색=§5 카테고리 인코딩). 신규 `:root` 토큰·CSS 0 → TOKENS 무변·check-docs 통과. 3px 스트라이프 유지. index=`patches/*.b64`(md5 왕복). SimpleorNothing 지시.
- 2026-07-17 21:43 · **01 「CNN 공포·탐욕」 카드 반원 게이지(니들) 추가.** `fgGauge()` SVG · 역발상 색(공포=`--st-dawn`·탐욕=`--st-hot`·중립=`--st-mature`) · 신규 `:root` 토큰·CSS 0 · check-docs 통과 · index=`patches/*.b64`(봇 `94b283c`). SimpleorNothing 지시.
- 2026-07-17 21:10 · **01 지표 6번째 카드 「DXI 메모리 현물」 추가.** §6 레퍼런스 복제 — `.mkt-card`+`card()`/`chart()`/`lens()` 재사용(`loadDxi`/`lensDxi`), 렌즈 2줄(l1=L3·메모리·γ-닫힘 ③ / l2=DDR4 현물·주간% → 판정). **신규 `:root` 토큰·CSS 0** → TOKENS 무변·check-docs 통과. 주간 카드라 `card()` `dod:false`(전일대비 억제) 옵션(하위호환). 등락색 규약 유지. 데이터=`dxi.json`(포털 게이트라 매주 금요일 append, OPS §3·§4·§8). (OPS §9 동반)
- 2026-07-17 20:02 · **03 라이프사이클 편집을 모달 + 필드별 「보기 칩」 선택식으로.** `window.prompt` 4연타 → 오버레이 모달 컴포넌트 신설(`.ins-lc-ov`/`.ins-lc-sheet`/`.ins-lc-hd`/`.ins-lc-claim`/`.ins-lc-bd`/`.ins-lc-f`/`.ins-lc-lb`/`.ins-lc-chips`/`.ins-lc-chip`(칩·`.on` 활성=`--dawn`·`.clear` 점선)/`.ins-lc-in` textarea·input/`.ins-lc-ft`/`.ins-lc-note`). 보기는 **클라 템플릿**(게이트 어휘·8레이어·관점 티커·thesis-break 패턴 즉시 생성 — 서버·외부호출 0). 칩 클릭=아래 칸 채우기(단일)·직접 수정 가능·Esc/배경/취소 닫기. **신규 `:root` 토큰 0**(기존 `--panel/--panel2/--line/--line2/--txt/--dim/--faint/--dawn/--onacc` 재사용) → TOKENS 무변·`check-docs` 통과. 면 radius 3px·칩 20px(§3 결 일치)·폼 14px·메타 12px(§2 하한). `#v-insight` 스코프. SimpleorNothing 지시. (OPS §3·§8·§9 동반)
- 2026-07-17 18:56 · **06 캘린더 삭제 → 01 「다가오는 일정」 흡수.** SimpleorNothing 지시. nav `cal` 버튼 제거(메모 06→05·insight.js 런타임 재번호), 「임박 이벤트」 컴포넌트·`--cat-*`·3px목록을 `#v-cal`→`#v-market` 이관만(신규 클래스·토큰 0 → TOKENS 무변·check-docs 통과). v-cal은 v-port식 코드 잔존. §5·§6-1 갱신. Playwright 렌더 검증(nav 01~06·D-N 8·pageerror 0). (OPS §3·§9 동반)
- 2026-07-17 17:12 · **04 「관점 지형」(`#clSynth`)·「여러 링크」 소스별 ✕ 제외/복원.** 관점 지형은 council.json synthesis를 `.cl-two`/`.cl-blk`/`.cl-eye`/`.cl-steel`/`.cl-rep` 재사용 렌더. 소스 ✕/복원은 기존 `.cl-btn`(면 3px)·제외 행 opacity .4+취소선. **신규 토큰·클래스 0** → TOKENS 무변·check-docs 통과. (OPS §3·§9 동반)
- 2026-07-17 16:38 · **04 전문가 원탁에 「토론 주제」 입력창 추가.** 「현 상황」 위 단일행 주제 입력(`#clTopic`) — 비우면 현 상황 종합, 채우면 그 논제 중심. **신규 `:root` 토큰·CSS 클래스 0** — 폼 `.cl-in` 재사용, 안내 `.cl-note`·`h2.msec`+`span.mnote`. 리포트 논제 노출은 `.cl-eye`(`--dawn`) 인라인. TOKENS 무변 → `check-docs` 통과. narrative≠numbers. (OPS §3·§9 동반 갱신)
- 2026-07-17 13:38 · **04 전문가 원탁 관점 갱신 모달에 「여러 링크」 탭 추가.** 유튜브·기사 링크를 한꺼번에 붙여넣어 소스별 인식→통합 관점으로 정리하는 흐름. **신규 `:root` 토큰·CSS 클래스 0** — 기존 모달 컴포넌트(`.cl-tabs`/`.cl-tab`·`.cl-in` textarea·`.cl-blk`·`.cl-eye`·`.cl-chip`·`.cl-pill`·`.cl-note`)만 재사용, 소스별 진행·한 줄·통합 미리보기는 인라인 스타일(모달 관행 승계). 탭은 4번째 `.cl-tab`(flex:1 → 4등분, 라벨 「여러 링크」)로 폭 자동. stance는 기능색(`--st-dawn/-mature/-hot`) 재사용. TOKENS 구역 무변 → `check-docs` 통과. (OPS §3·§9 동반 갱신)

- 2026-07-17 11:45 · **04 전문가 원탁 「음성 토론 재생」 플레이어 컴포넌트(`.cl-p*`).** 원탁 진단 리포트를 화자별 브라우저 TTS 메신저형으로 극화하는 오버레이(`.cl-play`/`.cl-psheet`/`.cl-pmsg`/`.cl-pbub`/`.cl-pcall`/`.cl-ptype`). **신규 `:root` 토큰 0**(전역 토큰만 — `--panel`/`--line`/`--txt`/`--dawn`/`--st-dawn`/`--st-mature`) → TOKENS 구역 무변, `check-docs` 통과. **면(sheet·bubble·callout·typing)=radius 3px 직접 지정**(§3 — 전역 3px 셀렉터 목록 미편집, 이미 3px라 결 일치)·**부표(stance pill·타이핑 점)=radius 20px**·아바타=기존 `avatar()` SVG 재사용. 말풍선 본문 14px·메타 12·13px(§2 하한 준수). 발언 강조=`--dawn` 보더. 화자 구분은 색이 아니라 톤(`CLV` rate·pitch)·이름·stance pill. `#v-council` 스코프. (OPS §3 동반 갱신)

- 2026-07-17 · **신규 뷰 `#v-council`(04 전문가 원탁) 등록.** §7 체크리스트 준수 — `.mkt-grid` 복제 · `#v-council` 스코프 스타일(신규 `:root` 토큰 0 → TOKENS 무변) · 레이어칩(§6-4 관행) · stance는 기능색(`--st-dawn/-mature/-hot`) 재사용. 카드=면 radius 3px · 뱃지=pill 20px. check-docs 통과.

- 2026-07-16 22:44 · **중간 고점 MDD 라벨 정수화.** 고점값·낙폭% 소수점 제거(`fv`/`dd.toFixed(1)` → `Math.round`) — SimpleorNothing 지시. §6-5. (신규 토큰·CSS 0)
- 2026-07-16 22:03 · **종목 뉴스 미니차트 중간 고점 MDD 라벨.** 창 내부(첫·끝 아닌)에 최고가가 찍히고 현재가 고점 대비 1%+ 밀리면 `dr()`가 고점 점 + `고점 {fv} ({낙폭%})` 표기(`--st-accel`·halo·호버 중 숨김). 신규 토큰·CSS 0(check-docs 무영향). §6-5. (MU 캡처 지시)
- 2026-07-16 · **01 헤더 `update` 배지를 라이브 데이터 시각으로.** 배지 `update : YYYY.MM.DD`가 변경 로그(마지막 코드 수정일)라 데이터가 매 세션 갱신돼도 07-14 고착 → '업데이트 안 됨' 오독. `changelog.js`가 `pulse.json` asOf(KST 분단위) 페치해 `update : YYYY.MM.DD HH:MM` 표시, 변경 로그는 「이력 N」 클릭 모달로 이전(제목 「사이트 변경 이력」). `index.html`·CSS·토큰 무변경(자가 마운트·신규 클래스 0·check-docs 무영향)·페치 실패 시 변경 로그 날짜 폴백. §4 갱신 배지 행 갱신. (PR #340)
- 2026-07-14 · **종목 뉴스 미니차트(`.stk-cv`) X축 날짜 연도 인식.** Ctrl+휠로 다년 창을 열면 시작·끝이 `MM-DD`만 찍혀 5년 차(PLTR 2021-07-14→2026-07-13, 1254D)를 하루 차로 오독 → `fd()`를 `fd(x,yr)`+`fdD()`로 확장, `dr()`의 `spanYr`로 다년은 `YY-MM-DD`, 한 해 안은 종전 `MM-DD`(눈금·호버 공통). §6-5 갱신. 신규 토큰·CSS 없음(check-docs 무영향). (PR #333)

- 2026-07-14 23:40 · **03 시그널 로그 중첩 블록(`.ins-sig`).** 채택 관점 카드(`.ins-si`) 안쪽에 관련 시그널을 중첩 — 좌측 2px `--line2` 룰로 **종속**을 표시, 아이템은 `--panel2` 면 + 1px `--line` + radius 3px(§3 면 규약). 태그 칩은 구 시그널 로그 배지 규약 승계(radius 20px · `col+'22'` 배경 · mono 12px) — 색은 데이터(`items[].col`). 본문 15px(§2 하한). 하단 「미연결 시그널」은 `.ins-sig.rest`(좌측 룰 없음 = 비종속). **신규 토큰 0개** · `insight.css` 에만 추가. 구 `.siglog` 뷰 폐지.
- 2026-07-14 22:57 · **관련 기사(매크로) 행을 `.arow`(종목 뉴스와 동일)로 통일.** `loadMacroNews()`가 `.nrow`(날짜+제목)로만 그리던 개별 기사를 종목 뉴스와 같은 `.arow`(일자 + 요약 `a` + `→` 의미 `w`)로 렌더. `.nlist` 래퍼 제거하고 `.stk-sum` 아래 `.arow` 직접 나열. **기존 `.arow` 컴포넌트 재사용 — 신규 클래스·토큰·CSS 0**(check-docs 무영향). 데이터 `a·w`는 `fetch-news.mjs summarizeMacro()`가 생성(OPS §3). `a` 없으면 제목 폴백. §6-5 매크로 행 규칙 신설.

- 2026-07-14 22:18 · **01 보유 종목 뉴스 블록을 보유 비중(`holdings.json` `detail[].w`) 내림차순 정렬.** digest `groups[].items[]` 원순서 대신 렌더 시점 `byHeld()`/`WMAP`로 정렬(안정) → MU→MRVL→LITE→TSLA→VRT→삼성전자→BE. 미보유는 원순서. 신규 소스·토큰·CSS 없음(check-docs 무영향).

- 2026-07-12 23:59 · **03 관점 카드 출처 줄(`.ins-cs`).** 채택 관점 밑에 `출처: 매체 · 종류 · 날짜` + 링크(`.ins-cs-lk` — 원문 ↗ / 저장 원문 ↗)를 mono 12px `--faint`로 부착(메타 라벨 12px 하한 준수, §2). 링크는 `--dawn`·700, hover 밑줄 — 기존 `.ins-src-lk` 규약과 동일 결. 저장 목록·다른 메뉴 스트립 공통. **신규 토큰 없음**(check-docs 무영향), `insight.css`에만 추가.
- 2026-07-12 23:15 · **03 관점과 정보 얻기 읽는 글을 `.vsub`(15px)에 정렬 + 최소 글자크기 규정 명문화(§2·§7).** insight.css의 폼·본문·요약·관점·스틸맨·저장목록 텍스트가 11.5~13.5px로 뷰 부제(15px)보다 작아 가독성이 떨어졌음(운영자 지적: 입력·목록 영역 < 안내 문단) → 읽는 글 전부 15px, 메타 라벨(칩·배지·집계·날짜·링크·`.m`)은 12px 하한으로 상향(10~11.5px → 12px). insight.js 인라인 11px 버튼도 12px로. 폰트 크기는 토큰이 아니라 check-docs 무영향. §2에 폼 컨트롤·보조 뷰 하한, §7 체크리스트 11에 크기 하한 점검 추가.
- 2026-07-12 22:55 · **기간 버튼 5Y 실데이터화 — `fetch-prices.mjs` 창 1Y→5Y 확대.** 07-12 19:55의 「charts.json ~1년 보유 → 3Y·5Y 클램프」 한계를 해소: Yahoo `range=1y→5y`, Naver `400일→1850일`(+상한 1300 캡). 매 실행 시리즈 전체를 교체하므로 `update-prices` 워크플로가 다음 실행에서 charts.json을 5Y로 백필 → 3Y·5Y 버튼이 실데이터 표시(신규 상장은 확보분까지 자동 클램프). 파일 크기 ~210KB→~1.1MB(gzip ~250KB). 프런트는 무변경(count 기반 `slice6`가 그대로 유효) — 단 `loadUs10y`가 기간버튼을 무시하던 것 `slice6` 적용해 라벨·창 일치. WTI(`/api/wti`)는 이미 2020~ 확보라 5Y 즉시 동작. index.html은 JS 1줄(슬라이스)만 → 신규 토큰·CSS 없음(check-docs 무영향).
- 2026-07-12 22:25 · **01 헤더 변경-로그 배지 + 이력 팝업.** `update : YYYY.MM.DD 주요내용`(헤더 우상단 `.cyc-upd`+`.mkt-upd`) → 클릭 시 `.cyc-pop` 모달로 전체 이력. `changelog.js` 자가 마운트(insight.js 패턴)로 index.html은 `<script src>` 한 줄, 데이터 `MKT_CHANGELOG`. 기존 컴포넌트·CSS 재사용 → 신규 토큰·모달 없음(check-docs 무영향).
- 2026-07-12 19:55 · **01 시장 모니터링 지표·보유 종목 헤더에 기간 선택 버튼(1M/6M/1Y/3Y/5Y) 추가.** 고정 `span.mnote`(「6개월」) 자리를 세그먼트 버튼군 `span.mrng`(`.rbtn`×5)으로 교체 — 지표·보유 두 그룹은 공통 상태 `RG`로 동기화(한쪽 클릭 시 두 배지+모든 카드 재슬라이스). `slice6()`를 `a.slice(-RG.days)`로 일반화(거래일 근사 1M 21·6M 126·1Y 252·3Y 756·5Y 1260, 기본 6M=기존 동작 보존), `card()`의 `.mkt-span`·렌즈 기간 라벨(`6M`)을 `RG.ko`/`RG.k`로 동적화. charts.json은 현재 ~1년치만 보유 → 3Y·5Y는 확보 전 구간(≈1년)까지 표시(가용분 자동 클램프). `.rbtn`/`.mrng` CSS는 `#v-market` 스코프, 신규 토큰 없음(check-docs 무영향). 차트 계열(loadWti·loadUs10y·loadIndices·loadHoldings)만 재요청, 뉴스 블록은 기간 무관이라 제외.
- 2026-07-12 23:55 · **01 카드 그래프 끝점 라벨 — 소수점 통일(fmtNum) + 선에서 더 띄움.** 카드마다 제각각이던 끝점 라벨 소수점을 `fmtNum`(≥10 정수 콤마·<10 1자리, 종목 뉴스 `fv`와 동일)으로 전면 통일(보유 $979.30→$979 · WTI $71.4→$71 · 금리 4.57%→4.6% · 지수·₩는 정수 유지). **헤더 `.mkt-val`은 정밀값 유지** — 그래프 라벨만 반올림. 가독성은 halo 대신 **여백**: `.mkt-chart` padding-top 20→28 · `.spv` margin-top −4→−8(선 겹침 회피, PT 상수 동기). `chart()` 기본 포맷터도 fmtNum으로. 지수 카드는 이미 정수-콤마라 무변경 · 신규 토큰 없음(check-docs 무영향).
- 2026-07-12 23:45 · **01 시장 모니터링 스파크라인 세로 50% 확대(36→54px).** 지표·보유 종목 카드 그래프 `.mkt-card .spark` height 36→54px · `chart()` 끝점 라벨 계산 `HH` 36→54 동기(끝점 수치 `.spv`가 실제 끝점 y에 계속 붙도록). `.mkt-chart` padding-top·flex 하단정렬 무변경 · 단일 `card()`/`chart()` 경로라 전 카드 자동 적용 · 신규 토큰 없음(check-docs 무영향). 종목 뉴스 차트(`.stk-cv`)는 범위 밖.
- 2026-07-12 23:40 · **종목 뉴스 차트 끝점 값 가독성 — 흰 헤일로 추가.** 끝점 값이 같은 색 라인 위에 겹쳐(빨/청) 묻혀 안 보인다는 피드백 → `halo()`(흰 외곽선 `lineWidth 3` 후 채움)로 모든 캔버스 라벨(끝점 값·호버 툴팁·평단)을 그려 라인 위에서도 읽히게 함. 위치·포맷은 유지.
- 2026-07-12 23:05 · **종목 뉴스 차트: 처음·마지막 값을 각 끝점에 붙여 위/아래 표기(사용자 첨부대로).** 직전엔 값을 하단 눈금줄로 뺐는데, 값을 라인 끝점에 붙여 달라는 요청 → `lblY()`로 끝점 위(−5)/상단 근접 시 아래(+12)에 배치, 처음=좌·마지막=우. 하단 눈금줄엔 날짜만 남김. `fv()` 포맷·라인 색·볼드 유지.
- 2026-07-12 22:45 · **종목 뉴스 차트: 처음·마지막 값을 '그래프 아래' 하단 눈금줄로 이동 + 수치 포맷 규칙.** 끝점 위 오버레이가 라인과 겹쳐 안 보인다는 피드백 → 값을 하단(`H−4`)의 날짜 옆(바깥=날짜 회색·안쪽=값 볼드 라인색)으로 옮겨 선과 안 겹치게 함. `fv()` 신설 = **10 미만 소수 1자리 / 10 이상 정수(콤마)**, 처음·마지막·호버·평단 라벨 공통 적용(예 235.81→236·979.7→980·8.53→8.5).
- 2026-07-12 19:35 · **01 끝점 수치 라벨 투명 배경 + 살짝 위로.** `.spv` 배경칩(`--panel`)이 그래프 선을 가려서 제거(투명) · `margin-top:-4px`로 끝점보다 조금 더 위에 띄움 · `.mkt-chart` 상단 여백 16→20px(JS `PT`도 동기)로 최고점 라벨 안 잘리게 확보.
- 2026-07-12 19:50 · **종목 뉴스 차트: 처음·마지막 값을 각 끝점 y 위로 이동 + 기간 증감률을 좌상단으로.** 직전엔 처음/마지막/증감률을 캔버스 상단 여백에 일렬로 얹었는데, 사용자 요청대로 처음값은 시작점 위(좌)·마지막값은 끝점 위(우)로 붙이고(#296 `.spv`와 동일 개념) 증감률(%·N일)만 좌상단에 남김. 끝점 y는 `Y()`로 계산, 클램프로 캔버스·증감률 겹침 방지.
- 2026-07-12 19:15 · **종목 뉴스 차트 값 라벨을 그래프에 붙여 캔버스 상단 오버레이로 이전 + Ctrl+휠 안내 제거.** 직전 `.stk-cap` DOM 헤더(그래프와 분리된 위쪽 행)를 없애고, `dr()`가 캔버스 상단 여백(y<18)에 처음값(좌·시작점 위) / 마지막값(중앙·bold) / 등락%(우)를 직접 그린다 = 그래프에 붙어 표시. `.stk-zn`(“Ctrl+휠: 기간 조절”) 텍스트 삭제(휠 확대 기능은 유지). `.stk-cap`/`.stk-zn` CSS·마크업 제거(§6-5). ※ 같은 날 #296이 지표/보유 카드(`.mkt-chart`)에 적용한 「끝점 수치 그래프 위 오버레이」를 종목 뉴스 차트(`.stk-cv`)에도 맞춘 셈.
- 2026-07-12 19:10 · **01 시장 모니터링: 카드 간 그래프 세로 위치 일치 + 끝점 수치를 그래프 위로 이전.** ① 렌즈 줄 수에 따라 스파크라인이 카드마다 다른 높이에 떠 수평이 안 맞던 문제 → `.mkt-card`를 flex column으로, `.mkt-chart`에 `margin-top:auto`를 줘 그래프 블록을 하단 정렬(한 줄 안에서 세로 위치 일치). ② X축(`.mkt-axis`)에 있던 **시작·마지막 값**을 그래프 위 오버레이(`.spv`, 실제 끝점 y에 붙여 위에 표기)로 이전 — X축엔 시작·마지막 **날짜만** 남김. `chart()` 헬퍼 신설(`axis()` 대체), `card()` 단일 경로라 지표·보유 종목 전부 자동 적용.
- 2026-07-12 18:20 · **종목 뉴스 그래프를 카드 상단 정렬 + 처음·마지막 값 헤더 추가.** 기존 `.stk-chart{justify-content:center}`는 기사 목록이 길면 그래프가 세로 중앙으로 내려가 카드 상단이 비었음 → `flex-start`로 최상단 정렬. 캔버스 좌상단에 그리던 값 라벨(마지막값·%)을 캔버스 밖 `.stk-cap` DOM 헤더(`처음값 → 마지막값 · 등락%`)로 이전 — 현재 창 기준 `dr()`에서 동기 갱신, 라인 세로 여백도 확보(§6-5).
- 2026-07-12 17:45 · 빈 상태(§6-6) 보강 — 대기 중 렌즈 l1 유지 · `.stk-sum.ph` 대기 표기.
- 2026-07-12 18:30 · **01 시장 모니터링 스파크라인에 X축 시작·끝 라벨 추가.** 스파크라인이 값만 그리고 기간은 `6개월` 텍스트뿐이라 시작·끝 시점/값이 안 보였음 — `.spark` 바로 아래 `.mkt-axis`(좌=시작일·시작값 / 우=끝값·마지막일)를 추가. `card()`에 옵션 인자 `{dates,fmtV}` 추가(무변경 호출은 값만 표시, 날짜 없으면 자동 생략). 지표(코스피·S&P·나스닥·미10년물·WTI)·보유 종목 전부 `card()` 단일 경로라 자동 적용. 날짜 소스: charts.json `series.*.t`(epoch-day) / WTI `points[i][0]`(YYYY-MM-DD).
- 2026-07-12 17:40 · **03 관점 등급(승격) 배지·보드.** 채택 관점의 확신도를 관찰→후보→지지→확립→확신 5등급으로 표시. `.ins-gr.g0~g4`(저장 목록·스트립 배지), `.ins-tag.gpv`(선별 화면 승격 예고), `.ins-gboard`/`.ins-gcell`(등급 집계 보드·클릭 필터). 색은 기존 기능색 토큰 재사용(g2 `--st-dawn`·g3 `--st-accel`·g4 `--st-hot`) — **신규 토큰 없음**(check-docs 무영향). `insight.css`에만 추가.
- 2026-07-12 17:44 · **05 알파맵에 렌즈 2줄(§6-4) 적용** — 지금까지 알파맵만 렌즈 미준수(숫자만 던지는 그래프)였음. `.mkt-lens`(전역 클래스 재사용) 삽입: l1=벤치마크 프레임+`<b>`칩 / l2=① · ③ 사분면 분포·비중 + `MACRO_GRADE` 게이트→행동 판정(`.ok`/`.wn`/`.nt`). 버블 크기 토글(비중↔밴드갭)은 툴바 `.tbtn` 재사용, 밴드갭 이탈 종목은 amber(오버)·green(언더) 링으로 표기(§4 등락색 규약과 별개 = 회전 방향색).
- 2026-07-12 17:20 · **01 시장 모니터링 카드에 전일대비 변동 병기.** 기존 등락(`.mkt-chg`)은 6개월 창(`pct`) 기준이라 하루 움직임이 안 보였음 — 값 옆에 `.mkt-dod`(전일 종가 대비, `pctDoD` = 시리즈 마지막 두 점 비율)를 추가. 지표(코스피·S&P·나스닥·미10년물·WTI)·보유 종목 카드 전부 `card()` 단일 경로라 자동 적용. 데이터 2점 미만이면 미표시.
- 2026-07-12 15:54 · **타이포 스케일 리베이스(01 시장 모니터링).** 읽는 글 **14px 하한** · 메타 라벨 **12px 하한** · 블록 제목·카드명 15px · 값 17px으로 통일(기존 10–12.5px 본문은 가독성 미달). 렌즈 14px 수용을 위해 `.mkt-grid` minmax 180→224px · `.mkt-card` min-height 104→128px. §2에 크기 하한을 절대 규칙으로 명문화.
- 2026-07-12 15:45 · 01 「관련 기사」(매크로 토픽) 블록을 **2열 그리드**로 배치(`#mktMacroNews`) — 토픽별 기사 수가 적어 세로 스택 시 우측 절반이 계속 비었음. `.stk-blk` 재사용·모바일 700px 이하 1열(§6-5).
- 2026-07-12 13:30 · 종목 뉴스 블록 우측 차트(`.stk-cv`) 높이를 **190px 고정**으로 통일 — 기존 `flex:1`이 좌측 기사 목록 높이만큼 늘어나 종목마다 그래프 크기가 달랐음. 긴 블록은 `.stk-chart{justify-content:center}`로 세로 중앙 정렬(§6-5).
- 2026-07-12 13:05 · v3.1 — 문서 맨 위에 **연월일시분(KST) 최종 갱신 타임스탬프** 도입(OPS 동일 적용). §7 체크리스트 11항에 갱신 의무 반영.
- 2026-07-12 · **v3.** 지속 갱신 문서를 **2개(STYLE_GUIDE·OPS)** 로 확정 — 이 파일은 디자인 SoT. §3 해도 레이어(면 3px/배지 20px·radius 함정), §4 전역 관행(뷰 골격·updstamp·등락색 규약), §6 **01 시장 모니터링 레퍼런스 구현**(그리드·카드 내부 순서·렌즈 2줄·리스트/블록·빈 상태), §7 **신규 메뉴 체크리스트 11항** 신설. 토큰 구역은 무변경(실측 정합 유지).
- 2026-07-12 · **v2 전면 재작성.** v1은 `--bg/--surface/--text/--muted/--border/--brand` 6토큰(흰 배경·`#1257d6` 파랑)을 기술했으나, 이는 현행 `index.html`·`pantone.css` 어디에도 없는 **폐기 팔레트**(04 알파맵 레거시 `--a-*`와만 일치)였다. 라이브 실측 기준으로 교체하고, `scripts/check-docs.mjs` 드리프트 검출기를 붙여 재발을 막는다.
- (v1) · 기획 도구 모음 시절 디자인 토큰 문서 — 폐기.
| nav 하이드레이션 가드 | `#nav{visibility:hidden}` → 자가 마운트(`insight.js`·`brief.js` defer) 재구성 후 인라인 스크립트가 `DOMContentLoaded`→`rAF`에 `.rdy` 부여해 표시. **정적 5탭(옛 라벨) 플래시(FOUC) 억제** · `visibility`라 레이아웃 시프트 0 · 3s 폴백. `</head>` 앞 `#nav-fouc-guard`. |
- 2026-07-25 22:00 · **nav 새로고침 FOUC 억제.** 정적 `#nav` 5탭(옛 「02 궁금한 것」)이 `insight.js`·`brief.js`(defer) 재구성 전 순간 보이던 문제 → `</head>` 앞 `#nav-fouc-guard`(`#nav{visibility:hidden}`+`DOMContentLoaded`→`rAF` `.rdy`·3s 폴백). §4 「nav 하이드레이션 가드」 행 신설. (OPS §3·§9 동반)
