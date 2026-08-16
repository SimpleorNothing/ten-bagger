// Paid-LLM policy wrapper.
// User policy (2026-08-15): external paid LLM APIs are allowed for
// 02 insight, 03 council, and 06 briefing. Other paid-LLM routes stay blocked.
import baseWorker from "./worker.js";

const BLOCKED_LLM_PATHS = new Set([
  "/api/site-apply",
  "/api/calevent-parse",
]);

const FRESH_PATHS = new Set([
  "/",
  "/index.html",
  "/gamma.json",
  "/holdings.json",
  "/prices.json",
  "/charts.json",
  "/cycle.json",
  "/changelog.js",
  "/capital-scarcity.js",
  "/site-change-commits.json",
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

function versionResponse(env) {
  return new Response(JSON.stringify({
    service: "ten-bagger",
    sha: env.DEPLOY_SHA || "unknown",
    deployedAt: env.DEPLOYED_AT || "unknown",
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function withFreshnessHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function patchChangelogResponse(response) {
  if (!response || !response.ok) return response;
  const text = await response.text();
  const patched = text
    .replace(
      "https://api.github.com/repos/SimpleorNothing/ten-bagger/commits?sha=main&per_page=100",
      "/site-change-commits.json"
    )
    // 같은 날 여러 번 실제 사이트가 바뀌어도 각각 이력에 남긴다.
    .replace("if(d<=CURATED_MAX)return;", "if(d<CURATED_MAX)return;");
  return withFreshnessHeaders(new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/__version") return versionResponse(env);
    if (BLOCKED_LLM_PATHS.has(url.pathname)) return disabledResponse(url.pathname);

    const response = await baseWorker.fetch(request, env, ctx);
    if (url.pathname === "/changelog.js" && response && response.ok) {
      return patchChangelogResponse(response);
    }
    if ((request.method === "GET" || request.method === "HEAD") &&
        (FRESH_PATHS.has(url.pathname) || url.pathname.startsWith("/raw/revisions/"))) {
      return withFreshnessHeaders(response);
    }
    return response;
  },
};
