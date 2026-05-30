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
    sidecarKR:  body.sidecarKR === true,
    spDailyPct: num(body.spDailyPct, -30, 30),
    note: "VIX 종가·CNN F&G·한국 사이드카·S&P 일간. null이면 페이지 '--' 폴백. 충격 시 1회 갱신.",
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
    message: `signals: vix=${payload.vix ?? "-"} fg=${payload.fearGreed ?? "-"} side=${payload.sidecarKR ? "ON" : "off"} (web form)`,
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
      return env.ASSETS.fetch(request);
    }

    // Anything else (page or .json) gets the login screen, never the data.
    return new Response(loginPage(false), { status: 401, headers: htmlHeaders });
  },
};
