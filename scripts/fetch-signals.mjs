// Daily macro-signal fetcher for the Tenbagger Observatory (01 매크로 매매 신호등).
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress.
// Sources: VIX 종가 & S&P 500 일간 % from Yahoo Finance; CNN Fear & Greed from CNN dataviz.
// Per-source failures are non-fatal: the last known value is preserved so the
// signal lights never go blank on a transient hiccup. Values are range-validated
// (same bounds the manual web form uses) so a bad fetch can't pollute the board.

import fs from 'node:fs';

const OUT = 'signals.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };

const clamp = (n, lo, hi) => (Number.isFinite(n) && n >= lo && n <= hi ? n : null);

async function yahooChart(sym) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('yahoo HTTP ' + r.status);
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice == null) throw new Error('yahoo no data');
  const price = meta.regularMarketPrice;
  const prev = meta.previousClose ?? meta.chartPreviousClose ?? null;
  return { price, changePct: prev ? ((price - prev) / prev) * 100 : null };
}

async function fetchVix() {
  const { price } = await yahooChart('^VIX');
  return clamp(+price.toFixed(2), 0, 150);
}

async function fetchSpDailyPct() {
  const { changePct } = await yahooChart('^GSPC');
  if (changePct == null) throw new Error('no prev close for ^GSPC');
  return clamp(+changePct.toFixed(2), -30, 30);
}

async function fetchFearGreed() {
  const u = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('cnn HTTP ' + r.status);
  const j = await r.json();
  const score = j?.fear_and_greed?.score;
  if (score == null) throw new Error('cnn no score');
  return clamp(Math.round(Number(score)), 0, 100);
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* first run */ }

  const out = {
    asOf: prev.asOf ?? null,
    source: '자동(크론)',
    vix: prev.vix ?? null,
    fearGreed: prev.fearGreed ?? null,
    spDailyPct: prev.spDailyPct ?? null,
    note: "VIX 종가·CNN F&G·S&P 일간. 자동 수집(미국장 마감 후 1일 1회). null이면 페이지 '--' 폴백. 폼은 수동 보정용.",
  };

  let ok = 0;
  const tasks = [
    ['vix', fetchVix],
    ['spDailyPct', fetchSpDailyPct],
    ['fearGreed', fetchFearGreed],
  ];
  for (const [key, fn] of tasks) {
    try {
      const v = await fn();
      out[key] = v;
      ok++;
      console.log(`OK   ${key} = ${v}`);
    } catch (e) {
      console.log(`FAIL ${key}: ${e.message}${out[key] != null ? ' (keeping last known)' : ''}`);
    }
  }

  if (ok > 0) out.asOf = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nDone: ${ok}/3 ok. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
