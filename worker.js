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

// Anthropic 오류 응답을 상태코드별 조치 안내가 붙은 한국어 메시지로 변환.
// 프론트는 error 필드만 표시하므로(insight.js) 원인·조치를 여기서 문자열에 접어 넣는다.
// 상태코드·타입별로 무엇을 해야 하는지가 갈린다: 키(401)·권한(403)·모델(404)·레이트리밋(429)·크레딧(400)·과부하(529).
function describeAnthropicError(status, bodyText) {
  let type = "", msg = "";
  try {
    const j = JSON.parse(bodyText || "");
    const e = (j && j.error) || j;
    if (e) { type = e.type || ""; msg = e.message || ""; }
  } catch { msg = (bodyText || "").slice(0, 200); }
  const lowCredit = type === "invalid_request_error" && /credit balance/i.test(msg);
  const hint =
    status === 401 || type === "authentication_error" ? "API 키 인증 실패 — ANTHROPIC_API_KEY 확인" :
    status === 403 || type === "permission_error"     ? "권한 없음 — 키·모델 접근 권한 확인" :
    status === 404 || type === "not_found_error"      ? "모델 사용 불가 — 모델 ID·계정 접근 확인" :
    status === 429 || type === "rate_limit_error"     ? "레이트리밋 초과 — 잠시 후 재시도" :
    lowCredit                                          ? "크레딧 부족 — Anthropic 콘솔에서 크레딧 충전" :
    status === 529 || type === "overloaded_error"      ? "Anthropic 과부하 — 잠시 후 재시도" :
    status === 400 || type === "invalid_request_error" ? "요청 오류" :
    status >= 500                                      ? "Anthropic 서버 오류 — 잠시 후 재시도" : "";
  return "anthropic api failed (" + status + (hint ? " · " + hint : "") + ")" + (msg ? ": " + msg.slice(0, 200) : "");
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
    return json({ error: describeAnthropicError(upstream.status, t), status: upstream.status, detail: t.slice(0, 400) }, 502);
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

  if (errDetail) return json({ error: "anthropic api failed: " + errDetail.slice(0, 200), detail: errDetail.slice(0, 400) }, 502);

  // 클라이언트는 data.content 의 text 블록만 사용 → 동일한 형태로 반환.
  return json({ content: [{ type: "text", text: text }], stop_reason: stopReason }, 200);
}

// ===== 07 자문단(Council) — 원탁 토론(Claude) · 유튜브 관점 추출(Gemini) =====

