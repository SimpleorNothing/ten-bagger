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

export default {
  async fetch(request, env, ctx) {
    const response = await hotfixWorker.fetch(request, env, ctx);
    return injectPortfolioHistoryUi(request, response);
  },

  async scheduled(event, env, ctx) {
    if (portfolioWorker && typeof portfolioWorker.scheduled === 'function') {
      return portfolioWorker.scheduled(event, env, ctx);
    }
  },
};
