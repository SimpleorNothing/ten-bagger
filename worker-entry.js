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
    new RegExp(`(<script\\b[^>]*\\bsrc=["']oracle-release-card\\.js\\?v=[^"']+["'][^>]*>)<\\/script>`, 'gi'),
    (_match, openingTag) => {
      replacements += 1;
      // 이 문자열은 바깥 inline <script> 안의 document.write() 인자다.
      // HTML parser가 literal </script>를 바깥 script 종료로 해석하지 못하도록 분할한다.
      return `${openingTag}</scr'+'ipt>`;
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

  // index.html의 vcOpenTab document.write() 문자열 안에 literal </script>가 들어가면
  // 브라우저 HTML parser가 바깥 inline script를 조기 종료해 이후 JS를 본문 텍스트로 노출한다.
  // oracle-release-card nested script 태그를 위치/개수와 무관하게 모두 안전한 분할 문자열로 복구한다.
  const source = await response.text();
  const fixed = repairMalformedIndexHtml(source);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  if (fixed.repaired) headers.set('x-alpha-index-repair', `nested-script:${fixed.replacements}`);
  const repairedResponse = new Response(fixed.html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on('body', { element(el) {
      el.append('<script src="/portfolio-history-ui.js?v=20260912-02" defer></scr' + 'ipt>', { html: true });
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
    const hasSafeSplit = fixed.html.includes("</scr'+'ipt>");
    state.repairedNestedScriptSafe = state.remainingDangerousNestedScriptCount === 0 && (!state.sourceHadNestedScript || hasSafeSplit);
    // 향후 index.html 원본 자체가 고쳐지면 repairApplied=false여도 정상으로 인정한다.
    state.indexRepairOk = state.repairedNestedScriptSafe;
    return state;
  } catch (_) {
    return state;
  }
}

async function portfolioHistoryProbe(request, env) {
  let uiAsset = false;
  let compactUi = false;
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
      }
    } catch (_) {}
  }
  const indexRepair = await inspectIndexRepair(request, env);
  const storeBound = !!env?.MEMO_BUCKET;
  const ok = uiAsset && compactUi && storeBound && indexRepair.indexRepairOk;
  return new Response(JSON.stringify({
    ok,
    uiAsset,
    compactUi,
    storeBound,
    ...indexRepair,
    historyApi: '/api/portfolio/history',
    scheduleBackend: 'github-actions',
    scheduleUtc: '0 8 * * *',
    scheduleKst: '17:00',
    timezone: 'Asia/Seoul',
    indexHtmlRepair: 'nested-document-write-script-global',
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
