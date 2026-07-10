// Password gate. Runs before static assets (assets.run_worker_first=true),
// so it protects index.html AND the .json data files.
// Password lives in the SITE_PASSWORD secret; a long-lived cookie remembers the device.

const COOKIE = "tb_auth";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year — once entered, this device stays unlocked

async function token(password) {
  const data = new TextEncoder().encode(`ten-bagger:auth:v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time compare of two equal-length hex tokens.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

const htmlHeaders = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };

function page(body) {
  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>알파맵 · 잠금</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root{--txt:#16242d;--dim:#5c6f7e;--line:#d3d9df;--panel:#fff;--bg:#f3f5f7;--err:#e03131}
*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%}
body{font-family:'Pretendard Variable',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--txt);display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:34px 30px;max-width:360px;width:100%;box-shadow:0 10px 40px rgba(22,36,45,.08)}
.mark{font-weight:800;font-size:26px;letter-spacing:-.02em}
.tag{font-size:12px;color:var(--dim);letter-spacing:.16em;text-transform:uppercase;margin-top:4px}
form{margin-top:24px;display:flex;flex-direction:column;gap:12px}
label{font-size:13px;color:var(--dim)}
input[type=password]{font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;width:100%;outline:none}
input[type=password]:focus{border-color:var(--txt)}
button{font:inherit;font-weight:700;font-size:15px;padding:12px;border:none;border-radius:10px;background:var(--txt);color:#fff;cursor:pointer}
button:hover{opacity:.9}
.err{font-size:13px;color:var(--err)}
.hint{font-size:12px;color:var(--dim);margin-top:14px;line-height:1.5}
</style></head><body><div class="card">${body}</div></body></html>`;
}

function loginPage(error) {
  return page(`<div class="mark">알파맵</div>
<div class="tag">Observatory · Locked</div>
<form method="POST" action="/__auth">
<label for="pw">비밀번호</label>
<input id="pw" name="password" type="password" autofocus autocomplete="current-password" required>
${error ? '<div class="err">비밀번호가 올바르지 않습니다.</div>' : ""}
<button type="submit">들어가기</button>
</form>
<div class="hint">한 번 입력하면 이 기기에서는 다음부터 자동으로 열립니다.</div>`);
}

const setupPage = page(`<div class="mark">알파맵</div>
<div class="tag">Setup needed</div>
<div class="hint" style="margin-top:18px">관리자: <code>SITE_PASSWORD</code> 시크릿이 설정되지 않았습니다.<br>
<code>wrangler secret put SITE_PASSWORD</code> 로 비밀번호를 설정하세요.</div>`);

// signals.json 갱신 — GitHub Contents API 프록시
async function handleSignalsUpdate(request, env) {
  const OWNER  = "SimpleorNothing";
  const REPO   = "ten-bagger";
  const BRANCH = "claude/wizardly-rubin-SubA1";
  const PATH   = "signals.json";
  const API    = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
  const gh = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "alphamap-worker",
    Accept: "application/vnd.github+json",
  };

  if (!env.GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN not configured" }),
      { status: 503, headers: { "content-type": "application/json" } });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "invalid json" }),
    { status: 400, headers: { "content-type": "application/json" } }); }

  // 형변환 + 범위 검증 (잘못된 값이 신호등을 오염시키지 않게)
  const num = (v, lo, hi) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
  };
  const payload = {
    asOf: new Date().toISOString().slice(0, 10),
    source: "수동(사이트 폼)",
    vix:        num(body.vix, 0, 150),
    fearGreed:  num(body.fearGreed, 0, 100),
    spDailyPct: num(body.spDailyPct, -30, 30),
    note: "VIX 종가·CNN F&G·S&P 일간. 자동 수집(크론) 기본, 폼은 수동 보정. null이면 페이지 '--' 폴백.",
  };

  // 1) 기존 파일 sha 조회 (없으면 최초 생성)
  let sha = null;
  const cur = await fetch(`${API}?ref=${encodeURIComponent(BRANCH)}`, { headers: gh });
  if (cur.ok) {
    const j = await cur.json();
    sha = j.sha;
  } else if (cur.status !== 404) {
    return new Response(JSON.stringify({ error: "github get failed", status: cur.status }),
      { status: 502, headers: { "content-type": "application/json" } });
  }

  // 2) PUT
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2) + "\n")));
  const putBody = {
    message: `signals: vix=${payload.vix ?? "-"} fg=${payload.fearGreed ?? "-"} sp=${payload.spDailyPct ?? "-"} (web form)`,
    branch: BRANCH,
    content,
    ...(sha ? { sha } : {}),
  };
  const put = await fetch(API, { method: "PUT", headers: gh, body: JSON.stringify(putBody) });
  if (!put.ok) {
    const t = await put.text();
    return new Response(JSON.stringify({ error: "github put failed", status: put.status, detail: t.slice(0, 400) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }

  // 3) 사이트는 1~2분 후 deploy.yml 완료 시 자동 갱신. 즉시 미리보기용 payload echo.
  return new Response(JSON.stringify({ ok: true, payload }),
    { status: 200, headers: { "content-type": "application/json" } });
}

// σ·μ 추정 — Anthropic Messages API 프록시 (브라우저 직접 호출은 CORS·키 부재로 실패하므로 서버측에서 중계)
async function handleEstimate(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json" } });

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "invalid json" }, 400); }

  const tk = (body && body.ticker ? String(body.ticker) : "").trim();
  if (!tk) return json({ error: "ticker required" }, 400);

  const prompt = 'You are a quant. For the stock/ETF ticker or name "' + tk + '", estimate its ANNUALIZED volatility (%) from recent ~1y daily returns, and a reasonable ANNUAL expected drift (%) assumption. Use web search for recent data. Respond with ONLY a compact JSON object, no prose, no markdown fences: {"ticker":"","name":"","annualizedVolPct":number,"suggestedDriftPct":number,"note":"one short sentence in Korean"}';

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1500,
        // 스트리밍 — Opus + web_search(서버툴)는 비스트리밍 시 첫 바이트까지
        // 오래 걸려 api.anthropic.com(Cloudflare) 의 ~100s 한도를 넘기면 524 가 떴다
        // (워커는 이를 502 "anthropic api failed" 로 전달). 스트리밍은 ping/델타로
        // 연결을 유지해 타임아웃을 막는다. 서버측에서 텍스트를 재조립해 동일 형태로 반환.
        stream: true,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20260209", name: "web_search" }],
      }),
    });
  } catch (e) {
    return json({ error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    return json({ error: "anthropic api failed", status: upstream.status, detail: t.slice(0, 400) }, 502);
  }

  // SSE 스트림을 서버측에서 수집해 text 블록을 재조립 — 클라이언트 계약(data.content[].text) 유지.
  let text = "", stopReason = null, errDetail = null;
  try {
    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let ev;
        try { ev = JSON.parse(payload); } catch { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
          text += ev.delta.text;
        } else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) {
          stopReason = ev.delta.stop_reason;
        } else if (ev.type === "error") {
          errDetail = (ev.error && ev.error.message) || "stream error";
        }
      }
    }
  } catch (e) {
    return json({ error: "anthropic stream failed", detail: String(e && e.message ? e.message : e) }, 502);
  }

  if (errDetail) return json({ error: "anthropic api failed", detail: errDetail.slice(0, 400) }, 502);

  // 클라이언트는 data.content 의 text 블록만 사용 → 동일한 형태로 반환.
  return json({ content: [{ type: "text", text: text }], stop_reason: stopReason }, 200);
}

