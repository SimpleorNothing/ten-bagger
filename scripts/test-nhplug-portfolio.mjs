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
    return new Response(JSON.stringify({ Output_0: [{ acct_no: '12345678901', acct_type: '01' }] }), { status: 200 });
  }
  if (String(url).includes('/krstock/inquiry/v1/balance')) {
    return new Response(JSON.stringify({ Output_1: [{ iem_cd: '005930', qty: 10 }], acct_no: '12345678901' }), { status: 200 });
  }
  if (String(url).includes('/gbstock/inquiry/v1/balance')) {
    return new Response(JSON.stringify({ Output_1: [{ iem_cd: 'CRDO', qty: 20 }], acct_no: '12345678901' }), { status: 200 });
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
  assert.equal(body.accounts.length, 1);
  assert.equal(body.accounts[0].account.endsWith('8901'), true);
  assert.equal(body.accounts[0].domestic.acct_no.endsWith('8901'), true);
  assert.equal(calls.filter((call) => call.url.includes('/oauth2/token')).length, 1);

  calls = [];
  const res2 = await handlePortfolioLive(req, env, false);
  assert.equal(res2.status, 200);
  assert.equal(calls.filter((call) => call.url.includes('/oauth2/token')).length, 0, 'token should be reused');
  console.log('nhplug portfolio tests passed');
} finally {
  globalThis.fetch = originalFetch;
}
