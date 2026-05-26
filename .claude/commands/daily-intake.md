---
description: 데일리 뉴스 인테이크 — news.json 큐레이션 → SIGNAL_LOG 기록 (OPS.md §3~4)
---

오늘자 뉴스 인테이크를 수행한다. 06:50 KST `update-news.yml` 크론이 이미 `news.json`을
갱신해 둔 상태를 전제로, 그 뒤의 **신호/소음 판단**(사람/Claude 몫)을 처리한다.

## 절차

1. **오늘 새로 들어온 항목 추출**
   - `git log -1 --format=%H -- news.json` 로 최신 갱신 커밋을 찾고,
     `git show <sha> -- news.json` 에서 추가된(`+`) item만 뽑는다.
   - 또는 직전 인테이크 이후 추가분(발행일 기준 최근 24h)을 본다.

2. **신호 vs 소음 선별** (OPS.md §3)
   - 소음 제거: 단순 시세/쿼트 페이지, 목표가·의견글, 재료 없는 등락 기사.
   - 신호만 남긴다: 신제품/IP·규제·계약·수요 트리거 등 **어느 레이어의 수급을 바꾸는** 헤드라인.
   - 링크는 네트워크 제약으로 원문 검증이 안 될 수 있음 → **헤드라인 기반 판단**임을 src에 명시.

3. **SIGNAL_LOG 기록** (`index.html`, `/* ▼ 신규 시그널은 여기에 */` 위)
   - 날짜 entry 하나 추가. 템플릿(OPS.md §4 / 기존 엔트리 형식): `{date, at, source, srcs:[{label,url}], items:[{tag,layer,col,html}]}`.
   - `at`은 `YYYY-MM-DDThh:mm+09:00` (사이트 "정보" 타임스탬프를 끌어올림).
   - 추가 후 `node -e` 로 `const SIGNAL_LOG=` 블록을 eval 해 파싱 검증.

4. **숫자 반영 라우팅** (OPS.md §4) — **기본은 로그만, 숫자는 신중히**
   - 방향·반전·런웨이 변화 → `judgment.json` (확신 있을 때만)
   - 실적 크기 → `earnings.json`
   - 그 외 전부 → SIGNAL_LOG만 (숫자 불변)
   - 애매하면 손대지 말고 로그에만. "침묵하는 오류"(§1) 방지.

5. **4사분면 블링킹은 자동** — 실적 임박(D-3~D-Day) 종목은 알파 맵에서 펄스 링으로 자동 표시되므로
   별도 작업 불필요. 다만 임박 종목이 있으면 요약에 한 줄로 언급.

6. **커밋 & PR**
   - 브랜치 `claude/daily-intake-<YYYYMMDD>` 생성 → `index.html`(필요시 json) 커밋 → 푸시.
   - base `claude/wizardly-rubin-SubA1` 로 **draft PR** 생성. 머지는 운영자 판단.

## 출력 (요약, 한국어)
- 선별된 신호 목록(종목·왜 신호인지 한 줄)
- 소음으로 거른 건수
- SIGNAL_LOG에 추가한 entry
- 숫자 변경 플래그(있으면) / 임박 실적(있으면)
- PR 링크
