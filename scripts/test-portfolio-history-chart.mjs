import assert from 'node:assert/strict';
import fs from 'node:fs';

const seed=JSON.parse(fs.readFileSync('portfolio-history-seed.json','utf8'));
const chart=fs.readFileSync('portfolio-history-chart.js','utf8');
const entry=fs.readFileSync('worker-entry.js','utf8');

assert.equal(seed.schemaVersion,2);
assert.equal(seed.currency,'KRW');
assert.equal(seed.series.personal[0][0],'2023-01-02');
assert.equal(seed.series.personal[0][1],57145090);
assert.equal(seed.series.dc[0][0],'2023-01-02');
assert.equal(seed.series.irp[0][0],'2025-10-11');
assert.equal(seed.series.personal.at(-1)[0],'2026-09-05');
assert.equal(seed.series.dc.at(-1)[0],'2026-09-05');
assert.equal(seed.series.irp.at(-1)[0],'2026-09-05');
assert.equal(seed.series.principal[0][0],'2023-01-02');
assert.equal(seed.series.principal.at(-1)[1],390860818);
assert.match(seed.policy.principal,/전체 투자원금/);
assert.match(seed.policy.personal,/2023~2025/);
assert.match(seed.policy.personal,/NHPLUG API 저장 이력이 우선/);
assert.match(seed.policy.dc,/첨부 원장/);
assert.match(seed.policy.irp,/첨부 원장/);

assert.match(chart,/portfolioHistoryChart/);
assert.match(chart,/SEED='\/portfolio-history-seed\.json'/);
assert.match(chart,/HISTORY='\/api\/portfolio\/history'/);
assert.match(chart,/LIVE='\/api\/portfolio\/live'/);
assert.match(chart,/개인투자: 2023~2025 과거원장/);
assert.match(chart,/2026 NHPLUG API 우선/);
assert.match(chart,/API 저장 전 구간은 2026 원장 백필/);
assert.match(chart,/dataSource\|\|''\)\.toUpperCase\(\)!=='MANUAL_CAPTURE'/);
assert.match(chart,/src!=='MANUAL_CAPTURE'/);
assert.match(chart,/note\.parentNode\.insertBefore\(sec,note\.nextSibling\)/);
assert.match(chart,/data-r=\"6M\"/);
assert.match(chart,/data-r=\"1Y\"/);
assert.match(chart,/data-r=\"3Y\"/);
assert.match(chart,/data-r=\"ALL\"/);
assert.match(chart,/전체 투자원금/);
assert.match(chart,/H=428/);
assert.match(chart,/height:428px/);
assert.equal(/['"]\/(?:api\/)?(?:order|orders|buy|sell|trade)(?:\/|['"?])/i.test(chart),false);

assert.match(entry,/portfolio-history-chart\.js\?v=20260913-02/);
assert.match(entry,/historyChartAsset/);
assert.match(entry,/historySeedAsset/);
assert.match(entry,/seed\?\.series\?\.personal\?\.\[0\]\?\.\[0\] === '2023-01-02'/);
assert.match(entry,/seed\?\.schemaVersion === 2/);
assert.match(entry,/Array\.isArray\(seed\?\.series\?\.principal\)/);

console.log('portfolio history chart checks passed');
