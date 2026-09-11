const DEFAULT_BASE_URL = 'https://api.nhplug.com:8443';
const DEFAULT_AUTH_URL = 'https://api.nhplug.com:8443';
const TOKEN_OBJECT_KEY = '_private/nhplug/token-v1.json';
const ALLOWED_API_HOSTS = new Set([
  'api.nhplug.com', 'moapi.nhplug.com', 'api.n2plug.com', 'moapi.n2plug.com',
]);
const ALLOWED_AUTH_HOSTS = new Set(['api.nhplug.com', 'api.n2plug.com']);

let memoryToken = { scope: '', token: '', exp: 0 };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      pragma: 'no-cache',
      expires: '0',
    },
  });
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function sha256Bytes(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

async function sha256Hex(text) {
  return [...await sha256Bytes(text)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireHttpsAllowed(value, fallback, allowedHosts, label) {
  const u = new URL(String(value || fallback).trim());
  if (u.protocol !== 'https:' || !allowedHosts.has(u.hostname.toLowerCase())) {
    throw new Error(`${label}_HOST_NOT_ALLOWED`);
  }
  u.pathname = '';
  u.search = '';
  u.hash = '';
  return u.toString().replace(/\/$/, '');
}

function apiBase(env) {
  return requireHttpsAllowed(env.NHPLUG_BASE_URL, DEFAULT_BASE_URL, ALLOWED_API_HOSTS, 'NHPLUG_BASE_URL');
}

function authBase(env) {
  return requireHttpsAllowed(env.NHPLUG_AUTH_URL, DEFAULT_AUTH_URL, ALLOWED_AUTH_HOSTS, 'NHPLUG_AUTH_URL');
}

function configured(env) {
  return Boolean(env && env.NHPLUG_APP_KEY && env.NHPLUG_APP_SECRET);
}

export async function derivePortfolioApiToken(appSecret) {
  if (!appSecret) return '';
  return sha256Hex(`alpha-map:portfolio-read:v1:${appSecret}`);
}

async function isPortfolioAuthorized(request, env, cookieAuthorized) {
  if (cookieAuthorized) return true;
  if (!env || !env.NHPLUG_APP_SECRET) return false;
  const got = request.headers.get('x-portfolio-api-token') || '';
  const expected = await derivePortfolioApiToken(env.NHPLUG_APP_SECRET);
  return safeEqual(got, expected);
}

async function encryptionKey(secret) {
  const keyBytes = await sha256Bytes(`alpha-map:nhplug-token-cache:v1:${secret}`);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptTokenPayload(payload, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(secret);
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  ));
  return { v: 1, iv: bytesToBase64(iv), data: bytesToBase64(cipher) };
}

async function decryptTokenPayload(stored, secret) {
  if (!stored || stored.v !== 1 || !stored.iv || !stored.data) return null;
  const key = await encryptionKey(secret);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(stored.iv) },
    key,
    base64ToBytes(stored.data),
  );
  return JSON.parse(decoder.decode(plain));
}

async function tokenScope(env) {
  return sha256Hex(`${env.NHPLUG_APP_KEY}|${authBase(env)}`);
}

async function readPersistedToken(env, scope) {
  if (!env.MEMO_BUCKET) return null;
  try {
    const object = await env.MEMO_BUCKET.get(TOKEN_OBJECT_KEY);
    if (!object) return null;
    const stored = JSON.parse(await object.text());
    const payload = await decryptTokenPayload(stored, env.NHPLUG_APP_SECRET);
    if (!payload || payload.scope !== scope || !payload.token || !Number(payload.exp)) return null;
    if (Number(payload.exp) <= Date.now() + 60_000) return null;
    return payload;
  } catch {
    return null;
  }
}

async function persistToken(env, payload) {
  if (!env.MEMO_BUCKET) return;
  const stored = await encryptTokenPayload(payload, env.NHPLUG_APP_SECRET);
  await env.MEMO_BUCKET.put(TOKEN_OBJECT_KEY, JSON.stringify(stored), {
    httpMetadata: { contentType: 'application/json' },
  });
}

async function clearPersistedToken(env) {
  memoryToken = { scope: '', token: '', exp: 0 };
  if (!env.MEMO_BUCKET) return;
  try { await env.MEMO_BUCKET.delete(TOKEN_OBJECT_KEY); } catch {}
}

async function issueToken(env) {
  const u = new URL(`${authBase(env)}/oauth2/token`);
  u.searchParams.set('appkey', env.NHPLUG_APP_KEY);
  u.searchParams.set('appsecretkey', env.NHPLUG_APP_SECRET);
  u.searchParams.set('grant_type', 'client_credentials');
  u.searchParams.set('scope', 'oob');

  const res = await fetch(u.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || !data || !data.access_token) {
    const code = data && (data.error_code || data.rsp_cd || data.error);
    throw new Error(`NHPLUG_TOKEN_FAILED:${res.status}:${code || 'unknown'}`);
  }
  const scope = await tokenScope(env);
  const exp = Date.now() + Math.max(60, Number(data.expires_in || 86400)) * 1000;
  const payload = { scope, token: String(data.access_token), exp };
  memoryToken = payload;
  await persistToken(env, payload);
  return payload.token;
}

