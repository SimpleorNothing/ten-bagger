// Paid-LLM kill switch wrapper.
// User policy (2026-08-13): GitHub/Worker code must not call paid LLM APIs.
// ChatGPT scheduled routines perform judgment/summarization instead.
import baseWorker from "./worker.js";

const BLOCKED_LLM_PATHS = new Set([
  "/api/insight",
  "/api/site-apply",
  "/api/yt-view",
  "/api/council-image",
  "/api/council",
  "/api/council-summary",
  "/api/council-ask",
  "/api/council-read",
  "/api/brief",
  "/api/brief-audio",
  "/api/council-audio",
  "/api/calevent-parse",
]);

function disabledResponse(path) {
  return new Response(JSON.stringify({
    error: "외부 유료 LLM API 사용이 비활성화됐습니다.",
    path,
    policy: "ChatGPT 데일리/주간 루틴에서 웹 검색과 자체 추론으로 처리",
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
