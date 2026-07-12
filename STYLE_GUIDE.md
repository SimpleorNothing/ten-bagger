**최종 갱신: 2026-07-12 18:35 (KST)**

# STYLE_GUIDE — 알파맵 디자인 시스템

> **SoT = 이 파일(리포 `main`).** Claude Project 지식파일·과거 캡처는 폴백이며, 충돌하면 리포가 이긴다.
> **짝 문서 = `OPS.md`(운영 가이드).** 이 리포의 지속 갱신 문서는 이 둘뿐이다 — 디자인은 여기, 정보·운영 로직은 OPS.
> `.assetsignore`에 `*.md` → 사이트에 배포되지 않고 리포에만 남는다.
> **토큰 표는 손으로 고치지 않는다.** `node scripts/check-docs.mjs --fix` 가 `index.html` `:root` + `pantone.css` 오버라이드에서 실측해 재생성한다.
> **신규 메뉴·컴포넌트는 §6 「01 시장 모니터링 = 레퍼런스 구현」을 복제해 만든다.**
> 버전: **v3.1** (레퍼런스 구현 §6 · 신규 메뉴 체크리스트 §7 · 상단 타임스탬프 규칙)
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
- **크기 하한(절대):** **읽는 글(문장) = 14px 하한** · **메타 라벨(날짜·기간·칩·눈금, `--mono`) = 12px 하한.** 12px 미만은 쓰지 않는다.
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
| 갱신 배지 | `.updstamp`(mono 11.5px `--faint`) · 우상단 고정은 `.updstamp.abs` · 비면 자동 숨김 |
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
- `#v-cal` → `--pt-card/-line/-ink/-txt/-mut/-brand` + 카테고리색 `--cat-macro|infl|earn|event|pol|watch`
- 신규 뷰는 **전용 토큰을 새로 파지 않는다**(01 시장 모니터링은 전역 토큰만 쓴다). 뷰 전용 토큰은 유지비만 낳는다 — 위 둘은 레거시로 취급.

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
  <h2 class="msec">지표 <span class="mnote">6개월</span></h2>
  <div class="mkt-grid"> … .mkt-card … </div>
  <h2 class="msec">보유 종목 <span class="mnote">6개월</span></h2>
  <div class="mkt-grid" id="mktHoldings"> … </div>
  <h2 class="msec">관련 기사 <span class="mnote">토픽 · 일자별</span></h2>
  <h2 class="msec">종목 뉴스 <span class="mnote" id="mktDigestAsof">요약 · 일자별</span></h2>
</section>
```

- **섹션 리듬:** `h2.msec`(20px/700, margin `26px 0 12px`) + `span.mnote`(mono 11px `--faint`, .04em) = 「제목 + 조건(기간·정렬)」. 부제 문단을 길게 쓰지 않는다.
- 뷰 안에서 정보 밀도는 **섹션 4개 안팎**으로 끊는다.

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
.spark     스파크라인            height 36px, width 100%
.mkt-axis  X축 시작·끝 라벨       mono 11px --faint · 좌=시작일·시작값 / 우=끝값·마지막일 (날짜 .ax-dt=--dim/600) · space-between
.mkt-span  기간 라벨             mono 12px --faint
```

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
| `.arow` | `.adt`(날짜 40px) + `.asum`(내용 12.5px/600) + `.aimp`(의미·영향 — `.aar` 화살표 `--dawn`/700) |
| `.stk-body` | 좌 `.stk-left`(62%) / 우 `.stk-chart`(36%, 좌측 보더 · `justify-content:flex-start` = **상단 정렬**, 카드 최상단부터 그래프 배치). 차트 열 = `.stk-cap`(그래프 위 헤더) + `.stk-cv`(캔버스) + `.stk-zn`(안내). **캔버스는 190px 고정**(`.stk-cv{flex:0 0 190px}`) — 기사 수에 따라 늘어나지 않는다(종목 간 그래프 높이 통일). `@media(max-width:700px)` → 세로 스택, 캔버스 150px 고정 |
| `.stk-cap` | 그래프 **위 헤더**(캔버스 밖) — `처음값 → 마지막값` + 우측 `.c-pct`(등락% / N일). `dr()`가 현재 창 기준으로 채우며(Ctrl+휠 확대·호버 시 동기 갱신), 마지막값·%는 라인 색(상승 `--st-hot`/하락 `--st-accel`) 적용. 값 라벨을 캔버스에서 DOM 헤더로 이전 = 라인 세로 여백 확보 |
| 노이즈 | `.arow.is-noise` → 회색·비굵게(표시는 하되 눌러 둔다) |
| **매크로 토픽 2열** | 「관련 기사」 컨테이너 `#mktMacroNews`는 **2열 그리드**(`repeat(2,1fr)` · gap 12px · `align-items:start`). 토픽마다 기사 수가 달라 세로 스택은 우측 여백만 남겼다. 블록은 `.stk-blk` 그대로 재사용(새 클래스 금지) · `margin:0`으로 그리드 gap에 위임 · 빈 상태는 `grid-column:1/-1`. `@media(max-width:700px)` → 1열 |

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
11. UI/CSS를 건드렸으면 **`node scripts/check-docs.mjs` 통과** + 이 문서 **맨 위 「최종 갱신: YYYY-MM-DD HH:MM (KST)」 갱신** + 갱신 이력 한 줄.