// ===== 메모 저장 — Cloudflare R2 (MEMO_BUCKET) · DA Space 방식 =====
// 메모 노트 JSON 을 R2 오브젝트("notes.json")로 보관. KV 의 25MiB 단일값 한도가 없어
// 이미지(캡쳐) 누적에도 여유가 크다. 클라이언트(/api/memo)는 백엔드를 모른 채 그대로 동작.
const MEMO_KEY = "notes.json";

function memoJson(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleMemoGet(env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(MEMO_KEY);
  const v = obj ? await obj.text() : "";
  return new Response(v && v.trim() ? v : "[]", {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleMemoPut(request, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  let raw;
  try { raw = await request.text(); }
  catch { return memoJson({ error: "read failed" }, 400); }
  let arr;
  try { arr = JSON.parse(raw); }
  catch { return memoJson({ error: "invalid json" }, 400); }
  if (!Array.isArray(arr)) return memoJson({ error: "expected array" }, 400);
  // R2 단일 오브젝트 보호 — 메모 분량으로는 한참 여유인 64MiB 에서 컷.
  if (raw.length > 64 * 1024 * 1024) return memoJson({ error: "too large", bytes: raw.length }, 413);
  await env.MEMO_BUCKET.put(MEMO_KEY, JSON.stringify(arr), {
    httpMetadata: { contentType: "application/json" },
  });
  return memoJson({ ok: true, count: arr.length }, 200);
}

// ===== 캘린더 플래그 저장 — R2(MEMO_BUCKET) 재사용 · 키 calflags.json =====
// 투자 캘린더 행 플래그를 {행키:색} 맵으로 R2 에 보관 → 모든 인증 기기 공유.
const CALFLAGS_KEY = "calflags.json";

async function handleCalflagsGet(env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(CALFLAGS_KEY);
  const v = obj ? await obj.text() : "";
  return new Response(v && v.trim() ? v : "{}", {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleCalflagsPut(request, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  let raw;
  try { raw = await request.text(); }
  catch { return memoJson({ error: "read failed" }, 400); }
  let obj;
  try { obj = JSON.parse(raw); }
  catch { return memoJson({ error: "invalid json" }, 400); }
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return memoJson({ error: "expected object" }, 400);
  if (raw.length > 1024 * 1024) return memoJson({ error: "too large", bytes: raw.length }, 413);
  await env.MEMO_BUCKET.put(CALFLAGS_KEY, JSON.stringify(obj), {
    httpMetadata: { contentType: "application/json" },
  });
  return memoJson({ ok: true, count: Object.keys(obj).length }, 200);
}

// US10Y 데이터 프록시 — 데이터 생성은 us10y 리포의 GitHub Actions(daily-update.yml)가
// 매일 data.json 을 기본 브랜치에 커밋한다. Railway(구 us10y.simpleornothing.com)는
// 배달 전용이었고 트라이얼 만료로 폐기 → GitHub 을 직접 SoT 로 사용.
// 기본 브랜치명은 하드코딩하지 않고 라이브 해소(개명 자기치유), 해소 실패 시 폴백 상수.
// suspended/HTML 페이지를 JSON 으로 착각하지 않도록 본문이 JSON 오브젝트일 때만 통과.
async function handleUs10y() {
  const OWNER = "SimpleorNothing", REPO = "us10y";
  const FALLBACK_BRANCH = "claude/init-samsungda-repo-shgrq";
  const rawUrl = (br) => `https://raw.githubusercontent.com/${OWNER}/${REPO}/${br}/data.json`;

  // 1) 기본 브랜치 라이브 해소 — 브랜치는 거의 안 바뀌므로 엣지 캐시 강하게(6h).
  let branch = FALLBACK_BRANCH;
  try {
    const meta = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers: { "user-agent": "alphamap-worker", "accept": "application/vnd.github+json" },
      cf: { cacheTtl: 21600, cacheEverything: true },
    });
    if (meta.ok) {
      const j = await meta.json();
      if (j && j.default_branch) branch = j.default_branch;
    }
  } catch (_) { /* 해소 실패 → 폴백 상수 사용 */ }

  // 2) data.json 페치 — 해소된 기본 브랜치 우선, 폴백 브랜치 차선.
  const cands = branch === FALLBACK_BRANCH ? [FALLBACK_BRANCH] : [branch, FALLBACK_BRANCH];
  for (const br of cands) {
    try {
      const r = await fetch(rawUrl(br), { cf: { cacheTtl: 900, cacheEverything: true } });
      if (r.ok) {
        const body = await r.text();
        if (body && body.trimStart().startsWith("{")) {
          return new Response(body, {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "public, max-age=900",
            },
          });
        }
      }
    } catch (_) { /* 다음 후보로 폴백 */ }
  }
  return new Response(JSON.stringify({ error: "us10y upstream unavailable" }),
    { status: 502, headers: { "content-type": "application/json" } });
}

// WTI 일별 시계열(2020~현재) 프록시 — Yahoo Finance(CL=F) 우선, Stooq CSV 폴백.
// 서버사이드 fetch 라 브라우저 CORS 무관. 정규화 출력: {source, points:[["YYYY-MM-DD", close], ...]}
async function handleWti() {
  const okJson = (obj) => new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
  const P1 = 1577836800; // 2020-01-01 UTC
  const now = Math.floor(Date.now() / 1000);

  // 1) Yahoo Finance v8 chart
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const u = `https://${host}/v8/finance/chart/CL=F?period1=${P1}&period2=${now}&interval=1d`;
      const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; alphamap/1.0)" }, cf: { cacheTtl: 3600, cacheEverything: true } });
      if (r.ok) {
        const j = await r.json();
        const res = j && j.chart && j.chart.result && j.chart.result[0];
        const ts = res && res.timestamp;
        const cl = res && res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close;
        if (ts && cl && ts.length) {
          const out = [];
          for (let i = 0; i < ts.length; i++) {
            if (cl[i] == null) continue;
            out.push([new Date(ts[i] * 1000).toISOString().slice(0, 10), Math.round(cl[i] * 100) / 100]);
          }
          if (out.length) return okJson({ source: "yahoo", points: out });
        }
      }
    } catch (_) { /* 다음 소스 */ }
  }

  // 2) Stooq CSV 폴백 (Date,Open,High,Low,Close,Volume)
  try {
    const r = await fetch("https://stooq.com/q/d/l/?s=cl.f&i=d&d1=20200101", { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (r.ok) {
      const t = await r.text();
      const lines = t.trim().split("\n");
      const out = [];
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(",");
        if (c.length >= 5 && c[4] && !isNaN(+c[4])) out.push([c[0], Math.round(+c[4] * 100) / 100]);
      }
      if (out.length) return okJson({ source: "stooq", points: out });
    }
  } catch (_) { /* 폴백 실패 */ }

  return new Response(JSON.stringify({ error: "wti upstream unavailable" }),
    { status: 502, headers: { "content-type": "application/json" } });
}

// FRED 시계열 프록시 — fredgraph.csv (무키). ?ids=ID1,ID2,... (영숫자_, 최대 12개)
// 2020-01-01 이후만 반환. 출력: {series:{ID:[["YYYY-MM-DD", value], ...]}}
// 한 시리즈 다운로드: 성공 시 포인트 배열, 항구적 빈값([]) 구분, 실패(네트워크/비200) 시 null.
// cosd=2020-01-01 로 2020년부터 강제 시도하되, 실패하면 cosd 없이(시리즈 기본 구간) 폴백.
function parseFred(text, from) {
  const lo = from || "2020-01-01";
  const lines = text.trim().split("\n");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const d = c[0], v = c[1];
    if (d && d >= lo && v && v !== "." && !isNaN(+v)) out.push([d, +v]);
  }
  return out;
}
async function fredFetch(qs, from) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?" + qs, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ten-bagger/1.0)", "Accept": "text/csv,*/*" },
        // 성공 응답만 엣지 캐시(6h). 4xx/5xx(예: 일시적 403/429)는 캐시하지 않아 자가 복구.
        cf: { cacheTtlByStatus: { "200-299": 21600, "300-599": 0 }, cacheEverything: true },
      });
      if (r.ok) return parseFred(await r.text(), from);
    } catch (_) { /* 재시도 */ }
    await new Promise((res) => setTimeout(res, 250 * (attempt + 1))); // 백오프
  }
  return null;
}
async function fredOne(id, from) {
  const eid = encodeURIComponent(id);
  const lo = from || "2020-01-01";
  // 1순위: from 부터. 빈/실패면 2순위: cosd 없이 기본 구간.
  let r = await fredFetch("id=" + eid + "&cosd=" + lo, from);
  if (r && r.length) return r;
  const r2 = await fredFetch("id=" + eid, from);
  if (r2 && r2.length) return r2;
  return (r === null && r2 === null) ? null : (r2 || r || []);
}
async function handleFred(url) {
  const ids = (url.searchParams.get("ids") || "").split(",")
    .map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_]{1,32}$/.test(s)).slice(0, 12);
  // 선택적 from=YYYY-MM-DD (기본 2020-01-01). 전년동월비 산출용으로 더 이른 시작점 허용.
  const fromRaw = (url.searchParams.get("from") || "").trim();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : "2020-01-01";
  if (!ids.length) {
    return new Response(JSON.stringify({ error: "ids required" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const series = {};
  let anyFail = false;
  // 순차 처리 — FRED 동시요청 버스트(throttle) 회피.
  for (const id of ids) {
    const r = await fredOne(id, from);
    if (r === null) { anyFail = true; series[id] = []; } else { series[id] = r; }
  }
  // 일부라도 실패하면 짧게(2분)만 캐시해 자가 복구, 전부 성공 시 6h 캐시.
  const ttl = anyFail ? 120 : 21600;
  return new Response(JSON.stringify({ series }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + ttl },
  });
}

export default {
  async fetch(request, env) {
    const password = env.SITE_PASSWORD;

    // Fail closed: never serve the dashboard or data if no password is configured.
    if (!password) {
      return new Response(setupPage, { status: 503, headers: htmlHeaders });
    }

    const expected = await token(password);
    const url = new URL(request.url);

    // Login submission.
    if (request.method === "POST" && url.pathname === "/__auth") {
      const form = await request.formData();
      const supplied = await token(String(form.get("password") ?? ""));
      if (safeEqual(supplied, expected)) {
        return new Response(null, {
          status: 303,
          headers: {
            location: "/",
            "set-cookie": `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      return new Response(loginPage(true), { status: 401, headers: htmlHeaders });
    }

    // Already authenticated on this device.
    if (safeEqual(readCookie(request.headers.get("Cookie"), COOKIE), expected)) {
      // signals 갱신 엔드포인트 (인증된 디바이스만 도달)
      if (request.method === "POST" && url.pathname === "/api/signals") {
        return handleSignalsUpdate(request, env);
      }
      // σ·μ AI 추정 프록시 (인증된 디바이스만 도달)
      if (request.method === "POST" && url.pathname === "/api/estimate") {
        return handleEstimate(request, env);
      }
      // US10Y 데이터 프록시 (인증된 디바이스만 도달) — 매일 자동 갱신 원본 중계
      if (request.method === "GET" && url.pathname === "/api/us10y") {
        return handleUs10y();
      }
      // WTI 일별 시계열(2020~현재) 프록시 (인증된 디바이스만 도달)
      if (request.method === "GET" && url.pathname === "/api/wti") {
        return handleWti();
      }
      // FRED 시계열 프록시(정책금리·CPI 2020+) (인증된 디바이스만 도달)
      if (request.method === "GET" && url.pathname === "/api/fred") {
        return handleFred(url);
      }
      // 메모 저장/조회 (Cloudflare KV) — 인증된 디바이스만 도달
      if (url.pathname === "/api/memo") {
        if (request.method === "GET") return handleMemoGet(env);
        if (request.method === "PUT") return handleMemoPut(request, env);
        return memoJson({ error: "method not allowed" }, 405);
      }
      // 캘린더 플래그 저장/조회 (R2 · 모든 기기 공유) — 인증된 디바이스만 도달
      if (url.pathname === "/api/calflags") {
        if (request.method === "GET") return handleCalflagsGet(env);
        if (request.method === "PUT") return handleCalflagsPut(request, env);
        return memoJson({ error: "method not allowed" }, 405);
      }
      const res = await env.ASSETS.fetch(request);
      // HTML 응답에 1Y 호버 차트 모듈 주입 (index.html 본문은 그대로 유지하기 위한 worker-side 주입).
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html")) {
        const transformed = new HTMLRewriter()
          .on("body", { element(el) {
            el.append('<script src="/hover-chart.js" defer></scr' + 'ipt>', { html: true });
            el.append('<script src="/flags.js" defer></scr' + 'ipt>', { html: true });
          } })
          .transform(res);
        // 대시보드 HTML 은 캐시 금지 — Workers Assets 기본 캐시 헤더 때문에 새 배포가
        // 엣지/브라우저에 안 잡히는 문제(배포는 성공하는데 화면은 옛날 그대로)를 막는다.
        // 로그인 페이지(htmlHeaders)와 동일하게 항상 최신 index.html 을 받게 한다.
        const headers = new Headers(transformed.headers);
        headers.set("cache-control", "no-store");
        return new Response(transformed.body, { status: transformed.status, headers });
      }
      return res;
    }

    // Anything else (page or .json) gets the login screen, never the data.
    return new Response(loginPage(false), { status: 401, headers: htmlHeaders });
  },
};
