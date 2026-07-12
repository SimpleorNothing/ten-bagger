// Daily news headline collector for the 初入 Observatory · Alpha Map.
// Runs in GitHub Actions (has internet); this repo's sandbox blocks egress,
// same as fetch-prices.mjs. Source of truth for tickers is the C array in
// index.html. Pulls Google News RSS per holding/candidate into news.json.
//
// IMPORTANT: this collector SCREENS but never SCORES. It never touches
// alpha.json / earnings.json / judgment.json / SIGNAL_LOG. Deciding signal
// vs noise — and whether a headline is big enough to move a number — stays
// with the operator/Claude (see OPS.md §2 "수시" + the daily intake loop).
//
// 스크리닝(items[].m)은 '무엇을 보여줄지'만 정한다(표시 창 방어) — 판단·숫자 변경이 아니다.
// 사다리·정규식·소스 티어는 ./news-screen.mjs 가 단일 소스(MV=2).
// m=2 논제(펀더멘털) / m=1 리비전·수급 실사건 / m=0 비물질(사후 등락 서술·홍보·추측·콘텐츠팜).
// m=0 도 news_archive.json 에는 전건 보존된다(삭제 아님, 표시 제외일 뿐).
// 수집 축은 셋: ① 종목축 ② 시그널축(확정 사실 키워드 결합) ③ 병목축(레이어 고정 — 리밸런싱 입력).
//
// news.json is repo-only review material: it is in .assetsignore and
// paths-ignored in deploy.yml, so the daily commit never redeploys the site.

import fs from 'node:fs';
import { MV, srcTier, ruleM, needsGrade, RE_MOVE, RE_KEEP, LADDER,
         SIG_TERMS_EN, SIG_TERMS_KO, BOTTLENECK_TOPICS } from './news-screen.mjs';

const HTML = 'index.html';
const OUT = 'news.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 스크리닝(m)이 노이즈를 걷어내므로 원시 수집은 넉넉히 긁는다.
// 4건만 긁으면 홍보·사후해설이 3건을 먹었을 때 실질 기사가 1건만 남는다.
const PER_TICKER = 8;     // keep newest N headlines per name (종목축)
const PER_TICKER_SIG = 4; // 시그널축(확정 사실 키워드 결합) 추가 수집분
const MIN_M = 1;          // 사이트 표시 임계 — m>=1(주가에 영향)만 news.json·샤드에 싣는다
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
  if (c.q) return c.q;                       // 트렌딩 매크로 주제: 발굴된 검색어 우선
  if (QOVERRIDE[c.id]) return QOVERRIDE[c.id];
  return c.name.replace(/\(.*?\)/g, '').replace(/\s+plays/i, '').trim();
}

const isKR = (c) => c.mkt === 'KOSPI' || c.mkt === 'KOSDAQ';
const locOf = (c) => (isKR(c) ? 'hl=ko&gl=KR&ceid=KR:ko' : 'hl=en-US&gl=US&ceid=US:en');

function feedUrl(c) {
  const q = encodeURIComponent(newsQuery(c) + ' when:7d');
  return `https://news.google.com/rss/search?q=${q}&${locOf(c)}`;
}

function sigFeedUrl(c) {
  const q = encodeURIComponent(`${newsQuery(c)} ${isKR(c) ? SIG_TERMS_KO : SIG_TERMS_EN} when:14d`);
  return `https://news.google.com/rss/search?q=${q}&${locOf(c)}`;
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

async function fetchOne(url, n) {
  // 구글 뉴스는 러너 IP를 간헐적으로 스로틀링한다(503/429) → 지수 백오프 재시도.
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return parseRSS(await r.text()).slice(0, n);
      last = new Error('HTTP ' + r.status);
      if (r.status !== 503 && r.status !== 429 && r.status < 500) throw last;  // 일시 오류만 재시도
    } catch (e) { last = e; }
    if (i < 2) await sleep(2000 * (i + 1) + Math.floor(Math.random() * 800));
  }
  throw last;
}

async function fetchFeed(c) {
  const base = await fetchOne(feedUrl(c), PER_TICKER);   // ① 종목축
  if (c.ticker === 'MACRO') return base;
  let sig = [];                                          // ② 시그널축(보조 — 실패해도 무해)
  try { sig = await fetchOne(sigFeedUrl(c), PER_TICKER_SIG); } catch (e) { /* 보조 축 */ }
  await sleep(300);
  const seen = new Set(base.map((x) => x.link));
  return [...base, ...sig.filter((x) => !seen.has(x.link))];
}


