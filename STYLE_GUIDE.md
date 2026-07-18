**최종 갱신: 2026-07-18 09:53 (KST)**

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
- **크기 하한(절대 — 폼·보조 뷰 예외 없음):** **읽는 글(문장) = 14px 하한** · **폼 컨트롤(`input·textarea·select·button`)도 14px 하한** · **메타 라벨(날짜·기간·칩·눈금·집계 수, `--mono`) = 12px 하한.** 12px 미만은 어디에도 쓰지 않는다. **뷰 부제(`.vsub` 15px)가 있는 화면에선 그 아래 읽는 글이 부제보다 작아 보이면 안 된다** — 그 뷰의 본문·폼은 `.vsub`와 같은 **15px**로 맞춘다(예: 03 관점과 정보 얻기 `insight.css`). 위계는 크기를 하한 밑으로 낮춰서가 아니라 굵기·색으로 만든다.
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
  <h2 class="msec">보유 종목 <span class="mnote">6개월</span></h2>
  <div class="mkt-grid" id="mktHoldings"> … </div>
  <h2 class="msec">관련 기사 <span class="mnote">토픽 · 일자별</span></h2>
  <h2 class="msec">종목 뉴스 <span class="mnote" id="mktDigestAsof">요약 · 일자별</span></h2>
</section>
```

- **섹션 리듬:** `h2.msec`(20px/700, margin `26px 0 12px`) + 조건 배지 = 「제목 + 조건(기간·정렬)」. 조건이 **고정 텍스트**면 `span.mnote`(mono 11px `--faint`, .04em), **선택형**이면 `span.mrng`(세그먼트 버튼군 — `.rbtn` 5개 = 1M/6M/1Y/3Y/5Y, 활성 `.on`). 부제 문단을 길게 쓰지 않는다.
  - 기간 선택군(`.mrng`)은 지표·보유 두 헤더에 각각 두되 **공통 상태(`RG`)** 로 동기화 — 한쪽을 누르면 두 그룹 배지·모든 카드가 함께 재슬라이스된다. 거래일 근사: 1M≈21·6M≈126·1Y≈252·3Y≈756·5Y≈1260, `slice6()` 단일 경로. charts.json은 `fetch-prices.mjs`가 **Yahoo/Naver 5Y 일봉**으로 채운다(매 실행 창 전체 교체) → 5Y 버튼까지 실데이터. 신규 상장 등 확보분이 창보다 짧으면 자동 클램프. WTI(`/api/wti`)는 2020~ · **US10Y도 `charts.json.us10y`(`^TNX` 5Y) 1순위 · `/api/us10y` 폴백**(외부 피드 ~2개월뿐이라 단독 사용 시 기간버튼 무반응 — 2026-07-16 수리, PR #345).
- **03 채택 매크로 관점 스트립(`insStripMarket`)은 「관련 기사」 섹션 안에 산다(2026-07-18):** `insight.js mount()`가 `#v-market` 최상단(`.vhead` 뒤)이 아니라 **`#mktMacroNews` 바로 앞**(「관련 기사」 h2 아래·자동 수집 뉴스 위)에 마운트한다. 큐레이션 관점(등급·출처·라이프사이클 메타 보존)과 자동 매크로 뉴스가 한 묶음으로 읽힌다. 뉴스 `.arow`로 평탄화하지 않는다(narrative≠numbers · 스트립 컴포넌트 그대로). 빈 `insStripCal`(채택 일정 관점)은 종전대로 `.vhead` 뒤 잔존(비면 렌더 0).
- 뷰 안에서 정보 밀도는 **섹션 4개 안팎**으로 끊는다.
- **「다가오는 일정」(06 흡수, 2026-07-17):** `.cal-now`(4열·모바일 2열)+`.now-card`(D-N + `.when`·`.lbl`·`.meta` · 좌측 3px `--cat-*` 스트라이프·radius 3px). `renderCalNow()`가 `calendar.json`+`earnings.json` moves를 오늘 기준 병합·프루닝, 임박 8개. `.meta`가 프레임→게이트 판정을 나르므로 §6-4 렌즈에 부합(숫자만 카드 아님). `#v-cal`서 이동 — 신규 클래스 0.

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
| `.stk-body` | 좌 `.stk-left`(62%) / 우 `.stk-chart`(36%, 좌측 보더 · `justify-content:flex-start` = **상단 정렬**, 카드 최상단부터 그래프 배치). 차트 열 = `.stk-cv`(캔버스) 단독. **캔버스는 190px 고정**(`.stk-cv{flex:0 0 190px}`) — 기사 수에 따라 늘어나지 않는다(종목 간 그래프 높이 통일). `@media(max-width:700px)` → 세로 스택, 캔버스 150px 고정 |
| 차트 값 오버레이 | `dr()`가 캔버스 내부에 직접 그린다. **처음·마지막 값은 각 끝점에 붙여 위/아래**(`lblY()` — 상단 근접이면 아래 `+12`, 아니면 위 `−5`로 캔버스 밖 클리핑 방지) · `fv()`·`bold`·라인 색. 처음=시작점 좌(left-align x=6) / 마지막=끝점 우(right-align w−6). **모든 캔버스 텍스트 라벨은 `halo()` (흰 외곽선 `lineWidth 3` → 채움)로 그려 라인 위에 겹쳐도 읽힌다** — 끝점 값·호버 툴팁·평단 공통(빨/청 라인 위 같은 색 글씨가 묻히는 문제 방지). **기간별 증감률(%·N일)은 좌상단**(라인 색). **하단 눈금줄(`H−4`)엔 시작·끝 날짜만**(`fd()`·`#868e96`) — 창이 여러 해에 걸치면(`spanYr`) `YY-MM-DD`, 한 해 안이면 `MM-DD`(호버 툴팁 공통). **수치 포맷 `fv()` = 10 미만 소수 1자리 / 10 이상 정수(콤마)** — 처음·마지막·호버·평단 공통. Ctrl+휠·호버 시 창과 함께 동기 갱신. 라인 색 = 상승 `--st-hot` / 하락 `--st-accel`. **Ctrl+휠 안내 텍스트는 두지 않는다**(기능은 유지) |
| ↳ 중간 고점 MDD | 창 내부(첫·끝 아닌)에 최고가 + 현재가 고점 대비 1%+ 밀림(`mxi>0&&mxi<k-1&&dd≤−1`) → 고점 점 + `고점 {정수} ({정수%})`(소수점 없음·`--st-accel`·`halo`·점 아래 +12·좌우 클램프). 낙폭(MDD)=`Math.round((v[k-1]/mx−1)*100)`(가격 시계). 호버 중 숨김(평단·툴팁 양보) |
| 노이즈 | `.arow.is-noise` → 회색·비굵게(표시는 하되 눌러 둔다) |
| **매크로 토픽 2열** | 「관련 기사」 컨테이너 `#mktMacroNews`는 **2열 그리드**(`repeat(2,1fr)` · gap 12px · `align-items:start`). 토픽마다 기사 수가 달라 세로 스택은 우측 여백만 남겼다. 블록은 `.stk-blk` 그대로 재사용(새 클래스 금지) · `margin:0`으로 그리드 gap에 위임 · 빈 상태는 `grid-column:1/-1`. `@media(max-width:700px)` → 1열 |
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

