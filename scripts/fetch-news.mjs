// Daily news headline collector for the 初入 Observatory · Alpha Map.
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress,
// same as fetch-prices.mjs. Source of truth for tickers is the C array in
// index.html. Pulls Google News RSS per holding/candidate into news.json.
//
// IMPORTANT: this is a RAW FEED collector, not a scorer. It never touches
// alpha.json / earnings.json / judgment.json / SIGNAL_LOG. Deciding signal
// vs noise — and whether a headline is big enough to move a number — stays
// with the operator/Claude (see OPS.md §2 "수시" + the daily intake loop).
//
// news.json is repo-only review material: it is in .assetsignore and
// paths-ignored in deploy.yml, so the daily commit never redeploys the site.

import fs from 'node:fs';

const HTML = 'index.html';
const OUT = 'news.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PER_TICKER = 4;     // keep newest N headlines per name
const PRUNE_DAYS = 10;    // drop items older than this
const MAX_ITEMS = 150;    // hard cap on the accumulated feed

// ETF baskets have low single-name news value → skip.
const SKIP = (c) => /KODEX|ETF/i.test(c.name);

// Disambiguate awkward / generic names for a cleaner search query.
const QOVERRIDE = {
  ceg: 'Constellation Energy', oklo: 'Oklo nuclear SMR', be: 'Bloom Energy',
  sec: '삼성전자 HBM', mu: 'Micron 마이크론', tsla: 'Tesla 테슬라',
  harm: 'Harmonic Drive humanoid', alch: 'Alchip ASIC', sem: '삼성전기',
  ddk: '대덕전자', vicr: 'Vicor power', cohr: 'Coherent optical',
};

function readCandidates() {
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/const C=(\[[\s\S]*?\n\];)/);
  if (!m) throw new Error('C array not found in index.html');
  const C = eval(m[1].replace(/;\s*$/, '')); // literals only → safe
  return C.map((c) => ({ id: c.id, ticker: c.ticker, mkt: c.mkt, name: c.name }));
}

function newsQuery(c) {
  if (QOVERRIDE[c.id]) return QOVERRIDE[c.id];
  return c.name.replace(/\(.*?\)/g, '').replace(/\s+plays/i, '').trim();
}

function feedUrl(c) {
  const q = encodeURIComponent(newsQuery(c) + ' when:7d');
  const loc = (c.mkt === 'KOSPI' || c.mkt === 'KOSDAQ')
    ? 'hl=ko&gl=KR&ceid=KR:ko'
    : 'hl=en-US&gl=US&ceid=US:en';
  return `https://news.google.com/rss/search?q=${q}&${loc}`;
}

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseRSS(xml) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const t = (b.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const l = (b.match(/<link>([\s\S]*?)<\/link>/) || [])[1];
    const p = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    const s = (b.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1];
    if (!t || !l) continue;
    const d = p ? new Date(p) : null;
    out.push({
      title: decode(t),
      link: decode(l),
      published: d && !isNaN(d) ? d.toISOString() : null,
      source: s ? decode(s) : null,
    });
  }
  return out;
}

async function fetchFeed(c) {
  const r = await fetch(feedUrl(c), { headers: UA });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const xml = await r.text();
  return parseRSS(xml).slice(0, PER_TICKER);
}

async function main() {
  const MACRO_TOPICS = [
    { id: 'macro_iran', ticker: 'MACRO', name: '이란 호르무즈 해협', mkt: 'KOSPI' },
    { id: 'macro_fomc', ticker: 'MACRO', name: 'FOMC 연준 기준금리', mkt: 'KOSPI' },
    { id: 'macro_tariff', ticker: 'MACRO', name: '미국 관세 무역협상', mkt: 'KOSPI' },
  ];
  const candidates = [...readCandidates().filter((c) => !SKIP(c)), ...MACRO_TOPICS];

  let prev = { items: [] };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }

  const now = new Date();
  const collected = [];
  let ok = 0, fail = 0;
  for (const c of candidates) {
    try {
      const items = await fetchFeed(c);
      for (const it of items) {
        collected.push({
          id: c.id, ticker: c.ticker, name: c.name,
          title: it.title, link: it.link,
          published: it.published || now.toISOString(),
          source: it.source,
        });
      }
      ok++;
      console.log(`OK   ${c.id.padEnd(8)} ${String(items.length)} items`);
    } catch (e) {
      fail++;
      console.log(`FAIL ${c.id.padEnd(8)} ${e.message}`);
    }
    await sleep(400);
  }

  // merge prev + new, dedupe by link, prune old, sort newest-first, cap.
  const cutoff = now.getTime() - PRUNE_DAYS * 864e5;
  const byLink = new Map();
  for (const it of [...collected, ...(prev.items || [])]) {
    if (!it || !it.link) continue;
    const t = it.published ? new Date(it.published).getTime() : 0;
    if (t && t < cutoff) continue;
    if (!byLink.has(it.link)) byLink.set(it.link, it);
  }
  const items = [...byLink.values()]
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, MAX_ITEMS);

  const payload = {
    asOf: now.toISOString(),
    source: 'Google News RSS · 보유/후보 종목별 (원시 피드, 미선별)',
    note: '신호/소음 판단과 SIGNAL_LOG 반영은 사람/Claude의 몫. 이 파일은 채점·차트에 쓰이지 않는 검토용 원시 헤드라인. 링크↑·종목별 최신 일부만 누적, 10일 경과·중복 자동 제거.',
    count: items.length,
    items,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nDone: ${ok} ok, ${fail} failed, ${items.length} items in ${OUT}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
