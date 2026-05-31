// Daily price fetcher for the Tenbagger Observatory.
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress.
// Source of truth for tickers/markets is the C array inside index.html.
// Korean (KOSPI/KOSDAQ) -> Naver; US/Taiwan/Japan -> Yahoo. Failures are
// non-fatal: last known price is preserved so the site never goes blank.
//
// changePct = YTD 수익률: (현재가 / 전년도 마지막 거래일 종가 − 1) × 100.
// 전일 대비가 아니라 연초 대비(올해 누적). 필드명은 프런트(priceHTML) 호환을
// 위해 changePct 그대로 유지하고 의미만 YTD로 전환한다. Yahoo는 range=1y 창에서
// 1/1 직전 마지막 종가(없으면 올해 첫 종가)를, Naver는 ~400일 일봉에서 같은
// 기준가를 쓴다 → US/KR 모두 '연초 대비'로 일원화.

import fs from 'node:fs';

const HTML = 'index.html';
const OUT = 'prices.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const YEAR_START = () => new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
const YEAR_START_SEC = () => Math.floor(YEAR_START().getTime() / 1000);
const YEAR_START_YMD = () => ymd(YEAR_START());

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
  // range=1y → ~52주 일봉 확보 후 올해 1/1 직전 마지막 종가를 YTD 기준가로 사용.
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`;
  const r = await fetch(u, { headers: { ...UA, ...(YCOOKIE ? { Cookie: YCOOKIE } : {}) } });
  if (!r.ok) throw new Error('yahoo HTTP ' + r.status);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const meta = res?.meta;
  if (!meta || meta.regularMarketPrice == null) throw new Error('yahoo no data');
  const price = meta.regularMarketPrice;
  // 기준가 = 1/1 직전 마지막 유효 종가(전년도 마지막 거래일). 없으면 올해 첫 종가, 그래도 없으면 chartPreviousClose/창 첫 종가.
  const ts = res.timestamp || [];
  const cl = res.indicators?.quote?.[0]?.close || [];
  const t0 = YEAR_START_SEC();
  let before = null, after = null;
  for (let i = 0; i < ts.length; i++) {
    if (cl[i] == null) continue;
    if (ts[i] < t0) before = cl[i];      // 1/1 이전 마지막 종가로 계속 갱신
    else { after = cl[i]; break; }       // 1/1 이후 첫 종가
  }
  const base = before ?? after ?? meta.chartPreviousClose ?? cl.find((x) => x != null) ?? null;
  return { price, changePct: base ? +(((price - base) / base) * 100).toFixed(2) : null, currency: meta.currency || 'USD' };
}

async function naver(code) {
  const end = ymd(new Date());
  const start = ymd(new Date(Date.now() - 400 * 864e5)); // ~13개월 → 연초(전년도 말) 기준가 확보
  const u = `https://api.finance.naver.com/siseJson.naver?symbol=${encodeURIComponent(code)}&requestType=1&startTime=${start}&endTime=${end}&timeframe=day`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('naver HTTP ' + r.status);
  const txt = await r.text();
  const arr = JSON.parse(txt.replace(/'/g, '"')); // header: [날짜,시가,고가,저가,종가,거래량]
  const rows = arr.slice(1).filter((x) => Array.isArray(x) && x.length >= 5 && x[4] != null);
  if (!rows.length) throw new Error('naver empty');
  const price = Number(rows[rows.length - 1][4]); // [4] = 종가(close), not [1] 시가(open)
  // 기준가 = 1/1 직전 마지막 거래일 종가(전년도 말). 없으면 올해 첫 거래일 종가.
  const t0 = YEAR_START_YMD();
  let before = null, after = null;
  for (const x of rows) {
    const d = String(x[0]).replace(/-/g, '');
    if (d < t0) before = x; else { after = x; break; }
  }
  const baseRow = before || after || rows[0];
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
      console.log(`OK   ${c.id.padEnd(8)} ${c.ticker.padEnd(8)} ${q.price} ${q.currency} YTD=${q.changePct}% (${q.src})`);
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