// ---- 기사별 두 점 정리 (items[].a = 명사형 요약, items[].w = 의미·주가 영향) ----
// 사이트 종목 카드는 "일자 + 요약" 행으로 렌더한다(기사 제목 미표시).
// 요약은 아카이브에 영구 보존되고, a 가 없는 신규 기사만 증분 생성한다
// → 과거치를 매일 재요약하지 않는다(토큰·비용 방어).
const ART_BATCH = 30;      // 1회 호출당 기사 수 (두 점 출력이라 60은 max_tokens 초과·절단 위험)
const ART_MAX_NEW = 240;   // 1회 실행당 신규 요약 상한

// ---- 물질성 스크리닝 (items[].m) · MV=2 ----
// 사다리·정규식·소스 티어는 전부 ./news-screen.mjs 가 단일 소스(SoT).
// 기준은 하나 — 앞으로의 등락에 영향을 줄 시그널인가. 지나간 등락의 해설은 시그널이 아니다.
// 스크리닝은 '무엇을 보여줄지'만 정한다(표시 창 방어) — 판단·숫자 파일은 건드리지 않는다.

// 하드룰로 확정된 m=0 은 요약 토큰도 쓰지 않는다(수집→즉시 배제).
function preScreen(items) {
  let cut = 0, regrade = 0;
  for (const it of items) {
    it.st = srcTier(it.source);   // 소스 티어(1 원문·2 전문지·3 집계·9 콘텐츠팜)
    if (it.ticker === 'MACRO') {  // 매크로·병목축은 LLM 미채점(축 자체가 관측 대상) — 하드룰만
      const t = String(it.title || '');
      if (it.st === 9 || (RE_MOVE.test(t) && !RE_KEEP.test(t))) { it.m = 0; it.mv = MV; cut++; }
      continue;
    }
    if (!needsGrade(it)) continue;
    if (Number.isInteger(it.m)) regrade++;   // 구세대 등급 → 무효화 후 재채점
    const r = ruleM(it);
    if (r === 0) { it.m = 0; it.mv = MV; cut++; }
    else if (it.mv !== MV) it.m = undefined;
  }
  if (regrade) console.log(`screen(rule): 구세대 등급 ${regrade}건 재채점 대상(MV=${MV})`);
  if (cut) console.log(`screen(rule): ${cut}건 m=0 (콘텐츠팜·홍보·추측·사후 등락 서술)`);
}

// a·w 는 이미 있는데 m 만 없는 과거 기사 → 제목·요약만 보고 등급만 경량 배치로 백필.
const SCORE_BATCH = 60;
async function scoreLegacy(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  const todo = items.filter(needsGrade);
  if (!todo.length) { console.log('screen(llm): 대상 없음'); return; }
  if (!key) {   // 키 없으면 보수적으로 통과(표시) — 스크리닝 실패가 기사 실종으로 이어지면 안 된다
    for (const it of todo) { it.m = 1; it.mv = MV; }
    console.log(`screen(llm): API 키 없음 → ${todo.length}건 m=1 통과`);
    return;
  }
  let done = 0;
  for (let i = 0; i < todo.length; i += SCORE_BATCH) {
    const batch = todo.slice(i, i + SCORE_BATCH);
    const lines = batch.map((it, n) => `${n}|${it.ticker}|${it.title}${it.a ? ' // ' + it.a : ''}`).join('\n');
    const prompt = `너는 AI 인프라 투자 관측소의 애널리스트다. 아래 기사 각각에 등급(m)만 매겨라.

${LADDER}

다음 JSON 배열만 출력하라(마크다운·설명 금지):
[{"n":0,"m":2}]

${lines}`;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error('anthropic HTTP ' + r.status);
      const j = await r.json();
      const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const arr = parseArts(text);
      for (const x of arr) {
        if (x && Number.isInteger(x.n) && batch[x.n] && Number.isInteger(x.m)) {
          batch[x.n].m = Math.max(0, Math.min(2, x.m));
          batch[x.n].mv = MV;
          done++;
        }
      }
    } catch (e) {
      console.log(`screen(llm) 배치 실패(건너뜀): ${e.message}`);
    }
    await sleep(600);
  }
  for (const it of todo) if (!Number.isInteger(it.m)) { it.m = 1; it.mv = MV; }   // 실패분은 통과(표시)
  const cut = todo.filter((it) => it.m === 0).length;
  console.log(`screen(llm): ${done}/${todo.length} 판정 · m=0 ${cut}건 제외`);
}

