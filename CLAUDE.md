# CLAUDE.md - ten-bagger 작업 규칙

## 지속 갱신 문서는 2개뿐 (SoT = main)
- **`STYLE_GUIDE.md`** — 디자인 SoT(토큰·해도 레이어·컴포넌트). **신규 메뉴는 「01 시장 모니터링 = 레퍼런스 구현」을 복제한다.**
- **`OPS.md`** — 운영 SoT(불변 규율·정보 인벤토리·갱신 주기·GitHub 파이프라인·자기갱신 매핑표).
- **작업 시작 전 이 둘을 `main`에서 재페치해 읽는다.** Claude Project 지식파일 캐시는 폴백 — 충돌하면 리포가 이긴다.
- **작업 후 같은 PR에서 해당 문서를 갱신**한다(무엇→어디는 `OPS.md` §7 매핑표). 하단 갱신 이력에 한 줄.
- `INFO_SOURCES.md`는 `OPS.md` §3으로 흡수·삭제(2026-07-12).

## 브랜치/배포
- 항상 main 에서 분기한 새 브랜치에서 작업하고, PR base 는 반드시 main 로 한다.
- main 에 직접 push 금지. 변경은 PR 로만.

## index.html (~550KB 단일 파일)
- 절대 파일 전체를 재작성하지 않는다. 고유 문자열 앵커 기준 부분 치환만 사용.
- 핵심 앵커 const D= / const C= / HOLDINGS / SIGNAL_LOG / TARGETS 는 편집 후에도 보존되어야 한다.
- 편집 후 파일 크기가 비정상적으로 줄지 않았는지 확인.
- 대용량 패치는 `patches/*.b64` — **미니파이 + `base64 -w0` + 푸시 후 커밋SHA핀 raw 디코드 md5 왕복 검증**(OPS §6-3). 크기 일치는 무결성 보증이 아니다.

## JSON (alpha / earnings / judgment / gamma / holdings / signal_log / prices / news)
- 편집 시 유효한 JSON 을 유지한다. `signal_log.json`은 EOF 앵커 raw-text append(전체 재직렬화 금지).

## PR (중요: 자동 생성)
- 작업 후 "PR 생성 링크"만 제공하고 끝내지 말 것. 반드시 **직접 PR을 생성**한다.
- 변경을 작업 브랜치에 커밋·푸시한 뒤, gh pr create 로 PR을 직접 연다:
  `gh pr create --base main --head <작업브랜치> --fill`
  (gh 가 없거나 실패하면 사용 가능한 GitHub PR 생성 도구로 동일하게 PR을 만든다.)
- base 는 반드시 main. PR 제목/본문에 무엇을 왜 바꿨는지 한국어로 요약한다.
- PR을 실제로 생성한 뒤, 댓글에 생성된 PR 번호/링크를 보고한다. 링크 안내만으로 종료하지 않는다.

## 머지 결과 확인/보고 (중요)
- 이 리포는 `.github/workflows/claude-pr-gate.yml` 의 validate → auto-merge 잡이 base=main·head=claude/* PR 을 검사 통과 시 자동 squash 머지(+브랜치 삭제)한다.
- 따라서 PR 생성 후 "queued/진행 중" 상태로 끝내지 말 것. **게이트가 끝날 때까지 확인하여 실제 머지 여부를 명시 보고**한다.
- 보고에는 머지됨/안 됨을 분명히 적는다. 머지됐으면 squash 커밋 SHA(또는 (#PR번호) 커밋)와 head 브랜치 삭제 여부로 확정 짓는다.
- auto-merge 가 곧바로 안 떴으면 게이트 잡 상태를 재확인한다(생성 직후엔 queued 일 수 있음 — 그 스냅샷만 보고 "안 됐다"고 단정하지 말 것).
- 머지가 실패/대기로 끝났으면 그 사유(validate 실패 로그 등)를 보고한다.
- `.github/workflows/` 는 GitHub App 권한 부재로 403 → **운영자 수동 편집**.

## 문서 드리프트 가드
- UI/CSS 를 건드린 PR은 반드시 `node scripts/check-docs.mjs` 통과. 실패 시 `--fix` 후 이력 한 줄.
- `STYLE_GUIDE.md`의 `TOKENS:BEGIN~END`는 자동 생성 구역 — 손으로 고치지 않는다.