// 유튜브 URL → 발화자 투자 관점 요약. Gemini 가 fileData(file_uri)로 URL 을 직접 처리
// (NotebookLM 방식). 공개 영상만·프리뷰 무료·하루 8h 한도. 키 부재 시 503(무해).
async function handleYtView(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json" } });
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
  const ytUrl = (body && body.url ? String(body.url) : "").trim();
  const exp = (body && body.expert) ? body.expert : {};
  // mode='insight' → 03 관점과 정보 얻기가 부르는 '스크립트 추출' 모드. 04 전문가 원탁은 mode 무전달(기본).
  const mode = (body && body.mode) ? String(body.mode) : "";
  const insightMode = mode === "insight";
  if (!/youtu\.?be/.test(ytUrl)) return json({ error: "youtube url required" }, 400);
  const _m = ytUrl.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  const ytCanon = _m ? ("https://www.youtube.com/watch?v=" + _m[1]) : ytUrl;
  const geminiModel = env.GEMINI_MODEL || "gemini-3.5-flash";  // 모델 교체 = 시크릿/var만(코드 재배포 불요)

  // 04 전문가 원탁: 한 발화자의 관점을 압축 요약(view+stance).
  // 03 관점과 정보 얻기: 영상 내용을 '스크립트에 가깝게' 충실히 전사 → 다운스트림 /api/insight 가 8레이어·단계로 재구조화.
  const prompt = insightMode
    ? ("이 유튜브 영상의 내용을 한국어로 최대한 충실하게 전사·정리해줘. 요약이 아니라 스크립트에 가깝게 — " +
       "발화자의 투자 관점·논거와 언급한 종목·티커, 8레이어(L1 모델/SW · L2 컴퓨트 · L3 메모리 · L4 패키징/장비 · L5 서버 · L6 옵티컬 · L7 전력/냉각 · L8 발전/그리드), 수치·전망을 시간 순으로 빠짐없이 담아라. " +
       "반드시 JSON만 출력하고 다른 말은 하지 마. " +
       '스키마: {"title":"영상 제목 추정","channel":"채널명 추정","transcript":"영상 내용 상세 전사·정리(문단 여러 개, 충실히)","view":"발화자 핵심 관점 2~3문장","stance":"강세|중립|약세"}')
    : ("이 유튜브 영상에서 발화자 '" + (exp.name || "") + "'(" + (exp.field || "") + ")의 " +
       "핵심 투자 관점을 한국어로 요약해줘. 반드시 JSON만 출력하고 다른 말은 하지 마. " +
       '스키마: {"view":"2~3문장 관점 요약","stance":"강세|중립|약세","transcript":"핵심 발언 원문 발췌(2~4문장)"}');

  let up;
  try {
    up = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent",
      { method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [ { text: prompt }, { file_data: { file_uri: ytCanon } } ] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: insightMode ? 8192 : 2048 },
        }),
      });
  } catch (e) {
    return json({ error: "gemini fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const g = await up.json().catch(() => null);
  if (!up.ok || !g) {
    const d = (g && g.error && g.error.message) ? g.error.message : "";
    return json({ error: "gemini api failed (" + up.status + ")" + (d ? ": " + d.slice(0, 200) : "") }, 502);
  }
  const parts = (g.candidates && g.candidates[0] && g.candidates[0].content && g.candidates[0].content.parts) || [];
  const text = parts.map((x) => x.text || "").join("");
  if (!text.trim()) return json({ error: "빈 응답 — 공개 영상인지 확인하거나 텍스트 탭을 사용하세요" }, 502);
  // 클라이언트 계약: data.content[].text (estimate/insight 와 동일)
  return json({ content: [{ type: "text", text: text }] }, 200);
}

// 자문단 원탁 토론(Claude). web_search 미사용이라 비스트리밍으로도 100s 여유.
async function handleCouncil(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json" } });
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
  const personas = (body && Array.isArray(body.personas)) ? body.personas : [];
  const situation = (body && body.situation) ? String(body.situation) : "";
  const topic = (body && body.topic) ? String(body.topic).slice(0, 300).trim() : "";
  if (personas.length < 2) return json({ error: "personas>=2 required" }, 400);

  const sys =
    "너는 '알파맵' AI 인프라 투자 관측소의 자문단 원탁 시뮬레이터다. 참여자는 실존 공개 인물의 '공개 발언·콘텐츠 기반 관점(field/view)'과 「알파맵」좌장(진실원천 SoT)이다. " +
    "각 인물의 실제 발언을 지어내지 마라 — 그의 공개된 분석 렌즈(field/view)를 '현 상황'에 적용해 '이 관점에서 보면 …' 식으로 해석한다(가짜 인용·구체적 미발화 예측 금지). 「알파맵」좌장은 라이브 게이트·보유·γ를 전제로 팩트·게이트·스틸맨을 강제하되 결론을 확정하지 않는다. " +
    "입력에 topic(토론 주제)이 있으면 그것을 원탁 중심 논제로 삼아 각 인물이 자기 렌즈로 그 논제를 다투게 하고 situation은 전제 배경으로 깐다. diagnosis는 그 논제에 대한 한 줄 답이어야 한다. topic이 비면 현 상황 종합 진단. " +
    "규율: 결론 먼저 · 게이트는 전부 AND · 매수 권유가 아니라 프레임 도출 · 논제 시계와 가격·규율 시계 분리 · " +
    "narrative≠numbers(관점일 뿐 숫자 파일 제안 금지). 한국어, 종결어 '~하겠습니다/~할게'. " +
    "반드시 아래 JSON만 출력(코드펜스·설명 금지).\n" +
    'JSON: {"diagnosis":"한 줄 종합 진단","board":[{"id":"페르소나 id","take":"2~3문장","call":"강세|중립|약세"}],' +
    '"consensus":["합의점"],"tension":["이견·긴장점"],"actions":["게이트 조건부 구체 액션"],"steelman":"합의에 대한 반론 한 단락"}';

  let up;
  try {
    up = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 2500, system: sys,
        messages: [{ role: "user", content: JSON.stringify({ topic: topic, personas: personas, situation: situation }) }] }),
    });
  } catch (e) {
    return json({ error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const t = await up.text();
  if (!up.ok) return json({ error: describeAnthropicError(up.status, t), status: up.status }, 502);
  let data; try { data = JSON.parse(t); } catch { return json({ error: "anthropic parse failed" }, 502); }
  return json({ content: data.content || [] }, 200);
}

// 1인 심층 자문 — 지목한 전문가 한 명의 렌즈로 깊은 진단·직접 실행 조언.
// 원탁 토론(다인 합의/이견)과 별개다: 좌장 오버레이 없이 그 전문가 렌즈만 순수하게 쓰되,
// 그 렌즈 자체의 리스크 규율을 watch(자기 반증)로 강제한다. narrative≠numbers(관점 텍스트일 뿐 숫자 파일 불변).
async function handleCouncilAsk(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json" } });
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
  const expert = (body && body.expert && typeof body.expert === "object") ? body.expert : null;
  if (!expert || !expert.name) return json({ error: "expert required" }, 400);
  const situation = (body && body.situation) ? String(body.situation) : "";
  const question = (body && body.question) ? String(body.question).slice(0, 300).trim() : "";

  const sys =
    "너는 '알파맵' AI 인프라 투자 관측소 자문단 중 지목된 전문가 한 명의 '공개 발언·콘텐츠 기반 관점(field/view)'을 깊이 있게 대변하는 1인 심층 자문가다. " +
    "여러 명의 토론이 아니라 이 한 전문가의 렌즈로만 답한다 — 다른 패널·좌장(알파맵 SoT)의 게이트 판정을 끌어오지 말고, 오직 이 인물의 field/view 관점을 '현 상황(situation)'과 'question'에 깊게 적용한다. " +
    "그의 실제 발언을 지어내지 마라 — 공개된 분석 렌즈를 적용해 '이 관점에서 깊이 보면 …' 식으로 해석한다(가짜 인용·구체적 미발화 예측 금지). 관점 시뮬레이션이며 투자자문이 아니다. " +
    "얕게 요약하지 말고 깊게 진단하라 — 필요하면 AI 인프라 8레이어(L1 모델/SW→L2 컴퓨트→L3 메모리→L4 패키징/장비→L5 서버→L6 옵티컬→L7 전력/냉각→L8 발전/그리드) 프레임으로 근거를 전개한다. " +
    "question 이 있으면 그 물음에 직접 답하고(answer), 없으면 answer 는 빈 문자열로 두고 이 렌즈로 본 현 상황 심층 진단을 낸다. " +
    "advice 는 이 전문가라면 취할 '직접적이고 구체적인 실행 조언'까지 낸다(무엇을 어느 조건에서 늘리고 줄이나) — 다만 이 렌즈의 판단일 뿐 확정 매매 지시가 아니다. " +
    "watch 는 '이 렌즈가 틀리거나 꺾이는 트리거' = 이 전문가 자신이 인정하는 반증 조건(자기 스틸맨)이며 반드시 채운다. " +
    "규율: 결론 먼저 · narrative≠numbers(관점 텍스트일 뿐 숫자 파일 변경 제안 금지) · 한국어, 종결어 '~하겠습니다/~할게' · '및' 회피 · 모바일 친화. " +
    "반드시 아래 JSON만 출력(코드펜스·설명 금지).\n" +
    'JSON: {"diagnosis":"이 렌즈의 심층 진단 3~6문장","basis":["근거(레이어·논점) 3~5개"],"advice":["직접 실행 조언 2~4개"],"watch":["이 렌즈가 꺾이는 자기 반증 트리거 2~3개"],"answer":"question 이 있으면 그 물음에 대한 직접 답, 없으면 빈 문자열","stance":"강세|중립|약세"}';

  let up;
  try {
    up = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 3500, system: sys,
        messages: [{ role: "user", content: JSON.stringify({ expert: { name: expert.name, field: expert.field || "", stance: expert.stance || "", view: expert.view || "" }, question: question, situation: situation }) }] }),
    });
  } catch (e) {
    return json({ error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const t = await up.text();
  if (!up.ok) return json({ error: describeAnthropicError(up.status, t), status: up.status }, 502);
  let data; try { data = JSON.parse(t); } catch { return json({ error: "anthropic parse failed" }, 502); }
  return json({ content: data.content || [] }, 200);
}

// 기사·글 URL → 전문가 '주요 관점' 요약. 유튜브는 /api/yt-view 사용.
// 서버가 그 URL 본문을 '직접 페치'해 텍스트를 뽑고 Claude(비스트리밍)로 요약한다
// (web_search 로 검색하지 않음 → 특정 URL을 빠르고 확실하게 읽는다).
// 차단·JS 렌더·페이월로 본문이 얇으면 view 를 빈 문자열로 반환(개별 건너뜀).
function stripHtmlToText(html) {
  let t = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t　]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
  return t;
}
async function handleCouncilRead(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json" } });
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
  const url = (body && body.url ? String(body.url) : "").trim().slice(0, 500);
  const exp = (body && body.expert) ? body.expert : {};
  if (!/^https?:\/\//.test(url)) return json({ error: "url required" }, 400);

  const emptyOut = (title) => json({ content: [{ type: "text", text: JSON.stringify({ title: title || "", view: "", stance: "중립" }) }] }, 200);

  // 1) 기사 본문 직접 페치 → 텍스트 추출
  let pageText = "", pageTitle = "";
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 12000);
    const resp = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko,en-US;q=0.8,en;q=0.6",
      },
    });
    clearTimeout(to);
    const ct = (resp.headers.get("content-type") || "").toLowerCase();
    if (resp.ok && /html|text|xml/.test(ct)) {
      const html = (await resp.text()).slice(0, 800000);
      const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      pageTitle = tm ? tm[1].replace(/\s+/g, " ").trim().slice(0, 200) : "";
      pageText = stripHtmlToText(html).slice(0, 16000);
    }
  } catch (_e) { /* 페치 실패 → 빈 본문 */ }

  // 본문이 너무 짧으면(차단·JS 렌더·페이월) 확보 실패 → 개별 건너뜀
  if (pageText.replace(/\s/g, "").length < 200) return emptyOut(pageTitle);

  // 2) Claude 로 관점 요약 (비스트리밍 · 빠름)
  const sys =
    "너는 투자 전문가의 발언·기사를 그 전문가의 '주요 관점'으로 요약하는 도구다. 핵심 투자 관점만 한국어로. " +
    "narrative≠numbers: 관점 텍스트만 만들고 숫자 파일 변경은 제안하지 마라. 결론 먼저, 문장은 짧게. " +
    '반드시 JSON 객체 하나만 출력(코드펜스·서문·후기 금지): {"title":"글 제목(불명확하면 빈 문자열)","view":"2~3문장 관점 요약","stance":"강세|중립|약세"}';
  const user = JSON.stringify({ expert: exp.name || "", field: exp.field || "", url: url, pageTitle: pageTitle, content: pageText });

  let up;
  try {
    up = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 700, system: sys, messages: [{ role: "user", content: user }] }),
    });
  } catch (e) {
    return json({ error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const t = await up.text();
  if (!up.ok) return json({ error: describeAnthropicError(up.status, t), status: up.status }, 502);
  let data; try { data = JSON.parse(t); } catch { return json({ error: "anthropic parse failed" }, 502); }
  return json({ content: data.content || [] }, 200);
}

// 텍스트/파일 → 전문가 '주요 관점' 요약(Claude). 03 인테이크와 별개로 자문단 전용.
async function handleCouncilSummary(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json" } });
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
  const content = (body && body.content) ? String(body.content).slice(0, 16000) : "";
  const expert = (body && body.expert) ? body.expert : {};
  const source = (body && body.source) ? String(body.source) : "";
  if (!content.trim()) return json({ error: "content required" }, 400);

  const sys =
    "너는 투자 전문가의 발언/기사를 그 전문가의 '주요 관점'으로 요약하는 도구다. 핵심 투자 관점만 한국어로. " +
    "narrative≠numbers: 관점 텍스트만 만들고 숫자 파일 변경은 제안하지 마라. " +
    '반드시 JSON만 출력: {"view":"2~3문장 관점 요약","stance":"강세|중립|약세"}';
  const user = JSON.stringify({ expert: expert.name || "", field: expert.field || "", source: source, content: content });

  let up;
  try {
    up = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 700, system: sys, messages: [{ role: "user", content: user }] }),
    });
  } catch (e) {
    return json({ error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const t = await up.text();
  if (!up.ok) return json({ error: describeAnthropicError(up.status, t), status: up.status }, 502);
  let data; try { data = JSON.parse(t); } catch { return json({ error: "anthropic parse failed" }, 502); }
  return json({ content: data.content || [] }, 200);
}

// ===== 07 자문단 — 관점 갱신 감사 로그(R2 · council_log.json) =====
const COUNCIL_LOG_KEY = "council_log.json";
async function handleCouncilLogGet(env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(COUNCIL_LOG_KEY);
  const v = obj ? await obj.text() : "";
  return new Response(v && v.trim() ? v : "[]", {
    status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
async function handleCouncilLogPost(request, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  let e;
  try { e = await request.json(); } catch { return memoJson({ error: "invalid json" }, 400); }
  if (!e || !e.expert || !e.view) return memoJson({ error: "entry(expert,view) required" }, 400);
  const obj = await env.MEMO_BUCKET.get(COUNCIL_LOG_KEY);
  let arr = [];
  if (obj) { try { arr = JSON.parse(await obj.text()); } catch (_) { arr = []; } }
  if (!Array.isArray(arr)) arr = [];
  arr.push({
    at: (typeof e.at === "string" && e.at) ? e.at : new Date().toISOString(),
    expertId: String(e.expertId || ""),
    expert: String(e.expert || ""),
    field: String(e.field || ""),
    source: String(e.source || ""),
    ref: String(e.ref || "").slice(0, 500),
    refs: Array.isArray(e.refs)
      ? e.refs.slice(0, 24)
          .map((x) => ({ label: String((x && x.label) || "").slice(0, 24), url: String((x && x.url) || "").slice(0, 500) }))
          .filter((x) => x.url)
      : [],
    stance: String(e.stance || ""),
    view: String(e.view || "").slice(0, 2000),
  });
  if (arr.length > 5000) arr = arr.slice(-5000);
  await env.MEMO_BUCKET.put(COUNCIL_LOG_KEY, JSON.stringify(arr), { httpMetadata: { contentType: "application/json" } });
  return memoJson({ ok: true, count: arr.length }, 200);
}

const COUNCIL_DISC_KEY = "council_discussions.json";
async function handleCouncilDiscGet(env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(COUNCIL_DISC_KEY);
  const v = obj ? await obj.text() : "";
  return new Response(v && v.trim() ? v : "[]", { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
async function handleCouncilDiscPost(request, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  let e;
  try { e = await request.json(); } catch { return memoJson({ error: "invalid json" }, 400); }
  if (!e || !e.diagnosis) return memoJson({ error: "diagnosis required" }, 400);
  const obj = await env.MEMO_BUCKET.get(COUNCIL_DISC_KEY);
  let arr = [];
  if (obj) { try { arr = JSON.parse(await obj.text()); } catch (_) { arr = []; } }
  if (!Array.isArray(arr)) arr = [];
  arr.push({
    at: (typeof e.at === "string" && e.at) ? e.at : new Date().toISOString(),
    members: Array.isArray(e.members) ? e.members.slice(0, 12).map(String) : [],
    diagnosis: String(e.diagnosis || "").slice(0, 1000),
    board: Array.isArray(e.board) ? e.board.slice(0, 12) : [],
    consensus: Array.isArray(e.consensus) ? e.consensus.slice(0, 20) : [],
    tension: Array.isArray(e.tension) ? e.tension.slice(0, 20) : [],
    actions: Array.isArray(e.actions) ? e.actions.slice(0, 20) : [],
    steelman: String(e.steelman || "").slice(0, 2000),
  });
  if (arr.length > 500) arr = arr.slice(-500);
  await env.MEMO_BUCKET.put(COUNCIL_DISC_KEY, JSON.stringify(arr), { httpMetadata: { contentType: "application/json" } });
  return memoJson({ ok: true, count: arr.length }, 200);
}

// ===== 원탁 로스터(패널 명단) — R2(MEMO_BUCKET) · 추가·삭제·편집 SoT =====
// 전문가 카드 명단(누가 앉나 + 정체성 필드)의 서버 저장소. 존재하면 인라인 기본 6인을
// 대체한다(클라 council-roster.js 가 병합). 관점 텍스트 갱신은 여전히 council_log 가 덮는다.
// narrative≠numbers — 관점·명단 텍스트일 뿐 숫자 파일 불변.
const COUNCIL_ROSTER_KEY = "council_roster.json";
async function handleCouncilRosterGet(env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(COUNCIL_ROSTER_KEY);
  const v = obj ? await obj.text() : "";
  return new Response(v && v.trim() ? v : "{}", { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
function sanitizeRosterExpert(e) {
  if (!e || typeof e !== "object") return null;
  const s = (x, n) => String(x == null ? "" : x).slice(0, n);
  const id = s(e.id, 40).trim();
  const name = s(e.name, 40).trim();
  if (!id || !name) return null;
  const bench = (["chair", "thesis", "price"].indexOf(e.bench) >= 0) ? e.bench : "thesis";
  const stance = (["강세", "중립", "약세"].indexOf(e.stance) >= 0) ? e.stance : "중립";
  const cfg = (e.cfg && typeof e.cfg === "object") ? e.cfg : {};
  const cfgOut = {};
  ["id", "skin", "hair", "style", "disc", "shirt"].forEach((k) => { if (typeof cfg[k] === "string") cfgOut[k] = String(cfg[k]).slice(0, 16); });
  ["glasses", "beard", "emblem"].forEach((k) => { if (typeof cfg[k] === "boolean") cfgOut[k] = cfg[k]; });
  if (!cfgOut.id) cfgOut.id = "g" + id.slice(0, 8);
  return { id, bench, name, chip: s(e.chip, 40), field: s(e.field, 80), stance, updated: s(e.updated, 80) || "수동 편집", view: s(e.view, 1500), cfg: cfgOut, custom: e.custom === true };
}
async function handleCouncilRosterPost(request, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  let b;
  try { b = await request.json(); } catch { return memoJson({ error: "invalid json" }, 400); }
  const inList = (b && Array.isArray(b.experts)) ? b.experts : null;
  if (!inList) return memoJson({ error: "experts[] required" }, 400);
  const seen = {}; const experts = [];
  for (const raw of inList.slice(0, 40)) {
    const e = sanitizeRosterExpert(raw);
    if (!e || seen[e.id]) continue;
    seen[e.id] = 1; experts.push(e);
    if (experts.length >= 24) break;
  }
  const out = { asOf: new Date().toISOString().slice(0, 10), experts };
  await env.MEMO_BUCKET.put(COUNCIL_ROSTER_KEY, JSON.stringify(out), { httpMetadata: { contentType: "application/json" } });
  return memoJson({ ok: true, count: experts.length }, 200);
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

// ===== 03 관점과 정보 — 인사이트 저장(R2 · insights.json) =====
// 증권사 리포트·기사·유튜브에서 뽑아낸 "관점 카드"를 모든 인증 기기가 공유하도록 R2 에 보관.
// 채택(adopted)된 클레임만 다른 메뉴(01/02/04/05)에 에코된다 — 선별은 사람이 한다.
const INSIGHTS_KEY = "insights.json";

async function handleInsightsGet(env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(INSIGHTS_KEY);
  const v = obj ? await obj.text() : "";
  return new Response(v && v.trim() ? v : "[]", {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// 저장 원문 영구 링크 — 인테이크 때 넣은 본문(rec.raw)을 id 로 되불러 보여준다.
// 채택 관점 카드의 "저장 원문 ↗" 이 여기로 온다(원문 URL 이 없거나 사라져도 근거가 남게).
function hesc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function insightRawPage(rec) {
  const s = (rec && rec.src) || {};
  const meta = [s.publisher, s.kind, s.date].filter(Boolean).join(" · ");
  const body = String((rec && rec.raw) || "");
  const cutNote = rec && rec.rawcut
    ? `<p class="note">원문 ${Number(rec.rawcut).toLocaleString()}자 중 앞 ${body.length.toLocaleString()}자만 저장됨(상한 20,000자).</p>`
    : "";
  const link = s.url ? `<a href="${hesc(s.url)}" target="_blank" rel="noopener">원문 링크 ↗</a>` : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${hesc(s.title || "저장 원문")} — 알파맵</title>
<style>
 body{margin:0;padding:28px 20px 60px;background:#f3f2ef;color:#16242d;font-family:"Noto Serif KR",serif;line-height:1.7}
 main{max-width:820px;margin:0 auto}
 .kick{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a9299;margin:0 0 8px}
 h1{font-size:24px;line-height:1.4;margin:0 0 8px}
 .meta{font-size:13px;color:#68727a;margin:0 0 6px}
 .note{font-size:13px;color:#68727a;margin:0 0 6px}
 a{color:#1c5fd6;font-weight:700;text-decoration:none;font-size:13px}
 a:hover{text-decoration:underline}
 pre{white-space:pre-wrap;word-break:break-word;margin:16px 0 0;padding:16px;background:#fff;border:1px solid #e2e0da;border-radius:3px;font-family:inherit;font-size:15px;color:#3f4a52}
 .back{display:inline-block;margin-top:22px}
</style></head><body><main>
 <p class="kick">Insight Intake · 저장 원문</p>
 <h1>${hesc(s.title || "(제목 없음)")}</h1>
 <p class="meta">${hesc(meta || "출처 미상")}</p>
 ${link}
 ${cutNote}
 <pre>${hesc(body) || "(저장된 원문 없음 — URL 만으로 뽑은 자료)"}</pre>
 <a class="back" href="/">← 알파맵으로</a>
</main></body></html>`;
}
async function handleInsightRaw(url, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) return memoJson({ error: "id required" }, 400);
  const obj = await env.MEMO_BUCKET.get(INSIGHTS_KEY);
  let arr = [];
  try { arr = JSON.parse(obj ? await obj.text() : "[]"); } catch { arr = []; }
  const rec = Array.isArray(arr) ? arr.find((x) => x && x.id === id) : null;
  if (!rec) return new Response("<!doctype html><meta charset=utf-8><p>해당 자료를 찾을 수 없습니다(삭제됐거나 id 불일치).", {
    status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
  return new Response(insightRawPage(rec), {
    status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

async function handleInsightsPut(request, env) {
  if (!env.MEMO_BUCKET) return memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  let raw;
  try { raw = await request.text(); }
  catch { return memoJson({ error: "read failed" }, 400); }
  let arr;
  try { arr = JSON.parse(raw); }
  catch { return memoJson({ error: "invalid json" }, 400); }
  if (!Array.isArray(arr)) return memoJson({ error: "expected array" }, 400);
  if (raw.length > 16 * 1024 * 1024) return memoJson({ error: "too large", bytes: raw.length }, 413);
  await env.MEMO_BUCKET.put(INSIGHTS_KEY, JSON.stringify(arr), {
    httpMetadata: { contentType: "application/json" },
  });
  return memoJson({ ok: true, count: arr.length }, 200);
}

// Anthropic Messages 프록시(공용) — SSE 를 서버측에서 재조립해 텍스트만 반환.
// (handleEstimate 와 동일한 이유로 스트리밍: Opus + web_search 는 비스트리밍 시 100s 한도에 걸린다.)
async function anthropicText(env, prompt, useSearch, maxTokens) {
  const payload = {
    model: "claude-opus-4-8",
    max_tokens: maxTokens || 4000,
    stream: true,
    messages: [{ role: "user", content: prompt }],
  };
  if (useSearch) payload.tools = [{ type: "web_search_20260209", name: "web_search" }];

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) };
  }
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    return { error: describeAnthropicError(upstream.status, t), status: upstream.status, detail: t.slice(0, 400) };
  }

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
        const p = line.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        let ev;
        try { ev = JSON.parse(p); } catch { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") text += ev.delta.text;
        else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
        else if (ev.type === "error") errDetail = (ev.error && ev.error.message) || "stream error";
      }
    }
  } catch (e) {
    return { error: "anthropic stream failed", detail: String(e && e.message ? e.message : e) };
  }
  if (errDetail) return { error: "anthropic api failed: " + errDetail.slice(0, 200), detail: errDetail.slice(0, 400) };
  return { text: text, stop_reason: stopReason };
}

// 관점 추출 — 리포트/기사/유튜브 본문(또는 URL)을 알파맵 프레임으로 구조화.
// 규율은 프롬프트에 박아 넣는다: narrative≠numbers · 상대가치 · 가격상승≠강등 · 사람 승인 필수.
async function handleInsight(request, env) {
  if (!env.ANTHROPIC_API_KEY) return memoJson({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); }
  catch { return memoJson({ error: "invalid json" }, 400); }

  const url = String((body && body.url) || "").slice(0, 500);
  let text = String((body && body.text) || "");
  if (text.length > 120000) text = text.slice(0, 120000);
  if (!text.trim() && !url.trim()) return memoJson({ error: "text or url required" }, 400);

  const useSearch = !text.trim() && !!url.trim();

  const prompt = [
    "너는 'AI 인프라 8레이어' 관측소(알파맵)의 리서치 애널리스트다. 아래 자료에서 '유의미한 관점·정보'만 뽑아 구조화한다.",
    "",
    "[프레임]",
    "· 8레이어: L1 모델/소프트웨어 · L2 컴퓨트(GPU/ASIC) · L3 메모리 · L4 패키징/장비 · L5 서버 · L6 옵티컬 · L7 전력/냉각 · L8 발전/그리드. (해당 없으면 macro 또는 기타)",
    "· 단계(Dawn Map): 태동 → 초입 → 가속 → 성숙 → 과열.",
    "",
    "[선별 규율 — 반드시 지킬 것]",
    "1. narrative ≠ numbers: 발표·키노트·전망·M&A 논의 같은 내러티브는 type='narrative' 이며 route 는 최대 'signal_log' 까지만. 숫자 파일(earnings/judgment/stage/holdings) 변경을 제안하지 마라.",
    "   실적 비트/미스, 가이더스 상향/하향, 확정 수주·계약, 확정된 가격·수급 데이터만 type='numbers'.",
    "2. 상대가치가 핵심: '이 종목에 호재인가'가 아니라 '어느 레이어가 싸지고 어느 레이어가 비싸졌는가'를 바꾸는지로 평가하라.",
    "3. 가격 상승 그 자체는 단계 강등 근거가 아니다. 강등은 '가격 상승률 vs FY+1/+2 EPS 추정 리비전 속도' 비교로만.",
    "4. 이미 아는 컨센서스·홍보성 문구·중복 헤드라인은 noise 로 버려라. 애널리스트의 목표가 상향 그 자체는 근거(추정 변경)가 없으면 noise.",
    "5. 너는 후보 정렬까지만 한다. 최종 반영은 사람이 승인한다. 단정하지 말고 검증 항목(verify)을 남겨라.",
    "",
    "[점수] 각 0~2 · novelty(기존 컨센 대비 새로움) · impact(레이어 상대가치를 바꾸는 정도) · confidence(출처·검증가능성)",
    "[route] 'signal_log' | 'earnings' | 'judgment' | 'stage' | 'holdings' | 'macro' | 'calendar' | 'none'",
    "  - macro: 금리·유가·환율·지정학 등 01 시장 모니터링에 걸릴 관점",
    "  - calendar: 날짜가 확정된 이벤트(실적일·정책회의·제품 출시)",
    "  - none: 소음",
    "",
    "[출력] 아래 JSON 객체 하나만. 마크다운 펜스·서문·후기 금지. 한국어. 결론 먼저, 문장은 짧게.",
    '{"src":{"kind":"","publisher":"","title":"","url":"","date":""},"summary":"3줄 이내 핵심 요약","claims":[{"text":"핵심 한 줄","layer":"L3","tickers":["MU"],"type":"numbers|narrative","novelty":0,"impact":0,"confidence":0,"route":"signal_log","why":"어느 층 수요/공급을 바꾸는지 + 상대가치 함의","verify":"확인해야 할 것"}],"noise":["버린 것 한 줄씩"],"steelman":"이 자료의 논지에 대한 가장 강한 반론 1~2문장"}',
    "claims 는 최대 8개. 유의미한 게 없으면 claims 는 빈 배열로 두고 noise 에 이유를 적어라.",
    "",
    "[자료] 종류·출처·제목·날짜는 주어지지 않는다. 본문(또는 URL)에서 직접 판별해 src 에 채워라(불명확하면 빈 문자열).",
    "  src.kind 는 '증권사 리포트' | '기사' | '유튜브' | '공시' | '기타' 중 하나로 분류하라. src.title 은 자료의 실제 제목, src.publisher 는 발행처·매체·채널명.",
    url ? ("URL: " + url) : "",
    useSearch
      ? "본문이 제공되지 않았다. web_search 로 위 URL 의 내용(또는 그 영상·기사에 대한 신뢰 가능한 요약·보도)을 찾아 근거로 삼아라. 찾지 못하면 claims 를 비우고 noise 에 '본문 확보 실패'라고 적어라."
      : ("본문/스크립트:\n" + text),
  ].filter(Boolean).join("\n");

  const r = await anthropicText(env, prompt, useSearch, 6000);
  if (r.error) return memoJson(r, 502);
  return memoJson({ content: [{ type: "text", text: r.text }], stop_reason: r.stop_reason }, 200);
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

// 원/달러 환율(USD/KRW) 일별 시계열 프록시 — 01 시장 맥박 환율 게이지용.
// 출력 = {source, points:[["YYYY-MM-DD", close]]} (WTI 와 동일 스키마 → 프런트 재사용). 최근 ~1년.
async function handleFx() {
  const okJson = (obj) => new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=1800" },
  });
  const now = Math.floor(Date.now() / 1000);
  const P1 = now - 400 * 86400; // 최근 ~400일

  // 1) Yahoo Finance v8 chart — KRW=X (USD→KRW)
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const u = `https://${host}/v8/finance/chart/KRW=X?period1=${P1}&period2=${now}&interval=1d`;
      const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; alphamap/1.0)" }, cf: { cacheTtl: 1800, cacheEverything: true } });
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

  // 2) Stooq CSV 폴백 (usdkrw)
  try {
    const r = await fetch("https://stooq.com/q/d/l/?s=usdkrw&i=d", { cf: { cacheTtl: 1800, cacheEverything: true } });
    if (r.ok) {
      const t = await r.text();
      const lines = t.trim().split("\n");
      const out = [];
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(",");
        if (c.length >= 5 && c[4] && !isNaN(+c[4])) out.push([c[0], Math.round(+c[4] * 100) / 100]);
      }
      if (out.length) return okJson({ source: "stooq", points: out.slice(-400) });
    }
  } catch (_) { /* 폴백 실패 */ }

  return new Response(JSON.stringify({ error: "fx upstream unavailable" }),
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

// ===== 데일리 브리핑 팟캐스트(2인 대담) — /api/brief =====
// 슬랙 텍스트 요약의 '듣는 판'. 라이브 JSON(gamma·signals·holdings·calendar·signal_log)으로
// 진행자·애널리스트 2인 대담 대본을 만든다. narrative≠numbers — 대본은 관점 텍스트일 뿐
// 숫자·판단 파일을 절대 바꾸지 않는다(게이트 판정은 라이브 값을 그대로 읽어 말할 뿐).
//
// 8분 분량은 비스트리밍 1회 호출로는 api.anthropic.com(~100s)에 걸린다 → part 1/2 분할.
// part1(전반: 게이트·레이어)을 먼저 반환해 재생을 시작하고, part2(후반: 종목·스틸맨)는
// 재생 중 뒤에서 받아 이어붙인다. 각 part 는 R2(MEMO_BUCKET)에 날짜별로 캐시된다.
const BRIEF_KEY = (d, p) => `brief_${d}_p${p}.json`;

function kstDate(ts) {
  return new Date((ts || Date.now()) + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 라이브 자산 읽기(자기 자신의 ASSETS 바인딩) — 실패해도 브리핑은 계속된다.
async function briefAsset(env, request, path) {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL(path, request.url).toString()));
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// 라이브 상황 요약 — LLM 입력. 토큰을 아끼려고 판단에 쓰이는 값만 추린다.
async function briefSituation(env, request) {
  const [sig, gam, hol, cal, log, jud] = await Promise.all([
    briefAsset(env, request, "/signals.json"),
    briefAsset(env, request, "/gamma.json"),
    briefAsset(env, request, "/holdings.json"),
    briefAsset(env, request, "/calendar.json"),
    briefAsset(env, request, "/signal_log.json"),
    briefAsset(env, request, "/judgment.json"),
  ]);

  const macro = sig ? {
    asOf: sig.asOf, vix: sig.vix, fearGreed: sig.fearGreed,
    nasdaqDrawdownPct: sig.nasdaqDrawdownPct, spDailyPct: sig.spDailyPct,
  } : null;

  const G = (gam && gam.gamma) || {};
  const gamma = Object.keys(G).slice(0, 24).map((k) => {
    const v = G[k] || {};
    return { tk: k, g: v.g, stage: v.stage, gapPct: v.pct, trend: v.trend, flagged: !!v.flagged, why: v.why || "" };
  });

  const layers = (hol && Array.isArray(hol.holdings))
    ? hol.holdings.map((h) => ({ layer: h.layer, w: h.w, label: h.label })) : [];
  const names = (hol && Array.isArray(hol.detail))
    ? hol.detail.slice(0, 20).map((d) => ({ nm: d.nm || d.name || d.label, w: d.w })) : [];

  const today = kstDate();
  const events = (cal && Array.isArray(cal.events))
    ? cal.events.filter((e) => e.d >= today).slice(0, 8).map((e) => ({ d: e.d, lbl: e.lbl, meta: e.meta })) : [];

  const recent = (log && Array.isArray(log.log))
    ? log.log.slice(-4).map((e) => ({ date: e.date, source: String(e.source || "").slice(0, 320) })) : [];

  const overrides = (jud && Array.isArray(jud.overrides))
    ? jud.overrides.slice(0, 10).map((o) => ({ tk: o.tk || o.ticker, why: String(o.why || "").slice(0, 160) })) : [];

  return {
    asOf: today,
    macroGate: macro,
    gammaStage: gamma,
    layerWeights: layers,
    topNames: names,
    upcoming: events,
    recentSignals: recent,
    judgmentOverrides: overrides,
    portfolioTotalMKRW: hol ? hol.total : null,
  };
}

const BRIEF_SYS_BASE =
  "너는 '알파맵' AI 인프라 투자 관측소의 **데일리 브리핑 팟캐스트 대본 작가**다. " +
  "화자는 딱 둘 — `host`(진행자: 질문하고 흐름을 끌고 요약한다) 와 `ana`(알파맵 애널리스트: 라이브 데이터로 답한다). " +
  "실제 팟캐스트처럼 자연스러운 구어체 대화로 쓴다(문어체 보고서 금지). 한 발언은 2~5문장. " +
  "규율(절대): ①**결론 먼저** ②**게이트는 전부 AND** — 하나라도 미충족이면 실행 불가라고 명시한다 " +
  "③**narrative ≠ numbers** — 뉴스·발표는 숫자 파일을 바꾸지 않는다 ④**두 시계 분리**(논제 시계=펀더멘털·EPS 리비전 / 가격 시계=센티먼트) " +
  "⑤**단계 강등 트리거는 가격 상승 그 자체가 아니라 '가격 상승률 vs FY+1/+2 EPS 리비전 속도'** ⑥매매 권유가 아니라 프레임 도출이다. " +
  "숫자는 입력된 라이브 값만 쓴다 — 없는 수치를 지어내지 마라. 모르면 '그 값은 오늘 데이터에 없습니다'라고 말한다. " +
  "한국어. 종결어는 '~하겠습니다/~할게요/~입니다'. '및' 을 쓰지 않는다. " +
  "`say` 는 **음성 낭독용 평문**이라 기호를 말로 푼다(γ→'감마', → '로', % → '퍼센트', L3 → '레이어 3', VIX → '빅스'). " +
  "반드시 아래 JSON만 출력한다(코드펜스·설명 금지).\n" +
  'JSON: {"title":"오늘 브리핑 헤드라인 한 줄","badges":[["라벨","값"]],"script":[{"s":"host|ana","say":"발언 평문"}]}';

// part 0 = 06 모닝 브리핑의 '텍스트로 정리' 판. 대담(1·2)과 같은 라이브 입력을 쓰되
// 낭독용 대본이 아니라 훑어보는 구조(결론·게이트 보드·레이어 갭·볼 것·액션·스틸맨)로 낸다.
const BRIEF_TEXT_SYS =
  "너는 '알파맵' AI 인프라 투자 관측소의 **모닝 브리핑 작성자**다. 아침에 30초 만에 훑을 수 있는 텍스트 브리핑을 쓴다. " +
  "규율(절대): ①**결론 먼저** ②**게이트는 전부 AND** — 하나라도 미충족이면 실행 불가라고 명시한다 " +
  "③**narrative ≠ numbers** — 뉴스·발표는 숫자 파일을 바꾸지 않는다 ④**두 시계 분리**(논제 시계=펀더멘털·EPS 리비전 / 가격 시계=센티먼트) " +
  "⑤**단계 강등 트리거는 가격 상승 그 자체가 아니라 '가격 상승률 vs FY+1/+2 EPS 리비전 속도'** ⑥매매 권유가 아니라 프레임 도출이다. " +
  "숫자는 입력된 라이브 값만 쓴다 — 없는 수치를 지어내지 마라. " +
  "`gate` 는 매크로 게이트 3축(나스닥 드로다운·VIX·CNN 공포탐욕)을 각각 한 칸씩, `s` 는 '충족' 또는 '미충족'으로만 쓴다. " +
  "`gateVerdict` 는 '몇/3 · 그래서 지금 무엇이 금지·허용인가' 한 줄. " +
  "`layers` 는 보유 레이어를 비중 큰 순으로, `state` 는 '오버'·'언더'·'적정' 중 하나. 적정밴드를 모르면 band 는 빈 문자열. " +
  "`actions` 는 전부 조건부(AND)로 쓴다. `steelman` 은 오늘 결론이 틀렸다면 무엇 때문인지 한 단락. " +
  "한국어. 종결어는 '~하겠습니다/~입니다'. '및' 을 쓰지 않는다. 모바일에서 읽기 좋게 문장을 짧게 끊는다. " +
  "반드시 아래 JSON만 출력한다(코드펜스·설명 금지).\n" +
  'JSON: {"headline":"오늘 한 줄 결론","gate":[{"k":"축 이름","v":"현재값","s":"충족|미충족"}],"gateVerdict":"n/3 · 그래서 무엇","' +
  'layers":[{"l":"L3","w":"43.2%","band":"30~32%","state":"오버|언더|적정","note":"한 줄"}],' +
  '"watch":["오늘 볼 것 3~5개"],"actions":["조건부 액션 2~4개"],"steelman":"반론 한 단락"}';

const BRIEF_PART = {
  1: "이번엔 **전반부**만 쓴다(약 4분·발언 14~18개). 흐름: 오프닝 인사와 오늘 한 줄 결론 → 매크로 게이트 3중 AND 점등 상태(나스닥 드로다운·빅스·공포탐욕)와 그래서 지금 무엇이 금지·허용인지 → 8레이어 비중 갭(오버웨이트·언더웨이트 어디인가, 목표 대비) → 유한자본 관점의 상대가치(비싸진 층에서 공포에 눌린 층으로). badges 는 4~5개(나스닥 드로다운·빅스·공포탐욕·게이트 점등·최대 비중 레이어). 마지막 발언은 후반부로 넘기는 진행자의 한마디로 끝낸다.",
  2: "이번엔 **후반부**만 쓴다(약 4분·발언 14~18개). 전반부 대본이 입력으로 주어지니 **같은 말을 반복하지 마라**. 흐름: 종목별 감마·단계 판정(닫힘 트리거 점등 여부를 명시) → 다가오는 일정과 D-N 게이트 → 최근 시그널 로그가 누적으로 말해주는 것 → **오늘의 액션 아이템**(전부 조건부·AND) → 마지막에 반드시 **스틸맨 반론**(오늘 결론이 틀렸다면 무엇 때문인가) → 클로징. badges 는 빈 배열로 둔다.",
};

// 저장된 브리핑 회차 목록 — 06 「지난 브리핑」. 뉴스레터처럼 **회차 번호 + 제목**으로 낸다.
// 회차 번호(no)는 p0 생성 시점에 박아 저장하므로 이후 목록이 바뀌어도 불변이다.
// 옛 회차(no 없이 저장된 것)는 날짜 오름차순 순번으로 폴백한다.
const BRIEF_LIST_CAP = 60;

async function briefDateMap(env) {
  const seen = {};
  let cursor;
  for (let i = 0; i < 5; i++) {
    const r = await env.MEMO_BUCKET.list({ prefix: "brief_", limit: 1000, cursor });
    (r.objects || []).forEach((o) => {
      const m = /^brief_(\d{4}-\d{2}-\d{2})_p(\d)\.json$/.exec(o.key || "");
      if (!m) return;
      (seen[m[1]] = seen[m[1]] || []).push(Number(m[2]));
    });
    if (!r.truncated) break;
    cursor = r.cursor;
  }
  return seen;
}

async function handleBriefList(env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (!env.MEMO_BUCKET) return json({ dates: [] }, 200);

  let seen;
  try { seen = await briefDateMap(env); }
  catch (e) { return json({ dates: [], error: String(e && e.message ? e.message : e) }, 200); }

  const asc = Object.keys(seen).sort();                       // 오래된 순 = 회차 순
  const recent = asc.slice(-BRIEF_LIST_CAP);
  const titles = {};
  await Promise.all(recent.map(async (d) => {
    if ((seen[d] || []).indexOf(0) < 0) return;               // 텍스트 회차가 없으면 제목도 없다
    try {
      const o = await env.MEMO_BUCKET.get(BRIEF_KEY(d, 0));
      if (!o) return;
      const j = await o.json();
      titles[d] = { title: j.headline || "", no: j.no || null };
    } catch { /* 개별 실패는 제목 없이 통과 */ }
  }));

  const dates = asc.map((d, i) => ({
    d,
    no: (titles[d] && titles[d].no) || (i + 1),               // 폴백 = 날짜 오름차순 순번
    title: (titles[d] && titles[d].title) || "",
    parts: seen[d].sort(),
  })).reverse();                                              // 표시는 최신순
  return json({ dates }, 200);
}

async function handleBrief(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  const url = new URL(request.url);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("d") || "") ? url.searchParams.get("d") : kstDate();
  const pRaw = url.searchParams.get("part");
  const part = pRaw === "0" ? 0 : pRaw === "2" ? 2 : 1;
  const regen = url.searchParams.get("regen") === "1";

  // 1) R2 캐시 — 같은 날 같은 파트는 한 번만 만든다(열 때마다 과금되지 않게).
  if (env.MEMO_BUCKET && !regen) {
    try {
      const obj = await env.MEMO_BUCKET.get(BRIEF_KEY(d, part));
      if (obj) return new Response(obj.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    } catch { /* 캐시 실패는 무시하고 생성 */ }
  }

  const situation = await briefSituation(env, request);

  // 후반부는 전반부 대본을 받아 이어 쓴다(중복 방지).
  let prev = null;
  if (part === 2 && env.MEMO_BUCKET) {
    try {
      const p1 = await env.MEMO_BUCKET.get(BRIEF_KEY(d, 1));
      if (p1) prev = await p1.json();
    } catch { /* 없으면 전반부 없이 후반부만 */ }
  }

  const sys = part === 0 ? BRIEF_TEXT_SYS : (BRIEF_SYS_BASE + "\n\n" + BRIEF_PART[part]);
  const payload = {
    date: d,
    situation: situation,
    previousPart: prev && Array.isArray(prev.script) ? prev.script.map((x) => x.say).join(" ").slice(0, 4000) : "",
  };

  let up;
  try {
    up = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-4-8", max_tokens: 4000, system: sys,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
  } catch (e) {
    return json({ error: "anthropic fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const t = await up.text();
  if (!up.ok) return json({ error: describeAnthropicError(up.status, t), status: up.status }, 502);

  let data; try { data = JSON.parse(t); } catch { return json({ error: "anthropic parse failed" }, 502); }
  const raw = ((data.content || []).map((c) => c.text || "").join("")).trim().replace(/^```(?:json)?|```$/g, "").trim();
  let out; try { out = JSON.parse(raw); } catch { return json({ error: "brief parse failed", raw: raw.slice(0, 400) }, 502); }
  if (part === 0) {
    if (!out || !out.headline) return json({ error: "brief text missing" }, 502);
    out.asOf = d;
    out.part = 0;
    // 회차 번호 = 기존 텍스트 회차 수 + 1. 생성 시점에 고정해 저장(이후 불변).
    if (env.MEMO_BUCKET) {
      try {
        const map = await briefDateMap(env);
        const prior = Object.keys(map).filter((k) => k !== d && (map[k] || []).indexOf(0) >= 0).length;
        out.no = prior + 1;
      } catch { /* 실패해도 목록이 순번으로 폴백한다 */ }
    }
  } else {
    if (!out || !Array.isArray(out.script)) return json({ error: "brief script missing" }, 502);
    out.asOf = d;
    out.part = part;
    out.script = out.script
      .filter((x) => x && x.say)
      .map((x) => ({ s: x.s === "host" ? "host" : "ana", say: String(x.say).slice(0, 1200) }));
  }

  if (env.MEMO_BUCKET) {
    try {
      await env.MEMO_BUCKET.put(BRIEF_KEY(d, part), JSON.stringify(out),
        { httpMetadata: { contentType: "application/json" } });
    } catch { /* 캐시 저장 실패는 응답에 영향 없음 */ }
  }
  return json(out, 200);
}

// ===== 06 모닝 브리핑 — 고품질 오디오(Gemini 멀티스피커 TTS) · /api/brief-audio =====
// 워커가 이미 가진 GEMINI_API_KEY 로, R2 에 캐시된 대담 대본(brief_{날짜}_p{1,2}.json)을
// 「The Energetic Co-Host」 톤 오디오로 구워 브라우저 플레이어에 그대로 준다.
// 슬랙·SITE_PASSWORD·워크플로 없이 사이트 안에서 바로 재생된다. 결과 WAV 는 R2 에 날짜 캐시.
// 실패는 항상 비-200 JSON → 클라이언트가 브라우저 TTS 로 자동 폴백(무해).
// 키 접두는 `briefaud_` — 「지난 호」 목록의 `brief_..._p{n}.json` 정규식과 충돌하지 않는다.
const BRIEF_AUD_KEY = (d, p) => `briefaud_${d}_p${p}.wav`;
const BRIEF_TTS_STYLE =
  "당신은 활기찬 팟캐스트 공동 진행자 두 명입니다. 밝고 에너지 넘치는 구어체로, 서로 맞장구치며 " +
  "리듬감 있게 주고받으세요. 과장은 피하되 톤은 지루하지 않게 생동감 있게 — 숫자와 판정은 정확히 전달합니다.";
const BRIEF_TTS_VOICE = { host: "Puck", ana: "Kore" };   // 경쾌한 리드 · 또렷한 분석
const BRIEF_TTS_LABEL = { host: "진행자", ana: "애널리스트" };

// PCM(s16le) → WAV(44B 헤더). Cloudflare Workers 에 ffmpeg 이 없으므로 WAV 로 서빙(브라우저 재생 가능).
function wavFromPcm(pcm, rate) {
  const hdr = new Uint8Array(44);
  const dv = new DataView(hdr.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  const len = pcm.length;
  w(0, "RIFF"); dv.setUint32(4, 36 + len, true); w(8, "WAVE");
  w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, "data"); dv.setUint32(40, len, true);
  const out = new Uint8Array(44 + len);
  out.set(hdr, 0); out.set(pcm, 44);
  return out;
}

async function handleBriefAudio(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 503);
  if (!env.MEMO_BUCKET) return json({ error: "MEMO_BUCKET not configured" }, 503);

  const url = new URL(request.url);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("d") || "") ? url.searchParams.get("d") : kstDate();
  const part = url.searchParams.get("part") === "2" ? 2 : 1;
  const regen = url.searchParams.get("regen") === "1";
  const audHeaders = { "content-type": "audio/wav", "cache-control": "no-store" };

  // 1) 오디오 캐시 — 같은 날 같은 파트는 한 번만 굽는다(열 때마다 TTS 과금되지 않게).
  if (!regen) {
    try {
      const c = await env.MEMO_BUCKET.get(BRIEF_AUD_KEY(d, part));
      if (c) return new Response(c.body, { headers: audHeaders });
    } catch { /* 캐시 조회 실패는 무시하고 생성 */ }
  }

  // 2) 대담 대본(R2)이 있어야 굽는다. 없으면 409 → 클라이언트가 /api/brief 로 먼저 만든다.
  let scriptObj;
  try {
    const o = await env.MEMO_BUCKET.get(BRIEF_KEY(d, part));
    if (!o) return json({ error: "script not ready" }, 409);
    scriptObj = await o.json();
  } catch { return json({ error: "script read failed" }, 502); }
  const lines = (scriptObj && Array.isArray(scriptObj.script) ? scriptObj.script : []).filter((x) => x && x.say);
  if (!lines.length) return json({ error: "script empty" }, 409);

  // 3) Gemini 멀티스피커 TTS — 「The Energetic Co-Host」 톤. TTS 모델은 별도(YouTube용 GEMINI_MODEL 과 다름).
  const ttsModel = env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
  const prompt = BRIEF_TTS_STYLE + "\n\n다음 대담을 읽어 주세요.\n\n"
    + lines.map((l) => `${BRIEF_TTS_LABEL[l.s] || BRIEF_TTS_LABEL.ana}: ${l.say}`).join("\n");
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: BRIEF_TTS_LABEL.host, voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_VOICE_HOST || BRIEF_TTS_VOICE.host } } },
            { speaker: BRIEF_TTS_LABEL.ana,  voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_VOICE_ANA  || BRIEF_TTS_VOICE.ana } } },
          ],
        },
      },
    },
  };

  let up;
  try {
    up = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + ttsModel + ":generateContent",
      { method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify(body) });
  } catch (e) {
    return json({ error: "gemini tts fetch failed", detail: String(e && e.message ? e.message : e) }, 502);
  }
  const g = await up.json().catch(() => null);
  if (!up.ok || !g) {
    const dd = (g && g.error && g.error.message) ? g.error.message : "";
    return json({ error: "gemini tts failed (" + up.status + ")" + (dd ? ": " + dd.slice(0, 200) : "") }, 502);
  }
  const gParts = (g.candidates && g.candidates[0] && g.candidates[0].content && g.candidates[0].content.parts) || [];
  const inl = gParts.map((p) => p.inlineData || p.inline_data).find((x) => x && x.data);
  if (!inl || !inl.data) return json({ error: "gemini tts: 오디오 없음" }, 502);
  const rateM = /rate=(\d+)/.exec(inl.mimeType || inl.mime_type || "");
  const rate = rateM ? Number(rateM[1]) : 24000;

  // base64 PCM(s16le) → 바이트 → WAV
  let pcm;
  try {
    const bin = atob(inl.data);
    pcm = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
  } catch { return json({ error: "audio decode failed" }, 502); }
  const wav = wavFromPcm(pcm, rate);

  // 4) R2 캐시(WAV). 저장 실패해도 이번 응답엔 영향 없음.
  try {
    await env.MEMO_BUCKET.put(BRIEF_AUD_KEY(d, part), wav, { httpMetadata: { contentType: "audio/wav" } });
  } catch { /* 캐시 저장 실패 무시 */ }

  return new Response(wav, { headers: audHeaders });
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
      // 원/달러 환율(USD/KRW) 일별 시계열 — 01 시장 맥박 환율 게이지(런타임). (인증된 디바이스만 도달)
      if (request.method === "GET" && url.pathname === "/api/fx") {
        return handleFx();
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
      // 03 관점과 정보 — 관점 추출(Claude) · 인사이트 저장(R2) — 인증된 디바이스만 도달
      if (request.method === "POST" && url.pathname === "/api/insight") {
        return handleInsight(request, env);
      }
      // 07 자문단 — 유튜브 관점 추출(Gemini) · 원탁 토론(Claude) — 인증된 디바이스만 도달
      if (request.method === "POST" && url.pathname === "/api/yt-view") {
        return handleYtView(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/council") {
        return handleCouncil(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/council-summary") {
        return handleCouncilSummary(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/council-ask") {
        return handleCouncilAsk(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/council-read") {
        return handleCouncilRead(request, env);
      }
      if (url.pathname === "/api/council-log") {
        if (request.method === "GET") return handleCouncilLogGet(env);
        if (request.method === "POST") return handleCouncilLogPost(request, env);
        return memoJson({ error: "method not allowed" }, 405);
      }
      if (url.pathname === "/api/council-discussions") {
        if (request.method === "GET") return handleCouncilDiscGet(env);
        if (request.method === "POST") return handleCouncilDiscPost(request, env);
        return memoJson({ error: "method not allowed" }, 405);
      }
      // 데일리 브리핑 팟캐스트(2인 대담 대본) — 파트 분할 생성·R2 날짜 캐시
      if (request.method === "GET" && url.pathname === "/api/brief") {
        return handleBrief(request, env);
      }
      // 06 모닝 브리핑 — 저장된 회차 날짜 목록
      if (request.method === "GET" && url.pathname === "/api/briefs") {
        return handleBriefList(env);
      }
      // 06 모닝 브리핑 — 고품질 오디오(Gemini 멀티스피커 TTS · 대본 R2 캐시를 WAV 로)
      if (request.method === "GET" && url.pathname === "/api/brief-audio") {
        return handleBriefAudio(request, env);
      }
      if (url.pathname === "/api/council-roster") {
        if (request.method === "GET") return handleCouncilRosterGet(env);
        if (request.method === "POST") return handleCouncilRosterPost(request, env);
        return memoJson({ error: "method not allowed" }, 405);
      }
      // 저장 원문 영구 링크(채택 관점 → 근거 추적) — /api/insights 보다 먼저 매칭
      if (request.method === "GET" && url.pathname === "/api/insights/raw") {
        return handleInsightRaw(url, env);
      }
      if (url.pathname === "/api/insights") {
        if (request.method === "GET") return handleInsightsGet(env);
        if (request.method === "PUT") return handleInsightsPut(request, env);
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
            el.append('<script src="/aisd.js" defer></scr' + 'ipt>', { html: true });
            el.append('<script src="/council-ask.js" defer></scr' + 'ipt>', { html: true });
            el.append('<script src="/council-roster.js" defer></scr' + 'ipt>', { html: true });
            el.append('<script src="/brief.js" defer></scr' + 'ipt>', { html: true });
          } })
          .transform(res);
        // 대시보드 HTML 은 캐시 금지 — Workers Assets 기본 캐시 헤더 때문에 새 배포가
        // 엣지/브라우저에 안 잡히는 문제(배포는 성공하는데 화면은 옛날 그대로)를 막는다.
        // 로그인 페이지(htmlHeaders)와 동일하게 항상 최신 index.html 을 받게 한다.
        const headers = new Headers(transformed.headers);
        headers.set("cache-control", "no-store");
        return new Response(transformed.body, { status: transformed.status, headers });
      }
      // 데이터 .json 자산도 동일 이유로 캐시 금지 — Workers Assets 기본 캐시 헤더 탓에
      // 새 배포가 엣지/브라우저에 안 잡혀(배포는 성공하는데 화면은 옛날 그대로) 주간 리뷰·게이트 등
      // 데이터 갱신이 반영되지 않는다. HTML 과 같은 no-store 덮개를 json 에도 씌운다.
      if (ct.includes("application/json") || url.pathname.endsWith(".json")) {
        const jh = new Headers(res.headers);
        jh.set("cache-control", "no-store");
        return new Response(res.body, { status: res.status, headers: jh });
      }
      return res;
    }

    // Anything else (page or .json) gets the login screen, never the data.
    return new Response(loginPage(false), { status: 401, headers: htmlHeaders });
  },
};
