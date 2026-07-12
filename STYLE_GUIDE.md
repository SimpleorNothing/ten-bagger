# STYLE_GUIDE — 알파맵 디자인 시스템

> **SoT = 이 파일(리포 `main`).** Claude Project 지식파일·과거 캡처는 폴백일 뿐이며, 충돌하면 리포가 이긴다.
> `.assetsignore`에 `*.md` → 사이트에 배포되지 않고 리포에만 남는다.
> **토큰 표는 손으로 고치지 않는다.** `node scripts/check-docs.mjs --fix` 가 `index.html` `:root` + `pantone.css` 오버라이드에서 실측해 재생성한다.
> 최종 갱신: 2026-07-12 · v2 (전면 재작성 — v1은 폐기된 팔레트를 기술하고 있었다)

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
- 적색(`--st-hot`)은 **과열·경고에만**. 장식으로 쓰지 않는다.

---

## 2. 서체

- **Pretendard 단일 패밀리.** 표제·데이터·본문 모두 같은 폰트 — 위계는 **굵기·자간·크기로만** 만든다.
- `--mono`는 `--serif`의 별칭이다. 고정폭이 아니다. 숫자 정렬이 필요하면 `font-variant-numeric: tabular-nums`.
- 크기 관행: 섹션 제목 20px/700 · 본문 13.5–14px/1.6–1.7 · 보조 12.5px · 최약 라벨 11–11.5px.

## 3. 컴포넌트 관행

| 항목 | 값 |
|---|---|
| 카드 | `background:var(--panel); border:1px solid var(--line)` |
| radius | 컨테이너 10–12px · 04 알파/인사이트 계열 3px (**같은 뷰 안에서는 통일**) |
| 버튼(기본) | `--panel2` 바탕 + `--line2` 테두리 + `--txt` 글자 |
| 버튼(주) | `--txt` 바탕 + `--onacc` 글자 |
| 비활성 | `opacity:.45` |
| 스틸맨·인용 | 좌측 2px `--line2` 보더 + `--dim` 글자 |
| 모바일 | 카드 그리드 → 세로 스택. 표는 가로 스크롤 금지, 열 축약. |

## 4. 뷰 전용 토큰 (스코프)

- `#v-alpha` → `--a-surface/-2 · --a-line/-2 · --a-txt · --a-dim · --a-faint · --a-brand`
  ⚠️ `index.html` 안의 `--a-*` 기본값(`#f6f7f9`·`#1a1d21`·`#1257d6` 등)은 **팬튼이 덮는 레거시**다. 이 값들을 근거로 새 UI를 만들면 안 된다.
- `#v-cal` → `--pt-card/-line/-ink/-txt/-mut/-brand` + 카테고리색 `--cat-macro|infl|earn|event|pol|watch`

## 5. 원복 경로

`index.html`의 `<link rel="stylesheet" href="/pantone.css">` 한 줄을 지우면 해도(海圖) 테마 원본으로 돌아간다. 레이아웃·radius·타이포는 팬튼이 건드리지 않는다(색만 교체).

---

## 갱신 이력

- 2026-07-12 · **v2 전면 재작성.** v1은 `--bg/--surface/--text/--muted/--border/--brand` 6토큰(흰 배경·`#1257d6` 파랑)을 기술했으나, 이는 현행 `index.html`·`pantone.css` 어디에도 없는 **폐기 팔레트**(04 알파맵 레거시 `--a-*`와만 일치)였다. 라이브 실측 기준으로 교체하고, `scripts/check-docs.mjs` 드리프트 검출기를 붙여 재발을 막는다.
- (v1) · 기획 도구 모음 시절 디자인 토큰 문서 — 폐기.
