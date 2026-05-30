// judgment-diff.mjs — 두 판단층 스냅샷의 종목별 wk·m3 델타와 사분면 전이를 출력.
// usage: node scripts/judgment-diff.mjs history/judgment_260524.json judgment.json
// aN:[wk, m3, y1] · X=m3(3개월), Y=wk(다음주).
import fs from 'fs';

const [, , aPath, bPath] = process.argv;
if (!aPath || !bPath) {
  console.error('usage: node scripts/judgment-diff.mjs <before.json> <after.json>');
  process.exit(1);
}
const load = p => (JSON.parse(fs.readFileSync(p, 'utf8')).overrides || {});
const A = load(aPath), B = load(bPath);

const quad = (wk, m3) => {
  if (wk == null || m3 == null) return '—';
  if (m3 >= 0 && wk >= 0) return '① 알파';
  if (m3 >= 0 && wk < 0)  return '② 중기알파';
  if (m3 < 0 && wk < 0)   return '③ 벤치이하';
  return '④ 단기만';
};

const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
console.log(`판단층 diff: ${aPath} → ${bPath}`);
console.log('종목\t이전(wk,m3)\t이후(wk,m3)\t사분면 전이\twhy');
let n = 0;
for (const k of keys) {
  const a = A[k]?.aN || [null, null], b = B[k]?.aN || [null, null];
  if (JSON.stringify(a) === JSON.stringify(b)) continue;
  const qa = quad(a[0], a[1]), qb = quad(b[0], b[1]);
  const trans = qa === qb ? qa : `${qa} → ${qb}`;
  console.log(`${k}\t(${a[0]},${a[1]})\t(${b[0]},${b[1]})\t${trans}\t${B[k]?.why || ''}`);
  n++;
}
console.log(`\n변동 ${n}건.`);