// ---- 트렌딩 매크로 주제 자동 발굴 (macroTopics) ----
// 고정 주제(호르무즈·FOMC·관세)를 하드코딩하면 이슈가 식어도 계속 긁는다.
// → ① 경제 헤드라인 수집 → ② 지금 시장을 실제로 움직이는 이슈 선별 → ③ 그 주제로 검색.
// 발굴 실패 시 직전 실행의 주제(prev.macroTopics)를 재사용하고, 그것도 없으면 시드로 폴백한다.
const MACRO_SEED = [
  { id: 'macro_fomc', ticker: 'MACRO', name: 'FOMC 연준 기준금리', mkt: 'KOSPI' },
  { id: 'macro_tariff', ticker: 'MACRO', name: '미국 관세 무역협상', mkt: 'KOSPI' },
  { id: 'macro_ai_capex', ticker: 'MACRO', name: 'AI 데이터센터 capex', mkt: 'KOSPI' },
];
const MACRO_N = 3;                      // 선별할 트렌딩 주제 수
// 광역·중립 검색어로 '지금 무엇이 헤드라인인가'를 긁는다(특정 이슈를 미리 못박지 않는다).
// rss/search 형식은 기존 파이프라인에서 작동이 검증된 경로. topic/BUSINESS 섹션은 보조(실패해도 무해).
const DISCOVERY_FEEDS = [
  'https://news.google.com/rss/search?q=' + encodeURIComponent('증시 when:2d') + '&hl=ko&gl=KR&ceid=KR:ko',
  'https://news.google.com/rss/search?q=' + encodeURIComponent('stock market when:2d') + '&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=' + encodeURIComponent('economy when:2d') + '&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
];

async function fetchUrlFeed(url, n) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return parseRSS(await r.text()).slice(0, n);
    } catch (e) { /* 재시도 */ }
    if (i < 1) await sleep(2000);
  }
  return [];
}

