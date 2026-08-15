// Paid-LLM policy wrapper.
// User policy (2026-08-15): external paid LLM APIs are allowed for
// 02 insight, 03 council, and 06 briefing. Other paid-LLM routes stay blocked.
import baseWorker from "./worker.js";

const BLOCKED_LLM_PATHS = new Set([
  "/api/site-apply",
  "/api/calevent-parse",
]);

function disabledResponse(path) {
  return new Response(JSON.stringify({
    error: "외부 유료 LLM API 사용이 비활성화됐습니다.",
    path,
    policy: "02 인사이트, 03 원탁, 06 브리핑만 외부 LLM API 허용",
    code: "PAID_LLM_DISABLED",
  }), {
    status: 503,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (BLOCKED_LLM_PATHS.has(url.pathname)) return disabledResponse(url.pathname);
    return baseWorker.fetch(request, env, ctx);
  },
};
