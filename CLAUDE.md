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

## PR
- PR 제목/본문에 무엇을 왜 바꿨는지 한국어로 요약한다.