function slugId(s, i) {
  const base = String(s || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
  return 'macro_' + (base || 'topic') + '_' + i;
}

async function discoverMacroTopics(prevTopics) {
  const key = process.env.ANTHROPIC_API_KEY;
  const heads = [];
  for (const u of DISCOVERY_FEEDS) {
    const got = await fetchUrlFeed(u, 25);
    for (const it of got) heads.push(it.title);
    await sleep(500);
  }
  console.log(`macro 발굴: 헤드라인 ${heads.length}건 수집`);
  if (!key || heads.length < 5) {
    const fb = (prevTopics && prevTopics.length) ? prevTopics : MACRO_SEED;
    console.log('macro 발굴 스킵 → 폴백 주제 사용');
    return fb;
  }
  const prompt = `너는 AI 인프라 투자 관측소의 매크로 애널리스트다. 아래는 오늘의 경제·시장 헤드라인이다.

지금 시장을 실제로 움직이고 있는 **트렌딩 매크로 이슈 ${MACRO_N}개**를 골라라.

선별 기준:
- AI 인프라 스택(L1 모델 ~ L8 발전/그리드) 투자 판단에 실제로 영향을 주는 축일 것.
  (금리·유동성 / 지정학·공급망 / 관세·수출통제 / 전력·에너지 / 신용·환율 / 하이퍼스케일러 capex)
- 개별 종목 뉴스가 아니라 **매크로 축**일 것.
- 헤드라인에서 반복 등장하거나 새로 부상한 이슈를 우선한다. 식은 이슈는 버린다.
- 서로 다른 축으로 분산한다(같은 축 2개 금지).

각 이슈에 대해:
- label: 사람이 읽는 이슈명(한글, 12자 내외)
- q: 구글 뉴스 검색어(그 이슈의 기사를 잘 긁을 핵심어 2~5개. 한글 또는 영문)
- ko: 한국 시장 관점 기사가 더 적합하면 true, 미국/글로벌이면 false

다음 JSON 배열만 출력하라(마크다운·설명 금지):
[{"label":"이슈명","q":"검색어","ko":true}]

${heads.slice(0, 70).join('\n')}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error('anthropic HTTP ' + r.status);
    const j = await r.json();
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const arr = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!Array.isArray(arr) || !arr.length) throw new Error('macro shape invalid');
    const topics = arr.slice(0, MACRO_N).map((x, i) => ({
      id: slugId(x.label, i),
      ticker: 'MACRO',
      name: String(x.label || x.q || '매크로').trim(),
      q: String(x.q || x.label || '').trim(),
      mkt: x.ko === false ? 'US' : 'KOSPI',
    })).filter((x) => x.q);
    if (!topics.length) throw new Error('macro 주제 0건');
    console.log('macro 트렌딩 주제: ' + topics.map((t) => `${t.name}(${t.q})`).join(' · '));
    return topics;
  } catch (e) {
    console.log(`macro 발굴 실패(${e.message}) → 폴백 주제 사용`);
    return (prevTopics && prevTopics.length) ? prevTopics : MACRO_SEED;
  }
}

// 모델 출력이 부분 손상돼도(키 누락·꼬리 절단) 살릴 수 있는 항목만 건진다.
// 배치 전체를 버리면 60건이 통째로 요약 없이 남는다 → 객체 단위 구제.
function parseArts(text) {
  const t = String(text || '').replace(/```json|```/g, '').trim();
  try {
    const a = JSON.parse(t);
    if (Array.isArray(a)) return a;
  } catch (e) { /* 아래에서 구제 */ }
  const out = [];
  const re = /\{[^{}]*\}/g;
  let m;
  while ((m = re.exec(t))) {
    const chunk = m[0];
    try {
      const o = JSON.parse(chunk);
      if (o && Number.isInteger(o.n)) { out.push(o); continue; }
    } catch (e) { /* 필드 단위 구제로 폴백 */ }
    const mn = chunk.match(/"n"\s*:\s*(\d+)/);
    const ma = chunk.match(/"a"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const mw = chunk.match(/"w"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const mm = chunk.match(/"m"\s*:\s*(\d)/);
    if (!mn || !ma) continue;
    try {
      out.push({
        n: Number(mn[1]),
        a: JSON.parse('"' + ma[1] + '"'),
        w: mw ? JSON.parse('"' + mw[1] + '"') : '',
        ...(mm ? { m: Number(mm[1]) } : {}),
      });
    } catch (e) { /* 이 항목만 포기 */ }
  }
  return out;
}

async function summarizeArticles(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('arts: ANTHROPIC_API_KEY 없음 → 스킵'); return 0; }
  // m===0 (하드룰 확정 노이즈)은 표시되지 않으므로 요약 토큰을 쓰지 않는다.
  const todo = items.filter((it) => it.ticker !== 'MACRO' && it.m !== 0 && (!it.a || it.w === undefined)).slice(0, ART_MAX_NEW);
  if (!todo.length) { console.log('arts: 신규 기사 없음'); return 0; }
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

${LADDER}

해당 종목과 무관한 기사도 **n·a·w·m 네 키를 모두 포함**해 {"n":5,"a":"회사 무관 노이즈","w":"","m":0} 형태로 출력한다.
어떤 경우에도 키 이름을 생략하지 말 것(예: {"n":5,"a":"...",""} 같은 출력은 금지).

다음 JSON 배열만 출력하라(마크다운·설명 금지):
[{"n":0,"a":"명사형 요약","w":"의미·주가 영향 한 문장","m":2}]

${lines}`;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 12000, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error('anthropic HTTP ' + r.status);
      const j = await r.json();
      const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const arr = parseArts(text);
      if (!arr.length) throw new Error('arts 파싱 결과 0건');
      for (const x of arr) {
        if (x && Number.isInteger(x.n) && batch[x.n] && x.a) {
          batch[x.n].a = String(x.a).trim();
          batch[x.n].w = String(x.w || '').trim();   // 두 번째 점(의미·주가 영향)
          if (Number.isInteger(x.m)) { batch[x.n].m = Math.max(0, Math.min(2, x.m)); batch[x.n].mv = MV; }  // 물질성 등급
          done++;
        }
      }
    } catch (e) {
      console.log(`arts 배치 실패(건너뜀): ${e.message}`);
    }
    await sleep(600);
  }
  console.log(`arts: ${done}/${todo.length} 요약 생성`);
  return done;
}

// ---- Korean daily digest (news_digest.json) ----
// ANTHROPIC_API_KEY 가 env 에 있으면 위 items 를 한글 레이어별 요약으로 변환해 저장.
// 키가 없으면 조용히 스킵(뉴스 수집 자체는 영향 없음). 실패해도 이전 digest 유지.
const DIGEST_OUT = 'news_digest.json';

