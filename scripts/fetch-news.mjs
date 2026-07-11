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


// ---- Korean daily digest (news_digest.json) ----
// ANTHROPIC_API_KEY 가 env 에 있으면 위 items 를 한글 레이어별 요약으로 변환해 저장.
// 키가 없으면 조용히 스킵(뉴스 수집 자체는 영향 없음). 실패해도 이전 digest 유지.
const DIGEST_OUT = 'news_digest.json';

async function buildDigest(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('digest: ANTHROPIC_API_KEY 없음 → 스킵'); return; }
  const holdings = ['MRVL', 'MU', 'LITE', 'VRT', 'BE', 'TSLA', 'RMBS', '005930'];
  const lines = items
    .filter((it) => it.ticker !== 'MACRO')
    .map((it) => `${it.ticker}|${it.name}|${(it.published || '').slice(0, 10)}|${it.title}`)
    .join('\n');
  const macroLines = items
    .filter((it) => it.ticker === 'MACRO')
    .map((it) => `${it.id}|${it.name}|${(it.published || '').slice(0, 10)}|${it.title}`)
    .join('\n');
  const prompt = `너는 AI 인프라 투자 관측소의 애널리스트다. 아래는 종목별 최근 뉴스 헤드라인이다(티커|이름|날짜|제목).

보유 종목: ${holdings.join(', ')} (나머지는 워치리스트)
레이어: L2 컴퓨트(GPU/ASIC) L3 메모리 L4 패키징/장비 L5 서버 L6 옵티컬 L7 전력/냉각 L8 발전/그리드

다음 JSON 만 출력하라(마크다운·설명 금지):
{"headline":"이번 피드의 축을 ①②③ 형식으로 요약한 결론 한 문장(한글)",
 "groups":[{"title":"보유 종목","items":[{"tk":"MU","nm":"마이크론","s":"핵심 내용 1~2문장 한글 요약"}]},
           {"title":"워치리스트 · L2 컴퓨트","items":[...]},
           {"title":"워치리스트 · L3/L4 메모리·장비","items":[...]},
           {"title":"워치리스트 · L5~L8 서버·옵티컬·전력","items":[...]}],
 "watch":["실적 발표 임박 등 일정 주의 항목(있으면, 최대 4개)"],
 "macro":[{"id":"macro_iran","s":"해당 매크로 토픽의 핵심 흐름 1~2문장 한글 요약"}]}

규칙: 보유 종목은 전부 포함(뉴스 없으면 생략 가능), 워치리스트는 의미 있는 것만. macro는 아래 매크로 헤드라인의 토픽id별 1개씩. 요약은 사실만, 과장 금지, 헤드라인에 없는 내용 추가 금지.

${lines}

[매크로 토픽 헤드라인 (토픽id|토픽명|날짜|제목)]
${macroLines}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error('anthropic HTTP ' + r.status);
    const j = await r.json();
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const digest = JSON.parse(clean);
    if (!digest.headline || !Array.isArray(digest.groups)) throw new Error('digest shape invalid');
    const out = { asOf: new Date().toISOString(), model: 'claude-sonnet-4-6', ...digest };
    fs.writeFileSync(DIGEST_OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`digest: ${DIGEST_OUT} 작성 (groups=${digest.groups.length})`);
  } catch (e) {
    console.log('digest 실패(이전 파일 유지):', e.message);
  }
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
  await buildDigest(items);
}

main().catch((e) => { console.error(e); process.exit(1); });
