// fetch-pulse.mjs — 시장 맥박 자동 갱신 정책 가드
//
// 2026-08-30 정책:
// - 01 시장 모니터링의 시장 맥박은 ChatGPT 데일리 루틴이 웹 검색 + 자체 추론으로 갱신한다.
// - Gemini / Anthropic / OpenAI 등 외부 유료 LLM API를 이 경로에서 호출하지 않는다.
// - 이 스크립트는 과거 유료 LLM 자동 호출 경로의 재활성화를 막기 위한 명시적 가드다.
// - 02 인사이트, 03 전문가 원탁토론, 06 브리핑의 허용된 외부 LLM 경로에는 영향을 주지 않는다.
// - pulse.json은 이 스크립트에서 임의 생성·덮어쓰기하지 않는다. 실패·미갱신 상태를 숨기지 않는다.

console.log('::notice::market pulse: paid external LLM path disabled by policy; ChatGPT daily routine owns pulse.json updates.');
process.exit(0);
