// 06 모닝 브리핑 복구 래퍼.
// 기존 worker.js를 그대로 위임하되 /api/brief가 Anthropic 권한 오류(403)로 실패할 때만
// 이미 운영 중인 Gemini 키로 동일한 JSON 계약을 생성해 R2에 캐시한다.
// 다른 API·인증·정적자산 동작은 worker.js와 완전히 동일하다.
import baseWorker from "./worker.js";

const BRIEF_KEY = (d, p) => `brief_${d}_p${p}.json`;

function kstDate(ts) {
  return new Date((ts || Date.now()) + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

async function asset(env, request, path) {
  try {
    const r = await env.ASSETS.fetch(new Request(new URL(path, request.url).toString()));
    return r.ok ? await r.json() : null;
  } catch (_) { return null; }
}

function seriesLast(series, key) {
  const s = series && series[key];
  if (!s || !Array.isArray(s.c) || s.c.length < 2) return null;
  const c = s.c, t = Array.isArray(s.t) ? s.t : [];
  const last = c[c.length - 1], prev = c[c.length - 2], back = c.length > 6 ? c[c.length - 6] : c[0];
  if (typeof last !== "number") return null;
  const pc = (a, b) => (typeof a === "number" && typeof b === "number" && b)
    ? Math.round(((a / b) - 1) * 10000) / 100 : null;
  const day = t.length ? new Date(t[t.length - 1] * 86400000).toISOString().slice(0, 10) : "";
  return { d: day, close: last, d1Pct: pc(last, prev), d5Pct: pc(last, back) };
}

function boardCompact(j) {
  return j && Array.isArray(j.items) ? {
    insight: String(j.insight || "").slice(0, 300),
    items: j.items.slice(0, 10).map((x) => ({
      no: x.no || x.id || "", name: x.name || "", state: x.stateLabel || x.state || "",
      verdict: String(x.verdict || "").slice(0, 220),
    })),
  } : null;
}

async function compactSituation(env, request) {
  const [sig, gam, hol, cal, log, jud, pul, chr, ear, risk, gates, dxi, news, digest] = await Promise.all([
    asset(env, request, "/signals.json"), asset(env, request, "/gamma.json"),
    asset(env, request, "/holdings.json"), asset(env, request, "/calendar.json"),
    asset(env, request, "/signal_log.json"), asset(env, request, "/judgment.json"),
    asset(env, request, "/pulse.json"), asset(env, request, "/charts.json"),
    asset(env, request, "/earnings.json"), asset(env, request, "/risk.json"),
    asset(env, request, "/gates.json"), asset(env, request, "/dxi.json"),
    asset(env, request, "/news.json"), asset(env, request, "/news_digest.json"),
  ]);

  const today = kstDate();
  const cut2d = kstDate(Date.now() - 2 * 86400000);
  const ser = (chr && chr.series) || {};
  const gm = (gam && gam.gamma) || {};
  const detail = hol && Array.isArray(hol.detail) ? hol.detail : [];
  const held = detail.filter((x) => x && x.w).sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, 12);
  const closes = held.map((x) => {
    const s = x.priceKey ? seriesLast(ser, x.priceKey) : null;
    const g = gm[x.ticker] || {};
    return { nm: x.name || x.nm || x.label || x.ticker, tk: x.ticker || "", layer: x.layer || "", w: x.w,
      d: s && s.d || "", close: s && s.close != null ? s.close : null,
      d1Pct: s && s.d1Pct != null ? s.d1Pct : null, d5Pct: s && s.d5Pct != null ? s.d5Pct : null,
      gamma: g.g || "", stage: g.stage || "" };
  });
  const indices = [["코스피", "ks11"], ["나스닥", "ixic"], ["S&P500", "gspc"]]
    .map(([k, key]) => ({ k, ...(seriesLast(ser, key) || {}) })).filter((x) => x.close != null);
  const us10y = seriesLast(ser, "us10y");
  const wti = seriesLast(ser, "wti");
  const gas = seriesLast(ser, "gasoline");
  const dser = dxi && Array.isArray(dxi.series) ? dxi.series : [];
  const dl = dser[dser.length - 1], dp = dser[dser.length - 2];
  const dxiNow = dl && dl.v != null ? { d: dl.t || "", usd: dl.v,
    wowPct: dp && dp.v ? Math.round(((dl.v / dp.v) - 1) * 1000) / 10 : null } : null;
  const moves = (ear && ear.moves) || {};
  const earnings = Object.keys(moves).map((k) => ({ tk: k, d: moves[k].date || "", movePct: moves[k].pct, basis: moves[k].basis || "" }))
    .filter((x) => x.d && x.d >= today).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);
  const events = cal && Array.isArray(cal.events) ? cal.events.filter((x) => x.d >= today).slice(0, 10)
    .map((x) => ({ d: x.d, lbl: x.lbl, meta: String(x.meta || "").slice(0, 280) })) : [];
  const recentSignals = log && Array.isArray(log.log) ? log.log.filter((x) => (x.date || "") >= cut2d).slice(-8)
    .map((x) => ({ date: x.date, source: String(x.source || "").slice(0, 260), items: (x.items || []).slice(0, 3).map((i) => ({ tag: i.tag || "", layer: i.layer || "" })) })) : [];
  const wOf = {}; detail.forEach((x) => { if (x.ticker) wOf[x.ticker] = x.w || 0; });
  const newsCut = Date.now() - 2 * 86400000;
  const stockNews = news && Array.isArray(news.items) ? news.items
    .filter((x) => x.ticker && wOf[x.ticker] && x.published && Date.parse(x.published) >= newsCut)
    .sort((a, b) => (wOf[b.ticker] - wOf[a.ticker]) || String(b.published).localeCompare(String(a.published)))
    .slice(0, 10).map((x) => ({ tk: x.ticker, nm: x.name || x.ticker, d: String(x.published).slice(5, 10),
      a: String(x.a || x.title || "").slice(0, 180), w: String(x.w || "").slice(0, 150) })) : [];
  const macroNews = news && Array.isArray(news.items) ? news.items
    .filter((x) => x.ticker === "MACRO" && x.published && Date.parse(x.published) >= newsCut)
    .slice(0, 8).map((x) => ({ ax: x.name || "", d: String(x.published).slice(5, 10),
      a: String(x.a || x.title || "").slice(0, 180), w: String(x.w || "").slice(0, 150) })) : [];

  return {
    asOf: today,
    macroGate: sig ? { asOf: sig.asOf, vix: sig.vix, fearGreed: sig.fearGreed,
      nasdaqDrawdownPct: sig.nasdaqDrawdownPct, spDailyPct: sig.spDailyPct } : null,
    marketPulse: pul && Array.isArray(pul.drivers) ? pul.drivers.slice(0, 8).map((x) => ({
      ax: x.name, dir: x.dir, layer: x.layer || "", lens: String(x.l1 || "").slice(0, 200), verdict: String(x.verdict || "").slice(0, 150) })) : [],
    riskBoard: boardCompact(risk), cycleBoard: boardCompact(gates), dxi: dxiNow,
    indices, us10yPct: us10y ? { d: us10y.d, level: us10y.close } : null,
    oilWti: wti ? { d: wti.d, usd: wti.close, d1Pct: wti.d1Pct } : null,
    gasolineRb: gas ? { d: gas.d, usd: gas.close, d1Pct: gas.d1Pct } : null,
    layerWeights: hol && Array.isArray(hol.holdings) ? hol.holdings.slice(0, 12) : [],
    holdingCloses: closes, upcoming: events, upcomingEarnings: earnings,
    recentSignals, judgmentOverrides: jud && Array.isArray(jud.overrides) ? jud.overrides.slice(0, 10) : [],
    stockNews, macroNews,
    macroTopics: digest && Array.isArray(digest.macro) ? digest.macro.slice(0, 6) : [],
    portfolioTotalMKRW: hol ? hol.total : null,
  };
}

