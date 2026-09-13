const NAVER_UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const PENSION_LABEL_RE = /^(?:DC|DC연금|퇴직연금|개인형IRP|IRP)$/i;

function numberValue(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function compactDate(value) { return String(value || '').replace(/-/g, ''); }

function addDays(date, delta) {
  const d = new Date(`${date}T12:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(d);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00+09:00`) - Date.parse(`${a}T00:00:00+09:00`)) / 86400000);
}

export function isManualPensionAccount(account) {
  return String(account?.dataSource || '') === 'MANUAL_CAPTURE' && PENSION_LABEL_RE.test(String(account?.label || ''));
}

export function hasSameDayManualPensionCapture(accounts, snapshotDate) {
  return (Array.isArray(accounts) ? accounts : []).some((account) => isManualPensionAccount(account) && String(account?.asOf || '') === snapshotDate);
}

function pensionRows(account) {
  return Array.isArray(account?.domestic?.Output_1) ? account.domestic.Output_1 : [];
}

export async function fetchNaverClose(code, snapshotDate, fetchFn = fetch) {
  const start = compactDate(addDays(snapshotDate, -12));
  const end = compactDate(snapshotDate);
  const url = `https://api.finance.naver.com/siseJson.naver?symbol=${encodeURIComponent(code)}&requestType=1&startTime=${start}&endTime=${end}&timeframe=day`;
  const response = await fetchFn(url, { headers: NAVER_UA });
  if (!response.ok) throw new Error(`PENSION_PRICE_HTTP_${response.status}:${code}`);
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text.replace(/'/g, '"')); }
  catch { throw new Error(`PENSION_PRICE_PARSE:${code}`); }
  const rows = (Array.isArray(parsed) ? parsed.slice(1) : []).filter((row) => Array.isArray(row) && row.length >= 5 && row[4] != null);
  if (!rows.length) throw new Error(`PENSION_PRICE_EMPTY:${code}`);
  const row = rows[rows.length - 1];
  const marketDateRaw = String(row[0] || '').replace(/[^0-9]/g, '');
  const marketDate = marketDateRaw.length === 8 ? `${marketDateRaw.slice(0,4)}-${marketDateRaw.slice(4,6)}-${marketDateRaw.slice(6,8)}` : '';
  const price = numberValue(row[4]);
  if (!marketDate || price == null || price <= 0) throw new Error(`PENSION_PRICE_INVALID:${code}`);
  const age = daysBetween(marketDate, snapshotDate);
  if (age < 0 || age > 10) throw new Error(`PENSION_PRICE_STALE:${code}:${marketDate}`);
  return { code, price, marketDate, source:'NAVER_CLOSE' };
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export async function applyPensionDailyValuation(payload, snapshotDate, fetchFn = fetch) {
  const result = clone(payload || {});
  const accounts = Array.isArray(result.accounts) ? result.accounts : [];
  const quoteCache = new Map();

  async function quote(code) {
    if (!quoteCache.has(code)) quoteCache.set(code, fetchNaverClose(code, snapshotDate, fetchFn));
    return quoteCache.get(code);
  }

  for (const account of accounts) {
    if (!isManualPensionAccount(account)) continue;
    const captureDate = String(account.asOf || '');
    account.quantityAsOf = captureDate || null;
    account.valuationDate = snapshotDate;

    if (captureDate === snapshotDate) {
      account.valuationMode = 'CAPTURE_EXACT';
      account.valuationSource = 'USER_CAPTURE';
      account.valuationPriceDate = snapshotDate;
      continue;
    }

    const rows = pensionRows(account);
    let total = 0;
    const marketDates = [];
    for (const row of rows) {
      const quantity = numberValue(row?.itg_bnc_qty ?? row?.rsdl_qty ?? row?.qty);
      const code = String(row?.iem_cd || '').trim();
      if (!quantity) {
        row.eal_amt = 0;
        continue;
      }
      if (!code) throw new Error(`PENSION_POSITION_CODE_MISSING:${account.label || 'pension'}`);
      let q;
      try {
        q = await quote(code);
      } catch (error) {
        const previousPrice = numberValue(row?.now_pr ?? row?.end_pr);
        if (previousPrice == null || previousPrice <= 0) throw error;
        q = { code, price:previousPrice, marketDate:captureDate || snapshotDate, source:'PREVIOUS_VALID_PRICE' };
      }
      const evaluationAmount = Math.round(quantity * q.price);
      row.now_pr = q.price;
      row.eal_amt = evaluationAmount;
      row.valuation_price_date = q.marketDate;
      row.valuation_source = q.source;
      const purchaseAmount = numberValue(row.pchs_amt);
      if (purchaseAmount != null && purchaseAmount > 0) {
        row.eal_pls_amt = evaluationAmount - purchaseAmount;
        row.pft_rt = +(row.eal_pls_amt / purchaseAmount * 100).toFixed(2);
      } else {
        row.eal_pls_amt = null;
        row.pft_rt = null;
      }
      total += evaluationAmount;
      marketDates.push(q.marketDate);
    }
    if (!account.domestic || typeof account.domestic !== 'object') account.domestic = {};
    const summary = Array.isArray(account.domestic.Output_0) ? (account.domestic.Output_0[0] ||= {}) : (account.domestic.Output_0 ||= {});
    summary.tot_evlu_amt = total;
    summary.cash_status = 'not-visible-in-latest-capture';
    account.valuationMode = 'QUANTITY_X_DAILY_PRICE';
    const sources = new Set(rows.map((row) => String(row?.valuation_source || '')).filter(Boolean));
    account.valuationSource = sources.has('PREVIOUS_VALID_PRICE') ? 'NAVER_CLOSE_OR_PREVIOUS_VALID_PRICE' : 'NAVER_CLOSE';
    account.valuationPriceDate = marketDates.length ? marketDates.sort().at(-1) : null;
  }
  return result;
}

export function snapshotNeedsSameDayCaptureRefresh(stored, currentAccounts, snapshotDate) {
  if (!stored || !hasSameDayManualPensionCapture(currentAccounts, snapshotDate)) return false;
  const storedAccounts = Array.isArray(stored?.snapshot?.accounts) ? stored.snapshot.accounts : [];
  return currentAccounts.some((current) => {
    if (!isManualPensionAccount(current) || String(current.asOf || '') !== snapshotDate) return false;
    const label = String(current.label || '');
    const previous = storedAccounts.find((a) => String(a?.label || '') === label);
    return !previous || previous.valuationMode !== 'CAPTURE_EXACT' || String(previous.quantityAsOf || previous.asOf || '') !== snapshotDate;
  });
}
