# CLAUDE.md - ten-bagger 작업 규칙

## 브랜치/배포
- 항상 claude/wizardly-rubin-SubA1 에서 분기한 새 브랜치에서 작업하고, PR base 는 반드시 claude/wizardly-rubin-SubA1 로 한다.
- claude/wizardly-rubin-SubA1 에 직접 push 금지. 변경은 PR 로만.

## index.html (~210-250KB 단일 파일)
- 절대 파일 전체를 재작성하지 않는다. 고유 문자열 앵커 기준 부분 치환만 사용.
- 핵심 앵커 const D= / const C= / HOLDINGS / SIGNAL_LOG 는 편집 후에도 보존되어야 한다.
- 편집 후 파일 크기가 비정상적으로 줄지 않았는지 확인.

## JSON (alpha / earnings / judgment / news / prices)
- 편집 시 유효한 JSON 을 유지한다.

## PR (중요: 자동 생성)
- 작업 후 "PR 생성 링크"만 제공하고 끝내지 말 것. 반드시 **직접 PR을 생성**한다.
- 변경을 작업 브랜치에 커밋·푸시한 뒤, gh pr create 로 PR을 직접 연다:
  `gh pr create --base claude/wizardly-rubin-SubA1 --head <작업브랜치> --fill`
  (gh 가 없거나 실패하면 사용 가능한 GitHub PR 생성 도구로 동일하게 PR을 만든다.)
- base 는 반드시 claude/wizardly-rubin-SubA1. PR 제목/본문에 무엇을 왜 바꿨는지 한국어로 요약한다.
- PR을 실제로 생성한 뒤, 댓글에 생성된 PR 번호/링크를 보고한다. 링크 안내만으로 종료하지 않는다.

## 머지 결과 확인/보고 (중요)
- 이 리포는 `.github/workflows/claude-pr-gate.yml` 의 validate → auto-merge 잡이 base=claude/wizardly-rubin-SubA1·head=claude/* PR 을 검사 통과 시 자동 squash 머지(+브랜치 삭제)한다.
- 따라서 PR 생성 후 "queued/진행 중" 상태로 끝내지 말 것. **게이트가 끝날 때까지 확인하여 실제 머지 여부를 명시 보고**한다.
- 보고에는 머지됨/안 됨을 분명히 적는다. 머지됐으면 squash 커밋 SHA(또는 (#PR번호) 커밋)와 head 브랜치 삭제 여부로 확정 짓는다.
- auto-merge 가 곧바로 안 떴으면 게이트 잡 상태를 재확인한다(생성 직후엔 queued 일 수 있음 — 그 스냅샷만 보고 "안 됐다"고 단정하지 말 것).
- 머지가 실패/대기로 끝났으면 그 사유(validate 실패 로그 등)를 보고한다.
