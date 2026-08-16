// Reproducible daily investment-attractiveness snapshot.
// V3 is retained for comparison; V4 is the displayed model.
import fs from 'node:fs';

const gammaDoc = JSON.parse(fs.readFileSync('gamma.json', 'utf8'));
const benchmark = JSON.parse(fs.readFileSync('revision-benchmark.json', 'utf8'));
const holdings = JSON.parse(fs.readFileSync('holdings.json', 'utf8'));
if (benchmark.schema !== 'revision-benchmark-v2') throw new Error('revision-benchmark-v2 required');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const range = (v, lo, hi) => v == null ? null : clamp((v - lo) / (hi - lo) * 100, 0, 100);
const inverseRange = (v, lo, hi) => v == null ? null : 100 - range(v, lo, hi);
const weighted = (items) => {
  let available = 0, value = 0, full = 0;
  for (const [score, weight] of items) {
    full += weight;
    if (score != null && Number.isFinite(score)) { available += weight; value += score * weight; }
  }
  return { score: available ? value / available : null, coverage: full ? available / full : 0 };
};
const breadth = (up, down) => {
  if (up == null && down == null) return null;
  const u = up || 0, d = down || 0;
  return u + d ? 100 * u / (u + d) : null;
};

function percentile(value, key) {
  const xs = benchmark.distributions?.[key];
  if (value == null || !Array.isArray(xs) || xs.length < benchmark.minimumSample) return null;
  if (value <= xs[0]) return 0;
  if (value >= xs[xs.length - 1]) return 100;
  let lo = 0, hi = xs.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (xs[mid] < value) lo = mid + 1; else hi = mid; }
  let upper = lo;
  while (upper < xs.length && xs[upper] === value) upper++;
  const midRank = (lo + upper - 1) / 2;
  return clamp(midRank / (xs.length - 1) * 100, 0, 100);
}

function common(G) {
  const R = G.rev || {}, E = R.eps || {}, fy1 = E.fy1 || {}, fy0 = E.fy0 || {}, q1 = E.q1 || {};
  const epsGrowth = fy1.now > 0 && fy0.now > 0 ? (fy1.now / fy0.now - 1) * 100 : null;
  const fwdPE = G.price > 0 && fy1.now > 0 ? G.price / fy1.now : null;
  const garp = epsGrowth > 0 && fwdPE > 0 ? epsGrowth / fwdPE : null;
  return { R, fy1, fy0, q1, px: R.px || {}, tp: R.tp || {}, rating: R.rating || {}, epsGrowth, fwdPE, garp, br: breadth(fy1.up30, fy1.dn30) };
}

function v3(G) {
  const x = common(G), m = benchmark.metrics;
  const oldRevision = (v, key) => v == null || !m[key] ? null : range(v, m[key].p10, m[key].p90);
  const s3 = weighted([[oldRevision(x.q1.c30, 'q1_c30'), 50], [oldRevision(x.q1.c90, 'q1_c90'), 20], [oldRevision(x.fy1.c30, 'fy1_c30'), 30]]);
  const s6 = weighted([[range(x.epsGrowth, -10, 60), 60], [oldRevision(x.fy1.c90, 'fy1_c90'), 25], [oldRevision(x.fy1.c30, 'fy1_c30'), 15]]);
  const val = weighted([[range(G.pct, -10, 60), 45], [range(x.garp, 0, 2), 35], [range(x.tp.c30, -5, 10), 20]]);
  const gammaScore = ({ open: 88, flagged: 55, spent: 20 })[G.g] ?? null;
  const stageScore = ({ '태동': 72, '초입': 82, '가속': 92, '성숙': 58, '과열': 30 })[G.stage] ?? null;
  const cat = weighted([[oldRevision(x.q1.c30, 'q1_c30'), 25], [range(x.tp.c30, -5, 10), 20], [gammaScore, 25], [stageScore, 15], [x.br, 15]]);
  const con = weighted([[x.br, 60], [x.rating.mean != null ? inverseRange(x.rating.mean, 1, 5) : null, 40]]);
  const dims = [['short', s3, 30], ['medium', s6, 25], ['valuation', val, 20], ['catalyst', cat, 15], ['consensus', con, 10]];
  let ew = 0, ev = 0;
  for (const [, d, w] of dims) if (d.score != null) { const effective = w * d.coverage; ew += effective; ev += d.score * effective; }
  let penalty = 0;
  if (x.px.c30 != null && x.fy1.c30 != null) { const gap = x.px.c30 - x.fy1.c30; if (gap > 10) penalty += clamp((gap - 10) / 20 * 6, 0, 6); }
  if (x.q1.c30 < 0 && m.q1_c30?.p10 < 0) penalty += clamp(-x.q1.c30 / Math.abs(m.q1_c30.p10) * 4, 0, 4);
  if (x.fy1.c30 < 0 && m.fy1_c30?.p10 < 0) penalty += clamp(-x.fy1.c30 / Math.abs(m.fy1_c30.p10) * 4, 0, 4);
  if (G.g === 'spent') penalty += 6; else if (G.flagged || G.g === 'flagged') penalty += 3;
  if (G.stage === '과열') penalty += 8;
  if (G.pct > 60 && x.tp.c30 <= 0) penalty += clamp(((G.pct - 60) / 60 * 5) + ((-x.tp.c30) / 5 * 2), 0, 7);
  if (x.fy1.up30 != null || x.fy1.dn30 != null) { const u = x.fy1.up30 || 0, d = x.fy1.dn30 || 0; if (d > u) penalty += clamp((d - u) / Math.max(1, u + d) * 4, 0, 4); }
  penalty = clamp(penalty, 0, 20);
  const base = ew ? ev / ew : null, coverage = ew / 100;
  return { score: coverage >= .55 && base != null ? Math.round(clamp(base - penalty, 0, 100)) : null, base, adjustment: -penalty, coverage, dimensions: Object.fromEntries(dims.map(([k, d]) => [k, d.score])) };
}

