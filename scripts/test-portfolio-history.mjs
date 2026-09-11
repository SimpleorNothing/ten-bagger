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

const overseasDetail = {
  fc_sec_trd_nat_cd: '200',
  fc_sec_trd_nat_nm: '미국',
  iem_cd: 'CRDO',
  iem_nm: '크레도',
  cns_bse_bnc_qty: 130,
  sll_cns_qty: 0,
  byn_cns_qty: 0,
  sll_pbl_qty1: 130,
  fc_abk_amt: 21989.6,
  krw_abk_amt1: 30132350,
  fc_phs_uit_pr: 169.15,
  phs_uit_pr: 231787,
  fc_sec_end_pr: 162.92,
  end_pr: 218019,
  fc_eal_amt: 21179.6,
  krw_eal_amt: 28342540,
  fc_eal_pls_amt: -849.29,
  krw_eal_pls_amt: -1843022,
  eal_pft_rt: -3.86,
  eal_pft_rt1: -6.11,
  cur_cd: 'USD',
  phs_xcg_rt: 1370.30005,
  tdt_sby_bse_xcg_rt: 1338.2,
  fc_cns_bse_phs_xps: 19.79,
  krw_cns_bse_phs_xps: 27118,
  fc_avg_phs_pr: 169.303,
  krw_avg_phs_pr: 231995,
  fc_fee: 19.06,
  krw_fee: 25506,
  fc_tax_amt: 0.44,
  krw_tax_amt: 588,
  fc_pls_qtr_phs_pr: 169.453,
  krw_pls_qtr_phs_pr: 232196,
  cfd_lon_cd_nm: '현금',
  lon_dt: '',
  xrn_dt: '',
};

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
          { iem_cd: '442580', iem_nm: 'PLUS 글로벌HBM반도체', itg_bnc_qty: 1054, eal_amt: 106475080, eal_pls_amt: 60547010, pft_rt: 131.83, phs_pr: 43670, now_pr: 101020, rsdl_qty: 1054, ny_stl_qty: 0, lon_byn_dt: '00000000', xrn_dt: '', wtm_rt: '100%' },
        ],
      },
      overseas: [],
    },
    {
      account: '12345678901',
      label: '종합매매',
      dataSource: 'NHPLUG',
      domestic: { Output_1: [] },
      overseas: [{ nation: '200', data: { Output_0: { tot_aet_amt: 28342540, krw_pft_rt: -6.11 }, Output_1: [overseasDetail] } }],
    },
  ],
};

const sanitized = sanitizePortfolioSnapshot(raw);
assert.equal('account' in sanitized, false);
assert.equal('token' in sanitized, false);
assert.equal('account' in sanitized.accounts[0], false);
assert.equal(JSON.stringify(sanitized).includes('092728'), false);

// 화면에서 숨기는 상세값도 DB 원본에는 그대로 남아야 한다.
const kept = sanitized.accounts[1].overseas[0].data.Output_1[0];
for (const key of [
  'fc_sec_trd_nat_cd', 'fc_sec_trd_nat_nm', 'cns_bse_bnc_qty', 'sll_cns_qty', 'byn_cns_qty', 'sll_pbl_qty1',
  'fc_abk_amt', 'krw_abk_amt1', 'fc_phs_uit_pr', 'phs_uit_pr', 'fc_sec_end_pr', 'end_pr',
  'fc_eal_amt', 'krw_eal_amt', 'fc_eal_pls_amt', 'krw_eal_pls_amt', 'eal_pft_rt', 'eal_pft_rt1',
  'cur_cd', 'phs_xcg_rt', 'tdt_sby_bse_xcg_rt', 'fc_avg_phs_pr', 'krw_avg_phs_pr',
  'fc_fee', 'krw_fee', 'fc_tax_amt', 'krw_tax_amt', 'fc_pls_qtr_phs_pr', 'krw_pls_qtr_phs_pr',
  'cfd_lon_cd_nm', 'lon_dt', 'xrn_dt',
]) {
  assert.equal(Object.prototype.hasOwnProperty.call(kept, key), true, `detail field missing from DB snapshot: ${key}`);
  assert.deepEqual(kept[key], overseasDetail[key]);
}

const rows = flattenPortfolioHoldings(sanitized);
assert.equal(rows.length, 2);
assert.equal(rows[0].account, 'DC');
assert.equal(rows[0].evaluationAmountKrw, 106475080);
assert.equal(rows[1].code, 'CRDO');
assert.equal(rows[1].evaluationAmountKrw, 28342540);
assert.equal(rows[1].purchasePrice, 169.15);
assert.equal(rows[1].currentPrice, 162.92);
assert.equal(rows[1].returnPct, -6.11);

const summary = summarizePortfolioSnapshot(sanitized);
assert.equal(summary.accountCount, 2);
assert.equal(summary.holdingCount, 2);
assert.equal(summary.holdingValueKrw, 134817620);
assert.equal(summary.cashIncluded, false);

const bucket = new Bucket();
const stored = {
  storageSchemaVersion: 2,
  storagePolicy: 'full-sanitized-source',
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
    holdingValueKrw: '134817620',
    cashIncluded: 'false',
    storageSchemaVersion: '2',
    detailStorage: 'full-sanitized-source',
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
assert.match(body.storagePolicy, /full-sanitized-source/);
assert.equal(body.dates.length, 1);
assert.equal(body.dates[0].date, '2026-09-12');
assert.equal(body.dates[0].holdingValueKrw, 134817620);
assert.equal(body.dates[0].storageSchemaVersion, 2);
assert.equal(body.dates[0].detailStorage, 'full-sanitized-source');

res = await handlePortfolioHistory(new Request('https://simpleornothing.com/api/portfolio/history/2026-09-12'), env, true);
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.snapshotDate, '2026-09-12');
assert.equal(body.storageSchemaVersion, 2);
assert.equal(body.snapshot.accounts[1].overseas[0].data.Output_1[0].krw_fee, 25506);
assert.equal(body.snapshot.accounts[1].overseas[0].data.Output_1[0].phs_xcg_rt, 1370.30005);
assert.equal(JSON.stringify(body).includes('800-02-092728'), false);

res = await handlePortfolioHistory(new Request('https://simpleornothing.com/api/portfolio/history/2026-09-12.csv'), env, true);
assert.equal(res.status, 200);
assert.match(res.headers.get('content-disposition') || '', /portfolio-2026-09-12\.csv/);
const csv = await res.text();
assert.match(csv, /PLUS 글로벌HBM반도체/);
assert.match(csv, /크레도/);
assert.match(csv, /162\.92/);
assert.match(csv, /-6\.11/);
assert.equal(csv.includes('800-02-092728'), false);

console.log('portfolio history tests passed');
