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
console.log('00 money-flow static invariants passed');
