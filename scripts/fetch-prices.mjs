// Daily price fetcher for the Tenbagger Observatory.
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress.
// Source of truth for tickers/markets is the C array inside index.html.
// Korean (KOSPI/KOSDAQ) -> Naver; US/Taiwan/Japan -> Yahoo. Failures are
// non-fatal: last known price is preserved so the site never goes blank.
//
// changePct = YoY 수익률: (현재가 / 약 1년 전(≈365일 전) 종가 − 1) × 100.
// 전일 대비가 아니라 전년 동기 대비. 필드명은 프런트(priceHTML) 호환을 위해
// changePct 그대로 유지하고 의미만 YoY로 전환한다. Yahoo는 range=1y 창에서
// 365일 전 시점 이후 첫 종가를, Naver는 ~400일 일봉에서 365일 전 이후 첫
// 거래일 종가를 기준가로 쓴다 → US/KR 모두 '1년 전 대비'로 일원화.

import fs from 'node:fs';

const HTML = 'index.html';
const OUT = 'prices.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const YEAR_AGO_SEC = () => Math.floor((Date.now() - 365 * 864e5) / 1000);
const YEAR_AGO_YMD = () => ymd(new Date(Date.now() - 365 * 864e5));

function readCandidates() {
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/const C=(\[[\s\S]*?\n\];)/);
  if (!m) throw new Error('C array not found in index.html');
  // C contains only literals -> safe to evaluate.
  const C = eval(m[1].replace(/;\s*$/, ''));
  return C.map((c) => ({ id: c.id, ticker: c.ticker, mkt: c.mkt }));
}

function yahooSymbol(ticker, mkt) {
  switch (mkt) {
    case 'NASDAQ':
    case 'NYSE': return ticker;
    case 'TWSE': return ticker + '.TW';
    case 'TSE': return ticker + '.T';
    case 'KOSPI': return ticker + '.KS';
    case 'KOSDAQ': return ticker + '.KQ';
    default: return null;
  }
}

let YCOOKIE = '';
async function yahooAuth() {
  try {
    const r = await fetch('https://fc.yahoo.com', { headers: UA });
    const sc = r.headers.get('set-cookie');
    if (sc) YCOOKIE = sc.split(';')[0];
  } catch (e) { /* cookie is optional; chart often works without it */ }
}

async function yahoo(sym) {
  // range=1y → ~52주 일봉 확보 후 약 1년 전 종가를 YoY 기준가로 사용.
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`;
  const r = await fetch(u, { headers: { ...UA, ...(YCOOKIE ? { Cookie: YCOOKIE } : {}) } });
  if (!r.ok) throw new Error('yahoo HTTP ' + r.status);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const meta = res?.meta;
  if (!meta || meta.regularMarketPrice == null) throw new Error('yahoo no data');
  const price = meta.regularMarketPrice;
  // 기준가 = 365일 전 시점 이후 첫 유효 종가. 없으면 chartPreviousClose, 그래도 없으면 창의 첫 종가.
  const ts = res.timestamp || [];
  const cl = res.indicators?.quote?.[0]?.close || [];
  const t0 = YEAR_AGO_SEC();
  let base = null;
  for (let i = 0; i < ts.length; i++) { if (ts[i] >= t0 && cl[i] != null) { base = cl[i]; break; } }
  if (base == null) base = meta.chartPreviousClose ?? null;
  if (base == null) base = cl.find((x) => x != null) ?? null;
  return { price, changePct: base ? +(((price - base) / base) * 100).toFixed(2) : null, currency: meta.currency || 'USD' };
}

async function naver(code) {
  const end = ymd(new Date());
  const start = ymd(new Date(Date.now() - 400 * 864e5)); // ~13개월 → YoY 기준가 확보
  const u = `https://api.finance.naver.com/siseJson.naver?symbol=${encodeURIComponent(code)}&requestType=1&startTime=${start}&endTime=${end}&timeframe=day`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('naver HTTP ' + r.status);
  const txt = await r.text();
  const arr = JSON.parse(txt.replace(/'/g, '"')); // header: [날짜,시가,고가,저가,종가,거래량]
  const rows = arr.slice(1).filter((x) => Array.isArray(x) && x.length >= 5 && x[4] != null);
  if (!rows.length) throw new Error('naver empty');
  const price = Number(rows[rows.length - 1][4]); // [4] = 종가(close), not [1] 시가(open)
  // 기준가 = 365일 전 시점 이후 첫 거래일 종가(전년 동기). 없으면 창의 첫 종가.
  const t0 = YEAR_AGO_YMD();
  const baseRow = rows.find((x) => String(x[0]).replace(/-/g, '') >= t0) || rows[0];
  const base = Number(baseRow[4]);
  return { price, changePct: base ? +(((price - base) / base) * 100).toFixed(2) : null, currency: 'KRW' };
}

async function quote(c) {
  if (c.mkt === 'KOSPI' || c.mkt === 'KOSDAQ') {
    try { return { ...(await naver(c.ticker)), src: 'naver' }; } catch (e1) {
      for (const suf of (c.mkt === 'KOSDAQ' ? ['.KQ', '.KS'] : ['.KS', '.KQ'])) {
        try { return { ...(await yahoo(c.ticker + suf)), src: 'yahoo' + suf }; } catch (e2) { /* try next */ }
      }
      throw e1;
    }
  }
  const s = yahooSymbol(c.ticker, c.mkt);
  if (!s) throw new Error('no market mapping for ' + c.mkt);
  return { ...(await yahoo(s)), src: 'yahoo' };
}

async function main() {
  const candidates = readCandidates();
  let prev = { asOf: null, quotes: {} };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const out = { asOf: prev.asOf, quotes: { ...(prev.quotes || {}) } };

  await yahooAuth();
  let ok = 0, fail = 0;
  for (const c of candidates) {
    try {
      const q = await quote(c);
      out.quotes[c.id] = { price: q.price, changePct: q.changePct, currency: q.currency, ticker: c.ticker, src: q.src };
      ok++;
      console.log(`OK   ${c.id.padEnd(8)} ${c.ticker.padEnd(8)} ${q.price} ${q.currency} YoY=${q.changePct}% (${q.src})`);
    } catch (e) {
      fail++;
      console.log(`FAIL ${c.id.padEnd(8)} ${c.ticker.padEnd(8)} ${e.message}${out.quotes[c.id] ? ' (keeping last known)' : ''}`);
    }
    await sleep(300);
  }
  if (ok > 0) out.asOf = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nDone: ${ok} ok, ${fail} failed. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
