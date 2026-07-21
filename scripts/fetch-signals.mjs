// Daily macro-signal fetcher for the Tenbagger Observatory (01 매크로 매매 · 통합 매수 게이트 3등급).
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress.
// 2026-06-07 확장: 구 3중 신호등(VIX 종가·F&G·S&P 일간) → 3등급 게이트 입력 전체 수집.
//  - VIX: 종가 + 장중 고가 (종가 40 룰이 2024.8(장중 65/종가 38.6)·2026.3(피크 35)을 놓친 사각지대 보강)
//  - VIX3M: 기간구조 역전(VIX > VIX3M = 백워덩션) 판정용 — 레벨 무관 패닉 레짐 지표
//  - 나스닥: 5y 최고 종가 대비 드로다운 %, 40주 이평 기울기(13주 전 대비)·이격 % — G1/G2 추세 필터
//  - 🇰🇷 코스피: ^KS11 일중 저가·확정 종가 중 더 나쁜 쪽으로 서킷(circuitKR, −8%)·매도사이드카(sidecarKR, −5% 프록시) 자동 파생.
//    트리거는 장중 접촉 기준(반등해도 발동 유효). 당일 세션만 인정(stale 세션 무효).
//    폭락일 수동 입력(true)은 OR 로 보존, sidecarDate===asOf 인 당일에만 페이지 점등.
// Per-source failures are non-fatal: the last known value is preserved so the
// gate never goes blank on a transient hiccup. Values are range-validated.

import fs from 'node:fs';

const OUT = 'signals.json';
const CHARTS = 'charts.json'; // 코스피 종가 백스톱(ks11 확정 일봉) — 야후 장중 필드 결측 대비
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

// 종가 백스톱 — charts.json(ks11)의 확정 일봉으로 전일 대비 종가 변동률을 구한다.
// 야후 meta 의 장중 필드(previousClose·dayLow)는 KST 새벽(프리오픈) 시점에 롤오버·결측되는
// 사각지대가 있다. 2026-07-13 코스피 −8.95%(1단계 서킷)가 미점등된 사고의 직접 원인.
// charts.json 은 같은 워크플로 순번(시세 06:37 → 신호 06:47)에서 먼저 갱신되므로 당일 값이다.
function krCloseBackstop() {
  const j = JSON.parse(fs.readFileSync(CHARTS, 'utf8'));
  const s = j?.series?.ks11;
  if (!s || !Array.isArray(s.c) || s.c.length < 2) throw new Error('charts ks11 missing');
  const c = s.c, t = s.t;
  const closePct = clamp(+(((c[c.length - 1] / c[c.length - 2]) - 1) * 100).toFixed(2), -30, 30);
  const sessionDate = new Date(t[t.length - 1] * 864e5).toISOString().slice(0, 10);
  return { closePct, sessionDate };
}

async function fetchKr() {
  // 🇰🇷 속도 정찰 입력 — 코스피 현물 서킷브레이커(−8%)·매도 사이드카(−5%) 자동 파생.
  // 트리거는 장중 접촉 기준(반등해도 당일 발동은 유효)이라 일중 저가 vs 전일 종가로 판정하되,
  // 저가를 못 구하면 종가 백스톱(charts.json)으로 판정한다 — 둘 중 더 나쁜 값을 채택.
  // 사이드카는 본래 KOSPI200 선물 −5% 기준이나, 폭락일 지수·선물 동조성이 높아
  // KOSPI 종합지수(^KS11) −5% 를 프록시로 사용(정밀도는 폭락일 수동 입력으로 보정).
  let lowPct = null, yahooDate = null;
  try {
    const { meta } = await yahoo('^KS11');
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    const low = meta.regularMarketDayLow ?? null;
    if (prevClose && low != null) lowPct = clamp(+(((low / prevClose) - 1) * 100).toFixed(2), -30, 30);
    if (meta.regularMarketTime) yahooDate = new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10);
  } catch (e) { /* 종가 백스톱으로 계속 */ }

  let closePct = null, chartDate = null;
  try { const b = krCloseBackstop(); closePct = b.closePct; chartDate = b.sessionDate; } catch (e) { /* 백스톱 없음 */ }

  const vals = [lowPct, closePct].filter((v) => v != null);
  if (!vals.length) throw new Error('no KOSPI low/close');
  const worst = Math.min(...vals);
  return { lowPct: worst, circuit: worst <= -8, sidecar: worst <= -5,
    sessionDate: yahooDate ?? chartDate, chartDate, src: `low ${lowPct ?? 'n/a'} · close ${closePct ?? 'n/a'}` };
}

// ── 월간 선행지표(lead) — FRED 무키 CSV ────────────────────────────
// 알파맵 자동층은 전부 일간 시세(후행·동행)다. 「변화를 미리」 보려면 월간 선행 계열이 필요하다.
// 수집: fredgraph.csv (키 불필요) · 판정: 최근 3개월 평균을 직전 3개월 평균과 비교(mom3) + 전년동월비(yoy).
// 비치명 — 실패 시 직전 lead 보존. 워크플로 편집 불요(update-signals 가 signals.json 을 이미 커밋).
const LEAD_SERIES = [
  { id: 'IPG3344S', name: '반도체 생산지수', layer: 'L3·L4', unit: 'idx' },
  { id: 'CAPUTLG3344S', name: '반도체 가동률', layer: 'L4', unit: '%' },
  { id: 'NEWORDER', name: '비국방 자본재 신규수주(ex항공)', layer: '상류', unit: '$M' },
];

