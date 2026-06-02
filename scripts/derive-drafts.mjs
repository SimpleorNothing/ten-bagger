// Daily signal-triage drafter for the 初入 Observatory · Alpha Map.
// Reads the RAW news feed (news.json) and ranks/clusters headlines into
// signal_drafts.json — a REVIEW-ONLY candidate list for the operator/Claude.
//
// DISCIPLINE (OPS §2 / §4 · "narrative ≠ numbers"):
//   This NEVER writes signal_log.json. It does not score the 초입 5신호 or
//   assign a Dawn Map stage. It only surfaces "what to look at today",
//   ranked by how likely a headline is to be a *fundamental* signal
//   (실적·수주·공급·증설·병목·목표가) and DOWN-weights pure narrative /
//   sentiment (키노트·발언·전망·급등·젠슨). Promotion of a draft into
//   signal_log.json stays a human/Claude judgment.
//
// Repo-only: signal_drafts.json is in .assetsignore and paths-ignored in
// deploy.yml, so the daily commit never redeploys the site (same as news.json).

import fs from 'node:fs';

const HTML = 'index.html';
const NEWS = 'news.json';
const OUT  = 'signal_drafts.json';

// --- id → {layer, layer2, stage, held} from the C array in index.html ---
function readLayers() {
  try {
    const html = fs.readFileSync(HTML, 'utf8');
    const m = html.match(/const C=(\[[\s\S]*?\n\];)/);
    if (!m) return {};
    const C = eval(m[1].replace(/;\s*$/, '')); // object literals only → safe
    const map = {};
    for (const c of C) {
      if (!c || !c.id) continue;
      map[c.id] = {
        layer: c.layer || null, layer2: c.layer2 || null,
        stage: c.stage || null, held: !!c.held,
      };
    }
    return map;
  } catch { return {}; }
}

// --- signal keyword buckets: [regex, weight, label] ---
// STRONG = fundamental movers; NARRATIVE = sentiment (down-weighted + flagged).
const STRONG = [
  [/(실적|어닝|earnings|results|분기실적|guidance|가이던스|beat|raise|상향)/i, 3, '실적·가이던스'],
  [/(수주|백로그|backlog|order book|orders|design ?win|디자인 ?윈|수주잔고)/i, 3, '수주·백로그'],
  [/(공급\s?계약|supply (deal|agreement|contract)|계약 ?체결|awarded|납품|1차 ?공급|first supply)/i, 3, '공급·계약'],
  [/(증설|capex|capacity|투자 ?확대|fab|팹|ramp|양산|mass production)/i, 2, '증설·capex'],
  [/(병목|bottleneck|shortage|품귀|공급 ?부족)/i, 3, '병목'],
  [/(목표가 ?상향|price target.{0,12}(raise|hike|up)|upgrade|투자의견 ?상향)/i, 2, '목표가·상향'],
  [/(목표가 ?하향|price target.{0,12}(cut|lower)|downgrade|투자의견 ?하향|가이던스 ?하향|guidance cut|경고)/i, 2, '하향·경고'],
  [/(내부자|insider (sell|selling)|지분 ?(매각|매도)|주식 ?매도|stock sale)/i, 2, '내부자 매도'],
  [/(HBM|CoWoS|advanced packaging|첨단 ?패키징|2\.5D|3D ?패키징)/i, 2, 'HBM·패키징'],
];
const NARRATIVE = /(키노트|keynote|computex|ces ?20|발언|comments|\bsays\b|unveils|공개|선보|전망|outlook|hype|열풍|급등|폭등|surge|rally|jumps|젠슨|jensen|huang)/i;

function score(title) {
  const sigs = [];
  let s = 0;
  for (const [re, w, label] of STRONG) if (re.test(title)) { s += w; sigs.push(label); }
  const narrative = NARRATIVE.test(title);
  if (narrative && sigs.length === 0) s -= 2;     // pure sentiment → push down
  if (narrative) sigs.push('※내러티브');
  return { s, sigs, narrative };
}

function recencyBoost(published, now) {
  const t = published ? new Date(published).getTime() : 0;
  if (!t) return 0;
  const h = (now - t) / 36e5;
  if (h <= 24) return 2;
  if (h <= 48) return 1;
  return 0;
}

// crude token-Jaccard similarity for clustering same-ticker duplicates
function tokens(s) {
  return new Set(
    (s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 1)
  );
}
function sim(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

function main() {
  const now = Date.now();
  let news = { items: [], asOf: null };
  try { news = JSON.parse(fs.readFileSync(NEWS, 'utf8')); } catch { /* no feed yet */ }

  const layers = readLayers();
  const items = Array.isArray(news.items) ? news.items : [];

  const scored = items.map((it) => {
    const { s, sigs, narrative } = score(it.title || '');
    const L = layers[it.id] || {};
    const boost = recencyBoost(it.published, now) + (L.held ? 1 : 0);
    return {
      id: it.id, ticker: it.ticker, name: it.name,
      layer: L.layer || null, layer2: L.layer2 || null, stage: L.stage || null, held: !!L.held,
      title: it.title, link: it.link, source: it.source, published: it.published,
      score: s + boost, signals: sigs, narrative,
    };
  });

  // cluster within the same id by title similarity
  const byId = {};
  for (const r of scored) (byId[r.id] ||= []).push(r);
  const drafts = [];
  for (const id of Object.keys(byId)) {
    const rows = byId[id].sort((a, b) => b.score - a.score);
    const used = new Array(rows.length).fill(false);
    for (let i = 0; i < rows.length; i++) {
      if (used[i]) continue;
      const head = rows[i]; const members = [head]; used[i] = true;
      for (let j = i + 1; j < rows.length; j++) {
        if (!used[j] && sim(head.title, rows[j].title) >= 0.5) { members.push(rows[j]); used[j] = true; }
      }
      const sigSet = [...new Set(members.flatMap((m) => m.signals))];
      drafts.push({
        id: head.id, ticker: head.ticker, name: head.name,
        layer: head.layer, layer2: head.layer2, stage: head.stage, held: head.held,
        score: Math.max(...members.map((m) => m.score)),
        signals: sigSet,
        narrative: sigSet.length === 1 && sigSet[0] === '※내러티브',
        title: head.title, published: head.published, n: members.length,
        links: members.map((m) => ({ source: m.source, url: m.link })),
      });
    }
  }
  drafts.sort((a, b) => b.score - a.score || new Date(b.published) - new Date(a.published));

  const payload = {
    asOf: new Date(now).toISOString(),
    fromNews: news.asOf || null,
    source: 'derive-drafts.mjs · news.json 휴리스틱 트리아지(검토용 후보)',
    note: 'signal_log.json에 절대 자동 기록하지 않음. 5신호 채점·단계 판정 없음 — 펀더멘털 신호(실적·수주·공급·증설·병목·목표가)일수록 위로, 순수 내러티브(키노트·발언·급등·젠슨)는 ※내러티브로 강등. 승격(→ signal_log)은 사람/Claude 판단. (OPS §2·§4, narrative≠numbers)',
    count: drafts.length,
    drafts,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  const top = drafts.filter((d) => !d.narrative && d.score >= 4).length;
  console.log(`Done: ${drafts.length} draft clusters (${top} fundamental ≥4) from ${items.length} headlines → ${OUT}.`);
}

try { main(); } catch (e) { console.error(e); process.exit(1); }
