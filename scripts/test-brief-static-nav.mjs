import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../brief.js', import.meta.url), 'utf8');
const calls = [];
const listeners = {};
const elements = new Map();

function el(extra = {}) {
  return Object.assign({
    innerHTML: '',
    textContent: '',
    className: '',
    classList: { contains: () => false, toggle() {}, add() {}, remove() {} },
    appendChild() {},
    querySelectorAll: () => [],
  }, extra);
}

const briefTab = el({
  getAttribute(name) { return name === 'data-v' ? 'brief' : null; },
});
const nav = el({
  querySelector(selector) {
    if (selector === '.tab[data-v="brief"]') return briefTab;
    return null;
  },
  querySelectorAll(selector) { return selector === '.tab' ? [briefTab] : []; },
  addEventListener(type, fn) { listeners[type] = fn; },
});

elements.set('nav', nav);
elements.set('v-brief', el()); // 뷰는 이미 마운트된 상태를 모사한다.
elements.set('brBody', el());
elements.set('brArch', el());
elements.set('brDate', el());
elements.set('brPlayer', el());

const document = {
  readyState: 'complete',
  head: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
  createElement: () => el({ setAttribute() {} }),
  getElementById: (id) => elements.get(id) || null,
  querySelector: (selector) => selector === 'main.wrap' ? el() : null,
  addEventListener() {},
};

const fetch = async (url) => {
  calls.push(String(url));
  const payload = String(url).startsWith('/api/briefs') ? { dates: [] } : { headline: '테스트 브리핑' };
  return { ok: true, status: 200, json: async () => payload };
};

const context = {
  window: {}, document, fetch, URLSearchParams, AbortController,
  Date, Promise, console, setTimeout, clearTimeout, setInterval, clearInterval,
};
vm.runInNewContext(source, context, { filename: 'brief.js' });

if (typeof listeners.click !== 'function') {
  throw new Error('정적 모닝 브리핑 탭에 진입 리스너가 연결되지 않았습니다.');
}

listeners.click({ target: { closest: () => briefTab } });
await new Promise((resolve) => setTimeout(resolve, 0));

if (!calls.some((url) => url.startsWith('/api/brief?part=0'))) {
  throw new Error('정적 탭 클릭 후 오늘 브리핑 API가 호출되지 않았습니다.');
}
if (!calls.some((url) => url === '/api/briefs')) {
  throw new Error('정적 탭 클릭 후 저장본 목록 API가 호출되지 않았습니다.');
}
if (/불러오는 중/.test(elements.get('brArch').innerHTML)) {
  throw new Error('저장본 목록이 초기 로딩 문구에 머물렀습니다.');
}

console.log('brief static-nav regression passed');
