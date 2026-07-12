// γ (gamma) 자동 갱신기 — gamma.json 단일 소스를 price-vs-목표가로 매일 갱신.
// GitHub Actions에서 실행(인터넷 가능). 이 리포 샌드박스는 egress 차단.
// 룰(framework §3/§6 반영): pct=(목표평균가-현재가)/현재가.
//   pct>=+10%                         → open  (목표가가 충분히 위)
//   pct<=-5% AND trend in(flat,falling)→ spent (주가가 정체·하락 목표를 추월)
//   그 외(모호밴드 / 목표 상향중 / trend 미확정) → flagged + 직전 g 유지(hold)
// lock=true 항목은 운영자 수동 고정 → 자동 미적용. 실패는 비치명(직전값 hold).
// 목표가 trend는 gamma.json에 targetHist를 누적해 산출(45일 창의 최근 6포인트 — 기존 의미 불변).
//
// [2026-07 확장] 추정 리비전 트래커(e.rev)
//   목적: "TP·EPS 추정이 데일리로 어디로 움직이는가"를 관측(예측 아님).
//   - quoteSummary modules 확장: financialData + earningsTrend + recommendationTrend + upgradeDowngradeHistory
//   - epsTrend가 7/30/60/90일 전 값을 직접 제공 → 히스토리 누적 없이 즉시 리비전 속도 산출
//   - charts.json(같은 워크플로에서 선행 실행)에서 가격 7/30/90일 변화 산출
//   - ★ 강등 게이트(§2-4): gap = 가격 변화율 − EPS(FY+1) 리비전율.
//       gap > 0 → 가격이 추정을 추월(성숙 강등 후보) / gap < 0 → 추정이 앞섬(γ open 유지)
//   확장부는 전부 비치명(non-fatal): 실패 시 e.rev 미갱신, 기존 g/stage/trend 로직 무영향.

import fs from 'node:fs';

const GAMMA = 'gamma.json';
const CHARTS = 'charts.json';
const HIST_KEEP = 120;   // targetHist·priceHist 보존 포인트 수(구 6 → 120)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// gamma 티커 → charts.json series 키 (기본: 소문자. 예외만 명시)
const CHART_ALIAS = { '005930': 'sec' };

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

const num = (v) => {
  const x = (v && typeof v === 'object') ? v.raw : v;
  return (typeof x === 'number' && isFinite(x)) ? x : null;
};
const r2 = (x) => (x == null ? null : +x.toFixed(2));
const r1 = (x) => (x == null ? null : +x.toFixed(1));
// 변화율(%) — 분모 0/음수 EPS는 무의미하므로 null 처리(적자 종목의 리비전은 %로 표현 불가)
const chgPct = (now, then) => (now == null || then == null || then <= 0) ? null : r1(((now / then) - 1) * 100);

const MODULES = 'financialData,earningsTrend,recommendationTrend,upgradeDowngradeHistory';

