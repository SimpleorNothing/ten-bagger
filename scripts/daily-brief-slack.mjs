import { readFileSync } from "node:fs";

const TOKEN = process.env.SLACK_BOT_TOKEN;
const DM = process.env.SLACK_DM_CHANNEL;
const UA = { headers: { "User-Agent": "Mozilla/5.0" } };

async function yahoo(sym) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
  const m = (await (await fetch(u, UA)).json()).chart.result[0].meta;
  return { price: m.regularMarketPrice, prev: m.chartPreviousClose };
}
// CNN 라이브 엔드포인트는 GitHub Actions IP를 봇 차단(418) → 로컬 signals.json(크론 갱신) 사용
function fng() {
  try {
    const v = JSON.parse(readFileSync("signals.json", "utf8")).fearGreed;
    if (typeof v !== "number") return { score: "—", rating: "" };
    const label = v < 25 ? "극단적 공포" : v < 45 ? "공포" : v <= 55 ? "중립" : v <= 75 ? "탐욕" : "극단적 탐욕";
    return { score: v, rating: label };
  } catch {
    return { score: "—", rating: "" };
  }
}
const GRADE_W = { "긴급": 3, "주요": 2, "주시": 1, "참고": 0 };
async function applianceNews() {
  const j = await (await fetch("https://mi.samsungda.net/data/news.json", UA)).json();
  const cut = Date.now() - 24 * 3600 * 1000;
  const recent = j.items.filter(i => new Date(i.publishedAt).getTime() >= cut);
  const pool = recent.length ? recent : j.items;
  const pick = pool
    .sort((a, b) => (GRADE_W[b.grade] - GRADE_W[a.grade]) || (b.impact - a.impact))
    .slice(0, 5);
  return pick.map(i => `• <${i.url}|${i.headline}>  _${i.grade}·${i.lens}·${i.source?.name ?? ""}_`).join("\n")
    || "· 최근 24h 신규 없음";
}
// 팟캐스트 플레이어 — 사이트 비밀번호 게이트 안이라 첫 접속 시 1회 로그인이 필요하다.
const BRIEF_URL = process.env.BRIEF_URL || "https://simpleornothing.com/brief.html";
const SITE_URL = process.env.SITE_URL || "https://simpleornothing.com";

/* ── 뉴스레터 본문 = 게이트 보드 + 레이어 갭 ────────────────────────────────
   러너는 비밀번호 게이트를 못 넘어 /api/brief 를 못 읽는다(SITE_PASSWORD 미설정 · OPS §8).
   그래서 LLM 문장이 아니라 **결정론적 판정**을 직접 계산해 싣는다.
   임계·밴드·판정식은 절대 여기서 다시 정의하지 않는다 — index.html(단일 SoT)에서 통째로 뽑아 쓴다.
   (OPS §1 「임계 중복 정의 금지」. 파싱 실패 시 조용히 본문만 생략하고 지표·링크는 그대로 나간다.) */
function liveFrame() {
  try {
    const idx = readFileSync("index.html", "utf8");
    const th = idx.match(/const TH=\{[\s\S]*?\};/);
    const ev = idx.match(/function evalGate\(S\)\{[\s\S]*?\n \}\n window\.macroEval=evalGate;/);
    const tg = idx.match(/let TARGETS=\[[\s\S]*?\n\];/);
    if (!th || !ev || !tg) return null;
    const body = th[0] + "\n" + ev[0].replace("window.macroEval=evalGate;", "") + "\n" + tg[0] +
      "\nreturn { evalGate: evalGate, TARGETS: TARGETS, TH: TH };";
    return new Function(body)();
  } catch { return null; }
}

const GRADE_TXT = {
  0: "0/3 잠김 — 신규 매수 금지, 사전승인 트림만",
  1: "G1 — 1차 트랜치 조건 성립(나머지 AND 확인 필요)",
  2: "G2 — 2차 트랜치 조건 성립",
  3: "G3 — 최대 트랜치 조건 성립",
};

