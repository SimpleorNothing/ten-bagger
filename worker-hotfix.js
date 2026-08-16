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
  "/site-change-live.js",
  "/topic-radar-sync.js",
]);

const TOPIC_RADAR_PREFS_PATH = "/api/topic-radar-prefs";
const TOPIC_RADAR_PREFS_KEY = "topic-radar-prefs.json";

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

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function normalizeTopicKeys(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const key = String(value == null ? "" : value).trim();
    if (!key || key.length > 80 || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 200) break;
  }
  return out;
}

async function readTopicRadarPrefs(env) {
  if (!env.MEMO_BUCKET) return { error: "MEMO_BUCKET not configured" };
  const object = await env.MEMO_BUCKET.get(TOPIC_RADAR_PREFS_KEY);
  if (!object) return { hidden: [] };
  try {
    const parsed = JSON.parse(await object.text());
    return { hidden: normalizeTopicKeys(parsed && parsed.hidden) };
  } catch {
    return { hidden: [] };
  }
}

async function topicRadarPrefsResponse(request, env) {
  if (!env.MEMO_BUCKET) return jsonResponse({ error: "MEMO_BUCKET not configured" }, 503);
  if (request.method === "GET") {
    const prefs = await readTopicRadarPrefs(env);
    return jsonResponse(prefs.error ? { error: prefs.error } : { hidden: prefs.hidden || [] }, prefs.error ? 503 : 200);
  }
  if (request.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "invalid json" }, 400); }
  const incoming = normalizeTopicKeys(body && body.hidden);
  if (!incoming.length) return jsonResponse({ ok: true, hidden: (await readTopicRadarPrefs(env)).hidden || [] }, 200);

  const current = await readTopicRadarPrefs(env);
  if (current.error) return jsonResponse({ error: current.error }, 503);
  const hidden = normalizeTopicKeys((current.hidden || []).concat(incoming));
  await env.MEMO_BUCKET.put(TOPIC_RADAR_PREFS_KEY, JSON.stringify({ hidden, updatedAt: new Date().toISOString() }), {
    httpMetadata: { contentType: "application/json" },
  });
  return jsonResponse({ ok: true, hidden }, 200);
}

async function injectSiteEnhancements(response) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const transformed = new HTMLRewriter()
    .on("body", { element(el) {
      el.append('<script src="/site-change-live.js?v=20260816-live-verified" defer></scr' + 'ipt>', { html: true });
      el.append('<script src="/topic-radar-sync.js?v=20260816-server-delete-sync" defer></scr' + 'ipt>', { html: true });
    } })
    .transform(response);
  return withFreshnessHeaders(transformed);
}

async function siteChangesResponse(request, env) {
  if (!env.ASSETS) return new Response('[]', {status:200, headers:{'content-type':'application/json','cache-control':'no-store'}});
  const u = new URL(request.url);
  u.pathname = "/site-change-commits.json";
  u.search = "";
  const r = await env.ASSETS.fetch(new Request(u.toString(), {method:"GET"}));
  if (!r.ok) return new Response('[]', {status:200, headers:{'content-type':'application/json','cache-control':'no-store'}});
  return withFreshnessHeaders(r);
}

async function patchChangelogResponse(response) {
  if (!response || !response.ok) return response;
  const text = await response.text();
  const patched = text
    .replace(
      "https://api.github.com/repos/SimpleorNothing/ten-bagger/commits?sha=main&per_page=100",
      "/__site_changes"
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
    // 배포 검증 및 changelog 로더 전용 공개 메타데이터. 사이트 본문/개인 데이터는 포함하지 않는다.
    if (url.pathname === "/__site_changes") return siteChangesResponse(request, env);
    if (BLOCKED_LLM_PATHS.has(url.pathname)) return disabledResponse(url.pathname);

    // 인증은 기존 baseWorker가 먼저 수행한다. 미인증 기기는 401, 비밀번호 미설정은 503이므로
    // 이 응답을 그대로 반환하고 R2 상태에는 접근하지 않는다.
    const response = await baseWorker.fetch(request, env, ctx);
    if (url.pathname === TOPIC_RADAR_PREFS_PATH) {
      if (response.status === 401 || response.status === 503) return response;
      return topicRadarPrefsResponse(request, env);
    }
    if (url.pathname === "/changelog.js" && response && response.ok) {
      return patchChangelogResponse(response);
    }
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/" || url.pathname === "/index.html")) {
      return injectSiteEnhancements(response);
    }
    if ((request.method === "GET" || request.method === "HEAD") &&
        (FRESH_PATHS.has(url.pathname) || url.pathname.startsWith("/raw/revisions/"))) {
      return withFreshnessHeaders(response);
    }
    return response;
  },
};
