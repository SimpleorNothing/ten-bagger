// Monthly CPI (전년동월비) fetcher for the global CPI chart.
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress, and the
// Cloudflare /api/fred proxy is flaky under load (6 series × 재시도 → 워커 타임아웃으로
// 차트가 통째로 비는 사례). 그래서 신뢰할 수 있는 CI에서 받아 정적 파일로 떨군다.
//
// 1순위: OECD SDMX(각국 통계청·중앙은행 집계) 헤드라인 CPI 전년비(GY) — FRED가 미러를
//        끊은 韓·日·유로존도 여기선 현재까지 갱신된다.
// 폴백: 위 실패 시 직전 cpi.json 값 보존(차트가 비지 않게). 클라이언트엔 FRED 폴백도 있음.
//
// 출력: cpi.json = { asOf, series: { us, ez, kr, jp: [["YYYY-MM-DD", 전년비%], ...] } }

import fs from 'node:fs';

const OUT = 'cpi.json';
const START = '2020-01';
const AREAS = { USA: 'us', EA20: 'ez', KOR: 'kr', JPN: 'jp' }; // OECD REF_AREA → cpi.json 키
// OECD SDMX REST(DSD_PRICES@DF_PRICES_ALL): 헤드라인 CPI 전년동월비(GY) 월별(M), 총지수(_T).
// key = REF_AREA . FREQ . ADJUSTMENT . MEASURE . UNIT_MEASURE . EXPENDITURE . _ . TRANSFORMATION
const URL = 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/'
  + Object.keys(AREAS).join('+') + '.M.N.CPI.PA._T.N.GY'
  + '?startPeriod=' + START + '&dimensionAtObservation=AllDimensions&format=csvfilewithlabels';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ten-bagger/1.0)', 'Accept': 'text/csv,*/*' };

// 최소 CSV 파서(따옴표·콤마 처리). 한 줄 → 필드 배열.
function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function fetchOecd() {
  const r = await fetch(URL, { headers: UA });
  if (!r.ok) throw new Error('OECD HTTP ' + r.status);
  const text = await r.text();
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  if (lines.length < 2) throw new Error('OECD empty CSV');
  const head = parseCsvLine(lines[0]);
  const iArea = head.indexOf('REF_AREA');
  const iTime = head.indexOf('TIME_PERIOD');
  const iVal = head.indexOf('OBS_VALUE');
  if (iArea < 0 || iTime < 0 || iVal < 0) throw new Error('OECD columns not found: ' + head.join('|'));
  const series = {}; // key → { 'YYYY-MM': value }
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const key = AREAS[c[iArea]];
    const tp = c[iTime];          // "YYYY-MM"
    const v = c[iVal];
    if (!key || !tp || v === '' || v == null || isNaN(+v)) continue;
    (series[key] ||= {})[tp] = +v;
  }
  // { 'YYYY-MM': v } → 정렬된 [["YYYY-MM-01", round1], ...]
  const out = {};
  for (const k of Object.values(AREAS)) {
    const m = series[k]; if (!m) continue;
    out[k] = Object.keys(m).sort().map((tp) => [tp + '-01', +m[tp].toFixed(1)]);
  }
  return out;
}

async function main() {
  let prev = { asOf: null, series: {} };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const out = { asOf: prev.asOf, series: { ...(prev.series || {}) } };
  let ok = 0;
  try {
    const fresh = await fetchOecd();
    for (const [k, arr] of Object.entries(fresh)) {
      if (arr && arr.length) { out.series[k] = arr; ok++; console.log(`OK   ${k.padEnd(3)} ${arr.length} pts, last ${arr[arr.length - 1].join('=')}`); }
    }
    if (!ok) console.log('WARN OECD returned rows but no mapped series — check dimension codes.');
  } catch (e) {
    console.log('FAIL OECD: ' + e.message + ' (keeping last known)');
  }
  if (ok > 0) out.asOf = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`\nDone: ${ok} series updated. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
