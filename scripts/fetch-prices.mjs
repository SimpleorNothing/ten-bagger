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
const CHARTS_OUT = 'charts.json'; // 5Y 일봉 시계열(호버·기간버튼용). t=epoch day, c=close. 이전 창과 union 병합(결측 방어).
const HOLD = 'holdings.json'; // 보유자산 — detail[].priceKey/qty/ccy 로 하루 2회 시가평가(수량 고정·환율=NH). 수량은 주간 sync-holdings(체결)만 갱신.
// 결측 캔들 수동 보강(seed). 야후가 KRX 서킷브레이커 당일 일봉을 창에서 누락한 사고(2026-07-13)
// 대응 — t=epoch day, c=close. 시리즈 병합 시 소스(야후/네이버) 값이 있으면 소스가 이긴다.
const BACKFILL = { ks11: [[20647, 6807]] }; // 2026-07-13 코스피 종가 6,806.93 (−8.95%, 1단계 서킷)

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
  const list = C.map((c) => ({ id: c.id, ticker: c.ticker, mkt: c.mkt }));
  // 강물 후보 칩 호버 차트용 추가 티커(RV_PX). inC 항목은 위 C 에 이미 있으니 제외,
  // 신규 티커만 합류시켜 prices.json·charts.json 에 같이 채운다.
  const rm = html.match(/const RV_PX=(\[[\s\S]*?\n\];)/);
  if (rm) {
    const seen = new Set(list.map((c) => c.id));
    const RV = eval(rm[1].replace(/;\s*$/, ''));
    for (const e of RV) {
      if (e.inC || !e.t || !e.mkt || seen.has(e.id)) continue;
      seen.add(e.id);
      list.push({ id: e.id, ticker: e.t, mkt: e.mkt });
    }
  }
  return list;
}

// 보유자산 detail[] 의 시세 티커(priceKey/ticker/mkt)를 후보에 합류시킨다. 개별주(mu·mrvl…)는
// C·RV_PX 에 이미 있으니 seen 으로 스킵되고, 보유 ETF(442580·0162Z0…)만 신규로 추가된다.
function addHoldingsCandidates(list, holdings) {
  if (!holdings || !Array.isArray(holdings.detail)) return list;
  const seen = new Set(list.map((c) => c.id));
  for (const d of holdings.detail) {
    if (!d.priceKey || !d.ticker || !d.mkt || seen.has(d.priceKey)) continue;
    seen.add(d.priceKey);
    list.push({ id: d.priceKey, ticker: String(d.ticker), mkt: d.mkt });
  }
  return list;
}