async function getToken(env, force = false) {
  const scope = await tokenScope(env);
  if (!force && memoryToken.scope === scope && memoryToken.token && memoryToken.exp > Date.now() + 30_000) {
    return memoryToken.token;
  }
  if (!force) {
    const persisted = await readPersistedToken(env, scope);
    if (persisted) {
      memoryToken = persisted;
      return persisted.token;
    }
  }
  return issueToken(env);
}

async function nhCall(env, path, input, allowRetry = true) {
  const token = await getToken(env, false);
  const res = await fetch(`${apiBase(env)}${path}`, {
    method: 'POST',
    headers: {
      'x-client-id': env.NHPLUG_APP_KEY,
      'x-client-secret': env.NHPLUG_APP_SECRET,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ Input_0: input || {} }),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 1000) }; }

  const invalidToken = res.status === 401 || /IGW40043|유효하지\s*않은\s*token/i.test(text);
  if (invalidToken && allowRetry) {
    await clearPersistedToken(env);
    await getToken(env, true);
    return nhCall(env, path, input, false);
  }
  if (!res.ok) {
    const code = data && (data.error_code || data.rsp_cd || data.error);
    throw new Error(`NHPLUG_HTTP_${res.status}:${code || 'unknown'}`);
  }
  return data;
}

function currentEnvironment(env) {
  const host = new URL(apiBase(env)).hostname.toLowerCase();
  if (host.startsWith('moapi.')) return 'mock';
  if (host.startsWith('api.')) return 'live';
  return 'unknown';
}

function maskAccount(value) {
  const s = String(value || '').replace(/\s+/g, '');
  if (!s) return '';
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${'*'.repeat(Math.max(4, s.length - 4))}${s.slice(-4)}`;
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map((v) => sanitize(v));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/(?:^|_)(?:act_no|acct_no|account_no|cust_no|customer_no|rrn|jumin|email|phone|tel)(?:$|_)/i.test(k)) {
      out[k] = maskAccount(v);
    } else if (/token|secret|appkey|app_key/i.test(k)) {
      out[k] = '[redacted]';
    } else {
      out[k] = sanitize(v);
    }
  }
  return out;
}

function usableAccounts(raw, envName) {
  const rows = Array.isArray(raw && raw.Output_0) ? raw.Output_0 : [];
  return rows.filter((row) => {
    const type = String((row && row.acct_type) || '').trim();
    if (!type) return true;
    if (envName === 'mock') return type === '03';
    if (envName === 'live') return type === '01' || type === '02';
    return true;
  }).filter((row) => row && row.acct_no);
}

function overseasNations(env) {
  const raw = String((env && env.NHPLUG_OVERSEAS_NATIONS) || '200');
  const out = raw.split(',').map((x) => x.trim()).filter((x) => /^\d{3}$/.test(x));
  return out.length ? [...new Set(out)].slice(0, 5) : ['200'];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function buildPortfolio(env) {
  const envName = currentEnvironment(env);
  const accountResponse = await nhCall(env, '/n2/acctinfo', {});
  const accounts = usableAccounts(accountResponse, envName);
  if (!accounts.length) throw new Error('NHPLUG_NO_USABLE_ACCOUNT');

  const result = [];
  for (const account of accounts) {
    const actNo = String(account.acct_no);
    const domestic = await nhCall(env, '/krstock/inquiry/v1/balance', {
      act_no: actNo,
      bnc_bse_cd: '5',
      ltg_aot_dit_cd: '9',
      aet_bse: '2',
      qut_dit_cd: 'UNT',
    });
    await sleep(260);

    const overseas = [];
    for (const nation of overseasNations(env)) {
      const data = await nhCall(env, '/gbstock/inquiry/v1/balance', {
        act_no: actNo,
        qut_iqr_dit_cd: '9',
        fc_sec_trd_nat_cd: nation,
        cur_cd: 'KRW',
        xns_dit_cd: '1',
      });
      overseas.push({ nation, data: sanitize(data) });
      await sleep(260);
    }

    result.push({
      account: maskAccount(actNo),
      accountType: String(account.acct_type || ''),
      domestic: sanitize(domestic),
      overseas,
    });
  }

  return {
    source: 'NHPLUG',
    readOnly: true,
    fetchedAt: new Date().toISOString(),
    environment: envName,
    accounts: result,
    notes: [
      '국내주식·해외주식 잔고 조회만 사용합니다. 주문 엔드포인트는 구현하지 않았습니다.',
      '계좌번호와 인증정보는 응답에서 마스킹/제거합니다.',
      '해외 기본 조회 국가는 미국(200)이며 NHPLUG_OVERSEAS_NATIONS로 추가 가능합니다.',
    ],
  };
}

export async function handlePortfolioLive(request, env, cookieAuthorized = false) {
  if (request.method !== 'GET') return jsonResponse({ error: 'method not allowed' }, 405);
  if (!configured(env)) {
    return jsonResponse({
      error: 'NHPLUG credentials are not configured',
      code: 'NHPLUG_NOT_CONFIGURED',
    }, 503);
  }
  if (!await isPortfolioAuthorized(request, env, cookieAuthorized)) {
    return jsonResponse({ error: 'unauthorized', code: 'PORTFOLIO_UNAUTHORIZED' }, 401);
  }
  try {
    return jsonResponse(await buildPortfolio(env), 200);
  } catch (error) {
    return jsonResponse({
      error: 'NHPLUG portfolio fetch failed',
      code: String(error && error.message ? error.message : error),
    }, 502);
  }
}