async function buildDigest(items, newArts) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('digest: ANTHROPIC_API_KEY 없음 → 스킵'); return; }
  // 신규 기사가 0건이면 다이제스트도 바뀔 게 없다 → 호출 자체를 건너뛴다(기존 파일 유지).
  // 기존 요약은 그대로 두고 신규만 작업 → 실행 빈도를 올려도 비용이 선형으로 늘지 않는다.
  if (newArts === 0 && fs.existsSync(DIGEST_OUT)) {
    console.log('digest: 신규 기사 0건 → 재생성 스킵(기존 유지)');
    return;
  }
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
 "groups":[{"title":"보유 종목","items":[{"tk":"MU","nm":"마이크론"}]},
           {"title":"워치리스트 · L2 컴퓨트","items":[...]},
           {"title":"워치리스트 · L3/L4 메모리·장비","items":[...]},
           {"title":"워치리스트 · L5~L8 서버·옵티컬·전력","items":[...]}],
 "watch":["실적 발표 임박 등 일정 주의 항목(있으면, 최대 4개)"],
 "macro":[{"id":"아래 매크로 헤드라인에 실제로 등장한 토픽id 그대로","s":"해당 토픽의 핵심 흐름 1~2문장 한글 요약"}]}

id가 bneck_ 로 시작하면 **병목축**이다 — 그 레이어의 병목이 이번 주 **조여졌는지(공급 타이트·리드타임 증가·가격 상승) 풀렸는지(증설·완화)** 방향을 반드시 명시한다(리밸런싱 입력값).

규칙: groups 는 종목 카드의 그룹핑·순서만 정한다(tk·nm 만). 종목별 요약(s)·불릿(b)·기사요약(arts)은 만들지 말 것 — 기사별 두 점 요약은 news.json items[].a/w 가 이미 갖고 있고 사이트는 그쪽만 쓴다(중복 생성 = 순수 낭비).
보유 종목은 전부 포함(뉴스 없으면 생략 가능), 워치리스트는 의미 있는 것만. macro는 아래 매크로 헤드라인의 토픽id별 1개씩. 요약은 사실만, 과장 금지, 헤드라인에 없는 내용 추가 금지.

${lines}