function yahooSymbol(ticker, mkt) {
  switch (mkt) {
    case 'NASDAQ':
    case 'NYSE': return ticker;
    case 'TWSE': return ticker + '.TW';
    case 'TSE': return ticker + '.T';
    case 'KOSPI': return ticker + '.KS';
    case 'KOSDAQ': return ticker + '.KQ';
    case 'INDEX': return ticker;
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
  // range=5y → ~5년 일봉 확보(01 시장 모니터링 기간버튼 1M~5Y 지원). YTD 기준가는
  // 창 안에서 올해 1/1 직전 마지막 종가를 골라 계산하므로 창을 넓혀도 그대로 유효.
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5y`;
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
  // 5Y 시계열 (null 캔들 제거, t=epoch day). 신규 상장은 확보된 만큼만 → 프런트가 자동 클램프.
  const st = [], sc = [];
  for (let i = 0; i < ts.length; i++) {
    if (cl[i] == null || !Number.isFinite(cl[i])) continue;
    st.push(Math.floor(ts[i] / 86400));
    sc.push(+cl[i].toFixed(cl[i] >= 1000 ? 0 : 2));
  }
  // 시세(meta)와 시계열(candles)의 정합 보증. 야후는 당일 일봉을 창에서 누락하거나 지연 반영하는
  // 경우가 있다(2026-07-13 ^KS11 서킷 당일 누락 → 사이트가 3일 전 종가를 표시). meta 의 거래일을
  // 시계열 끝에 강제로 반영해 prices.json 과 charts.json 이 절대 갈라지지 않게 한다.
  const mt = meta.regularMarketTime;
  if (Number.isFinite(mt) && Number.isFinite(price)) {
    const dq = Math.floor(mt / 86400);
    const px = +price.toFixed(price >= 1000 ? 0 : 2);
    if (!st.length || dq > st[st.length - 1]) { st.push(dq); sc.push(px); }
    else if (dq === st[st.length - 1]) { sc[sc.length - 1] = px; }
  }
  return { price, changePct: base ? +(((price - base) / base) * 100).toFixed(2) : null, currency: meta.currency || 'USD',
    series: sc.length >= 20 ? { t: st, c: sc } : null };
}

async function naver(code) {
  const end = ymd(new Date());
  const start = ymd(new Date(Date.now() - 1850 * 864e5)); // ~5년+버퍼 → 기간버튼 1M~5Y + 연초 기준가 확보
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
  // 5Y 시계열 (최근 ~1250 거래일, t=epoch day). 상한 캡으로 파일 크기 방어.
  const hist = rows.slice(-1300);
  const st = [], sc = [];
  for (const x of hist) {
    const ds = String(x[0]).replace(/-/g, '');
    const t = Math.floor(Date.UTC(+ds.slice(0, 4), +ds.slice(4, 6) - 1, +ds.slice(6, 8)) / 864e5);
    st.push(t);
    sc.push(Math.round(Number(x[4])));
  }
  return { price, changePct: base ? +(((price - base) / base) * 100).toFixed(2) : null, currency: 'KRW',
    series: sc.length >= 20 ? { t: st, c: sc } : null };
}

// 시계열 병합: 이전 창 ∪ seed ∪ 새 창 (같은 t 는 새 소스가 우선). 소스가 캔들을 빠뜨려도
// 과거 값이 사라지지 않는다(구 로직은 매 실행 창 전체 교체 → 결측이 그대로 구멍으로 남았다).
function mergeSeries(prev, next, seed) {
  const m = new Map();
  const add = (s) => { if (!s || !Array.isArray(s.t)) return; for (let i = 0; i < s.t.length; i++) m.set(s.t[i], s.c[i]); };
  add(prev);
  if (Array.isArray(seed)) for (const [t, c] of seed) m.set(t, c);
  add(next);
  if (!m.size) return null;
  const ts = [...m.keys()].sort((a, b) => a - b);
  const newest = ts[ts.length - 1];
  const keep = ts.filter((t) => t >= newest - 1900); // 5년+버퍼로 트림(파일 크기 방어)
  return { t: keep, c: keep.map((t) => m.get(t)) };
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

// 보유자산 시가평가(수량 고정 × 최신가 × NH환율). 비파괴: 시세 누락 라인은 직전 amt 유지.
// 수량·priceKey·ccy·fx 는 주간 sync-holdings(엑셀 체결)만 세팅한다 → 여기선 평가만.
function revalueHoldings(h, quotes) {
  if (!h || !Array.isArray(h.detail)) throw new Error('holdings.detail 없음');
  const fx = h.fx && h.fx.usdkrw;
  if (!(fx > 0)) throw new Error('holdings.fx.usdkrw 없음(주간 sync 대기)');
  const amtByName = {};
  let total = 0, priced = 0;
  for (const d of h.detail) {
    if (d.priceKey && d.qty != null) {
      const q = quotes[d.priceKey];
      if (q && Number.isFinite(q.price)) {
        d.amt = Math.round((d.qty * q.price * (d.ccy === 'USD' ? fx : 1)) / 1e6);
        priced++;
      } // 시세 없으면 직전 amt 유지(아래 warn 집계)
    }
    amtByName[d.name] = d.amt || 0;
    total += d.amt || 0;
  }
  if (!(total > 0)) throw new Error('holdings total 0');
  for (const d of h.detail) d.w = +(((d.amt || 0) / total) * 100).toFixed(2);
  for (const row of (h.holdings || [])) {
    if (Array.isArray(row.members)) row.amt = row.members.reduce((s, n) => s + (amtByName[n] || 0), 0);
    row.w = +(((row.amt || 0) / total) * 100).toFixed(1);
  }
  h.total = total;
  // 평가 시각(KST 분단위) — 보드 asOf 배지 = 시가평가 시각. 체결일은 qtyAsOf(주간) 별도 보존.
  h.asOf = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  fs.writeFileSync(HOLD, JSON.stringify(h, null, 1) + '\n');
  return { total, priced, of: h.detail.filter((d) => d.priceKey && d.qty != null).length };
}

async function main() {
  const candidates = [...readCandidates(), { id: 'ks11', ticker: '^KS11', mkt: 'INDEX' }, { id: 'gspc', ticker: '^GSPC', mkt: 'INDEX' }, { id: 'ixic', ticker: '^IXIC', mkt: 'INDEX' }, { id: 'us10y', ticker: '^TNX', mkt: 'INDEX' }];
  let holdings = null;
  try { holdings = JSON.parse(fs.readFileSync(HOLD, 'utf8')); } catch (e) { /* holdings optional */ }
  addHoldingsCandidates(candidates, holdings); // 보유 ETF 티커 합류(개별주는 seen 스킵)
  let prev = { asOf: null, quotes: {} };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const out = { asOf: prev.asOf, quotes: { ...(prev.quotes || {}) } };
  let prevCharts = { asOf: null, series: {} };
  try { prevCharts = JSON.parse(fs.readFileSync(CHARTS_OUT, 'utf8')); } catch (e) { /* first run */ }
  const charts = { asOf: prevCharts.asOf, series: { ...(prevCharts.series || {}) } };

  await yahooAuth();
  let ok = 0, fail = 0;
  for (const c of candidates) {
    try {
      const q = await quote(c);
      // ^TNX(미 10년물)는 야후가 수익률(4.55) 로 주기도, 구 CBOE 관례의 10× 스케일(45.5) 로 주기도 한다.
      // 10Y 수익률이 20% 를 넘을 일은 없으므로 20 초과면 %로 정규화 → charts.json us10y 는 항상 %(4.55) 단위.
      if (c.id === 'us10y' && q && q.price != null && q.price > 20) {
        q.price = +(q.price / 10).toFixed(2);
        if (q.series && Array.isArray(q.series.c)) q.series.c = q.series.c.map((v) => +(v / 10).toFixed(2));
        // changePct 는 비율이라 스케일 불변 → 그대로 둔다.
      }
      out.quotes[c.id] = { price: q.price, changePct: q.changePct, currency: q.currency, ticker: c.ticker, src: q.src };
      const merged = mergeSeries(charts.series[c.id], q.series, BACKFILL[c.id]);
      if (merged) charts.series[c.id] = merged; // 병합 실패 시에만 이전 유지
      ok++;
      console.log(`OK   ${c.id.padEnd(8)} ${c.ticker.padEnd(8)} ${q.price} ${q.currency} YTD=${q.changePct}% (${q.src})`);
    } catch (e) {
      fail++;
      console.log(`FAIL ${c.id.padEnd(8)} ${c.ticker.padEnd(8)} ${e.message}${out.quotes[c.id] ? ' (keeping last known)' : ''}`);
    }
    await sleep(300);
  }
  // 무결성 가드 — charts 마지막 종가 vs prices 시세 괴리(>1%)는 '침묵하는 오류'다. 파일에 남겨 눈에 띄게 한다.
  const warn = [];
  for (const c of candidates) {
    const q = out.quotes[c.id], s = charts.series[c.id];
    if (!q || !q.price || !s || !s.c || !s.c.length) continue;
    const last = s.c[s.c.length - 1];
    if (Math.abs(last - q.price) / q.price > 0.01) warn.push(`${c.id} chart ${last} vs quote ${q.price}`);
  }
  out.warn = warn;
  if (warn.length) console.log('::warning::chart/quote divergence → ' + warn.join(' | '));

  if (ok > 0) { out.asOf = new Date().toISOString(); charts.asOf = out.asOf; }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(CHARTS_OUT, JSON.stringify(charts) + '\n'); // 시계열은 압축 직렬화(파일 크기)
  // 보유자산 시가평가(비파괴) — 실패해도 시세 파일은 이미 기록됨(피드 우선).
  if (holdings) {
    try {
      const r = revalueHoldings(holdings, out.quotes);
      console.log(`\nholdings revalued: total=${r.total}M · priced ${r.priced}/${r.of} 라인 · asOf=${holdings.asOf} (fx=${holdings.fx.usdkrw})`);
      if (r.priced < r.of) console.log(`::warning::holdings ${r.of - r.priced}개 라인 시세 결측 → 직전 평가 유지`);
    } catch (e) {
      console.log('::warning::holdings 시가평가 스킵: ' + e.message);
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
