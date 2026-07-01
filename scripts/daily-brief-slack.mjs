const SLACK = process.env.SLACK_WEBHOOK_URL;
const UA = { headers: { "User-Agent": "Mozilla/5.0" } };

async function yahoo(sym) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
  const m = (await (await fetch(u, UA)).json()).chart.result[0].meta;
  return { price: m.regularMarketPrice, prev: m.chartPreviousClose };
}
async function fng() {
  const d = new Date().toISOString().slice(0, 10);
  const j = await (await fetch(`https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${d}`, UA)).json();
  return { score: Math.round(j.fear_and_greed.score), rating: j.fear_and_greed.rating };
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

const [ndx, tnx, wti, ks, fg, news] = await Promise.all(
  [yahoo("^IXIC"), yahoo("^TNX"), yahoo("CL=F"), yahoo("^KS11"), fng(), applianceNews()]
);

const text =
  `*📊 알파맵 데일리 · ${new Date().toLocaleDateString("ko-KR")}*\n` +
  `• 나스닥: *${ndx.price.toLocaleString()}* (${pct(ndx.price, ndx.prev)})\n` +
  `• 美 10Y: *${tnx.price.toFixed(3)}* ← 스케일 검증\n` +
  `• WTI: *$${wti.price.toFixed(2)}* (${pct(wti.price, wti.prev)})\n` +
  `• 코스피(전일): *${ks.price.toLocaleString()}* (${pct(ks.price, ks.prev)})\n` +
  `• CNN F&G: *${fg.score}* (${fg.rating})\n\n` +
  `*🏠 가전 주요뉴스*  _(mi.samsungda.net)_\n${news}`;

const r = await fetch(SLACK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text }),
});
if (!r.ok) throw new Error(`Slack ${r.status}`);
console.log("sent");
