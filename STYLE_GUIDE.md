$(cat /tmp/STYLE_GUIDE_new.md)
- 2026-08-02 · **02 인사이트 「사이트 반영」 자동 PR 경로 정합.** 반영용 브랜치를 Claude PR Gate가 감시·자동 병합하는 `claude/site-apply-*`로 통일했다. 모달은 “자동 PR·병합”으로 동작을 정확히 안내하고, GitHub가 반환한 실패 상세도 상태줄에 표시한다. PR 생성 실패 시 임시 브랜치를 정리한다. **신규 `:root` 토큰·CSS 0** — 기존 `.ins-ap-st`·`--dim`·`--mono` 재사용, TOKENS 무변. (OPS §3·§9 동반)