[매크로 토픽 헤드라인 (토픽id|토픽명|날짜|제목)]
${macroLines}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
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
  let prev = { items: [] };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }

  // 매크로 주제는 고정이 아니라 매 실행 트렌딩으로 갱신한다
  const MACRO_TOPICS = await discoverMacroTopics(prev.macroTopics);
  // 트렌딩 매크로(발굴) + 병목축(고정) — 병목축은 식지 않으므로 발굴에 맡기지 않는다.
  const candidates = [...readCandidates().filter((c) => !SKIP(c)), ...MACRO_TOPICS, ...BOTTLENECK_TOPICS];

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
    if (!Number.isInteger(cur.m) && Number.isInteger(it.m)) { cur.m = it.m; cur.mv = it.mv; }   // 물질성 등급도 승계
  }
  const all = [...byLink.values()]
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));

  preScreen(all);           // ① 하드룰: 콘텐츠팜·홍보·추측·사후 등락 서술 → m=0 (요약 토큰 미소모)
  const newArts = await summarizeArticles(all);   // ② 신규 기사: a·w·m 동시 생성
  await scoreLegacy(all);   // ③ 등급 없음·구세대(mv<MV) → 등급만 백필·재채점

  fs.writeFileSync(ARCHIVE_OUT, JSON.stringify({
    asOf: now.toISOString(),
    source: 'Google News RSS · 보유/후보 종목별 영구 아카이브',
    note: '기사 전건 누적 — 프루닝·삭제 없음. items[].a = 기사별 한 줄 요약(신규만 증분 생성·이후 영구 보존). items[].m = 물질성 등급(2 논제·1 리비전/수급 실사건·0 비물질) · items[].mv = 스크리너 세대 · items[].st = 소스 티어(1 원문·2 전문지·3 집계·9 콘텐츠팜) — m=0 도 여기엔 남는다. news.json 은 이 파일에서 최근 구간·m>=1 만 잘라낸 사이트 표시용 창. 사이트에 배포되지 않는다(.assetsignore).',
    count: all.length,
    items: all,
  }, null, 2) + '\n');
  console.log(`archive: ${ARCHIVE_OUT} ${all.length}건 (누적·무삭제)`);

  // ── 종목별 3개월 창 샤드(archive/{TICKER}.json) ────────────────────
  // 카드는 5건만 보이지만 '더 보기'로 나머지 3개월치를 볼 수 있어야 한다.
  // 전체 아카이브(수 MB)를 통째로 받게 하면 안 되므로 종목별로 쪼갠다
  // → 클릭한 종목의 파일 하나(수십 KB)만 온디맨드로 내려간다.
  // 표시 창은 스크리닝을 통과한 기사만 담는다(m>=MIN_M). m=0 은 아카이브에만 남는다.
  const cutoff = now.getTime() - PRUNE_DAYS * 864e5;
  const material = (it) => !Number.isInteger(it.m) || it.m >= MIN_M;
  const inWin = all.filter((it) => {
    const t = it.published ? new Date(it.published).getTime() : 0;
    return (!t || t >= cutoff) && it.ticker !== 'MACRO' && material(it);
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
      // 렌더에 필요한 필드만(용량 절감): d=일자 a=명사형 요약 w=의미·주가 영향 m=물질성 t=제목(폴백) u=링크
      items: list.map((it) => ({ d: it.published, a: it.a || '', w: it.w || '', m: Number.isInteger(it.m) ? it.m : 1, t: it.title || '', u: it.link })),
    }, null, 2) + '\n');
  }
  console.log(`shards: ${SHARD_DIR}/ ${winByTk.size}개 종목 (3개월 창 · 스크리닝 통과분)`);

  // ── 사이트 표시 창(news.json) ──────────────────────────────────────
  // 카드는 종목당 5건까지만 보여주므로 파일에도 그만큼만 싣는다
  // → 아카이브가 몇 년치로 불어나도 첫 로딩 페이로드는 상수로 유지된다.
  const perTk = new Map();
  const items = all
    .filter((it) => {
      const t = it.published ? new Date(it.published).getTime() : 0;
      if (t && t < cutoff) return false;
      if (!material(it)) return false;   // 스크리닝 탈락(콘텐츠팜·홍보·추측·사후 등락 서술) → 카드 슬롯을 주지 않는다
      const k = it.ticker === 'MACRO' ? (it.id || 'MACRO') : (it.ticker || '?');  // 매크로는 토픽별로 센다(합산되면 트렌딩 축이 통째로 잘림)
      const n = (perTk.get(k) || 0) + 1;
      if (n > SITE_PER_TICKER) return false;   // all 은 최신순 정렬 → 앞 5건만 통과
      perTk.set(k, n);
      return true;
    })
    .slice(0, MAX_ITEMS);

  const payload = {
    asOf: now.toISOString(),
    source: 'Google News RSS · 종목축 + 시그널축 + 병목축 (기사별 한 줄 요약 + 물질성 스크리닝)',
    note: `사이트 종목 카드의 "일자 + 요약" 행 소스. 최근 ${PRUNE_DAYS}일 창 · 종목당 최신 ${SITE_PER_TICKER}건(첫 로딩 페이로드 상한) · **물질성 스크리닝 통과분만**(items[].m>=${MIN_M} — 2=논제/펀더멘털, 1=리비전·수급 실사건, 0=사후 등락 서술·홍보·추측·콘텐츠팜으로 제외). 탈락 기사는 삭제가 아니라 ${ARCHIVE_OUT} 에 전건 보존. 나머지 3개월치는 ${SHARD_DIR}/{티커}.json 을 '더 보기'로 온디맨드 로드. 신호/소음 판단과 SIGNAL_LOG 반영은 사람/Claude의 몫 — 채점·차트에는 쓰이지 않는다.`,
    count: items.length,
    macroTopics: MACRO_TOPICS,   // 이번 실행에서 채택된 트렌딩 매크로 축(폴백·표시용)
    bottleneck: BOTTLENECK_TOPICS,   // 고정 병목축(L3 가격·L4 캐파·L6 리드타임·L7·L8 전력·상류 capex)
    archive: ARCHIVE_OUT,
    archiveCount: all.length,
    shardDir: SHARD_DIR,
    winCounts,          // 종목별 3개월 창 총건수 → '더 보기 (+N건)' 표기용
    items,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nDone: ${ok} ok, ${fail} failed, ${items.length}/${all.length} items in ${OUT}.`);
  await buildDigest(items, newArts);
}

main().catch((e) => { console.error(e); process.exit(1); });
