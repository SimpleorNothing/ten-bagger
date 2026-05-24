// Alpha estimator for the 初入 Observatory · Alpha Map (05 알파 맵).
//
// Reproduces the PDF heuristic as a FIXED scoring table (no mean-reversion):
//   alpha ≈ ① beta/theme  + ② stage(runway)  + ③ imminent catalyst
//           + ④ momentum(relative strength, persists forward)  − ⑤ valuation ceiling
// Horizon weights:  wk = ④+③ ,  m3 = ③+②+⑤ ,  y1 = ②+⑤  (index overlap → 0)
//
// Inputs that are mechanizable (auto): β + relative strength vs each benchmark
// (Yahoo price history), valuation-ceiling proxy (maturity), catalyst timing.
// Judgment inputs (stage/maturity/conviction) come from the C array in
// index.html; the per-quarter 초입 5신호 scores are pulled from the tracker
// Gist when GH_GIST_TOKEN + GIST_ID are present (optional — degrades cleanly).
//
// Runs in GitHub Actions (the repo sandbox blocks egress, same as fetch-prices).
// Output is intentionally COARSE (rounded to 0.5 %p): trust the sign/bucket,
// not the 0.x — see the PDF's own caveat.

import fs from 'node:fs';

const HTML = 'index.html';
const OUT = 'alpha.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chart axis clamps (must match index.html: X0..X1 = -4..3, Y0..Y1 = -10..10).
const clampX = (v) => Math.max(-4, Math.min(3, v));
const clampY = (v) => Math.max(-10, Math.min(10, v));
const round5 = (v) => Math.round(v * 2) / 2;

// ② stage → structural runway score (higher = more headroom left).
// 성숙/과열도 0이 아닌 잔여 runway를 줘서 1년 분포가 납작해지지 않게 함.
const STAGE_RUNWAY = { 태동: 2.0, 초입: 2.0, 가속: 1.2, 성숙: 0.4, 과열: 0.0, 방어: -1.0 };

// Non-ticker placeholders used in the D array (ETF baskets, defensive, etc.).
const NOT_A_TICKER = new Set(['ETF', '방어', '기타', '소부장 L4', '한국 ETF']);

function evalArray(name) {
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(new RegExp(`const ${name}=(\\[[\\s\\S]*?\\n\\];)`));
  if (!m) throw new Error(`${name} array not found in ${HTML}`);
  return eval(m[1].replace(/;\s*$/, '')); // literals + comments only → safe
}

function yahooSymbol(t, mkt) {
  if (mkt === 'KR') return `${t}.KS`;     // KOSPI tickers are 6-digit
  return t;                                // US/NYSE/NASDAQ use the bare symbol
}

// 1y of daily closes from Yahoo, returned as [{t, c}] sorted ascending.
async function history(sym) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error(`yahoo HTTP ${r.status}`);
  const res = (await r.json())?.chart?.result?.[0];
  const ts = res?.timestamp, cl = res?.indicators?.quote?.[0]?.close;
  if (!ts || !cl) throw new Error('yahoo no history');
  const out = [];
  for (let i = 0; i < ts.length; i++) if (cl[i] != null) out.push({ t: ts[i], c: cl[i] });
  if (out.length < 30) throw new Error('too few points');
  return out;
}

// Trailing return over the last `n` trading days (fraction, e.g. 0.05 = +5%).
const ret = (h, n) => {
  if (h.length <= n) return null;
  const a = h[h.length - 1 - n].c, b = h[h.length - 1].c;
  return a ? b / a - 1 : null;
};

// β = cov(asset, bench)/var(bench) on daily returns over the common window.
function beta(ha, hb) {
  const map = new Map(hb.map((p) => [p.t, p.c]));
  const ra = [], rb = [];
  for (let i = 1; i < ha.length; i++) {
    const a0 = ha[i - 1].c, a1 = ha[i].c;
    const b0 = map.get(ha[i - 1].t), b1 = map.get(ha[i].t);
    if (a0 && a1 && b0 && b1) { ra.push(a1 / a0 - 1); rb.push(b1 / b0 - 1); }
  }
  if (rb.length < 30) return 1;
  const mb = rb.reduce((s, x) => s + x, 0) / rb.length;
  const ma = ra.reduce((s, x) => s + x, 0) / ra.length;
  let cov = 0, varb = 0;
  for (let i = 0; i < rb.length; i++) { cov += (ra[i] - ma) * (rb[i] - mb); varb += (rb[i] - mb) ** 2; }
  return varb ? cov / varb : 1;
}

// Relative strength (asset − benchmark) over a trailing window, in %p.
const rs = (ha, hb, n) => {
  const a = ret(ha, n), b = ret(hb, n);
  return a == null || b == null ? null : (a - b) * 100;
};