function gateBlock(fr) {
  const S = JSON.parse(readFileSync("signals.json", "utf8"));
  const g = fr.evalGate(S), T = fr.TH;
  const n = (v) => (v == null ? "—" : v);
  const mark = (hit) => (hit ? "🔴" : "⚪");
  return `*■ 매크로 게이트 · 3중 AND*  ${GRADE_TXT[g.grade] || g.grade}
` +
    `${mark(g.dd != null && g.dd <= T.ddG1)} 나스닥 드로다운 *${n(g.dd)}%*  _(트립 ${T.ddG1}%)_
` +
    `${mark(g.f1)} VIX *${n(g.vix)}*  _(트립 ${T.vixF})_
` +
    `${mark(g.f2)} CNN 공포탐욕 *${n(g.fg)}*  _(트립 ${T.fgF})_`;
}

function layerBlock(fr) {
  const H = JSON.parse(readFileSync("holdings.json", "utf8"));
  const rows = (H.holdings || []).map((h) => {
    const t = fr.TARGETS.find((x) => x.layer === h.layer);
    if (!t) return null;
    const gap = h.w > t.hi ? +(h.w - t.hi).toFixed(1) : h.w < t.lo ? +(h.w - t.lo).toFixed(1) : 0;
    return { l: h.layer, w: h.w, lo: t.lo, hi: t.hi, gap, dir: t.dir };
  }).filter(Boolean).filter((r) => r.gap !== 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 4);
  if (!rows.length) return "*■ 레이어 갭*\n· 전 레이어 적정밴드 안";
  return "*■ 레이어 갭*  _비중 vs 적정밴드_\n" + rows.map((r) =>
    `${r.gap > 0 ? "▼" : "▲"} ${r.l} *${r.w}%* / ${r.lo}~${r.hi}% · ` +
    `${r.gap > 0 ? "오버 +" : "언더 "}${r.gap}%p`).join("\n");
}


const pct = (n, p) => `${n >= p ? "▲" : "▼"}${Math.abs((n - p) / p * 100).toFixed(2)}%`;

const [ndx, tnx, wti, ks, news] = await Promise.all(
  [yahoo("^IXIC"), yahoo("^TNX"), yahoo("CL=F"), yahoo("^KS11"), applianceNews()]
);
const fg = fng();

// 판정 블록(게이트·레이어) — 파싱 실패 시 조용히 생략한다(지표·뉴스·링크는 그대로).
const FR = liveFrame();
let frameBlock = "";
try {
  if (FR) frameBlock = "\n" + gateBlock(FR) + "\n\n" + layerBlock(FR) + "\n\n";
} catch (e) {
  console.log("[warn] 판정 블록 생략:", e.message);
}

const text =
  `*📊 알파맵 데일리 · ${new Date().toLocaleDateString("ko-KR")}*\n` +
  `• 나스닥: *${ndx.price.toLocaleString()}* (${pct(ndx.price, ndx.prev)})\n` +
  `• 美 10Y: *${tnx.price.toFixed(2)}%*\n` +
  `• WTI: *$${wti.price.toFixed(2)}* (${pct(wti.price, wti.prev)})\n` +
  `• 코스피(전일): *${ks.price.toLocaleString()}* (${pct(ks.price, ks.prev)})\n` +
  `• CNN F&G: *${fg.score}*${fg.rating ? ` (${fg.rating})` : ""}\n\n` +
  frameBlock +
  `*🏠 가전 주요뉴스*  _(mi.samsungda.net)_\n${news}\n\n` +
  // 8분 2인 대담 팟캐스트 — 대본은 열 때 워커(/api/brief)가 라이브 JSON으로 생성·R2 날짜 캐시.
  // 텍스트를 대체하지 않고 병기한다(스캔은 텍스트, 이동 중엔 음성).
  `🎧 <${BRIEF_URL}|오늘 브리핑 듣기 (2인 대담 · 약 8분)>  ·  ` +
  `📄 <${SITE_URL}/#v-brief|06 모닝 브리핑 (지난 호 보기)>`;

const r = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({ channel: DM, text }),
});
const j = await r.json();
if (!j.ok) throw new Error(`Slack ${j.error}`);
console.log("sent", j.ts);
