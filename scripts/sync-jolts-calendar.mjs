#!/usr/bin/env node
/** BLS 공식 JOLTS 발표 일정을 calendar.json에 동기화한다. */
import { readFileSync, writeFileSync } from 'node:fs';

const BLS_URL = 'https://www.bls.gov/schedule/news_release/jolts.htm';
const CAL_PATH = process.env.CALENDAR_PATH || 'calendar.json';
const MONTH = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
const FULL_MONTH = { January:1, February:2, March:3, April:4, May:5, June:6, July:7, August:8, September:9, October:10, November:11, December:12 };

function text(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

export function parseSchedule(html) {
  const rx = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/g;
  const rows = [];
  for (const m of text(html).matchAll(rx)) {
    let hour = Number(m[6]) % 12;
    if (m[8] === 'PM') hour += 12;
    rows.push({ referenceMonth:`${m[2]}년 ${FULL_MONTH[m[1]]}월`, year:Number(m[5]), month:MONTH[m[3]], day:Number(m[4]), hour, minute:Number(m[7]) });
  }
  if (!rows.length) throw new Error('BLS JOLTS 일정 표를 해석하지 못했습니다.');
  return rows;
}

function zonedLocalToUtc({ year, month, day, hour, minute }, timeZone) {
  let guess = Date.UTC(year, month, day, hour, minute);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
    guess += Date.UTC(year, month, day, hour, minute) - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  }
  return new Date(guess);
}

function kstParts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  return Object.fromEntries(fmt.formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
}

export function toEvent(row, checkedAt) {
  const p = kstParts(zonedLocalToUtc(row, 'America/New_York'));
  return {
    d:`${p.year}-${p.month}-${p.day}`, cat:'macro', lbl:`미국 JOLTS 구인·이직 보고서 · ${row.referenceMonth}`,
    meta:`미국 노동통계국(BLS) 공식 발표 일정. 확인 포인트=구인건수, 채용, 자발적 퇴직률 및 노동수요 둔화 여부. 발표 시각은 미국 동부시간에서 한국시간으로 변환. · 원문: ${BLS_URL} · 확인: ${checkedAt} KST`,
    when:`${p.month}-${p.day} ${p.hour}:${p.minute} KST (발표)`
  };
}

async function main() {
  const html = process.env.BLS_JOLTS_HTML ? readFileSync(process.env.BLS_JOLTS_HTML, 'utf8')
    : await fetch(BLS_URL, { headers:{ 'user-agent':'AlphaMap calendar sync (official BLS schedule)' } }).then(r => { if (!r.ok) throw new Error(`BLS 응답 오류: ${r.status}`); return r.text(); });
  const checkedAt = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const official = parseSchedule(html).map(r => toEvent(r, checkedAt)).filter(e => e.d >= checkedAt);
  const cal = JSON.parse(readFileSync(CAL_PATH, 'utf8'));
  const others = (cal.events || []).filter(e => !String(e.lbl || '').startsWith('미국 JOLTS 구인·이직 보고서'));
  cal.events = [...others, ...official].sort((a,b) => String(a.d).localeCompare(String(b.d)) || String(a.lbl).localeCompare(String(b.lbl), 'ko'));
  if (!String(cal.source || '').includes('BLS JOLTS')) cal.source = `${cal.source} · BLS JOLTS 공식 발표 일정`;
  writeFileSync(CAL_PATH, JSON.stringify(cal, null, 1) + '\n');
  console.log(`[jolts] ${official.length}개 미래 일정을 KST로 동기화했습니다.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch(e => { console.error(e); process.exit(1); });