const COMMON = [
  "너는 알파맵 AI 인프라 투자 관측소의 모닝 브리핑 작성자다.",
  "절대 규율: 결론 먼저. 게이트는 전부 AND라 하나라도 미충족이면 실행 불가라고 쓴다.",
  "narrative≠numbers: 뉴스·발표는 숫자 파일을 바꾸지 않는다.",
  "입력에 있는 값만 사용하고 없는 숫자는 절대 추정하지 않는다. 사실과 해석을 분리한다.",
  "최근 1~2일 신규를 우선하고 오래된 내용을 억지로 반복하지 않는다. 한국어로 짧고 자연스럽게 쓴다.",
].join(" ");

const TEXT_SCHEMA = '{"headline":"오늘 한 줄 결론","bullets":["3~5줄"],"risks":[{"ax":"축","dir":"위험|기회|중립","layer":"","lens":"","verdict":""}],"gate":[{"k":"축","v":"현재값","s":"충족|미충족"}],"gateVerdict":"n/3 · 의미","indices":[{"k":"코스피|나스닥|S&P500","v":"","chg":"","note":""}],"holdSummary":"2~3문장","holdings":[{"n":"종목","l":"레이어","w":"","px":"","chg":"","chg5":"","g":""}],"layers":[{"l":"레이어","w":"","band":"","state":"오버|언더|적정","note":""}],"news":[{"d":"","t":"","note":""}],"upcoming":[{"dn":"D-n","d":"","e":"","note":""}],"rebalance":{"verdict":"","rows":[{"act":"","size":"","cond":""}]},"watch":[""],"actions":[""],"steelman":""}';
const DIALOGUE_SCHEMA = '{"title":"오늘 브리핑 헤드라인","badges":[["라벨","값"]],"script":[{"s":"host|ana","say":"발언 평문"}]}';

