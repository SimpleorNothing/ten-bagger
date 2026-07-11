#!/usr/bin/env node
/**
 * derive-calendar.mjs — 01 투자 캘린더 데일리 self-refresh
 *
 * 하는 일 (전부 결정론·외부 네트워크 의존 없음):
 *   1) calendar.json 로드
 *   2) 지난 이벤트 프루닝(d < today - grace)  → 임박 카드 항상 신선
 *   3) asOf · geo.asOf 를 실행시각(KST)으로 갱신 → updCal 배지 자동 신선
 *   4) (best-effort) news.json 에서 지정학 키워드 헤드라인을 geo.items 후보로 append
 *      — 후보 전용(비승격). 게이트/상태 판정은 수기(narrative≠numbers).
 *
 * 안 하는 일: 신규 이벤트 큐레이션·게이트 판정·judgment/earnings/holdings 변경.
 * 크론 활성화는 .github/workflows/update-calendar.yml (운영자 수동 추가 — App workflow write 부재).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CAL = 'calendar.json';
const NEWS = 'news.json';
const GEO_KW = ['이란','호르무즈','휴전','전쟁','유가','중동','ceasefire','Hormuz','Iran','oil','OPEC','원유','지정학'];
const GEO_MAX = 12; // geo 후보 상한(오래된 것부터 절삭)

function kstNowISO() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`
       + `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+09:00`;
}
function kstTodayYMD() { return kstNowISO().slice(0, 10); }
function ddiff(ymd, today) {
  return Math.round((Date.parse(ymd + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5);
}

function main() {
  if (!existsSync(CAL)) { console.error('[cal] calendar.json 없음 — 스킵'); process.exit(0); }
  let cal;
  try { cal = JSON.parse(readFileSync(CAL, 'utf8')); }
  catch (e) { console.error('[cal] parse 실패 — 미변경 종료:', e.message); process.exit(0); }

  const now = kstNowISO();
  const today = kstTodayYMD();
  const grace = Number.isFinite(cal.grace) ? cal.grace : 0;

  // 2) 과거 이벤트 프루닝
  let pruned = 0;
  if (Array.isArray(cal.events)) {
    const before = cal.events.length;
    cal.events = cal.events
      .filter(e => e && typeof e.d === 'string')
      .filter(e => ddiff(e.d, today) >= -grace)
      .sort((a, b) => ddiff(a.d, today) - ddiff(b.d, today));
    pruned = before - cal.events.length;
  }

  // 3) asOf 갱신
  cal.asOf = now;
  cal.geo = cal.geo || { note: '지정학 후보 피드(비승격).', items: [] };
  cal.geo.asOf = now;
  cal.geo.items = Array.isArray(cal.geo.items) ? cal.geo.items : [];

  // 4) news.json 지정학 후보 스캔(best-effort · 후보 전용)
  let added = 0;
  try {
    if (existsSync(NEWS)) {
      const news = JSON.parse(readFileSync(NEWS, 'utf8'));
      const items = Array.isArray(news.items) ? news.items : [];
      const seen = new Set(cal.geo.items.map(g => (g.src || g.html || '').slice(0, 80)));
      for (const it of items) {
        const t = String(it.title || '');
        if (!GEO_KW.some(k => t.includes(k))) continue;
        const key = t.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);
        cal.geo.items.push({
          d: (it.published || today).slice(0, 10),
          tag: '후보',
          status: 'candidate',
          src: t,
          link: it.link || '',
          html: t + ' — [자동 후보·미승격] 게이트 반영은 수기.'
        });
        added++;
      }
      cal.geo.items.sort((a, b) => String(a.d).localeCompare(String(b.d)));
      if (cal.geo.items.length > GEO_MAX) cal.geo.items = cal.geo.items.slice(-GEO_MAX);
    }
  } catch (e) { console.error('[cal] news 스캔 실패(무시):', e.message); }

  try {
    writeFileSync(CAL, JSON.stringify(cal, null, 1) + '\n', 'utf8');
    console.log(`[cal] OK · asOf=${now} · events=${cal.events?.length ?? 0} · pruned=${pruned} · geo+${added}`);
  } catch (e) { console.error('[cal] write 실패:', e.message); process.exit(1); }
}
main();
