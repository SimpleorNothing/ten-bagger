// Daily OPS compliance audit for Alpha Map.
// Fails the workflow when required update assets, freshness metadata, or ranking cadence wiring are missing.
import fs from "node:fs";

const required = [
  "OPS.md", "STYLE_GUIDE.md", "index.html", "changelog.js",
  "prices.json", "charts.json", "signals.json", "gamma.json", "cycle.json",
  ".github/workflows/update-prices.yml",
  "scripts/apply_dual_rank_ui.py",
];

const fail = (message) => { console.error("::error::" + message); process.exitCode = 1; };
const read = (path) => {
  try { return fs.readFileSync(path, "utf8"); }
  catch { fail("required file missing or unreadable: " + path); return ""; }
};
for (const path of required) read(path);

const json = (path) => {
  try { return JSON.parse(read(path)); }
  catch { fail("invalid JSON: " + path); return null; }
};
const prices = json("prices.json");
const charts = json("charts.json");
const signals = json("signals.json");
const gamma = json("gamma.json");
if (prices) {
  for (const id of ["gspc", "ixic", "us10y"]) {
    if (!Number.isFinite(Number(prices.quotes?.[id]?.price))) fail("required price quote missing: " + id);
  }
  if (!prices.asOf || Number.isNaN(Date.parse(prices.asOf))) fail("prices.json asOf missing or invalid");
}
if (charts) {
  for (const id of ["gspc", "ixic", "us10y"]) {
    const s = charts.series?.[id];
    if (!Array.isArray(s?.t) || !Array.isArray(s?.c) || !s.t.length || s.t.length !== s.c.length) {
      fail("chart series missing or mismatched: " + id);
    }
  }
}
if (signals && (!signals.asOf || Number.isNaN(Date.parse(signals.asOf)))) fail("signals.json asOf missing or invalid");
if (gamma && (!gamma.asOf || Number.isNaN(Date.parse(gamma.asOf)))) fail("gamma.json asOf missing or invalid");

const now = Date.now();
const maxAgeMs = 96 * 60 * 60 * 1000; // 주말·미국 휴장일 허용
for (const [name, value] of [["prices.json", prices?.asOf], ["signals.json", signals?.asOf], ["gamma.json", gamma?.asOf]]) {
  const age = value ? now - Date.parse(value) : Infinity;
  if (age > maxAgeMs) fail(name + " is stale: " + value);
}

// 05 실제 비중조절 우선순위는 독립 크론이 아니라 최신 gamma+holdings를 페이지 로드 때 재계산한다.
// 원천 데이터 예약 주기는 update-prices.yml의 06:05·06:35·16:52 KST(UTC 21:05·21:35·07:52) 3회다.
const priceWorkflow = read(".github/workflows/update-prices.yml");
for (const cron of ["5 21 * * *", "35 21 * * *", "52 7 * * *"]) {
  if (!priceWorkflow.includes(`cron: '${cron}'`) && !priceWorkflow.includes(`cron: \"${cron}\"`)) {
    fail("update-prices.yml revision cadence missing cron: " + cron);
  }
}
if (!/node scripts\/fetch-gamma\.mjs/.test(priceWorkflow)) fail("update-prices.yml no longer refreshes gamma.json");
if (!/node scripts\/fetch-revision-provenance\.mjs/.test(priceWorkflow)) fail("update-prices.yml no longer stores revision provenance");
if (!/node scripts\/validate-revision-provenance\.mjs/.test(priceWorkflow)) fail("update-prices.yml no longer validates revision provenance");

const dualRank = read("scripts/apply_dual_rank_ui.py");
if (!/fetch\('\.\/holdings\.json',\{cache:'no-store'\}\)/.test(dualRank)) fail("dual-rank holdings fetch must be no-store");
if (!/fetch\('\.\/gamma\.json',\{cache:'no-store'\}\)/.test(dualRank)) fail("dual-rank gamma fetch must be no-store");
if (!/actual=zb==null\?null:Math\.round\(clamp\(zb-pen,0,100\)\)/.test(dualRank)) fail("dual-rank actual score derivation missing");

for (const path of ["OPS.md", "STYLE_GUIDE.md"]) {
  const m = read(path).match(/최종 갱신:\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) fail(path + " top-level 최종 갱신 timestamp missing");
}
const index = read("index.html");
if (!/changelog\.js\?v=/.test(index)) fail("index.html changelog cache-buster missing");
const changelog = read("changelog.js");
if (!/MKT_CHANGELOG\s*=\s*\[/.test(changelog)) fail("changelog.js MKT_CHANGELOG missing");

if (process.exitCode) process.exit(1);
console.log("OPS daily audit passed: required files, data freshness, revision-ranking cadence, no-store ranking inputs, chart integrity, cache-buster, and changelog linkage.");