async function geminiBrief(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "Anthropic 403이며 GEMINI_API_KEY도 설정되지 않았습니다." }, 503);
  const url = new URL(request.url);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("d") || "") ? url.searchParams.get("d") : kstDate();
  const pRaw = url.searchParams.get("part"), part = pRaw === "0" ? 0 : pRaw === "2" ? 2 : 1;
  const situation = await compactSituation(env, request);
  let previousPart = "";
  if (part === 2 && env.MEMO_BUCKET) {
    try {
      const o = await env.MEMO_BUCKET.get(BRIEF_KEY(d, 1));
      if (o) { const j = await o.json(); previousPart = (j.script || []).map((x) => x.say || "").join(" ").slice(0, 4500); }
    } catch (_) {}
  }
  const prompt = part === 0
    ? `${COMMON}\n구성은 결론, 시장 맥박, 매크로 게이트, 한·미 종합지수, 보유종목 마감, 보유종목 주요 뉴스, 다가오는 일정, 오늘 리밸런싱 한다면, 스틸맨 순서다. 보유종목은 유의미한 움직임 위주 6~9개만. 리밸런싱은 조건부 AND로 쓰고 입력에 밴드가 없으면 band·size를 비워라. 반드시 아래 JSON 객체 하나만 출력한다.\n${TEXT_SCHEMA}\n\n[라이브 입력]\n${JSON.stringify(situation)}`
    : `${COMMON}\n진행자(host)와 애널리스트(ana) 2인 대담이다. 실제 팟캐스트처럼 자연스럽게 쓴다. 이번 파트는 ${part === 1 ? "전반부: 한 줄 결론, 임박 일정, 지수·금리·VIX·공포탐욕·유가, 시장 맥박" : "후반부: 리스크 보드, 사이클 보드, 최근 매크로·보유종목 뉴스, 스틸맨, 클로징"}이다. 발언 9~11개, 한 발언 2~4문장. say에서는 기호를 자연스러운 한국어 낭독으로 풀어쓴다. ${previousPart ? "아래 전반부와 같은 말을 반복하지 않는다. 전반부=" + previousPart : ""} 반드시 아래 JSON 객체 하나만 출력한다.\n${DIALOGUE_SCHEMA}\n\n[라이브 입력]\n${JSON.stringify(situation)}`;
  const model = env.GEMINI_MODEL || "gemini-3.5-flash";
  let up, g;
  try {
    up = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: {
        responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: part === 0 ? 8192 : 5000,
      } }),
    });
    g = await up.json().catch(() => null);
  } catch (e) {
    return json({ error: "Gemini 폴백 호출 실패", detail: String(e && e.message || e) }, 502);
  }
  if (!up.ok || !g) {
    const detail = g && g.error && g.error.message ? g.error.message : "";
    return json({ error: `Gemini 폴백 실패 (${up.status})`, detail: detail.slice(0, 300) }, 502);
  }
  const text = (((g.candidates || [])[0] || {}).content || {}).parts || [];
  const raw = text.map((x) => x.text || "").join("").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let out;
  try { out = JSON.parse(raw); } catch (_) { return json({ error: "Gemini 브리핑 JSON 해석 실패", raw: raw.slice(0, 400) }, 502); }
  if (part === 0) {
    if (!out || !out.headline) return json({ error: "Gemini 텍스트 브리핑이 비었습니다." }, 502);
  } else {
    if (!out || !Array.isArray(out.script)) return json({ error: "Gemini 대담 대본이 비었습니다." }, 502);
    out.script = out.script.filter((x) => x && x.say).map((x) => ({ s: x.s === "host" ? "host" : "ana", say: String(x.say).slice(0, 1200) }));
  }
  out.asOf = d; out.part = part; out.provider = "gemini-fallback";
  if (env.MEMO_BUCKET) {
    try { await env.MEMO_BUCKET.put(BRIEF_KEY(d, part), JSON.stringify(out), { httpMetadata: { contentType: "application/json" } }); } catch (_) {}
  }
  return json(out, 200, { "x-alphamap-llm-fallback": "gemini" });
}

export default {
  async fetch(request, env, ctx) {
    const res = await baseWorker.fetch(request, env, ctx);
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/api/brief" || res.ok) return res;
    let probe = null;
    try { probe = await res.clone().json(); } catch (_) {}
    const msg = String(probe && probe.error || "");
    if (res.status === 502 && (/anthropic api failed \(403/i.test(msg) || /Request not allowed/i.test(msg))) {
      return geminiBrief(request, env);
    }
    return res;
  },
};
