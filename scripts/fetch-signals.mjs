// Daily macro-signal fetcher for the Tenbagger Observatory (01 매크로 매매 · 통합 매수 게이트 3등급).
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress.
// 2026-06-07 확장: 구 3중 신호등(VIX 종가·F&G·S&P 일간) → 3등급 게이트 입력 전체 수집.
//  - VIX: 종가 + 장중 고가 (종가 40 룰이 2024.8(장중 65/종가 38.6)·2026.3(피크 35)을 놓친 사각지대 보강)
//  - VIX3M: 기간구조 역전(VIX > VIX3M = 백워데이션) 판정용 — 레벨 무관 패닉 레짐 지표
//  - 나스닥: 5y 최고 종가 대비 드로다운 %, 40주 이평 기울기(13주 전 대비)·이격 % — G1/G2 추세 필터
//  - sidecarKR: 수동 입력 보존(자동 수집 불가). sidecarDate와 함께 기록, 페이지가 asOf 일치 시에만 점등.
// Per-source failures are non-fatal: the last known value is preserved so the
// gate never goes blank on a transient hiccup. Values are range-validated.

import fs from 'node:fs';

const OUT = 'signals.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };

const clamp = (n, lo, hi) => (Number.isFinite(n) && n >= lo && n <= hi ? n : null);

async function yahoo(sym, range = '5d', interval = '1d') {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('yahoo HTTP ' + r.status);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res?.meta || res.meta.regularMarketPrice == null) throw new Error('yahoo no data');
  const closes = (res.indicators?.quote?.[0]?.close || []).filter((v) => Number.isFinite(v));
  return { meta: res.meta, closes };
}

async function fetchVix() {
  const { meta } = await yahoo('^VIX');
  const close = clamp(+meta.regularMarketPrice.toFixed(2), 0, 150);
  const high = meta.regularMarketDayHigh != null ? clamp(+meta.regularMarketDayHigh.toFixed(2), 0, 200) : null;
  return { close, high };
}

async function fetchVix3m() {
  const { meta } = await yahoo('^VIX3M');
  return clamp(+meta.regularMarketPrice.toFixed(2), 0, 150);
}

async function fetchSpDailyPct() {
  const { meta } = await yahoo('^GSPC');
  const prev = meta.previousClose ?? meta.chartPreviousClose ?? null;
  if (!prev) throw new Error('no prev close for ^GSPC');
  return clamp(+(((meta.regularMarketPrice - prev) / prev) * 100).toFixed(2), -30, 30);
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

async function fetchNasdaq() {
  // 드로다운: 5y 일간 최고 종가 대비 (강세장 기준 사실상 ATH 대비)
  const d = await yahoo('^IXIC', '5y', '1d');
  const last = d.meta.regularMarketPrice;
  const maxClose = Math.max(last, ...d.closes);
  const drawdownPct = clamp(+(((last / maxClose) - 1) * 100).toFixed(2), -95, 0);
  // 40주 이평: 2y 주간 종가. 기울기 = 현 40주 평균 vs 13주 전 40주 평균.
  const w = await yahoo('^IXIC', '2y', '1wk');
  const wc = w.closes;
  if (wc.length < 53) throw new Error('not enough weekly closes for 40w MA');
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const ma40 = avg(wc.slice(-40));
  const ma40Prev = avg(wc.slice(-53, -13));
  const wma40SlopeUp = ma40 > ma40Prev;
  const wma40GapPct = clamp(+(((last / ma40) - 1) * 100).toFixed(2), -90, 90);
  return { drawdownPct, wma40SlopeUp, wma40GapPct };
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* first run */ }

  const out = {
    asOf: prev.asOf ?? null,
    source: '자동(크론)',
    vix: prev.vix ?? null,
    vixHigh: prev.vixHigh ?? null,
    vix3m: prev.vix3m ?? null,
    fearGreed: prev.fearGreed ?? null,
    spDailyPct: prev.spDailyPct ?? null,
    nasdaqDrawdownPct: prev.nasdaqDrawdownPct ?? null,
    wma40SlopeUp: prev.wma40SlopeUp ?? null,
    wma40GapPct: prev.wma40GapPct ?? null,
    // 사이드카는 자동 수집 불가 — 수동 입력(sidecarKR:true + sidecarDate:'YYYY-MM-DD')을 그대로 보존.
    // 페이지는 sidecarDate === asOf 인 경우에만 당일 점등으로 계산(스테일 자동 무효화).
    sidecarKR: prev.sidecarKR ?? null,
    sidecarDate: prev.sidecarDate ?? null,
    note: '통합 매수 게이트 입력. VIX 종가/장중·VIX3M·CNN F&G·S&P 일간·나스닥 드로다운(5y)·40주선 기울기/이격 자동 수집(1일 1회). sidecarKR은 수동(sidecarDate 필수, asOf 일치 시에만 점등). null이면 페이지 폴백.',
  };

  let ok = 0;
  const tasks = [
    ['vix', async () => { const v = await fetchVix(); out.vix = v.close; out.vixHigh = v.high; return `${v.close} (H ${v.high})`; }],
    ['vix3m', async () => { const v = await fetchVix3m(); out.vix3m = v; return v; }],
    ['spDailyPct', async () => { const v = await fetchSpDailyPct(); out.spDailyPct = v; return v; }],
    ['fearGreed', async () => { const v = await fetchFearGreed(); out.fearGreed = v; return v; }],
    ['nasdaq', async () => { const v = await fetchNasdaq(); out.nasdaqDrawdownPct = v.drawdownPct; out.wma40SlopeUp = v.wma40SlopeUp; out.wma40GapPct = v.wma40GapPct; return `dd ${v.drawdownPct}% · 40w ${v.wma40SlopeUp ? '↑' : '↓'} · gap ${v.wma40GapPct}%`; }],
  ];
  for (const [key, fn] of tasks) {
    try {
      const msg = await fn();
      ok++;
      console.log(`OK   ${key} = ${msg}`);
    } catch (e) {
      console.log(`FAIL ${key}: ${e.message} (keeping last known)`);
    }
  }

  if (ok > 0) out.asOf = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nDone: ${ok}/${tasks.length} ok. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
