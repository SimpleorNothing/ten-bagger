import fs from 'node:fs';

const CAL = 'calendar.json';
const URL = 'https://www.bls.gov/news.release/ppi.nr0.htm';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; AlphaMapDataAudit/1.0)' };

function clean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function signed(n) {
  const x = Number(n);
  return x > 0 ? `+${x.toFixed(1)}%` : x < 0 ? `${x.toFixed(1)}%` : '0.0%';
}

function movement(text, subject, month) {
  const esc = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = text.match(new RegExp(`${esc} (?:was unchanged|(?:increased|rose|advanced|edged up|moved up) ([0-9.]+) percent|(?:decreased|declined|fell|dropped|moved down) ([0-9.]+) percent) in ${month}`, 'i'));
  if (!m) return null;
  const full = m[0].toLowerCase();
  if (full.includes('unchanged')) return 0;
  if (m[1] != null) return Number(m[1]);
  if (m[2] != null) return -Number(m[2]);
  return null;
}

const r = await fetch(URL, { headers: UA });
if (!r.ok) throw new Error(`BLS PPI HTTP ${r.status}`);
const text = clean(await r.text());
const hdr = text.match(/PRODUCER PRICE INDEXES\s*-\s*([A-Z]+)\s+(20\d{2})/i);
if (!hdr) throw new Error('BLS PPI reference month not found');
const monthName = hdr[1][0].toUpperCase() + hdr[1].slice(1).toLowerCase();
const year = Number(hdr[2]);
const months = { January:1, February:2, March:3, April:4, May:5, June:6, July:7, August:8, September:9, October:10, November:11, December:12 };
const mm = months[monthName];
if (!mm) throw new Error(`Unknown PPI month ${monthName}`);

const headlineMom = movement(text, 'The Producer Price Index for final demand', monthName);
const headlineYoyM = text.match(new RegExp(`index for final demand (?:increased|rose|advanced) ([0-9.]+) percent for the 12 months ended in ${monthName}`, 'i'));
const coreMom = movement(text, 'Prices for final demand less foods, energy, and trade services', monthName);
const coreYoyM = text.match(new RegExp(`index for final demand less foods, energy, and trade services (?:increased|rose|advanced) ([0-9.]+) percent`, 'i'));
if (headlineMom == null || !headlineYoyM || coreMom == null || !coreYoyM) {
  throw new Error(`PPI parse incomplete: headlineMom=${headlineMom} headlineYoy=${headlineYoyM?.[1]} coreMom=${coreMom} coreYoy=${coreYoyM?.[1]}`);
}
const headlineYoy = Number(headlineYoyM[1]);
const coreYoy = Number(coreYoyM[1]);
const ref = `${year}-${String(mm).padStart(2,'0')}`;

const cal = JSON.parse(fs.readFileSync(CAL, 'utf8'));
const events = Array.isArray(cal) ? cal : (cal.events || cal.items || []);
const event = events.find((e) => String(e.lbl || '').includes('美 PPI') && String(e.lbl || '').includes(`${mm}월분`));
if (!event) throw new Error(`calendar PPI event not found for ${ref}`);
const now = new Date();
const kst = new Date(now.getTime() + 9 * 3600_000).toISOString().replace('T',' ').slice(0,16) + ' KST';
event.meta = `BLS 확정 · PPI 최종수요 전월비 ${signed(headlineMom)}, 전년비 ${signed(headlineYoy)}. 근원(식품·에너지·무역서비스 제외) 전월비 ${signed(coreMom)}, 전년비 ${signed(coreYoy)}. 원문: ${URL} · 등록일: ${now.toISOString().slice(0,10)} · 확인/갱신: ${kst}`;
event.when = String(event.when || '').replace('발표 대기', '확정');
if (!event.when.includes('확정')) event.when += ' · 확정';
if (!Array.isArray(cal) && 'asOf' in cal) cal.asOf = now.toISOString();
fs.writeFileSync(CAL, JSON.stringify(cal, null, 2) + '\n');
console.log(`PPI ${ref}: headline ${signed(headlineMom)} MoM / ${signed(headlineYoy)} YoY; core ${signed(coreMom)} MoM / ${signed(coreYoy)} YoY`);
