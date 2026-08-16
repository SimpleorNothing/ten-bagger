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
  "/revision-benchmark.json",
  "/scores.json",
  "/holdings.json",
  "/prices.json",
  "/charts.json",
  "/cycle.json",
  "/changelog.js",
  "/capital-scarcity.js",
  "/revision-tracker-fix.js",
  "/site-change-commits.json",
  "/site-change-live.js",
  "/topic-radar-sync.js",
]);

const TOPIC_RADAR_PREFS_PATH = "/api/topic-radar-prefs";
const TOPIC_RADAR_PREFS_KEY = "topic-radar-prefs.json";
const CHANGELOG_VISIBLE_MARKER = "alpha-map-visible-changelog-20260816-v2";
const VERIFIED_VISIBLE_ROWS = [
  "    {d:'2026-08-16',t:'05 투자매력도 V4 적용 — Nasdaq-100 순위 백분위·중복 감점 제거·외생 데이터와 내부 판단 분리·일일 점수 스냅샷'},",
  "    {d:'2026-08-16',t:'05 투자매력도와 실제 비중조절 우선순위를 분리하고 포트폴리오 집중·중복 노출을 실제 비중조절에 반영'},",
  "    {d:'2026-08-16',t:'05 순위 근거를 EPS 리비전·상승여력 등 실제 점수 기여도로 표시'},",
  "    {d:'2026-08-16',t:'05 추정 리비전 트래커의 중복 설명 블록 제거'},",
  "    {d:'2026-08-16',t:'05 추정 리비전 트래커에서 음수 수치를 빨간색으로 표시'},",
  "    {d:'2026-08-16',t:'05 투자매력도·실제 비중조절 등 주요 항목을 헤더 클릭으로 정렬 가능하게 변경'},",
  "    {d:'2026-08-16',t:'01 토픽 레이더에서 삭제한 카드를 다른 기기에서도 동일하게 유지하도록 서버 동기화'},",
  "    {d:'2026-08-16',t:'사이트 변경 이력 팝업을 실제 배포된 사용자향 변경 기준으로 갱신하도록 수정'},"
].join("\n");

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
      el.append('<script src="/revision-tracker-fix.js?v=20260816-sort-v2" defer></scr' + 'ipt>', { html: true });
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

function patchChangelogText(text) {
  let patched = String(text || "");
  patched = patched.replace(
    "https://api.github.com/repos/SimpleorNothing/ten-bagger/commits?sha=main&per_page=100",
    "/__site_changes"
  );
  patched = patched.replace("if(d<=CURATED_MAX)return;", "if(d<CURATED_MAX)return;");
  if (!patched.includes(CHANGELOG_VISIBLE_MARKER) && patched.includes("var MKT_CHANGELOG=[")) {
    patched = patched.replace(
      "var MKT_CHANGELOG=[",
      "var MKT_CHANGELOG=[\n    /* " + CHANGELOG_VISIBLE_MARKER + " */\n" + VERIFIED_VISIBLE_ROWS
    );
  }
  return patched;
}

async function patchChangelogResponse(response) {
  if (!response || !response.ok) return response;
  const text = await response.text();
  const patched = patchChangelogText(text);
  return withFreshnessHeaders(new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }));
}

async function changelogProbeResponse(request, env) {
  if (!env.ASSETS) return jsonResponse({ ok:false, marker:false, reason:"ASSETS unavailable" }, 503);
  const u = new URL(request.url);
  u.pathname = "/changelog.js";
  u.search = "";
  const raw = await env.ASSETS.fetch(new Request(u.toString(), { method:"GET" }));
  if (!raw.ok) return jsonResponse({ ok:false, marker:false, status:raw.status }, 503);
  const patched = patchChangelogText(await raw.text());
  const marker = patched.includes(CHANGELOG_VISIBLE_MARKER);
  const rankSplit = patched.includes("투자매력도와 실제 비중조절 우선순위를 분리");
  const negativeRed = patched.includes("음수 수치를 빨간색으로 표시");
  return jsonResponse({ ok: marker && rankSplit && negativeRed, marker, rankSplit, negativeRed });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/__version") return versionResponse(env);
    if (url.pathname === "/__site_changes") return siteChangesResponse(request, env);
    if (url.pathname === "/__changelog_probe") return changelogProbeResponse(request, env);
    if (BLOCKED_LLM_PATHS.has(url.pathname)) return disabledResponse(url.pathname);

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