// Monthly CPI (전년동월비) fetcher for the global CPI chart.
// Runs in GitHub Actions (인터넷 가능). 런타임 Cloudflare /api/fred 프록시가 불안정해 차트가
// 통째로 비는 사례가 있어, CI에서 직접 받아 정적 cpi.json 으로 떨군다.
//
// 국가별로 여러 소스를 모아 "가장 최신까지 있는" 시리즈를 채택:
//   - FRED 지수 → 전년동월비 산출 (신뢰성↑, 단 OECD-미러가 끊긴 韓 '23·日 '21 에서 멈춤)
//   - DBnomics(OECD DF_PRICES_ALL · IMF CPI) 전년비 — 무키 JSON, 원천이 현재까지 갱신됨.
//     (OECD SDMX 직접 호출은 간헐 500 이라 안정적인 DBnomics 미러를 쓴다.)
// 모두 실패 시 직전 cpi.json 보존(차트가 비지 않게).
//
// 출력: cpi.json = { asOf, series: { us, ez, kr, jp: [["YYYY-MM-01", 전년비%], ...] } }

import fs from 'node:fs';

const OUT = 'cpi.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ten-bagger/1.0)', 'Accept': '*/*' };
const lastDate = (a) => (a && a.length ? a[a.length - 1][0] : '');

async function get(url, type) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return type === 'json' ? await r.json() : await r.text();
      if (r.status < 500) return null;
    } catch (_) { /* 재시도 */ }
    await sleep(700 * (i + 1));
  }
  return null;
}

// FRED CSV(지수, 월별) → 전년동월비[["YYYY-MM-01",%]]. 2019-01~ 받아 −12개월 확보.
async function fredYoy(id) {
  const t = await get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + encodeURIComponent(id) + '&cosd=2019-01-01', 'text');
  if (!t) return [];
  const idx = [];
  for (const line of t.trim().split('\n').slice(1)) {
    const [d, v] = line.split(',');
    if (d && v && v !== '.' && !isNaN(+v)) idx.push([d.slice(0, 7), +v]);
  }
  const m = {}; idx.forEach(([ym, v]) => { m[ym] = v; });
  const out = [];
  for (const [ym, v] of idx) {
    const prev = (+ym.slice(0, 4) - 1) + ym.slice(4);
    if (m[prev] && m[prev] !== 0 && ym >= '2020-01') out.push([ym + '-01', +((v / m[prev] - 1) * 100).toFixed(1)]);
  }
  return out;
}

// DBnomics 단일 시리즈 → [["YYYY-MM-01",%]] (이미 전년비 % 인 시리즈만 사용).
async function dbnomics(provider, dataset, code) {
  const url = 'https://api.db.nomics.world/v22/series/'
    + encodeURIComponent(provider) + '/' + encodeURIComponent(dataset) + '/' + encodeURIComponent(code)
    + '?observations=1';
  const j = await get(url, 'json');
  const doc = j && j.series && j.series.docs && j.series.docs[0];
  if (!doc || !Array.isArray(doc.period) || !Array.isArray(doc.value)) return [];
  const out = [];
  for (let i = 0; i < doc.period.length; i++) {
    const p = doc.period[i], v = doc.value[i];
    if (/^\d{4}-\d{2}$/.test(p) && typeof v === 'number' && isFinite(v) && p >= '2020-01') out.push([p + '-01', +v.toFixed(1)]);
  }
  return out;
}

// 후보들 중 가장 최신까지 있는(그리고 비어있지 않은) 시리즈 채택.
function freshest(cands) {
  return cands.filter((a) => a && a.length).sort((a, b) => (lastDate(a) < lastDate(b) ? 1 : -1))[0] || [];
}

async function main() {
  let prev = { asOf: null, series: {} };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const out = { asOf: prev.asOf, series: { ...(prev.series || {}) } };

  const sources = {
    us: async () => [await fredYoy('CPIAUCNS')],
    ez: async () => [
      await fredYoy('CP0000EZ19M086NEST'),
      await dbnomics('OECD', 'DSD_PRICES@DF_PRICES_ALL', 'EA20.M.N.CPI.PA._T.N.GY'),
    ],
    kr: async () => [
      await fredYoy('KORCPALTT01IXNBM'), await fredYoy('KORCPIALLMINMEI'),
      await dbnomics('OECD', 'DSD_PRICES@DF_PRICES_ALL', 'KOR.M.N.CPI.PA._T.N.GY'),
      await dbnomics('IMF', 'CPI', 'M.KR.PCPI_PC_CP_A_PT'),
    ],
    jp: async () => [
      await fredYoy('JPNCPALTT01IXNBM'), await fredYoy('JPNCPIALLMINMEI'),
      await dbnomics('OECD', 'DSD_PRICES@DF_PRICES_ALL', 'JPN.M.N.CPI.PA._T.N.GY'),
      await dbnomics('IMF', 'CPI', 'M.JP.PCPI_PC_CP_A_PT'),
    ],
  };

  let ok = 0;
  for (const [k, fn] of Object.entries(sources)) {
    let cands = [];
    try { cands = await fn(); } catch (e) { console.log(`WARN ${k}: ${e.message}`); }
    const best = freshest(cands);
    if (best.length) {
      out.series[k] = best; ok++;
      console.log(`OK   ${k} ${best.length}pts → last ${best[best.length - 1].join('=')}`);
    } else {
      console.log(`MISS ${k} (keeping last known ${lastDate(out.series[k] || [])})`);
    }
  }
  if (ok > 0) out.asOf = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`\nDone: ${ok}/4 series. asOf=${out.asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
