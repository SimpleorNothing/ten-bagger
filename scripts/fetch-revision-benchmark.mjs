// Nasdaq-100 EPS revision benchmark for the zero-base investment score.
// Constituents: official Nasdaq API. Revisions: Yahoo Finance earningsTrend.
// Scoring anchors use the cross-sectional P10/P90; P50 is retained for audit/display.
import fs from 'node:fs';

const OUT = 'revision-benchmark.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const MIN_SAMPLE = 50;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const num = (v) => {
  const x = v && typeof v === 'object' ? v.raw : v;
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
};
const changePct = (now, then) => now == null || then == null || then <= 0 ? null : ((now / then) - 1) * 100;

let cookie = '';
let crumb = '';
async function yahooAuth() {
  try {
    const r = await fetch('https://fc.yahoo.com', { headers: UA });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const c = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, ...(cookie ? { Cookie: cookie } : {}) } });
    if (c.ok) crumb = (await c.text()).trim();
  } catch {}
}

async function constituents() {
  const url = 'https://api.nasdaq.com/api/quote/list-type/nasdaq100';
  const r = await fetch(url, { headers: { ...UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Nasdaq constituents HTTP ${r.status}`);
  const j = await r.json();
  const rows = j?.data?.data?.rows;
  const symbols = Array.isArray(rows) ? rows.map((x) => String(x?.symbol || '').trim()).filter(Boolean) : [];
  if (symbols.length < 90) throw new Error(`Nasdaq-100 constituent count too small: ${symbols.length}`);
  return { symbols: [...new Set(symbols)], asOf: j?.data?.date || null, url };
}

function periodRevision(trend, period) {
  const t = trend.find((x) => x?.period === period);
  const e = t?.epsTrend || {};
  const now = num(e.current);
  return { c30: changePct(now, num(e['30daysAgo'])), c90: changePct(now, num(e['90daysAgo'])) };
}

async function revisions(symbol) {
  const q = crumb && !crumb.includes('<') ? `&crumb=${encodeURIComponent(crumb)}` : '';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=earningsTrend${q}`;
  const r = await fetch(url, { headers: { ...UA, ...(cookie ? { Cookie: cookie } : {}) } });
  if (!r.ok) throw new Error(`Yahoo ${symbol} HTTP ${r.status}`);
  const j = await r.json();
  const trend = j?.quoteSummary?.result?.[0]?.earningsTrend?.trend;
  if (!Array.isArray(trend)) throw new Error(`Yahoo ${symbol} earningsTrend missing`);
  return { q1: periodRevision(trend, '+1q'), fy1: periodRevision(trend, '+1y') };
}

function percentile(values, p) {
  const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const k = (xs.length - 1) * p;
  const lo = Math.floor(k), hi = Math.ceil(k);
  return xs[lo] + (xs[hi] - xs[lo]) * (k - lo);
}

function metric(rows, path) {
  const values = rows.map((r) => path.reduce((v, k) => v?.[k], r)).filter(Number.isFinite);
  return {
    n: values.length,
    p10: +percentile(values, 0.10).toFixed(2),
    p50: +percentile(values, 0.50).toFixed(2),
    p90: +percentile(values, 0.90).toFixed(2),
  };
}

const official = await constituents();
await yahooAuth();
const rows = [];
const failures = [];
for (const symbol of official.symbols) {
  try { rows.push({ symbol, ...(await revisions(symbol)) }); }
  catch (e) { failures.push({ symbol, error: String(e?.message || e) }); }
  await sleep(180);
}
const metrics = {
  q1_c30: metric(rows, ['q1', 'c30']),
  q1_c90: metric(rows, ['q1', 'c90']),
  fy1_c30: metric(rows, ['fy1', 'c30']),
  fy1_c90: metric(rows, ['fy1', 'c90']),
};
for (const [name, m] of Object.entries(metrics)) {
  if (m.n < MIN_SAMPLE || !(m.p10 < m.p90)) throw new Error(`invalid benchmark ${name}: ${JSON.stringify(m)}`);
}
const output = {
  schema: 'revision-benchmark-v1',
  asOf: new Date().toISOString(),
  universe: 'Nasdaq-100',
  constituentCount: official.symbols.length,
  constituentAsOf: official.asOf,
  methodology: 'Nasdaq-100 cross-section; P10=0, P90=100; linear interpolation; winsorized outside anchors',
  minimumSample: MIN_SAMPLE,
  metrics,
  sources: {
    constituents: { provider: 'Nasdaq', url: official.url },
    revisions: { provider: 'Yahoo Finance', module: 'quoteSummary.earningsTrend' },
  },
  failedCount: failures.length,
  failures,
};
fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');
console.log(`wrote ${OUT}: ${rows.length}/${official.symbols.length} symbols, ${failures.length} failures`);