function v4(G) {
  const x = common(G);
  const revision = weighted([
    [percentile(x.q1.c30, 'q1_c30'), 30], [percentile(x.q1.c90, 'q1_c90'), 15],
    [percentile(x.fy1.c30, 'fy1_c30'), 35], [percentile(x.fy1.c90, 'fy1_c90'), 20],
  ]);
  const growth = weighted([[percentile(x.epsGrowth, 'eps_growth'), 100]]);
  const valuation = weighted([[x.fwdPE == null ? null : 100 - percentile(x.fwdPE, 'fwd_pe'), 60], [percentile(x.garp, 'garp'), 40]]);
  const consensus = weighted([[x.br, 60], [x.rating.mean == null ? null : 100 - percentile(x.rating.mean, 'rating'), 40]]);
  const gap30 = x.px.c30 == null || x.fy1.c30 == null ? null : x.px.c30 - x.fy1.c30;
  const estimateLead = weighted([[gap30 == null ? null : clamp(100 - Math.max(0, gap30) / 30 * 100, 0, 100), 100]]);
  const dims = [['revisionMomentum', revision, 35], ['growth', growth, 20], ['valuation', valuation, 20], ['consensus', consensus, 10], ['estimateLead', estimateLead, 15]];
  let available = 0, value = 0, coverageWeight = 0;
  for (const [, d, w] of dims) {
    coverageWeight += w * d.coverage;
    if (d.score != null) { available += w; value += d.score * w; }
  }
  const dataScore = available ? value / available : null, coverage = coverageWeight / 100;
  const gammaAdjustment = ({ open: 2, flagged: -2, spent: -6 })[G.g] ?? 0;
  const stageAdjustment = ({ '태동': 0, '초입': 2, '가속': 1, '성숙': -2, '과열': -5 })[G.stage] ?? 0;
  const adjustment = gammaAdjustment + stageAdjustment;
  const score = coverage >= .55 && dataScore != null ? Math.round(clamp(dataScore + adjustment, 0, 100)) : null;
  const absoluteRevision = x.fy1.c30 == null ? '자료없음' : x.fy1.c30 > 0 ? '상향' : x.fy1.c30 < 0 ? '하향' : '보합';
  const label = score == null ? '자료부족' : score >= 80 && x.fy1.c30 > 0 && x.q1.c30 >= 0 ? '최우선' : score >= 68 && x.fy1.c30 > 0 ? '우선' : score >= 55 ? '중립' : score >= 45 ? '관찰' : '후순위';
  return {
    score, label, dataScore, adjustment, adjustmentDetail: { gamma: gammaAdjustment, stage: stageAdjustment }, coverage,
    dimensions: Object.fromEntries(dims.map(([k, d]) => [k, d.score])),
    inputs: { epsGrowth: x.epsGrowth, fwdPE: x.fwdPE, garp: x.garp, breadth: x.br, gap30, fy1c30: x.fy1.c30, absoluteRevision },
  };
}

const held = new Set((holdings.detail || []).filter((x) => Number(x.qty) > 0).map((x) => String(x.ticker).toUpperCase()));
const rows = {};
for (const [ticker, G] of Object.entries(gammaDoc.gamma || {})) {
  if (G?.instrumentType === 'ETF') continue;
  const oldScore = v3(G), nextScore = v4(G);
  rows[ticker] = { ticker, held: held.has(ticker), v3: oldScore, v4: nextScore, delta: oldScore.score == null || nextScore.score == null ? null : nextScore.score - oldScore.score };
}
const output = {
  schema: 'investment-scores-v4', modelVersion: '4.0.0', asOf: new Date().toISOString(),
  gammaAsOf: gammaDoc.asOf || null, benchmarkAsOf: benchmark.asOf,
  displayedModel: 'v4', methodology: 'external data score + explicit internal judgment adjustment; no duplicate downside penalties', rows,
};
fs.writeFileSync('scores.json', JSON.stringify(output, null, 2) + '\n');
console.log(`wrote scores.json for ${Object.keys(rows).length} tickers`);