async function yahooSummary(sym) {
  const q = YCRUMB ? `&crumb=${encodeURIComponent(YCRUMB)}` : '';
  const u = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${MODULES}${q}`;
  const r = await fetch(u, { headers: { ...UA, ...(YCOOKIE ? { Cookie: YCOOKIE } : {}) } });
  if (!r.ok) throw new Error('quoteSummary HTTP ' + r.status);
  const j = await r.json();
  const res = j?.quoteSummary?.result?.[0];
  const fd = res?.financialData;
  if (!fd) throw new Error('no financialData');
  const price = num(fd.currentPrice);
  const target = num(fd.targetMeanPrice);
  if (price == null || target == null) throw new Error('no price/target');
  return { price, target, res, fd };
}

// ── EPS 추정 리비전 (earningsTrend) ─────────────────────────────
// Yahoo가 current / 7·30·60·90일 전 값을 직접 준다 → 누적 없이 즉시 90일 궤적 확보.
function parseEps(res) {
  const arr = res?.earningsTrend?.trend;
  if (!Array.isArray(arr)) return null;
  const pick = (p) => arr.find((x) => x?.period === p);
  const one = (p) => {
    const t = pick(p);
    if (!t) return null;
    const et = t.epsTrend || {};
    const now = num(et.current);
    if (now == null) return null;
    const d7 = num(et['7daysAgo']), d30 = num(et['30daysAgo']);
    const d60 = num(et['60daysAgo']), d90 = num(et['90daysAgo']);
    const er = t.epsRevisions || {};
    return {
      end: t.endDate || null,
      now: r2(now), d7: r2(d7), d30: r2(d30), d60: r2(d60), d90: r2(d90),
      c7: chgPct(now, d7), c30: chgPct(now, d30), c90: chgPct(now, d90),
      up7: num(er.upLast7days), dn7: num(er.downLast7days),
      up30: num(er.upLast30days), dn30: num(er.downLast30days) ?? num(er.downLast90days),
      revEst: num(t.revenueEstimate?.avg),
    };
  };
  const fy1 = one('+1y'), fy0 = one('0y'), q1 = one('+1q');
  if (!fy1 && !fy0 && !q1) return null;
  return { fy1, fy0, q1 };
}

// ── 등급 추이 (recommendationTrend) — 야후 화면의 월별 막대 ──────
function parseRating(res, fd) {
  const tr = res?.recommendationTrend?.trend;
  const row = (t) => t ? {
    m: t.period, sb: num(t.strongBuy) ?? 0, b: num(t.buy) ?? 0,
    h: num(t.hold) ?? 0, u: num(t.sell) ?? 0, s: num(t.strongSell) ?? 0,
  } : null;
  const hist = Array.isArray(tr) ? tr.map(row).filter(Boolean).slice(0, 4) : [];
  const mean = num(fd?.recommendationMean);
  const n = num(fd?.numberOfAnalystOpinions);
  if (!hist.length && mean == null) return null;
  return { mean: r2(mean), n, hist };
}

// ── 최근 증권사 액션 (upgradeDowngradeHistory) ──────────────────
function parseActions(res) {
  const h = res?.upgradeDowngradeHistory?.history;
  if (!Array.isArray(h)) return null;
  const out = h
    .map((x) => {
      const ep = num(x?.epochGradeDate);
      return {
        d: ep == null ? null : new Date(ep * 1000).toISOString().slice(0, 10),
        firm: x?.firm || null, to: x?.toGrade || null,
        from: x?.fromGrade || null, act: x?.action || null,
      };
    })
    .filter((x) => x.d && x.firm)
    .sort((a, b) => (a.d < b.d ? 1 : -1))
    .slice(0, 5);
  return out.length ? out : null;
}

// ── 가격 변화율 — charts.json(선행 실행된 fetch-prices 산출물)에서 관측 ──
// t = epoch days, c = 종가. N일 전 이하의 마지막 포인트를 취한다.
function priceChanges(charts, tk) {
  const key = CHART_ALIAS[tk] || tk.toLowerCase();
  const s = charts?.series?.[key];
  if (!s || !Array.isArray(s.t) || !Array.isArray(s.c) || s.c.length < 2) return null;
  const t = s.t, c = s.c;
  const last = c[c.length - 1], lastT = t[t.length - 1];
  if (!(last > 0)) return null;
  const back = (days) => {
    const cut = lastT - days;
    for (let i = t.length - 1; i >= 0; i--) if (t[i] <= cut && c[i] > 0) return c[i];
    return null;
  };
  return { c7: chgPct(last, back(7)), c30: chgPct(last, back(30)), c90: chgPct(last, back(90)) };
}

// ── 자체 누적 히스토리에서 변화율 (targetHist / priceHist) ──────
function histChange(hist, field, todayISO, days) {
  if (!Array.isArray(hist) || hist.length < 2) return null;
  const cut = new Date(new Date(todayISO).getTime() - days * 864e5).toISOString().slice(0, 10);
  const past = hist.filter((h) => h && h.d <= cut && h[field] > 0);
  if (!past.length) return null;
  const now = hist[hist.length - 1]?.[field];
  return chgPct(now, past[past.length - 1][field]);
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

  let charts = null;
  try { charts = JSON.parse(fs.readFileSync(CHARTS, 'utf8')); }
  catch (e) { console.log('charts.json 없음 — 가격 변화율 스킵(비치명)'); }

  await yahooAuth();
  await yahooCrumb();

  let ok = 0, fl = 0, lk = 0, rv = 0;
  for (const [tk, e] of Object.entries(g.gamma)) {
    if (e.lock) { lk++; console.log(`LOCK  ${tk} (수동고정 ${e.g})`); continue; }
    try {
      const { price, target, res, fd } = await yahooSummary(gammaSymbol(tk, e.mkt || 'US'));
      const pct = +(((target - price) / price) * 100).toFixed(1);

      // targetHist / priceHist 누적 (보존 HIST_KEEP)
      const hist = (Array.isArray(e.targetHist) ? e.targetHist : []).filter((h) => h && h.d !== today);
      hist.push({ d: today, t: +target.toFixed(2) });
      while (hist.length > HIST_KEEP) hist.shift();
      const phist = (Array.isArray(e.priceHist) ? e.priceHist : []).filter((h) => h && h.d !== today);
      phist.push({ d: today, p: +price.toFixed(2) });
      while (phist.length > HIST_KEEP) phist.shift();

      // trend — 45일 창의 "최근 6포인트" 비교(구 동작 그대로 보존: g 판정 의미 불변)
      const win = hist.filter((h) => h.d >= cutoff).slice(-6);
      let trend = 'unknown';
      if (win.length >= 2) {
        const o = win[0].t, c = win[win.length - 1].t;
        trend = c > o * 1.02 ? 'rising' : c < o * 0.98 ? 'falling' : 'flat';
      }

      e.price = +price.toFixed(2); e.target = +target.toFixed(2); e.pct = pct;
      e.targetHist = hist; e.priceHist = phist; e.trend = trend; e.checkedAt = today; delete e.staleSince;
      const frac = pct / 100;
      if (frac >= openTh) { e.g = 'open'; e.flagged = false; }
      else if (frac <= spentTh && (trend === 'flat' || trend === 'falling')) { e.g = 'spent'; e.flagged = false; }
      else { e.flagged = true; }
      ok++;
      console.log(`${tk.padEnd(8)} px=${price} tgt=${target} pct=${pct}% trend=${trend} -> ${e.g}${e.flagged ? ' (FLAG hold)' : ''}`);

      // ── 리비전 트래커(비치명) ────────────────────────────────
      try {
        const eps = parseEps(res);
        const rating = parseRating(res, fd);
        const actions = parseActions(res);
        const px = priceChanges(charts, tk) || {
          c7: histChange(phist, 'p', today, 7),
          c30: histChange(phist, 'p', today, 30),
          c90: histChange(phist, 'p', today, 90),
        };
        // ★ 강등 게이트: 가격 변화율 − EPS(FY+1) 리비전율 (동기간)
        const gapOf = (a, b) => (a == null || b == null) ? null : r1(a - b);
        const gate = {
          d30: gapOf(px?.c30, eps?.fy1?.c30),
          d90: gapOf(px?.c90, eps?.fy1?.c90),
        };
        e.rev = {
          at: today,
          tp: {
            now: +target.toFixed(2),
            hi: r2(num(fd.targetHighPrice)), lo: r2(num(fd.targetLowPrice)),
            c7: histChange(hist, 't', today, 7),
            c30: histChange(hist, 't', today, 30),
            c90: histChange(hist, 't', today, 90),
          },
          px, eps, rating, actions, gate,
        };
        rv++;
        const f1 = eps?.fy1;
        console.log(`         rev: TP7d=${e.rev.tp.c7 ?? '—'}% | EPS+1y ${f1?.now ?? '—'} (30d ${f1?.c30 ?? '—'}% · 90d ${f1?.c90 ?? '—'}%) | 상향/하향30d ${f1?.up30 ?? '—'}/${f1?.dn30 ?? '—'} | px30d ${px?.c30 ?? '—'}% | GATE30 ${gate.d30 ?? '—'}`);
      } catch (re) {
        console.log(`         rev SKIP (${re.message}) — 기존 e.rev 유지`);
      }
    } catch (err) {
      e.flagged = true; if (!e.staleSince) e.staleSince = e.checkedAt || null;
      fl++;
      console.log(`${tk.padEnd(8)} FAIL ${err.message} (hold ${e.g})`);
    }
    await sleep(300);
  }
  if (ok > 0) { g.asOf = new Date().toISOString(); g.source = 'auto(price-vs-target+revisions)+judgment'; }
  fs.writeFileSync(GAMMA, JSON.stringify(g, null, 2) + '\n');
  console.log(`\nGamma done: ${ok} updated, ${rv} rev, ${fl} held(fail), ${lk} locked. asOf=${g.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