async function fredSeries(id) {
  const u = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + encodeURIComponent(id) + '&cosd=2019-01-01';
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('fred HTTP ' + r.status);
  const rows = [];
  for (const line of (await r.text()).trim().split('\n').slice(1)) {
    const [d, v] = line.split(',');
    if (d && v && v !== '.' && !isNaN(+v)) rows.push([d.slice(0, 7), +v]);
  }
  if (rows.length < 15) throw new Error('too few points');
  return rows;
}

function leadStat(rows) {
  const n = rows.length, last = rows[n - 1];
  const map = Object.fromEntries(rows);
  const py = (+last[0].slice(0, 4) - 1) + last[0].slice(4);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const v = (i) => rows[i][1];
  const cur3 = avg([v(n - 1), v(n - 2), v(n - 3)]);
  const pre3 = avg([v(n - 4), v(n - 5), v(n - 6)]);
  const r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1));
  const mom3 = pre3 > 0 ? r1((cur3 / pre3 - 1) * 100) : null;
  const yoy = map[py] > 0 ? r1((last[1] / map[py] - 1) * 100) : null;
  const dir = mom3 == null ? 'unknown' : mom3 > 0.5 ? 'up' : mom3 < -0.5 ? 'down' : 'flat';
  return { ym: last[0], v: r1(last[1]), yoy, mom3, dir };
}

async function fetchLead() {
  const items = [];
  for (const s of LEAD_SERIES) {
    try { items.push({ ...s, ...leadStat(await fredSeries(s.id)) }); }
    catch (e) { console.log(`     lead SKIP ${s.id}: ${e.message}`); }
  }
  if (!items.length) throw new Error('no lead series');
  return { asOf: new Date().toISOString().slice(0, 10), src: 'FRED', items };
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
    // 🇰🇷 코스피 속도 정찰: ^KS11 일중 저가·확정 종가로 서킷/사이드카 자동 파생(아래 task).
    // 폭락일 수동 입력(sidecarKR/circuitKR:true + sidecarDate)은 OR 로 보존. sidecarDate===asOf 당일만 점등.
    sidecarKR: prev.sidecarKR ?? null,
    circuitKR: prev.circuitKR ?? null,
    sidecarDate: prev.sidecarDate ?? null,
    lead: prev.lead ?? null,   // 월간 선행지표(FRED) — 아래 task 가 갱신, 실패 시 직전값 보존
    note: '통합 매수 게이트 입력. VIX 종가/장중·VIX3M·CNN F&G·S&P 일간·나스닥 드로다운(5y)·40주선 기울기/이격, 그리고 🇰🇷코스피 서킷(circuitKR −8%)/매도사이드카(sidecarKR −5% 프록시)를 자동 수집(1일 1회, 미 증시 마감 후=KST 익일 새벽). KR 값은 ^KS11 일중 저가와 charts.json(ks11) 확정 종가 중 더 나쁜 쪽으로 자동 파생하며, 폭락 당일 수동 입력(true + sidecarDate=asOf)으로 즉시 덮어쓰기 가능. sidecarDate===asOf 인 당일에만 점등.',
  };

  let ok = 0;
  const tasks = [
    ['vix', async () => { const v = await fetchVix(); out.vix = v.close; out.vixHigh = v.high; return `${v.close} (H ${v.high})`; }],
    ['vix3m', async () => { const v = await fetchVix3m(); out.vix3m = v; return v; }],
    ['spDailyPct', async () => { const v = await fetchSpDailyPct(); out.spDailyPct = v; return v; }],
    ['fearGreed', async () => { const v = await fetchFearGreed(); out.fearGreed = v; return v; }],
    ['nasdaq', async () => { const v = await fetchNasdaq(); out.nasdaqDrawdownPct = v.drawdownPct; out.wma40SlopeUp = v.wma40SlopeUp; out.wma40GapPct = v.wma40GapPct; return `dd ${v.drawdownPct}% · 40w ${v.wma40SlopeUp ? '↑' : '↓'} · gap ${v.wma40GapPct}%`; }],
    ['kospi', async () => {
      const k = await fetchKr();
      const today = new Date().toISOString().slice(0, 10);
      const fresh = k.sessionDate === today || k.chartDate === today; // 당일 코스피 세션만 인정(stale 무효)
      const manualSide = prev.sidecarKR === true && prev.sidecarDate === today;
      const manualCirc = prev.circuitKR === true && prev.sidecarDate === today;
      out.circuitKR = (fresh && k.circuit) || manualCirc;
      out.sidecarKR = (fresh && (k.sidecar || k.circuit)) || manualSide; // 서킷이면 사이드카도 발동
      out.sidecarDate = today;
      const pf = (n) => (n == null ? 'n/a' : n.toFixed(2) + '%');
      return `KOSPI ${k.sessionDate ?? '?'} worst ${pf(k.lowPct)} (${k.src}) → circuit(−8) ${out.circuitKR ? '🔴' : '·'} · sidecar(−5) ${out.sidecarKR ? '🟡' : '·'}${fresh ? '' : ' [stale session, not lit]'}`;
    }],
    ['lead', async () => {
      const L = await fetchLead();
      out.lead = L;
      return L.items.map((i) => `${i.name} ${i.ym} ${i.dir}(mom3 ${i.mom3 ?? '—'}% · yoy ${i.yoy ?? '—'}%)`).join(' | ');
    }],
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
