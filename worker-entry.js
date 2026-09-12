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
      // 이 문자열은 바깥 inline <script> 안의 document.write() 인자다.
      // HTML parser에는 literal </script>를 숨기되, JS 실행 시 child document에는 정상 </script>가 쓰이도록
      // JS escape인 <\/script>를 사용한다. 뒤따르던 개행도 제거해 단일따옴표 문자열을 깨뜨리지 않는다.
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

  // index.html의 vcOpenTab document.write() 문자열 안에 literal </script>가 들어가면
  // 브라우저 HTML parser가 바깥 inline script를 조기 종료해 이후 JS를 본문 텍스트로 노출한다.
  // child document의 script 종료 태그를 JS escape 형태로 바꾸고 줄바꿈까지 제거해 parser/JS 양쪽을 안전하게 만든다.
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
      el.append('<script src="/portfolio-history-ui.js?v=20260912-03" defer></scr' + 'ipt>', { html: true });
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
