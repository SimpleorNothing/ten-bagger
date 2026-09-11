import hotfixWorker from './worker-hotfix.js';
import portfolioWorker from './worker.js';

const ORACLE_NESTED_SCRIPT_RE = /<script defer src="oracle-release-card\.js\?v=[^"]+"><\/script>\n<\/body><\/html>'\);/;

function repairMalformedIndexHtml(html) {
  if (!ORACLE_NESTED_SCRIPT_RE.test(html)) return { html, repaired: false };
  return {
    html: html.replace(ORACLE_NESTED_SCRIPT_RE, (match) => match.replace('</script>', "</scr'+'ipt>")),
    repaired: true,
  };
}

async function injectPortfolioHistoryUi(request, response) {
  if (!response || !response.ok) return response;
  const url = new URL(request.url);
  if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/index.html')) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // index.html의 vcOpenTab document.write() 문자열 안에 literal </script>가 들어가면
  // 브라우저 HTML parser가 바깥 inline script를 조기 종료해 이후 JS를 본문 텍스트로 노출한다.
  // asset 자체를 바꾸지 못한 배포에서도 custom domain 응답 단계에서 안전한 분할 문자열로 복구한다.
  const source = await response.text();
  const fixed = repairMalformedIndexHtml(source);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  if (fixed.repaired) headers.set('x-alpha-index-repair', 'nested-script');
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
    repairApplied: false,
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
    state.sourceHadNestedScript = ORACLE_NESTED_SCRIPT_RE.test(source);
    const fixed = repairMalformedIndexHtml(source);
    state.repairApplied = fixed.repaired;
    const stillDangerous = ORACLE_NESTED_SCRIPT_RE.test(fixed.html);
    const hasSafeSplit = fixed.html.includes("</scr'+'ipt>");
    state.repairedNestedScriptSafe = !stillDangerous && (!state.sourceHadNestedScript || hasSafeSplit);
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
    indexHtmlRepair: 'nested-document-write-script',
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
