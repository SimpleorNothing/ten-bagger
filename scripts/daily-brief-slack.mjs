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
const pct = (n, p) => `${n >= p ? "▲" : "▼"}${Math.abs((n - p) / p * 100).toFixed(2)}%`;

const [ndx, tnx, wti, ks, news] = await Promise.all(
  [yahoo("^IXIC"), yahoo("^TNX"), yahoo("CL=F"), yahoo("^KS11"), applianceNews()]
);
const fg = fng();

const text =
  `*📊 알파맵 데일리 · ${new Date().toLocaleDateString("ko-KR")}*\n` +
  `• 나스닥: *${ndx.price.toLocaleString()}* (${pct(ndx.price, ndx.prev)})\n` +
  `• 美 10Y: *${tnx.price.toFixed(2)}%*\n` +
  `• WTI: *$${wti.price.toFixed(2)}* (${pct(wti.price, wti.prev)})\n` +
  `• 코스피(전일): *${ks.price.toLocaleString()}* (${pct(ks.price, ks.prev)})\n` +
  `• CNN F&G: *${fg.score}*${fg.rating ? ` (${fg.rating})` : ""}\n\n` +
  `*🏠 가전 주요뉴스*  _(mi.samsungda.net)_\n${news}`;

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
