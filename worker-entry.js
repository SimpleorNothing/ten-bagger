import hotfixWorker from './worker-hotfix.js';
import portfolioWorker from './worker.js';

async function injectPortfolioHistoryUi(request, response) {
  if (!response || !response.ok) return response;
  const url = new URL(request.url);
  if ((request.method !== 'GET' && request.method !== 'HEAD') || (url.pathname !== '/' && url.pathname !== '/index.html')) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
  return new HTMLRewriter()
    .on('body', { element(el) {
      el.append('<script src="/portfolio-history-ui.js?v=20260912-01" defer></scr' + 'ipt>', { html: true });
    } })
    .transform(response);
}

async function portfolioHistoryProbe(request, env) {
  let uiAsset = false;
  if (env?.ASSETS) {
    try {
      const url = new URL(request.url);
      url.pathname = '/portfolio-history-ui.js';
      url.search = '';
      const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
      if (response.ok) {
        const text = await response.text();
        uiAsset = text.includes('portfolioHistoryDownload') && text.includes('자산현황 다운로드');
      }
    } catch (_) {}
  }
  const storeBound = !!env?.MEMO_BUCKET;
  return new Response(JSON.stringify({
    ok: uiAsset && storeBound,
    uiAsset,
    storeBound,
    historyApi: '/api/portfolio/history',
    scheduleBackend: 'github-actions',
    scheduleUtc: '0 8 * * *',
    scheduleKst: '17:00',
    timezone: 'Asia/Seoul',
  }), {
    status: uiAsset && storeBound ? 200 : 503,
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