- 2026-07-18 09:53 · **01 「채택한 매크로 관점」 스트립을 상단→「관련 기사」 섹션으로 이동.** `insight.js mount()` 앵커 `insStripMarket`을 `#v-market` `.vhead` 뒤(최상단)에서 `#mktMacroNews` 앞(관련 기사 h2 아래)으로 변경 — 큐레이션 관점이 자동 매크로 뉴스와 한 묶음. **신규 `:root` 토큰·CSS 0**(스트립 컴포넌트·insight.css 재사용) → TOKENS 무변·check-docs 무영향. jsdom 배치 검증(prev=관련 기사 h2·next=#mktMacroNews·상단 미잔존). §6-1 규칙 추가. SimpleorNothing 지시. narrative≠numbers 유지. (OPS §3·§9 동반)
- 2026-07-18 08:46 · **01 다가오는 일정 카드 배경을 카테고리색 틴트로.** `.now-card` 바탕 `--panel`→`color-mix(var(--c) 8%)`·테두리 `var(--c) 24%`(6색=§5 카테고리 인코딩). 신규 `:root` 토큰·CSS 0 → TOKENS 무변·check-docs 통과. 3px 스트라이프 유지. index=`patches/*.b64`(md5 왕복). SimpleorNothing 지시.
- 2026-07-17 21:43 · **01 「CNN 공포·탐욕」 카드 반원 게이지(니들) 추가.** `fgGauge()` SVG · 역발상 색(공포=`--st-dawn`·탐욕=`--st-hot`·중립=`--st-mature`) · 신규 `:root` 토큰·CSS 0 · check-docs 통과 · index=`patches/*.b64`(봇 `94b283c`). SimpleorNothing 지시.
- 2026-07-17 21:10 · **01 지표 6번째 카드 「DXI 메모리 현물」 추가.** §6 레퍼런스 복제 — `.mkt-card`+`card()`/`chart()`/`lens()` 재사용(`loadDxi`/`lensDxi`), 렌즈 2줄(l1=L3·메모리·γ-닫힘 ③ / l2=DDR4 현물·주간% → 판정). **신규 `:root` 토큰·CSS 0** → TOKENS 무변·check-docs 통과. 주간 카드라 `card()` `dod:false`(전일대비 억제) 옵션(하위호환). 등락색 규약 유지. 데이터=`dxi.json`(포털 게이트라 매주 금요일 append, OPS §3·§4·§8). (OPS §9 동반)
- 2026-07-17 20:02 · **03 라이프사이클 편집을 모달 + 「보기 칩」 선택식으로.** `window.prompt` 4연타 → 오버레이 모달 컴포넌트 신설(`.ins-lc-ov`/`.ins-lc-sheet`/`.ins-lc-hd`/`.ins-lc-claim`/`.ins-lc-bd`/`.ins-lc-f`/`.ins-lc-lb`/`.ins-lc-chips`/`.ins-lc-chip`(칩·`.on` 활성=`--dawn`·`.clear` 점선)/`.ins-lc-in` textarea·input/`.ins-lc-ft`/`.ins-lc-note`). 보기는 **클라 템플릿**(게이트 어휘·8레이어·관점 티커·thesis-break 패턴 즉시 생성 — 서버·외부호출 0). 칩 클릭=아래 칸 채우기(단일)·직접 수정 가능·Esc/배경/취소 닫기. **신규 `:root` 토큰 0**(기존 `--panel/--panel2/--line/--line2/--txt/--dim/--faint/--dawn/--onacc` 재사용) → TOKENS 무변·`check-docs` 통과. 면 radius 3px·칩 20px(§3 결 일치)·폼 14px·메타 12px(§2 하한). `#v-insight` 스코프. SimpleorNothing 지시. (OPS §3·§8·§9 동반)
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
