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
// news.json = 사이트가 매 로딩마다 통째로 받는 파일 → 반드시 상한을 둔다(모바일 페이로드).
// 삭제가 아니라 '창(window)'일 뿐이고, 잘려나간 기사는 news_archive.json 에 영구 보존된다.
const PRUNE_DAYS = 95;         // 사이트 표시 창(약 3개월)
const SITE_PER_TICKER = 5;    // 사이트 표시 상한: 종목당 최신 5건 (카드 렌더와 동일)
const MAX_ITEMS = 2000;       // 사이트 파일 하드캡
const ARCHIVE_OUT = 'news_archive.json';  // 영구 보존(프루닝 없음·사이트 미배포)
const SHARD_DIR = 'archive';              // 종목별 3개월 창 샤드('더 보기' 온디맨드 로드용·사이트 배포)

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


// ---- 기사별 두 점 정리 (items[].a = 명사형 요약, items[].w = 의미·주가 영향) ----
// 사이트 종목 카드는 "일자 + 요약" 행으로 렌더한다(기사 제목 미표시).
// 요약은 아카이브에 영구 보존되고, a 가 없는 신규 기사만 증분 생성한다
// → 과거치를 매일 재요약하지 않는다(토큰·비용 방어).
const ART_BATCH = 60;      // 1회 호출당 기사 수
const ART_MAX_NEW = 240;   // 1회 실행당 신규 요약 상한

