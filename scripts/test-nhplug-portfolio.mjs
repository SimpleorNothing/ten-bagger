import assert from 'node:assert/strict';
import { derivePortfolioApiToken, handlePortfolioLive } from '../nhplug-portfolio.js';

class Bucket {
  constructor() { this.map = new Map(); }
  async get(key) {
    if (!this.map.has(key)) return null;
    const value = this.map.get(key);
    return { text: async () => value };
  }
  async put(key, value) { this.map.set(key, value); }
  async delete(key) { this.map.delete(key); }
}

const env = {
  NHPLUG_APP_KEY: 'app-key-test',
  NHPLUG_APP_SECRET: 'app-secret-test',
  MEMO_BUCKET: new Bucket(),
};

const regularAccount = '12345678901';
const irpAccount = '12345670473';
const dcAccount = '99999992728';
const originalFetch = globalThis.fetch;
let calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('/oauth2/token')) {
    return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 86400 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (String(url).endsWith('/n2/acctinfo')) {
    return new Response(JSON.stringify({
      Output_0: [
        { acct_no: regularAccount, acct_type: '01' },
        { acct_no: irpAccount, acct_type: '01' },
        { acct_no: dcAccount, acct_type: '08' },
      ],
    }), { status: 200 });
  }
  if (String(url).includes('/krstock/inquiry/v1/balance')) {
    const body = JSON.parse(init.body || '{}');
    const actNo = body?.Input_0?.act_no;
    assert.notEqual(actNo, dcAccount, 'non-stock account types must not be sent to stock balance API');
    if (actNo === irpAccount) {
      return new Response(JSON.stringify({
        Output_0: [{ tot_aet_amt: 0, dca: 0 }],
        Output_1: [],
        acct_no: irpAccount,
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      Output_0: [{ tot_aet_amt: 1000000, dca: 100000 }],
      Output_1: [{ iem_cd: '005930', qty: 10 }],
      acct_no: regularAccount,
    }), { status: 200 });
  }
  if (String(url).includes('/gbstock/inquiry/v1/balance')) {
    const body = JSON.parse(init.body || '{}');
    const actNo = body?.Input_0?.act_no;
    assert.notEqual(actNo, dcAccount, 'non-stock account types must not be sent to overseas balance API');
    if (actNo === irpAccount) {
      return new Response(JSON.stringify({
        Output_0: [{ tot_aet_amt: 0, krw_dca: 0 }],
        Output_1: [],
        acct_no: irpAccount,
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ Output_1: [{ iem_cd: 'CRDO', qty: 20 }], acct_no: regularAccount }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${url}`);
};

try {
  const unauth = await handlePortfolioLive(new Request('https://simpleornothing.com/api/portfolio/live'), env, false);
  assert.equal(unauth.status, 401);

  const token = await derivePortfolioApiToken(env.NHPLUG_APP_SECRET);
  const req = new Request('https://simpleornothing.com/api/portfolio/live', {
    headers: { 'x-portfolio-api-token': token },
  });
  const res = await handlePortfolioLive(req, env, false);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.source, 'NHPLUG');
  assert.equal(body.readOnly, true);
  assert.equal(body.portfolioMode, 'NHPLUG+MANUAL');
  assert.equal(body.discovery.length, 3);

  const irpDiscovery = body.discovery.find((row) => row.label === '개인형IRP');
  assert.ok(irpDiscovery, 'IRP must be visible in account discovery');
  assert.equal(irpDiscovery.type, '01');
  assert.equal(irpDiscovery.balanceEligible, true);

  const dcDiscovery = body.discovery.find((row) => row.label === 'DC');
  assert.ok(dcDiscovery, 'DC must remain visible in account discovery even when its account type is not stock-balance eligible');
  assert.equal(dcDiscovery.type, '08');
  assert.equal(dcDiscovery.balanceEligible, false);

  const regular = body.accounts.find((row) => row.dataSource === 'NHPLUG');
  assert.ok(regular);
  assert.equal(regular.account.endsWith('8901'), true);
  assert.equal(regular.domestic.acct_no.endsWith('8901'), true);

  const irp = body.accounts.find((row) => row.label === '개인형IRP');
  assert.ok(irp, 'manual IRP fallback must replace an empty NHPLUG pension balance');
  assert.equal(irp.dataSource, 'MANUAL_CAPTURE');
  assert.equal(irp.asOf, '2026-09-12');
  assert.equal(irp.domestic.Output_0[0].tot_evlu_amt, 4811610);
  assert.equal(irp.domestic.Output_0[0].cash_status, 'not-visible-in-source-capture');
  assert.equal(irp.domestic.Output_1.length, 4);
  assert.equal(irp.domestic.Output_1.reduce((sum, row) => sum + Number(row.eal_amt || 0), 0), 4811610);
  assert.equal(irp.domestic.Output_1.find((row) => row.iem_cd === '122090')?.itg_bnc_qty, 26);
  assert.equal(irp.domestic.Output_1.find((row) => row.iem_cd === '442580')?.itg_bnc_qty, 16);
  assert.equal(irp.nhplugListed, true);
  assert.equal(irp.nhplugType, '01');
  assert.equal(irp.queryStatus, 'manual-fallback-used');

  const dc = body.accounts.find((row) => row.label === 'DC');
  assert.ok(dc, 'manual DC fallback must be merged into the live portfolio response');
  assert.equal(dc.dataSource, 'MANUAL_CAPTURE');
  assert.equal(dc.asOf, '2026-09-12');
  assert.equal(dc.domestic.Output_0[0].tot_evlu_amt, 431206120);
  assert.equal(dc.domestic.Output_0[0].cash_status, 'not-visible-in-source-capture');
  assert.equal(dc.domestic.Output_1.length, 9);
  assert.equal(dc.domestic.Output_1.reduce((sum, row) => sum + Number(row.eal_amt || 0), 0), 431206120);
  assert.equal(dc.domestic.Output_1.find((row) => row.iem_cd === '442580')?.itg_bnc_qty, 1054);
  assert.equal(dc.domestic.Output_1.find((row) => row.iem_cd === '459580')?.itg_bnc_qty, 32);
  assert.equal(dc.nhplugListed, true);
  assert.equal(dc.nhplugType, '08');
  assert.equal(dc.queryStatus, 'manual-fallback-used');

  assert.deepEqual(body.manualFallbacks.map((row) => row.label), ['개인형IRP', 'DC']);
  assert.equal(calls.filter((call) => call.url.includes('/oauth2/token')).length, 1);

  calls = [];
  const res2 = await handlePortfolioLive(req, env, false);
  assert.equal(res2.status, 200);
  assert.equal(calls.filter((call) => call.url.includes('/oauth2/token')).length, 0, 'token should be reused');
  console.log('nhplug portfolio tests passed');
} finally {
  globalThis.fetch = originalFetch;
}
