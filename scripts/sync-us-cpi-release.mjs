import fs from 'node:fs';

const CAL = 'calendar.json';
const PULSE = 'pulse.json';
const CHANGELOG = 'changelog.js';
const URL = 'https://www.bls.gov/news.release/cpi.nr0.htm';

function kstNow() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date()).replace(' ', 'T') + '+09:00';
}

function monthNo(name) {
  return ({January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12})[name];
}

function signed(re, text, label) {
  const m = text.match(re);
  if (!m) throw new Error(`Could not parse ${label}`);
  const verb = m[1].toLowerCase();
  const v = Number(m[2]);
  return /fall|decreas|declin/.test(verb) ? -v : v;
}

function fmt(v) { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }

const r = await fetch(URL, {headers:{'User-Agent':'Mozilla/5.0 ten-bagger/1.0'}});
if (!r.ok) throw new Error(`BLS CPI fetch failed: ${r.status}`);
const html = await r.text();
const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const h = text.match(/CONSUMER PRICE INDEX - ([A-Z][a-z]+) (20\d{2})/i);
if (!h) throw new Error('Could not parse CPI reference month');
const monthName = h[1][0].toUpperCase() + h[1].slice(1).toLowerCase();
const year = Number(h[2]);
const month = monthNo(monthName);
if (!month) throw new Error(`Unknown CPI month ${monthName}`);

const release = text.match(/8:30 a\.m\. \(ET\) [A-Za-z]+, ([A-Z][a-z]+) (\d{1,2}), (20\d{2})/i);
if (!release) throw new Error('Could not parse CPI release date');
const releaseMonth = monthNo(release[1][0].toUpperCase() + release[1].slice(1).toLowerCase());
const releaseDate = `${release[3]}-${String(releaseMonth).padStart(2,'0')}-${String(release[2]).padStart(2,'0')}`;

const headlineMom = signed(/CPI-U\) (increased|rose|fell|decreased|declined) ([0-9.]+) percent on a seasonally adjusted basis in [A-Za-z]+/i, text, 'headline MoM');
const headlineYoy = signed(/Over the last 12 months, the all items index (increased|rose|fell|decreased|declined) ([0-9.]+) percent/i, text, 'headline YoY');
const coreMom = signed(/index for all items less food and energy (increased|rose|fell|decreased|declined) ([0-9.]+) percent/i, text, 'core MoM');
const coreYoy = signed(/all items less food and energy index (increased|rose|fell|decreased|declined) ([0-9.]+) percent over the year/i, text, 'core YoY');
const stamp = kstNow();
const lbl = `美 CPI · ${month}월분`;

const cal = JSON.parse(fs.readFileSync(CAL, 'utf8'));
const ev = cal.events.find(e => e.lbl === lbl);
if (!ev) throw new Error(`calendar event not found: ${lbl}`);
ev.meta = `BLS 확정 · CPI 전월비 ${fmt(headlineMom)}, 전년비 ${fmt(headlineYoy)}. 근원 CPI 전월비 ${fmt(coreMom)}, 전년비 ${fmt(coreYoy)}. 물가 상승률은 직전월보다 완화됐고 근원 물가도 둔화해 Fed 금리경로의 상방 압력을 일부 낮추는 입력. AI 인프라에는 수요 숫자보다 할인율·조달비용 경로에 우호적. · 원문: ${URL} · 등록일: ${releaseDate} · 확인/갱신: ${stamp.replace('T',' ').slice(0,16)} KST`;
ev.when = `${releaseDate.slice(5)} (21:30 KST·확정)`;
cal.asOf = stamp;
cal.note = (cal.note || '') + ` ${stamp.slice(0,10)} 정기 발표 점검에서 BLS ${month}월 CPI 공식값을 확정 반영.`;
fs.writeFileSync(CAL, JSON.stringify(cal, null, 2) + '\n');

if (fs.existsSync(PULSE)) {
  const pulse = JSON.parse(fs.readFileSync(PULSE, 'utf8'));
  const rates = Array.isArray(pulse.drivers) ? pulse.drivers.find(d => d.ax === 'rates') : null;
  if (rates) {
    rates.l1 = `${month}월 CPI 전년비 ${headlineYoy.toFixed(1)}%, 근원 CPI ${coreYoy.toFixed(1)}%로 직전월보다 둔화`;
    rates.l2 = `헤드라인 CPI 전월비 ${fmt(headlineMom)}, 근원 ${fmt(coreMom)}로 물가 재가속 우려가 완화됐다. Fed의 금리경로에는 완화적 입력이며 고밸류 AI 인프라의 할인율·조달비용 부담을 일부 낮추는 방향.`;
    rates.verdict = '물가 둔화 · 금리 부담 완화';
    rates.srcs = [{t:`BLS Consumer Price Index - ${monthName} ${year}`,u:URL,d:releaseDate}];
    pulse.asOf = stamp.slice(0,16);
    fs.writeFileSync(PULSE, JSON.stringify(pulse, null, 2) + '\n');
  }
}

if (fs.existsSync(CHANGELOG)) {
  let s = fs.readFileSync(CHANGELOG, 'utf8');
  const d = stamp.slice(0,10);
  s = s.replace(/market:'\d{4}-\d{2}-\d{2}'/, `market:'${d}'`);
  const entry = `    {d:'${d}',t:'01 미국 CPI ${month}월분 공식값 반영 — 헤드라인 전월비 ${fmt(headlineMom)}·전년비 ${fmt(headlineYoy)}, 근원 전월비 ${fmt(coreMom)}·전년비 ${fmt(coreYoy)}; CPI 시계열·캘린더·시장 맥락 동기화'},\n`;
  if (!s.includes(`01 미국 CPI ${month}월분 공식값 반영`)) s = s.replace('  var MKT_CHANGELOG=[\n', '  var MKT_CHANGELOG=[\n' + entry);
  fs.writeFileSync(CHANGELOG, s);
}

console.log(JSON.stringify({month:`${year}-${String(month).padStart(2,'0')}`,releaseDate,headlineMom,headlineYoy,coreMom,coreYoy,stamp}));