async function summarizeArticles(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('arts: ANTHROPIC_API_KEY 없음 → 스킵'); return; }
  const todo = items.filter((it) => it.ticker !== 'MACRO' && (!it.a || it.w === undefined)).slice(0, ART_MAX_NEW);
  if (!todo.length) { console.log('arts: 신규 기사 없음'); return; }
  let done = 0;
  for (let i = 0; i < todo.length; i += ART_BATCH) {
    const batch = todo.slice(i, i + ART_BATCH);
    const lines = batch
      .map((it, n) => `${n}|${it.ticker}|${it.name}|${(it.published || '').slice(0, 10)}|${it.title}`)
      .join('\n');
    const prompt = `너는 AI 인프라 투자 관측소의 애널리스트다. 아래는 추적 종목의 뉴스 기사다(번호|티커|종목명|날짜|제목).
각 기사를 **두 점(a·w)** 으로 정리하라.

a = 기사 내용 요약
- 제목을 그대로 번역·복사하지 말고, 무엇이 일어났는가를 압축한다.
- **반드시 명사형으로 종결한다.** ("~했다/~됐다" 금지 → "~ 급락", "~ 계약 체결", "~ 공개", "~ 전망 제기")
- 30~70자. 사실만. 제목에 없는 내용을 지어내지 않는다.

w = 그래서 무슨 의미인가 · 주가에 대한 영향
- 한 문장. 사이트에서 "→" 뒤에 붙는다(화살표는 넣지 말 것).
- **두 시계를 분리한다**: 실적·수주·가이던스 = 논제(펀더멘털) 영향 / 수급·센티먼트·지수 편출입·애널리스트 코멘트 = 가격 시계 노이즈.
- 영향의 방향(호재/악재/중립)과 그 강도를 분명히 하되, 근거 없는 단정·매매 권유는 금지.
- 확정 사실이 아니면 관측임을 드러낸다("~라는 관측", "~에 그침").

해당 종목과 무관한 기사는 a="회사 무관 노이즈", w="" 로 둔다.

다음 JSON 배열만 출력하라(마크다운·설명 금지):
[{"n":0,"a":"명사형 요약","w":"의미·주가 영향 한 문장"}]

${lines}`;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error('anthropic HTTP ' + r.status);
      const j = await r.json();
      const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const arr = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (!Array.isArray(arr)) throw new Error('arts shape invalid');
      for (const x of arr) {
        if (x && Number.isInteger(x.n) && batch[x.n] && x.a) {
          batch[x.n].a = String(x.a).trim();
          batch[x.n].w = String(x.w || '').trim();   // 두 번째 점(의미·주가 영향)
          done++;
        }
      }
    } catch (e) {
      console.log(`arts 배치 실패(건너뜀): ${e.message}`);
    }
    await sleep(600);
  }
  console.log(`arts: ${done}/${todo.length} 요약 생성`);
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
  const holdSet = new Set(holdings);
  const holdItems = items.filter((it) => holdSet.has(it.ticker));
  const holdLines = holdItems
    .map((it, i) => `${i}|${it.ticker}|${(it.published || '').slice(0, 10)}|${it.title}`)
    .join('\n');
  const prompt = `너는 AI 인프라 투자 관측소의 애널리스트다. 아래는 종목별 최근 뉴스 헤드라인이다(티커|이름|날짜|제목).

보유 종목: ${holdings.join(', ')} (나머지는 워치리스트)
레이어: L2 컴퓨트(GPU/ASIC) L3 메모리 L4 패키징/장비 L5 서버 L6 옵티컬 L7 전력/냉각 L8 발전/그리드

다음 JSON 만 출력하라(마크다운·설명 금지):
{"headline":"이번 피드의 축을 ①②③ 형식으로 요약한 결론 한 문장(한글)",
 "groups":[{"title":"보유 종목","items":[{"tk":"MU","nm":"마이크론","s":"핵심 내용 1~2문장 한글 요약","b":["핵심 포인트 불릿1(완결된 한 문장)","핵심 포인트 불릿2(완결된 한 문장)"]}]},
           {"title":"워치리스트 · L2 컴퓨트","items":[...]},
           {"title":"워치리스트 · L3/L4 메모리·장비","items":[...]},
           {"title":"워치리스트 · L5~L8 서버·옵티컬·전력","items":[...]}],
 "watch":["실적 발표 임박 등 일정 주의 항목(있으면, 최대 4개)"],
 "macro":[{"id":"macro_iran","s":"해당 매크로 토픽의 핵심 흐름 1~2문장 한글 요약"}],
 "arts":[{"n":0,"a":"해당 기사의 내용→의미→영향을 한 문장(80~140자)으로. 확정 실적/수주와 단순 관측·내러티브를 구분해 서술. 회사 무관 기사는 '회사 무관 노이즈'로 표기"}]}

규칙: b는 사이트에 그대로 표시되는 불릿이다 — 종목마다 2개(재료가 하나뿐이면 1개). 각 불릿은 완결된 한 문장이고 기사 제목을 그대로 옮기지 말 것. 서로 다른 축을 담아라(예: 불릿1=주가·수급 사건, 불릿2=펀더멘털·제품·계약). s는 b를 이어붙인 요약으로 유지(폴백용).
보유 종목은 전부 포함(뉴스 없으면 생략 가능), 워치리스트는 의미 있는 것만. macro는 아래 매크로 헤드라인의 토픽id별 1개씩. arts는 아래 [보유 기사] 번호 전건에 대해 작성. 요약은 사실만, 과장 금지, 헤드라인에 없는 내용 추가 금지.

${lines}

[매크로 토픽 헤드라인 (토픽id|토픽명|날짜|제목)]
${macroLines}

[보유 기사 (번호|티커|날짜|제목)]
${holdLines}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error('anthropic HTTP ' + r.status);
    const j = await r.json();
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const digest = JSON.parse(clean);
    if (!digest.headline || !Array.isArray(digest.groups)) throw new Error('digest shape invalid');
    if (Array.isArray(digest.arts)) {
      digest.arts = digest.arts
        .filter((x) => x && Number.isInteger(x.n) && holdItems[x.n] && x.a)
        .map((x) => ({ link: holdItems[x.n].link, a: x.a }));
    }
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

  // ── 영구 아카이브(news_archive.json) ────────────────────────────────
  // 기사는 시간이 지나도 삭제하지 않는다. 아카이브 = 단일 진실원천(전건 누적).
  // news.json 은 여기서 잘라낸 '사이트 표시 창'일 뿐이다.
  let arch = { items: [] };
  try { arch = JSON.parse(fs.readFileSync(ARCHIVE_OUT, 'utf8')); } catch (e) { /* first run */ }

  // archive + 기존 news.json + 신규 수집 → 링크 기준 dedupe.
  // 먼저 들어온 쪽(아카이브)이 이기므로 기존 요약(a)이 재수집에 덮이지 않는다.
  const byLink = new Map();
  for (const it of [...(arch.items || []), ...(prev.items || []), ...collected]) {
    if (!it || !it.link) continue;
    const cur = byLink.get(it.link);
    if (!cur) { byLink.set(it.link, it); continue; }
    if (!cur.a && it.a) cur.a = it.a;   // 요약은 어느 쪽에 있든 살린다
    if (cur.w === undefined && it.w !== undefined) cur.w = it.w;
  }
  const all = [...byLink.values()]
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));

  await summarizeArticles(all);

  fs.writeFileSync(ARCHIVE_OUT, JSON.stringify({
    asOf: now.toISOString(),
    source: 'Google News RSS · 보유/후보 종목별 영구 아카이브',
    note: '기사 전건 누적 — 프루닝·삭제 없음. items[].a = 기사별 한 줄 요약(신규만 증분 생성·이후 영구 보존). news.json 은 이 파일에서 최근 구간만 잘라낸 사이트 표시용 창. 사이트에 배포되지 않는다(.assetsignore).',
    count: all.length,
    items: all,
  }, null, 2) + '\n');
  console.log(`archive: ${ARCHIVE_OUT} ${all.length}건 (누적·무삭제)`);

  // ── 종목별 3개월 창 샤드(archive/{TICKER}.json) ────────────────────
  // 카드는 5건만 보이지만 '더 보기'로 나머지 3개월치를 볼 수 있어야 한다.
  // 전체 아카이브(수 MB)를 통째로 받게 하면 안 되므로 종목별로 쪼갠다
  // → 클릭한 종목의 파일 하나(수십 KB)만 온디맨드로 내려간다.
  const cutoff = now.getTime() - PRUNE_DAYS * 864e5;
  const inWin = all.filter((it) => {
    const t = it.published ? new Date(it.published).getTime() : 0;
    return (!t || t >= cutoff) && it.ticker !== 'MACRO';
  });
  const winByTk = new Map();
  for (const it of inWin) {
    const k = String(it.ticker || '?').toUpperCase();
    if (!winByTk.has(k)) winByTk.set(k, []);
    winByTk.get(k).push(it);
  }
  fs.mkdirSync(SHARD_DIR, { recursive: true });
  const winCounts = {};
  for (const [k, list] of winByTk) {
    winCounts[k] = list.length;
    fs.writeFileSync(`${SHARD_DIR}/${k}.json`, JSON.stringify({
      ticker: k,
      name: (list[0] || {}).name || k,
      asOf: now.toISOString(),
      windowDays: PRUNE_DAYS,
      count: list.length,
      // 렌더에 필요한 필드만(용량 절감): d=일자 a=명사형 요약 w=의미·주가 영향 t=제목(폴백) u=링크
      items: list.map((it) => ({ d: it.published, a: it.a || '', w: it.w || '', t: it.title || '', u: it.link })),
    }, null, 2) + '\n');
  }
  console.log(`shards: ${SHARD_DIR}/ ${winByTk.size}개 종목 (3개월 창 전건)`);

  // ── 사이트 표시 창(news.json) ──────────────────────────────────────
  // 카드는 종목당 5건까지만 보여주므로 파일에도 그만큼만 싣는다
  // → 아카이브가 몇 년치로 불어나도 첫 로딩 페이로드는 상수로 유지된다.
  const perTk = new Map();
  const items = all
    .filter((it) => {
      const t = it.published ? new Date(it.published).getTime() : 0;
      if (t && t < cutoff) return false;
      const k = it.ticker || '?';
      const n = (perTk.get(k) || 0) + 1;
      if (n > SITE_PER_TICKER) return false;   // all 은 최신순 정렬 → 앞 5건만 통과
      perTk.set(k, n);
      return true;
    })
    .slice(0, MAX_ITEMS);

  const payload = {
    asOf: now.toISOString(),
    source: 'Google News RSS · 보유/후보 종목별 (원시 피드 + 기사별 한 줄 요약)',
    note: `사이트 종목 카드의 "일자 + 요약" 행 소스. 최근 ${PRUNE_DAYS}일 창 · 종목당 최신 ${SITE_PER_TICKER}건(첫 로딩 페이로드 상한). 나머지 3개월치는 ${SHARD_DIR}/{티커}.json 을 '더 보기'로 온디맨드 로드. 창 밖 과거 기사는 삭제된 것이 아니라 ${ARCHIVE_OUT} 에 영구 보존된다. 신호/소음 판단과 SIGNAL_LOG 반영은 사람/Claude의 몫 — 채점·차트에는 쓰이지 않는다.`,
    count: items.length,
    archive: ARCHIVE_OUT,
    archiveCount: all.length,
    shardDir: SHARD_DIR,
    winCounts,          // 종목별 3개월 창 총건수 → '더 보기 (+N건)' 표기용
    items,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nDone: ${ok} ok, ${fail} failed, ${items.length}/${all.length} items in ${OUT}.`);
  await buildDigest(items);
}

main().catch((e) => { console.error(e); process.exit(1); });
