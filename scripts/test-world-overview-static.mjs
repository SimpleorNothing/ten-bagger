import fs from 'node:fs';

const src = fs.readFileSync('world-overview.js','utf8');
const required = [
  '돈의 흐름 지도',
  'wm-gaugebar',
  'wm-river-svg',
  'wm-rot-svg',
  'wm-heat',
  "fetchJSON('/market-flow.json',true)",
  '가격 상대강도 프록시',
  '<span class="n">00</span>시장 지도',
];
for (const token of required) {
  if (!src.includes(token)) throw new Error('00 시장 지도 필수 시각요소 소실: ' + token);
}
if (/Math\.random\s*\(/.test(src)) throw new Error('00 시장 지도에 임의 난수 기반 판단이 들어가면 안 됩니다.');
if (/#[0-9a-fA-F]{3,8}\b/.test(src)) throw new Error('00 시장 지도는 디자인 토큰 대신 하드코딩 색상을 쓰면 안 됩니다.');
if (!/실제 펀드 순유입/.test(src)) throw new Error('자금 흐름 프록시 정의/한계 문구 소실');

const radar = fs.readFileSync('momentum-radar.js','utf8');
new Function(radar);
if (radar.includes("querySelector('.wm-foot')")) throw new Error('급등 후보 레이더가 존재하지 않는 .wm-foot 앵커에 의존하면 안 됩니다.');
if (!radar.includes("querySelector('.wm-note')") || !radar.includes('host.appendChild(panel)')) {
  throw new Error('급등 후보 레이더의 실제 00 시장 지도 마운트 fallback이 없습니다.');
}
if (!radar.includes("new MutationObserver")) throw new Error('00 시장 지도 재렌더 후 레이더 재마운트 보호가 없습니다.');

const loader = fs.readFileSync('site-change-live.js','utf8');
if (!loader.includes('/momentum-radar.js?v=20260904-mountfix')) {
  throw new Error('급등 후보 레이더 수정본의 캐시 버스터가 로더에 연결되지 않았습니다.');
}

const capitalScarcity = fs.readFileSync('capital-scarcity.js','utf8');
new Function(capitalScarcity);
if (/−\?\\-\\d/.test(capitalScarcity) || /\/\\-\\d/.test(capitalScarcity)) {
  throw new Error('capital-scarcity 음수 표시 정규식에 Unicode mode에서 무효한 하이픈 escape가 재유입됐습니다.');
}
console.log('00 money-flow static invariants passed');