---

## 8. 원복 경로

`index.html`의 `<link rel="stylesheet" href="/pantone.css">` 한 줄을 지우면 해도(海圖) 테마 원본으로 돌아간다. 레이아웃·radius·타이포는 팬튼이 건드리지 않는다(색만 교체).

---

## 갱신 이력

- 2026-07-12 18:20 · **종목 뉴스 그래프를 카드 상단 정렬 + 처음·마지막 값 헤더 추가.** 기존 `.stk-chart{justify-content:center}`는 기사 목록이 길면 그래프가 세로 중앙으로 내려가 카드 상단이 비었음 → `flex-start`로 최상단 정렬. 캔버스 좌상단에 그리던 값 라벨(마지막값·%)을 캔버스 밖 `.stk-cap` DOM 헤더(`처음값 → 마지막값 · 등락%`)로 이전 — 현재 창 기준 `dr()`에서 동기 갱신, 라인 세로 여백도 확보(§6-5).
- 2026-07-12 17:45 · 빈 상태(§6-6) 보강 — 대기 중 렌즈 l1 유지 · `.stk-sum.ph` 대기 표기.
- 2026-07-12 18:30 · **01 시장 모니터링 스파크라인에 X축 시작·끝 라벨 추가.** 스파크라인이 값만 그리고 기간은 `6개월` 텍스트뿐이라 시작·끝 시점/값이 안 보였음 — `.spark` 바로 아래 `.mkt-axis`(좌=시작일·시작값 / 우=끝값·마지막일)를 추가. `card()`에 옵션 인자 `{dates,fmtV}` 추가(무변경 호출은 값만 표시, 날짜 없으면 자동 생략). 지표(코스피·S&P·나스닥·미10년물·WTI)·보유 종목 전부 `card()` 단일 경로라 자동 적용. 날짜 소스: charts.json `series.*.t`(epoch-day) / WTI `points[i][0]`(YYYY-MM-DD).
- 2026-07-12 17:20 · **01 시장 모니터링 카드에 전일대비 변동 병기.** 기존 등락(`.mkt-chg`)은 6개월 창(`pct`) 기준이라 하루 움직임이 안 보였음 — 값 옆에 `.mkt-dod`(전일 종가 대비, `pctDoD` = 시리즈 마지막 두 점 비율)를 추가. 지표(코스피·S&P·나스닥·미10년물·WTI)·보유 종목 카드 전부 `card()` 단일 경로라 자동 적용. 데이터 2점 미만이면 미표시.
- 2026-07-12 15:54 · **타이포 스케일 리베이스(01 시장 모니터링).** 읽는 글 **14px 하한** · 메타 라벨 **12px 하한** · 블록 제목·카드명 15px · 값 17px으로 통일(기존 10–12.5px 본문은 가독성 미달). 렌즈 14px 수용을 위해 `.mkt-grid` minmax 180→224px · `.mkt-card` min-height 104→128px. §2에 크기 하한을 절대 규칙으로 명문화.
- 2026-07-12 15:45 · 01 「관련 기사」(매크로 토픽) 블록을 **2열 그리드**로 배치(`#mktMacroNews`) — 토픽별 기사 수가 적어 세로 스택 시 우측 절반이 계속 비었음. `.stk-blk` 재사용·모바일 700px 이하 1열(§6-5).
- 2026-07-12 13:30 · 종목 뉴스 블록 우측 차트(`.stk-cv`) 높이를 **190px 고정**으로 통일 — 기존 `flex:1`이 좌측 기사 목록 높이만큼 늘어나 종목마다 그래프 크기가 달랐음. 긴 블록은 `.stk-chart{justify-content:center}`로 세로 중앙 정렬(§6-5).
- 2026-07-12 13:05 · v3.1 — 문서 맨 위에 **연월일시분(KST) 최종 갱신 타임스탬프** 도입(OPS 동일 적용). §7 체크리스트 11항에 갱신 의무 반영.
- 2026-07-12 · **v3.** 지속 갱신 문서를 **2개(STYLE_GUIDE·OPS)** 로 확정 — 이 파일은 디자인 SoT. §3 해도 레이어(면 3px/배지 20px·radius 함정), §4 전역 관행(뷰 골격·updstamp·등락색 규약), §6 **01 시장 모니터링 레퍼런스 구현**(그리드·카드 내부 순서·렌즈 2줄·리스트/블록·빈 상태), §7 **신규 메뉴 체크리스트 11항** 신설. 토큰 구역은 무변경(실측 정합 유지).
- 2026-07-12 · **v2 전면 재작성.** v1은 `--bg/--surface/--text/--muted/--border/--brand` 6토큰(흰 배경·`#1257d6` 파랑)을 기술했으나, 이는 현행 `index.html`·`pantone.css` 어디에도 없는 **폐기 팔레트**(04 알파맵 레거시 `--a-*`와만 일치)였다. 라이브 실측 기준으로 교체하고, `scripts/check-docs.mjs` 드리프트 검출기를 붙여 재발을 막는다.
- (v1) · 기획 도구 모음 시절 디자인 토큰 문서 — 폐기.
