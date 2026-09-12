import hotfixWorker from './worker-hotfix.js';
import portfolioWorker from './worker.js';

const ORACLE_NESTED_SCRIPT_SOURCE = String.raw`<script\b[^>]*\bsrc=["']oracle-release-card\.js\?v=[^"']+["'][^>]*><\/script>`;

function countDangerousOracleNestedScripts(html) {
  const matches = String(html || '').match(new RegExp(ORACLE_NESTED_SCRIPT_SOURCE, 'gi'));
  return matches ? matches.length : 0;
}

function repairMalformedIndexHtml(html) {
  let replacements = 0;
  const fixed = String(html || '').replace(
    new RegExp(`(<script\\b[^>]*\\bsrc=["']oracle-release-card\\.js\\?v=[^"']+["'][^>]*>)<\\/script>\\s*(<\\/body>)`, 'gi'),
    (_match, openingTag, bodyClose) => {
      replacements += 1;
      return `${openingTag}<\\/script>${bodyClose}`;
    },
  );
  return { html: fixed, repaired: replacements > 0, replacements };
}

async function injectPortfolioHistoryUi(request, response) {
  if (!response || !response.ok) return response;
  const url = new URL(request.url);
  if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/index.html')) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const source = await response.text();
  const fixed = repairMalformedIndexHtml(source);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  headers.set('pragma', 'no-cache');
  headers.set('expires', '0');
  if (fixed.repaired) headers.set('x-alpha-index-repair', `nested-script-js-escape:${fixed.replacements}`);
  const repairedResponse = new Response(fixed.html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on('body', { element(el) {
      el.append('<script src="/portfolio-history-ui.js?v=20260912-04" defer></scr' + 'ipt>', { html: true });
      el.append('<script src="/portfolio-intelligence-ui.js?v=20260912-01" defer></scr' + 'ipt>', { html: true });
    } })
    .transform(repairedResponse);
}

async function inspectIndexRepair(request, env) {
  const state = {
    indexAsset: false,
    sourceHadNestedScript: false,
    sourceDangerousNestedScriptCount: 0,
    repairApplied: false,
    repairReplacementCount: 0,
    remainingDangerousNestedScriptCount: 0,
    safeJsEscapedNestedScript: false,
    repairedNestedScriptSafe: false,
    indexRepairOk: false,
  };
  if (!env?.ASSETS) return state;
  try {
    const url = new URL(request.url);
    url.pathname = '/index.html';
    url.search = '';
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    if (!response.ok) return state;
    state.indexAsset = true;
    const source = await response.text();
    state.sourceDangerousNestedScriptCount = countDangerousOracleNestedScripts(source);
    state.sourceHadNestedScript = state.sourceDangerousNestedScriptCount > 0;
    const fixed = repairMalformedIndexHtml(source);
    state.repairApplied = fixed.repaired;
    state.repairReplacementCount = fixed.replacements;
    state.remainingDangerousNestedScriptCount = countDangerousOracleNestedScripts(fixed.html);
    state.safeJsEscapedNestedScript =
      fixed.html.includes('<\\/script></body></html>') &&
      !fixed.html.includes("</scr'+'ipt>");
    state.repairedNestedScriptSafe =
      state.remainingDangerousNestedScriptCount === 0 &&
      (!state.sourceHadNestedScript || state.safeJsEscapedNestedScript);
    state.indexRepairOk = state.repairedNestedScriptSafe;
    return state;
  } catch (_) {
    return state;
  }
}

async function portfolioHistoryProbe(request, env) {
  let uiAsset = false;
  let compactUi = false;
  let accountScopedUi = false;
  let intelligenceUiAsset = false;
  if (env?.ASSETS) {
    try {
      const url = new URL(request.url);
      url.pathname = '/portfolio-history-ui.js';
      url.search = '';
      const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
      if (response.ok) {
        const text = await response.text();
        uiAsset = text.includes('portfolioHistoryDownload') && text.includes('자산현황 다운로드');
        compactUi = text.includes('<th>현재가</th><th>수량</th><th>평가금액</th><th>수익률</th>') && !text.includes('<th>평가손익</th>');
        accountScopedUi = text.includes("document.getElementById('v-account')") && text.includes('accountView.appendChild(section)') && !text.includes('main.parentNode.insertBefore(section,main.nextSibling)');
      }
    } catch (_) {}
    try {
      const url = new URL(request.url);
      url.pathname = '/portfolio-intelligence-ui.js';
      url.search = '';
      const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
      if (response.ok) {
        const text = await response.text();
        intelligenceUiAsset = text.includes('portfolioIntelligence') && text.includes('/api/portfolio/activity') && text.includes('중복노출');
      }
    } catch (_) {}
  }
  const indexRepair = await inspectIndexRepair(request, env);
  const storeBound = !!env?.MEMO_BUCKET;
  const ok = uiAsset && compactUi && accountScopedUi && intelligenceUiAsset && storeBound && indexRepair.indexRepairOk;
  return new Response(JSON.stringify({
    ok,
    uiAsset,
    compactUi,
    accountScopedUi,
    intelligenceUiAsset,
    storeBound,
    ...indexRepair,
    historyApi: '/api/portfolio/history',
    activityApi: '/api/portfolio/activity',
    scheduleBackend: 'github-actions',
    scheduleUtc: '0 8 * * *',
    scheduleKst: '17:00',
    timezone: 'Asia/Seoul',
    indexHtmlRepair: 'nested-document-write-js-escape',
  }), {
    status: ok ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/__portfolio_history_probe') {
      return portfolioHistoryProbe(request, env);
    }
    const response = await hotfixWorker.fetch(request, env, ctx);
    return injectPortfolioHistoryUi(request, response);
  },

  async scheduled(event, env, ctx) {
    if (portfolioWorker && typeof portfolioWorker.scheduled === 'function') {
      return portfolioWorker.scheduled(event, env, ctx);
    }
  },
};
