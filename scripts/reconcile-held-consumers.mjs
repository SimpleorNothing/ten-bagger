import fs from 'node:fs';

const HOLDINGS = 'holdings.json';
const HTML = 'index.html';
const DIGEST = 'news_digest.json';

const h = JSON.parse(fs.readFileSync(HOLDINGS, 'utf8'));
const activeDetail = (h.detail || []).filter((d) => d && Number(d.amt) > 0);
const activeNames = new Set(activeDetail.map((d) => d.name));
const active = new Map(
  activeDetail
    .filter((d) => d.ticker && d.ticker !== '—')
    .map((d) => [String(d.ticker).toUpperCase(), d])
);

// 레이어 members/label도 최신 토요일 엑셀의 실제 보유금액(amt>0)과 맞춘다.
// 청산 종목의 detail 행은 추적·재진입 기준을 위해 남기되, 보유 members와 0원 레이어에서는 제거한다.
if (Array.isArray(h.holdings)) {
  h.holdings = h.holdings.map((row) => {
    const before = Array.isArray(row.members) ? row.members : [];
    const members = row.layer === '현금'
      ? before.filter((name) => name === '현금' || activeNames.has(name))
      : before.filter((name) => activeNames.has(name));
    let label = row.label;
    if (members.length !== before.length) {
      const base = String(label || row.layer || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (row.layer === '현금') label = '현금';
      else if (row.layer === '기타' && members.length === 1) label = members[0];
      else if (members.length) label = `${base} (${members.join('·')})`;
    }
    return { ...row, label, members };
  }).filter((row) => row.layer === '현금' || Number(row.amt) > 0 || (row.members || []).length > 0);
}

// 주간 엑셀 원장 total과 평일 시가평가 total을 혼동하지 않도록 note의 원장 총액 표기를 명시한다.
if (typeof h.note === 'string') {
  h.note = h.note.replace(/자동 동기화 · total /, '자동 동기화 · 주간 원장 total ');
}
fs.writeFileSync(HOLDINGS, JSON.stringify(h, null, 1) + '\n');

function splitTopLevelObjects(src) {
  const ranges = [];
  let quote = '', esc = false, depth = 0, start = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) { ranges.push([start, i + 1]); start = -1; }
      if (depth < 0) throw new Error('candidate object brace underflow');
    }
  }
  if (depth !== 0) throw new Error('candidate object braces unbalanced');
  return ranges;
}

function candidateArrayRange(html) {
  const marker = 'const C=[';
  const p = html.indexOf(marker);
  if (p < 0) throw new Error('const C array not found');
  const open = html.indexOf('[', p);
  let quote = '', esc = false, depth = 0;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return [open, i];
    }
  }
  throw new Error('const C array closing bracket not found');
}

function reconcileObject(obj) {
  const tm = obj.match(/ticker\s*:\s*['"]([^'"]+)['"]/);
  if (!tm) return obj;
  const ticker = tm[1].toUpperCase();
  const shouldHold = active.has(ticker);

  // held/heldNote는 최신 토요일 holdings.json만 권위값으로 삼는다.
  let out = obj
    .replace(/\s*,\s*held\s*:\s*true\s*/g, '')
    .replace(/\s*,\s*heldNote\s*:\s*['"][^'"]*['"]\s*/g, '');

  if (shouldHold) {
    const re = /(ticker\s*:\s*['"][^'"]+['"])/;
    out = out.replace(re, "$1,held:true,heldNote:'보유'");
  }
  return out;
}

let html = fs.readFileSync(HTML, 'utf8');
const [a0, a1] = candidateArrayRange(html);
let body = html.slice(a0 + 1, a1);
const ranges = splitTopLevelObjects(body);
for (let i = ranges.length - 1; i >= 0; i--) {
  const [s, e] = ranges[i];
  body = body.slice(0, s) + reconcileObject(body.slice(s, e)) + body.slice(e);
}
html = html.slice(0, a0 + 1) + body + html.slice(a1);
fs.writeFileSync(HTML, html);

if (fs.existsSync(DIGEST)) {
  const d = JSON.parse(fs.readFileSync(DIGEST, 'utf8'));
  d.holdingsAsOf = h.qtyAsOf || h.asOf || null;
  const items = [...active.values()].map((x) => ({ tk: x.ticker, nm: x.name }));
  const groups = Array.isArray(d.groups) ? d.groups : [];
  let g = groups.find((x) => x && x.title === '보유 종목');
  if (!g) { g = { title: '보유 종목', items: [] }; groups.unshift(g); }
  g.items = items;
  d.groups = groups;
  fs.writeFileSync(DIGEST, JSON.stringify(d, null, 2) + '\n');
}

const heldTickers = [...active.keys()].sort();
console.log(`Reconciled ${heldTickers.length} active non-cash holdings from ${h.qtyAsOf || h.asOf}: ${heldTickers.join(', ')}`);
