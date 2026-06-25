// cycle.json E군집(추정 γ) 자동 파생기 — gamma.json 단일소스 재사용.
// update-prices.yml에서 fetch-gamma.mjs 직후 실행(GitHub Actions, 인터넷 가능).
// 규칙: E point = (주가/목표가 − 1)×100  [gamma.json의 price·target 재사용]
//   point ≤ −5% → open(🟢, 목표가가 주가 위) / −5<point<+5 → 전환 / point ≥ +5% → spent(🔴, 주가가 목표 추월)
//   클러스터 lamp: 전부 open→green / 전부 spent→red / 혼재→amber
// 커밋 게이트(memory #12 규율): 램프 플립 OR 어느 종목이든 |Δpoint|≥1 일 때만 cycle.json 기록.
//   그 외(미세 틱)는 무기록 → 일일 배포 처닝·asOf 잡음 방지.
// gamma.json에 종목이 없거나 stale(staleSince)이면 그 종목 point는 직전값 유지(graceful).

import fs from 'node:fs';

const GAMMA = 'gamma.json';
const CYC = 'cycle.json';

// E series labels 순서 ↔ gamma.json 키 (라벨 불변)
const MAP = [
  ['마이크론', 'MU'],
  ['SK하이닉스', '000660'],
  ['삼성전자', '005930'],
];
const SHORT = ['MU', 'SK', '삼성'];

function band(v) { return v <= -5 ? 'open' : (v >= 5 ? 'spent' : '전환'); }
function sym(b) { return b === 'open' ? '(γ open🟢)' : (b === 'spent' ? '(γ spent🔴)' : '(전환)'); }

function main() {
  let g, cyc;
  try { g = JSON.parse(fs.readFileSync(GAMMA, 'utf8')); }
  catch (e) { console.log('gamma.json 없음/파싱실패 — E 파생 skip'); return; }
  try { cyc = JSON.parse(fs.readFileSync(CYC, 'utf8')); }
  catch (e) { console.log('cycle.json 없음/파싱실패 — E 파생 skip'); return; }

  const E = (cyc.clusters || []).find((c) => c.id === 'E');
  if (!E || !E.series || !Array.isArray(E.series.points)) { console.log('cycle E 구조 이상 — skip'); return; }

  const gm = g.gamma || {};
  const oldPts = E.series.points.slice();
  const oldLamp = E.lamp;
  const pts = oldPts.slice(); // 기본=직전값 유지

  MAP.forEach((m, i) => {
    const e = gm[m[1]];
    const valid = e && e.price > 0 && e.target > 0 && !e.staleSince;
    if (valid) {
      pts[i] = +(((e.price / e.target) - 1) * 100).toFixed(1);
    } else {
      console.log(`  ${m[0]}(${m[1]}) gamma 없음/stale → 직전 point ${oldPts[i]} 유지`);
    }
  });

  const bnd = pts.map(band);
  let lamp = 'amber';
  if (bnd.every((b) => b === 'open')) lamp = 'green';
  else if (bnd.every((b) => b === 'spent')) lamp = 'red';

  const now = pts.map((v, i) => `${SHORT[i]} ${v > 0 ? '+' : ''}${v}% ${sym(bnd[i])}`).join('·');

  const moved = pts.some((v, i) => Math.abs(v - oldPts[i]) >= 1);
  const lampFlip = lamp !== oldLamp;
  if (!moved && !lampFlip) {
    console.log(`cycle E 무변동(밴드·Δ<1) — write skip. points=${JSON.stringify(pts)} lamp=${lamp}`);
    return;
  }

  E.series.points = pts;
  E.lamp = lamp;
  E.now = now;
  cyc.asOf = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(CYC, JSON.stringify(cyc) + '\n');
  console.log(`cycle E updated: ${JSON.stringify(oldPts)}/${oldLamp} → ${JSON.stringify(pts)}/${lamp}${lampFlip ? ' (LAMP FLIP)' : ''}`);
  console.log(`  now: ${now}`);
  console.log(`  asOf → ${cyc.asOf}`);
}

main();
