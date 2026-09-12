import fs from 'node:fs';
import assert from 'node:assert/strict';

const activity=fs.readFileSync('nhplug-activity.js','utf8');
const ui=fs.readFileSync('portfolio-intelligence-ui.js','utf8');
const worker=fs.readFileSync('worker.js','utf8');
const entry=fs.readFileSync('worker-entry.js','utf8');

const requiredActivity=[
  '/krstock/inquiry/v1/dailyOrderExecution',
  '/krstock/inquiry/v1/tradingPnl',
  '/krstock/inquiry/v1/dailyPnl',
  '/gbstock/inquiry/v1/dailyTransaction',
  '/gbstock/inquiry/v1/unexecuted',
  '/gbstock/inquiry/v1/periodPnl',
];
for(const p of requiredActivity)assert.ok(activity.includes(p),`missing NHPLUG read-only endpoint: ${p}`);
assert.ok(!/\/krstock\/order\/|\/gbstock\/order\//.test(activity),'activity module must not call order APIs');
assert.ok(activity.includes("TARGET_SUFFIXES = new Map([['7747','개인투자']])"),'activity scope must remain the supported personal trading account');
assert.ok(activity.includes('rangeDays=clampInt')&&activity.includes('executionDays=clampInt'),'bounded activity windows required');
assert.ok(activity.includes('readOnly:true'),'activity response must explicitly remain read-only');
assert.ok(activity.includes('개인형IRP·DC'),'retirement-account limitation must be explicit');

assert.ok(worker.includes("import { handlePortfolioActivity } from './nhplug-activity.js'"),'worker activity import missing');
assert.ok(worker.includes("url.pathname === '/api/portfolio/activity'"),'worker activity route missing');
assert.ok(entry.includes('/portfolio-intelligence-ui.js?v=20260912-01'),'portfolio intelligence loader missing');
assert.ok(entry.includes("activityApi: '/api/portfolio/activity'"),'portfolio probe activity marker missing');

assert.ok(ui.includes("ACT='/api/portfolio/activity?days=30&executionDays=7'"),'UI activity window missing');
assert.ok(ui.includes("TAX='/holdings.json'")&&ui.includes("GAMMA='/gamma.json'"),'UI must use live taxonomy + gamma policy sources');
assert.ok(ui.includes('function l3Cycle')&&ui.includes('집중상한'),'dynamic L3 target policy missing');
assert.ok(ui.includes('ETF_RE')&&ui.includes('l.direct')&&ui.includes('l.etf'),'direct/ETF overlap engine missing');
assert.ok(ui.includes('확인 가능한 보유종목 평가금액'),'denominator limitation disclosure missing');
assert.ok(ui.includes("credentials:'same-origin'"),'authenticated same-origin fetch missing');
assert.ok(ui.includes('300000'),'five-minute refresh missing');
assert.ok(!/fetch\([^\n]*\/(?:api\/)?(?:order|orders|buy|sell|trade)(?:\/|['"?])/i.test(ui),'UI must not expose trading routes');

console.log('portfolio intelligence checks: OK');
