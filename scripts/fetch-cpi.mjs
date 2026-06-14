// Monthly CPI (전년동월비) fetcher for the global CPI chart.
// Runs in GitHub Actions (인터넷 가능). 이 리포 샌드박스는 egress 차단이고, 런타임의
// Cloudflare /api/fred 프록시는 6개 시리즈 순차+재시도 중 FRED 스로틀이 겹치면 응답이
// 통째로 비어 차트가 사라진다(사용자 캡처). 그래서 CI에서 직접 받아 정적 cpi.json 으로 떨군다.
//
// 데이터 경로(국가별로 최신 시점 우선):
//   1) FRED 지수 시리즈 직접 다운로드 → 전년동월비 산출 (信頼성 높음, base 가 쓰는 코드 동일)
//   2) OECD SDMX 헤드라인 전년비(GY)가 더 최신이면 그걸로 덮어씀 (FRED 미러가 끊긴 구간 보강)
// 둘 다 실패 시 직전 cpi.json 값 보존(차트가 비지 않게).
//
// 출력: cpi.json = { asOf, series: { us, ez, kr, jp: [["YYYY-MM-01", 전년비%], ...] } }

import fs from 'node:fs';

const OUT = 'cpi.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ten-bagger/1.0)', 'Accept': 'text/csv,*/*' };

// 국가별 FRED 지수 시리즈(신 코드 우선, 구 코드 폴백). index.html renderCpi 와 동일.
const FRED = {
  us: ['CPIAUCNS'],
  ez: ['CP0000EZ19M086NEST'],
  kr: ['KORCPALTT01IXNBM', 'KORCPIALLMINMEI'],
  jp: ['JPNCPALTT01IXNBM', 'JPNCPIALLMINMEI'],
};
// OECD SDMX REF_AREA → 키 (헤드라인 CPI 전년비). 보강용.
const OECD_AREAS = { USA: 'us', EA20: 'ez', KOR: 'kr', JPN: 'jp' };

async function getText(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.text();
      if (r.status < 500) return null;          // 4xx = 영구 실패
    } catch (_) { /* 재시도 */ }
    await sleep(800 * (i + 1));                  // 5xx/네트워크 백오프(OECD 500 잦음)
  }
  return null;
}

// FRED CSV(지수, 월별) → [["YYYY-MM-01", index], ...] (2019-01~, YoY 산출용 −12개월 포함)
async function fredIndex(id) {
  const t = await getText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + encodeURIComponent(id) + '&cosd=2019-01-01');
  if (!t) return [];
  const out = [];
  for (const line of t.trim().split('\n').slice(1)) {
    const [d, v] = line.split(',');
    if (d && v && v !== '.' && !isNaN(+v)) out.push([d.slice(0, 7) + '-01', +v]);
  }
  return out;
}

// 지수 → 전년동월비(%). 같은 달 −12개월 대비. 2020-01부터만 출력.
function yoy(points) {
  const m = {}; points.forEach((p) => { m[p[0].slice(0, 7)] = p[1]; });
  const out = [];
  for (const p of points) {
    const ym = p[0].slice(0, 7);
    const prev = (+ym.slice(0, 4) - 1) + ym.slice(4);
    const pv = m[prev];
    if (pv != null && pv !== 0 && p[0] >= '2020-01-01') out.push([p[0], +((p[1] / pv - 1) * 100).toFixed(1)]);
  }
  return out;
}

function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// OECD SDMX 헤드라인 CPI 전년비(GY) — 보강용. 실패하면 {}.
async function fetchOecd() {
  const url = 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/'
    + Object.keys(OECD_AREAS).join('+') + '.M.N.CPI.PA._T.N.GY'
    + '?startPeriod=2020-01&dimensionAtObservation=AllDimensions&format=csvfilewithlabels';
  const text = await getText(url);
  if (!text) return {};
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  if (lines.length < 2) return {};
  const head = parseCsvLine(lines[0]);
  const iA = head.indexOf('REF_AREA'), iT = head.indexOf('TIME_PERIOD'), iV = head.indexOf('OBS_VALUE');
  if (iA < 0 || iT < 0 || iV < 0) return {};
  const acc = {};
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const k = OECD_AREAS[c[iA]], tp = c[iT], v = c[iV];
    if (!k || !tp || v === '' || isNaN(+v)) continue;
    (acc[k] ||= {})[tp] = +v;
  }
  const out = {};
  for (const k of Object.values(OECD_AREAS)) {
    if (!acc[k]) continue;
    out[k] = Object.keys(acc[k]).sort().map((tp) => [tp + '-01', +acc[k][tp].toFixed(1)]);
  }
  return out;
}

const lastDate = (a) => (a && a.length ? a[a.length - 1][0] : '');

async function main() {
  let prev = { asOf: null, series: {} };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const out = { asOf: prev.asOf, series: { ...(prev.series || {}) } };

  // 1) FRED 지수 → YoY
  const fred = {};
  for (const [k, ids] of Object.entries(FRED)) {
    let best = [];
    for (const id of ids) { const s = yoy(await fredIndex(id)); if (lastDate(s) > lastDate(best)) best = s; }
    if (best.length) fred[k] = best;
  }
  // 2) OECD 로 보강(더 최신이면 교체)
  const oecd = await fetchOecd();

  let ok = 0;
  for (const k of Object.keys(FRED)) {
    const cand = [fred[k], oecd[k]].filter((a) => a && a.length).sort((a, b) => (lastDate(a) < lastDate(b) ? 1 : -1));
    if (cand.length) {
      out.series[k] = cand[0];
      ok++;
      console.log(`OK   ${k} ${cand[0].length}pts last ${cand[0][cand[0].length - 1].join('=')} (fred:${lastDate(fred[k] || [])} oecd:${lastDate(oecd[k] || [])})`);
    } else {
      console.log(`MISS ${k} (keeping last known ${lastDate(out.series[k] || [])})`);
    }
  }
  if (ok > 0) out.asOf = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`\nDone: ${ok}/4 series. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
