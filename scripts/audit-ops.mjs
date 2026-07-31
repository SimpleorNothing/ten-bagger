// Daily OPS compliance audit for Alpha Map.
// Fails the workflow when required update assets or freshness metadata are missing.
import fs from "node:fs";

const required = [
  "OPS.md", "STYLE_GUIDE.md", "index.html", "changelog.js",
  "prices.json", "charts.json", "signals.json", "gamma.json", "cycle.json",
  ".github/workflows/update-prices.yml",
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

const now = Date.now();
const maxAgeMs = 96 * 60 * 60 * 1000; // 주말·미국 휴장일 허용
for (const [name, value] of [["prices.json", prices?.asOf], ["signals.json", signals?.asOf]]) {
  const age = value ? now - Date.parse(value) : Infinity;
  if (age > maxAgeMs) fail(name + " is stale: " + value);
}
for (const path of ["OPS.md", "STYLE_GUIDE.md"]) {
  const m = read(path).match(/최종 갱신:\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) fail(path + " top-level 최종 갱신 timestamp missing");
}
const index = read("index.html");
if (!/changelog\.js\?v=/.test(index)) fail("index.html changelog cache-buster missing");
const changelog = read("changelog.js");
if (!/MKT_CHANGELOG\s*=\s*\[/.test(changelog)) fail("changelog.js MKT_CHANGELOG missing");

if (process.exitCode) process.exit(1);
console.log("OPS daily audit passed: required files, data freshness, chart integrity, cache-buster, and changelog linkage.");
