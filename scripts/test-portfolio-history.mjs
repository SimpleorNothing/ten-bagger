import assert from 'node:assert/strict';
import {
  flattenPortfolioHoldings,
  handlePortfolioHistory,
  historyKey,
  kstDate,
  sanitizePortfolioSnapshot,
  summarizePortfolioSnapshot,
} from '../portfolio-history-store.js';

class Bucket {
  constructor() { this.map = new Map(); }
  async get(key) {
    const item = this.map.get(key);
    if (!item) return null;
    return { text: async () => item.body, customMetadata: item.customMetadata || {} };
  }
  async put(key, body, options = {}) {
    this.map.set(key, { body, customMetadata: options.customMetadata || {}, uploaded: new Date('2026-09-12T08:00:00Z') });
  }
  async list({ prefix = '' } = {}) {
    const objects = [];
    for (const [key, item] of this.map.entries()) {
      if (!key.startsWith(prefix)) continue;
      objects.push({ key, customMetadata: item.customMetadata || {}, uploaded: item.uploaded });
    }
    return { objects, truncated: false };
  }
}

assert.equal(kstDate('2026-09-11T15:00:00Z'), '2026-09-12');
assert.equal(historyKey('2026-09-12'), 'portfolio-history/2026-09-12.json');

const raw = {
  source: 'NHPLUG',
  readOnly: true,
  account: '800-02-092728',
  token: 'secret-token',
  accounts: [
    {
      account: '800-02-092728',
      label: 'DC',
      dataSource: 'MANUAL_CAPTURE',
      domestic: {
        Output_1: [
          { iem_cd: '442580', iem_nm: 'PLUS 글로벌HBM반도체', itg_bnc_qty: 1054, eal_amt: 106475080, eal_pls_amt: 60547010, pft_rt: 131.83 },
        ],
      },
      overseas: [],
    },
    {
      account: '12345678901',
      label: '종합매매',
      dataSource: 'NHPLUG',
      domestic: { Output_1: [] },
      overseas: [{ nation: '200', data: { Output_1: [
        { iem_cd: 'CRDO', iem_nm: '크레도', cns_bse_bnc_qty: 2, krw_eal_amt: 500000, krw_eal_pls_amt: 100000, eal_pft_rt1: 25 },
      ] } }],
    },
  ],
};

const sanitized = sanitizePortfolioSnapshot(raw);
assert.equal('account' in sanitized, false);
assert.equal('token' in sanitized, false);
assert.equal('account' in sanitized.accounts[0], false);
assert.equal(JSON.stringify(sanitized).includes('092728'), false);

const rows = flattenPortfolioHoldings(sanitized);
assert.equal(rows.length, 2);
assert.equal(rows[0].account, 'DC');
assert.equal(rows[0].evaluationAmountKrw, 106475080);
assert.equal(rows[1].code, 'CRDO');
assert.equal(rows[1].evaluationAmountKrw, 500000);

const summary = summarizePortfolioSnapshot(sanitized);
assert.equal(summary.accountCount, 2);
assert.equal(summary.holdingCount, 2);
assert.equal(summary.holdingValueKrw, 106975080);
assert.equal(summary.cashIncluded, false);

const bucket = new Bucket();
const stored = {
  snapshotDate: '2026-09-12',
  savedAt: '2026-09-12T08:00:00.000Z',
  reason: 'scheduled-17-kst',
  summary,
  snapshot: sanitized,
};
await bucket.put(historyKey('2026-09-12'), JSON.stringify(stored), {
  customMetadata: {
    snapshotDate: '2026-09-12',
    savedAt: stored.savedAt,
    holdingCount: '2',
    accountCount: '2',
    holdingValueKrw: '106975080',
    cashIncluded: 'false',
  },
});

const env = { MEMO_BUCKET: bucket };
let res = await handlePortfolioHistory(new Request('https://simpleornothing.com/api/portfolio/history'), env, false);
assert.equal(res.status, 401);

res = await handlePortfolioHistory(new Request('https://simpleornothing.com/api/portfolio/history'), env, true);
assert.equal(res.status, 200);
let body = await res.json();
assert.equal(body.scheduledAt, '17:00');
assert.equal(body.timezone, 'Asia/Seoul');
assert.equal(body.dates.length, 1);
assert.equal(body.dates[0].date, '2026-09-12');
assert.equal(body.dates[0].holdingValueKrw, 106975080);

res = await handlePortfolioHistory(new Request('https://simpleornothing.com/api/portfolio/history/2026-09-12'), env, true);
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.snapshotDate, '2026-09-12');
assert.equal(JSON.stringify(body).includes('800-02-092728'), false);

res = await handlePortfolioHistory(new Request('https://simpleornothing.com/api/portfolio/history/2026-09-12.csv'), env, true);
assert.equal(res.status, 200);
assert.match(res.headers.get('content-disposition') || '', /portfolio-2026-09-12\.csv/);
const csv = await res.text();
assert.match(csv, /PLUS 글로벌HBM반도체/);
assert.match(csv, /크레도/);
assert.equal(csv.includes('800-02-092728'), false);

console.log('portfolio history tests passed');
