import { derivePortfolioApiToken, handlePortfolioLive } from './nhplug-portfolio.js';

const HISTORY_PREFIX = 'portfolio-history/';
const MAX_LIST_PAGES = 10;
const MAX_LIST_ITEMS = 5000;
const STORAGE_SCHEMA_VERSION = 2;
const STORAGE_POLICY = 'full-sanitized-source: preserve all NHPLUG Output_0/Output_1 fields except account/customer identifiers and credentials';

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      ...extraHeaders,
    },
  });
}

export function kstDate(value = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function historyKey(date) {
  return `${HISTORY_PREFIX}${date}.json`;
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ''));
}

function numberValue(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function sanitizePortfolioSnapshot(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizePortfolioSnapshot(item));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^(?:account|acct_no|act_no|account_no|cust_no|customer_no|rrn|jumin|email|phone|tel|token|secret|appkey|app_key|idMasked)$/i.test(key)) continue;
    out[key] = sanitizePortfolioSnapshot(item);
  }
  return out;
}

function domesticRows(account) {
  return Array.isArray(account?.domestic?.Output_1) ? account.domestic.Output_1 : [];
}

function overseasRows(account) {
  const result = [];
  for (const market of Array.isArray(account?.overseas) ? account.overseas : []) {
    for (const row of Array.isArray(market?.data?.Output_1) ? market.data.Output_1 : []) {
      result.push({ market, row });
    }
  }
  return result;
}

export function flattenPortfolioHoldings(snapshot) {
  const rows = [];
  for (const account of Array.isArray(snapshot?.accounts) ? snapshot.accounts : []) {
    const label = String(account?.label || account?.accountType || '계좌');
    const dataSource = String(account?.dataSource || '');
    for (const row of domesticRows(account)) {
      rows.push({
        account: label,
        dataSource,
        market: 'KR',
        code: String(row?.iem_cd || ''),
        name: String(row?.iem_nm || ''),
        quantity: numberValue(row?.itg_bnc_qty ?? row?.rsdl_qty ?? row?.qty),
        purchasePrice: numberValue(row?.phs_pr ?? row?.avg_phs_pr),
        currentPrice: numberValue(row?.now_pr ?? row?.end_pr),
        evaluationAmountKrw: numberValue(row?.eal_amt ?? row?.krw_eal_amt),
        profitLossKrw: numberValue(row?.eal_pls_amt ?? row?.krw_eal_pls_amt),
        returnPct: numberValue(row?.pft_rt ?? row?.eal_pft_rt1 ?? row?.eal_pft_rt),
      });
    }
    for (const { market, row } of overseasRows(account)) {
      rows.push({
        account: label,
        dataSource,
        market: String(row?.fc_sec_trd_nat_nm || market?.nation || 'OVERSEAS'),
        code: String(row?.iem_cd || ''),
        name: String(row?.iem_nm || ''),
        quantity: numberValue(row?.cns_bse_bnc_qty ?? row?.qty),
        purchasePrice: numberValue(row?.fc_phs_uit_pr ?? row?.phs_uit_pr ?? row?.krw_avg_phs_pr),
        currentPrice: numberValue(row?.fc_sec_end_pr ?? row?.end_pr),
        evaluationAmountKrw: numberValue(row?.krw_eal_amt ?? row?.eal_amt),
        profitLossKrw: numberValue(row?.krw_eal_pls_amt ?? row?.eal_pls_amt),
        returnPct: numberValue(row?.eal_pft_rt1 ?? row?.eal_pft_rt ?? row?.pft_rt),
      });
    }
  }
  return rows;
}

export function summarizePortfolioSnapshot(snapshot) {
  const holdings = flattenPortfolioHoldings(snapshot);
  const holdingValueKrw = holdings.reduce((sum, row) => sum + (Number.isFinite(row.evaluationAmountKrw) ? row.evaluationAmountKrw : 0), 0);
  return {
    accountCount: Array.isArray(snapshot?.accounts) ? snapshot.accounts.length : 0,
    holdingCount: holdings.length,
    holdingValueKrw,
    cashIncluded: false,
  };
}

async function buildSanitizedLiveSnapshot(env) {
  const response = await handlePortfolioLive(
    new Request('https://simpleornothing.com/api/portfolio/live', { method: 'GET' }),
    env,
    true,
  );
  const payload = await response.json();
  if (!response.ok || !payload || payload.source !== 'NHPLUG' || !Array.isArray(payload.accounts)) {
    throw new Error(`portfolio live fetch failed: HTTP ${response.status}`);
  }
  return sanitizePortfolioSnapshot(payload);
}

export async function saveDailyPortfolioSnapshot(env, scheduledTime = Date.now(), reason = 'scheduled-17-kst') {
  if (!env?.MEMO_BUCKET) throw new Error('MEMO_BUCKET not configured');
  const snapshotDate = kstDate(scheduledTime);
  const payload = await buildSanitizedLiveSnapshot(env);
  const savedAt = new Date().toISOString();
  const summary = summarizePortfolioSnapshot(payload);
  const stored = {
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    storagePolicy: STORAGE_POLICY,
    snapshotDate,
    savedAt,
    reason,
    summary,
    // DB에는 화면 표시용 축약값이 아니라 NHPLUG가 반환한 모든 비민감 필드를 그대로 저장한다.
    // 예: 매입가/매입금액/평가손익/매도가능수량/미결제수량/수수료/세금/손익분기매입가/
    // 매입환율/현재환율/국가/통화/대출일/만기일과 Output_0 계좌 요약 필드.
    snapshot: payload,
  };
  await env.MEMO_BUCKET.put(historyKey(snapshotDate), JSON.stringify(stored), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      snapshotDate,
      savedAt,
      holdingCount: String(summary.holdingCount),
      accountCount: String(summary.accountCount),
      holdingValueKrw: String(summary.holdingValueKrw),
      cashIncluded: 'false',
      storageSchemaVersion: String(STORAGE_SCHEMA_VERSION),
      detailStorage: 'full-sanitized-source',
    },
  });
  return stored;
}

