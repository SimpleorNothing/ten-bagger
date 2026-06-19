// γ (gamma) 자동 갱신기 — gamma.json 단일 소스를 price-vs-목표가로 매일 갱신.
// GitHub Actions에서 실행(인터넷 가능). 이 리포 샌드박스는 egress 차단.
// 룰(framework §3/§6 반영): pct=(목표평균가-현재가)/현재가.
//   pct>=+10%                         → open  (목표가가 충분히 위)
//   pct<=-5% AND trend in(flat,falling)→ spent (주가가 정체·하락 목표를 추월)
//   그 외(모호밴드 / 목표 상향중 / trend 미확정) → flagged + 직전 g 유지(hold)
// lock=true 항목은 운영자 수동 고정 → 자동 미적용. 실패는 비치명(직전값 hold).
// 목표가 trend는 gamma.json에 targetHist(최근 45일·6포인트)를 누적해 산출.

import fs from 'node:fs';

const GAMMA = 'gamma.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let YCOOKIE = '';
async function yahooAuth() {
  try {
    const r = await fetch('https://fc.yahoo.com', { headers: UA });
    const sc = r.headers.get('set-cookie');
    if (sc) YCOOKIE = sc.split(';')[0];
  } catch (e) { /* optional */ }
}

let YCRUMB = '';
async function yahooCrumb() {
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...UA, ...(YCOOKIE ? { Cookie: YCOOKIE } : {}) },
    });
    if (r.ok) {
      const t = (await r.text()).trim();
      if (t && t.length < 40 && !t.includes('<')) YCRUMB = t;
    }
  } catch (e) { /* non-fatal */ }
}

function gammaSymbol(ticker, mkt) {
  switch (mkt) {
    case 'US': case 'NASDAQ': case 'NYSE': return ticker;
    case 'KR': case 'KOSPI': return ticker + '.KS';
    case 'KOSDAQ': return ticker + '.KQ';
    case 'EU': return ticker + '.AS';
    case 'TWSE': return ticker + '.TW';
    case 'TSE': return ticker + '.T';
    default: return ticker;
  }
}

async function yahooTarget(sym) {
  const q = YCRUMB ? `&crumb=${encodeURIComponent(YCRUMB)}` : '';
  const u = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=financialData${q}`;
  const r = await fetch(u, { headers: { ...UA, ...(YCOOKIE ? { Cookie: YCOOKIE } : {}) } });
  if (!r.ok) throw new Error('quoteSummary HTTP ' + r.status);
  const j = await r.json();
  const fd = j?.quoteSummary?.result?.[0]?.financialData;
  if (!fd) throw new Error('no financialData');
  const price = fd.currentPrice?.raw;
  const target = fd.targetMeanPrice?.raw;
  if (price == null || target == null) throw new Error('no price/target');
  return { price: +price, target: +target };
}

async function main() {
  let g;
  try { g = JSON.parse(fs.readFileSync(GAMMA, 'utf8')); }
  catch (e) { console.log('gamma.json 없음/파싱실패 — 중단'); return; }
  g.gamma = g.gamma || {};
  const openTh = g.rules?.openTh ?? 0.10;
  const spentTh = g.rules?.spentTh ?? -0.05;
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);

  await yahooAuth();
  await yahooCrumb();

  let ok = 0, fl = 0, lk = 0;
  for (const [tk, e] of Object.entries(g.gamma)) {
    if (e.lock) { lk++; console.log(`LOCK  ${tk} (수동고정 ${e.g})`); continue; }
    try {
      const { price, target } = await yahooTarget(gammaSymbol(tk, e.mkt || 'US'));
      const pct = +(((target - price) / price) * 100).toFixed(1);
      const hist = (Array.isArray(e.targetHist) ? e.targetHist : []).filter((h) => h && h.d !== today);
      hist.push({ d: today, t: +target.toFixed(2) });
      while (hist.length > 6) hist.shift();
      const win = hist.filter((h) => h.d >= cutoff);
      let trend = 'unknown';
      if (win.length >= 2) {
        const o = win[0].t, c = win[win.length - 1].t;
        trend = c > o * 1.02 ? 'rising' : c < o * 0.98 ? 'falling' : 'flat';
      }
      e.price = +price.toFixed(2); e.target = +target.toFixed(2); e.pct = pct;
      e.targetHist = hist; e.trend = trend; e.checkedAt = today; delete e.staleSince;
      const frac = pct / 100;
      if (frac >= openTh) { e.g = 'open'; e.flagged = false; }
      else if (frac <= spentTh && (trend === 'flat' || trend === 'falling')) { e.g = 'spent'; e.flagged = false; }
      else { e.flagged = true; }
      ok++;
      console.log(`${tk.padEnd(8)} px=${price} tgt=${target} pct=${pct}% trend=${trend} -> ${e.g}${e.flagged ? ' (FLAG hold)' : ''}`);
    } catch (err) {
      e.flagged = true; if (!e.staleSince) e.staleSince = e.checkedAt || null;
      fl++;
      console.log(`${tk.padEnd(8)} FAIL ${err.message} (hold ${e.g})`);
    }
    await sleep(300);
  }
  if (ok > 0) { g.asOf = new Date().toISOString(); g.source = 'auto(price-vs-target)+judgment'; }
  fs.writeFileSync(GAMMA, JSON.stringify(g, null, 2) + '\n');
  console.log(`\nGamma done: ${ok} updated, ${fl} held(fail), ${lk} locked. asOf=${g.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