// Optional: pull 초입 5신호 scores from the private tracker Gist.
async function loadGistScores() {
  const token = process.env.GH_GIST_TOKEN, id = process.env.GIST_ID;
  if (!token || !id) return {};
  try {
    const r = await fetch(`https://api.github.com/gists/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) throw new Error(`gist HTTP ${r.status}`);
    const g = await r.json();
    const file = g.files?.['tenbagger-observatory-8L.json'];
    const data = JSON.parse(file.content)?.data || [];
    const byId = {};
    for (const x of data) byId[x.id] = x.S || {};
    return byId;
  } catch (e) {
    console.warn('Gist scores skipped:', e.message);
    return {};
  }
}

function build() {
  const D = evalArray('D');
  const C = evalArray('C');
  const cByTicker = new Map(C.map((c) => [String(c.ticker), c]));
  const cById = new Map(C.map((c) => [c.id, c]));
  const targets = D.filter((d) => d.t && !NOT_A_TICKER.has(d.t));
  return { targets, cByTicker, cById };
}

// Map the five inputs → [wk, m3, y1] alpha (%p) for one benchmark.
// 모멘텀은 tanh로 포화시켜 큰 상대강도가 차트 천장(±10)을 뚫지 않게 하고,
// 1년은 runway + 밸류천장(낮은 maturity = 리레이팅 여력)이 지배하게 한다.
function estimate({ frame, betaB, rsW, rsM, rsY, catalyst }) {
  const runway = STAGE_RUNWAY[frame.stage] ?? 0.4;
  const conv = frame.conv ?? 0.6;
  const convF = 0.7 + conv * 0.5;                          // ~1.0..1.2 엣지 스케일러
  const valHead = Math.max(0, 0.8 - (frame.mat ?? 0.6));   // 0..0.8 리레이팅 여력 (음수 강제 없음)
  const mom = (rs, A, s) => (rs == null ? 0 : A * Math.tanh(rs / s)); // 포화 모멘텀

  // 고베타는 단기 강세 테이프를 약간 증폭(짧은 호라이즌에만 의미).
  const tape = 0.9 + Math.min(1.6, Math.max(0.5, betaB)) * 0.1;
  const wk = (mom(rsW, 1.6, 8) + catalyst.wk) * tape;                 // ④모멘텀 + ③임박
  const m3 = (mom(rsM, 3.5, 22) + catalyst.m3) * tape + runway * 1.2 * convF + valHead * 1.2; // ③+②+⑤
  const y1 = (runway * 2.0 + valHead * 12) * convF + mom(rsY, 1.0, 40);                       // ②runway + ⑤밸류

  return [round5(clampX(wk)), round5(clampY(m3)), round5(clampY(y1))];
}

async function main() {
  const { targets, cByTicker, cById } = build();
  const gist = await loadGistScores();

  // Benchmarks fetched once.
  const benchH = {};
  for (const [k, sym] of [['NASDAQ', 'QQQ'], ['KOSPI', '^KS200']]) {
    try { benchH[k] = await history(sym); } catch (e) { console.warn(`bench ${sym} failed:`, e.message); }
    await sleep(300);
  }

  const quotes = {};
  for (const d of targets) {
    const sym = yahooSymbol(d.t, d.mkt);
    let ha;
    try { ha = await history(sym); } catch (e) { console.warn(`skip ${d.t} (${sym}):`, e.message); await sleep(250); continue; }

    const c = cByTicker.get(String(d.t));
    const frame = { stage: d.stage || c?.stage || '가속', mat: c?.mat, conv: c?.conv };

    // ③ catalyst from Gist 5신호 (S2 beat&raise, S3 visibility) when available.
    const S = c ? gist[c.id] : null;
    const s = (k) => (S && S[k] != null ? Number(S[k]) : 0);
    const catScore = s('s2') + s('s3'); // 0..4
    const catalyst = { wk: 0, m3: catScore * 0.4 };

    const out = {};
    for (const [k, hb] of Object.entries(benchH)) {
      const key = k === 'NASDAQ' ? 'aN' : 'aK';
      out[key] = estimate({
        frame,
        betaB: beta(ha, hb),
        rsW: rs(ha, hb, 5), rsM: rs(ha, hb, 63), rsY: rs(ha, hb, 252),
        catalyst,
      });
    }
    quotes[d.t] = out;
    console.log(`${d.t.padEnd(8)} aN=${JSON.stringify(out.aN)} aK=${JSON.stringify(out.aK)}`);
    await sleep(250);
  }

  const payload = {
    asOf: new Date().toISOString(),
    method: 'heuristic v1: β + relative-strength momentum + stage runway − valuation ceiling + catalyst (no mean-reversion). Coarse (0.5%p); trust sign/bucket.',
    benchmarks: { aN: 'QQQ', aK: '^KS200' },
    quotes,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT} with ${Object.keys(quotes).length} tickers.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