async function listHistory(env) {
  if (!env?.MEMO_BUCKET) return [];
  const items = [];
  let cursor;
  for (let page = 0; page < MAX_LIST_PAGES && items.length < MAX_LIST_ITEMS; page++) {
    const result = await env.MEMO_BUCKET.list({
      prefix: HISTORY_PREFIX,
      limit: 1000,
      cursor,
      include: ['customMetadata'],
    });
    for (const object of result.objects || []) {
      const match = /^portfolio-history\/(\d{4}-\d{2}-\d{2})\.json$/.exec(object.key || '');
      if (!match) continue;
      const meta = object.customMetadata || {};
      items.push({
        date: match[1],
        savedAt: meta.savedAt || (object.uploaded ? new Date(object.uploaded).toISOString() : ''),
        holdingCount: numberValue(meta.holdingCount) ?? 0,
        accountCount: numberValue(meta.accountCount) ?? 0,
        holdingValueKrw: numberValue(meta.holdingValueKrw) ?? 0,
        cashIncluded: false,
        storageSchemaVersion: numberValue(meta.storageSchemaVersion) ?? 1,
        detailStorage: meta.detailStorage || 'legacy-full-snapshot',
      });
    }
    if (!result.truncated) break;
    cursor = result.cursor;
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

async function getStoredHistory(env, date) {
  if (!env?.MEMO_BUCKET || !isValidDate(date)) return null;
  const object = await env.MEMO_BUCKET.get(historyKey(date));
  if (!object) return null;
  try {
    const parsed = JSON.parse(await object.text());
    return sanitizePortfolioSnapshot(parsed);
  } catch {
    return null;
  }
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function historyCsv(stored) {
  const rows = flattenPortfolioHoldings(stored?.snapshot || {});
  const header = ['기준일', '계좌', '데이터원', '시장', '종목코드', '종목명', '수량', '매입가', '현재가', '평가금액(원)', '평가손익(원)', '수익률(%)'];
  const body = rows.map((row) => [
    stored.snapshotDate,
    row.account,
    row.dataSource,
    row.market,
    row.code,
    row.name,
    row.quantity,
    row.purchasePrice,
    row.currentPrice,
    row.evaluationAmountKrw,
    row.profitLossKrw,
    row.returnPct,
  ].map(csvCell).join(','));
  return '\uFEFF' + [header.map(csvCell).join(','), ...body].join('\r\n');
}

async function tokenAuthorized(request, env) {
  const got = request.headers.get('x-portfolio-api-token') || '';
  if (!got || !env?.NHPLUG_APP_SECRET) return false;
  const expected = await derivePortfolioApiToken(env.NHPLUG_APP_SECRET);
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function snapshotReason(request) {
  const value = String(request.headers.get('x-portfolio-history-reason') || 'api-snapshot').trim();
  return /^(?:scheduled-17-kst|manual|deploy-seed-if-missing|api-snapshot)$/.test(value) ? value : 'api-snapshot';
}

export async function handlePortfolioHistory(request, env, cookieAuthorized = false) {
  const url = new URL(request.url);
  const apiAuthorized = await tokenAuthorized(request, env);
  if (!cookieAuthorized && !apiAuthorized) return jsonResponse({ error: 'unauthorized' }, 401);
  if (!env?.MEMO_BUCKET) return jsonResponse({ error: 'portfolio history store unavailable' }, 503);

  if (request.method === 'POST' && url.pathname === '/api/portfolio/history/snapshot') {
    try {
      const date = kstDate();
      if (url.searchParams.get('ifMissing') === '1') {
        const existing = await getStoredHistory(env, date);
        if (existing) {
          return jsonResponse({ ok: true, skipped: true, date, savedAt: existing.savedAt || '', summary: existing.summary || null });
        }
      }
      const stored = await saveDailyPortfolioSnapshot(env, Date.now(), snapshotReason(request));
      return jsonResponse({ ok: true, skipped: false, date: stored.snapshotDate, savedAt: stored.savedAt, summary: stored.summary, storageSchemaVersion: stored.storageSchemaVersion });
    } catch (error) {
      return jsonResponse({ error: String(error?.message || error || 'snapshot failed') }, 502);
    }
  }

  if (request.method !== 'GET') return jsonResponse({ error: 'method not allowed' }, 405);
  if (url.pathname === '/api/portfolio/history') {
    try {
      const dates = await listHistory(env);
      return jsonResponse({ timezone: 'Asia/Seoul', scheduledAt: '17:00', scheduleBackend: 'github-actions', storagePolicy: STORAGE_POLICY, dates });
    } catch (error) {
      return jsonResponse({ error: String(error?.message || error || 'history list failed') }, 500);
    }
  }

  const match = /^\/api\/portfolio\/history\/(\d{4}-\d{2}-\d{2})(\.csv|\.json)?$/.exec(url.pathname);
  if (!match) return jsonResponse({ error: 'not found' }, 404);
  const date = match[1];
  const format = match[2] || '';
  const stored = await getStoredHistory(env, date);
  if (!stored) return jsonResponse({ error: 'snapshot not found', date }, 404);

  if (format === '.csv') {
    return new Response(historyCsv(stored), {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="portfolio-${date}.csv"`,
        'cache-control': 'no-store',
      },
    });
  }
  const headers = format === '.json'
    ? { 'content-disposition': `attachment; filename="portfolio-${date}.json"` }
    : {};
  return jsonResponse(stored, 200, headers);
}
