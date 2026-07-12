#!/usr/bin/env node
/**
 * check-docs.mjs — 운영 문서 드리프트 가드
 *
 * STYLE_GUIDE.md 의 토큰 표가 라이브 코드(index.html :root ← pantone.css :root)와
 * 어긋나면 실패(exit 1)한다. 문서가 조용히 썩는 것(= 침묵하는 오류)을 막는 유일한 방어선.
 *
 *   node scripts/check-docs.mjs         # 검사만 (CI/수동)
 *   node scripts/check-docs.mjs --fix   # STYLE_GUIDE.md 토큰 구역 재생성
 *
 * 토큰 구역은 <!-- TOKENS:BEGIN --> ~ <!-- TOKENS:END --> 사이. 손으로 고치지 않는다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const p = (f) => new URL(f, ROOT);
const FIX = process.argv.includes('--fix');

/** 토큰 설명 — 사람이 관리하는 유일한 부분. 새 토큰은 여기에 한 줄 추가. */
const DESC = {
  '--ink': '페이지 배경 (Cloud Dancer)',
  '--ink2': '배경 변주·바 트랙',
  '--panel': '카드 바탕',
  '--panel2': '카드 내부 요소·입력창',
  '--line': '기본 테두리·구분선',
  '--line2': '강한 테두리·점선',
  '--txt': '본문·제목 (잉크)',
  '--dim': '보조 설명 (Hematite)',
  '--faint': '최약 라벨·주석 (Cloud Cover)',
  '--dawn': '강조·활성 (Blue Fusion)',
  '--accel': '강조 (팬튼에서 단색 통합)',
  '--hot': '강조 (팬튼에서 단색 통합)',
  '--nascent': '강조 (팬튼에서 단색 통합)',
  '--mature': '비활성·약화',
  '--onacc': '강조 배경 위 글자',
  '--st-nascent': '**기능색** 단계=태동',
  '--st-dawn': '**기능색** 단계=여명/초입',
  '--st-accel': '**기능색** 단계=가속',
  '--st-mature': '**기능색** 단계=성숙',
  '--st-hot': '**기능색** 단계=과열',
  '--glow': '글로우 비활성',
  '--serif': '전 서체 (단일 패밀리)',
  '--mono': '데이터·수치 (별도 고정폭 없음)',
  '--sans': '본문',
};

const rootVars = (css) => {
  const m = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!m) return {};
  const out = {};
  for (const [, k, v] of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim();
  return out;
};

const idx = readFileSync(p('index.html'), 'utf8');
const pan = readFileSync(p('pantone.css'), 'utf8');
const base = rootVars(idx);
const over = rootVars(pan);
const eff = { ...base, ...over };
const src = (k) => (k in over ? 'pantone' : 'index');
const font = (idx.match(/pretendard@(v[\d.]+)/) || [, '?'])[1];

const short = (v) => (v.length > 48 ? v.slice(0, 45).replace(/,[^,]*$/, '') + ',…' : v);
const render = () => {
  const rows = Object.entries(eff)
    .map(([k, v]) => `| \`${k}\` | \`${short(v)}\` | ${src(k)} | ${DESC[k] || '—(설명 미기입: DESC에 추가할 것)'} |`)
    .join('\n');
  return [
    '<!-- TOKENS:BEGIN — 자동 생성. 직접 편집 금지. `node scripts/check-docs.mjs --fix` 로 갱신. -->',
    '| 토큰 | 유효값 | 출처 | 용도 |',
    '|---|---|---|---|',
    rows,
    '',
    `웹폰트: Pretendard Variable **${font}** (jsDelivr \`orioncactus/pretendard\`, dynamic-subset)`,
    `<!-- TOKENS:FP ${JSON.stringify({ font, eff })} -->`,
    '<!-- TOKENS:END -->',
  ].join('\n');
};

const guide = readFileSync(p('STYLE_GUIDE.md'), 'utf8');
const RE = /<!-- TOKENS:BEGIN[\s\S]*?<!-- TOKENS:END -->/;
if (!RE.test(guide)) {
  console.error('✖ STYLE_GUIDE.md 에 TOKENS 구역이 없다. --fix 로도 못 고친다(수동 복구).');
  process.exit(1);
}

if (FIX) {
  writeFileSync(p('STYLE_GUIDE.md'), guide.replace(RE, render()), 'utf8');
  console.log('✔ STYLE_GUIDE.md 토큰 구역 재생성. 갱신 이력에 한 줄 남길 것.');
  process.exit(0);
}

const fp = guide.match(/<!-- TOKENS:FP ([\s\S]*?) -->/);
if (!fp) {
  console.error('✖ 지문(TOKENS:FP) 없음 → 문서가 구버전. `node scripts/check-docs.mjs --fix` 실행.');
  process.exit(1);
}
const doc = JSON.parse(fp[1]);
const drift = [];
if (doc.font !== font) drift.push(`폰트 CDN: 문서 ${doc.font} ≠ 라이브 ${font}`);
for (const k of new Set([...Object.keys(doc.eff), ...Object.keys(eff)])) {
  const a = doc.eff[k], b = eff[k];
  if (a === b) continue;
  if (a === undefined) drift.push(`+ 신규 토큰 ${k} = ${b} (${src(k)})`);
  else if (b === undefined) drift.push(`- 삭제 토큰 ${k} (문서엔 ${a})`);
  else drift.push(`~ ${k}: 문서 ${a} ≠ 라이브 ${b} (${src(k)})`);
}
if (drift.length) {
  console.error('✖ STYLE_GUIDE.md 가 라이브 토큰과 어긋난다 (문서 드리프트):');
  drift.forEach((d) => console.error('   ' + d));
  console.error('→ `node scripts/check-docs.mjs --fix` 후 갱신 이력 한 줄 추가.');
  process.exit(1);
}
console.log(`✔ 문서 정합 — 토큰 ${Object.keys(eff).length}종 · 폰트 ${font}`);
