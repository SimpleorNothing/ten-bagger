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

// 성장률과 Forward PER/GARP는 같은 FY+1 EPS 컨센서스를 동시에 사용한다.
// 커버리지가 1~2명뿐인 종목에서 한 명의 낙관적 추정치가 성장·밸류를 동시에 끌어올리는
// 이중 과대평가를 막기 위해 두 차원만 중립값(50) 쪽으로 축소한다.
// 5명 이상은 원점수를 유지하고, 1명은 55%, 2명은 70%, 3명은 80%, 4명은 90%만 신뢰한다.
function analystCoverage(G) {
  const raw = Number(G?.rev?.rating?.n);
  const count = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  const confidence = count == null ? 1 : count >= 5 ? 1 : ({ 1: 0.55, 2: 0.70, 3: 0.80, 4: 0.90 }[count] ?? 1);
  return { count, confidence, lowCoverage: count != null && count < 5 };
}
const shrinkToNeutral = (score, confidence) => score == null ? null : 50 + (score - 50) * confidence;

function recentPriceShock(G, lookbackDays = 7) {
  const rows = (Array.isArray(G.priceHist) ? G.priceHist : [])
    .filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.d || '')) && Number(x.p) > 0)
    .map((x) => ({ d: String(x.d), p: Number(x.p) }))
    .sort((a, b) => a.d.localeCompare(b.d));
  if (rows.length < 2) return { worst1d: null, shockDate: null, preShockPrice: null, residualFromPreShock: null };

  const last = rows[rows.length - 1];
  const lastMs = Date.parse(last.d + 'T00:00:00Z');
  const cutoffMs = lastMs - lookbackDays * 864e5;
  let worst = null;
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i];
    const curMs = Date.parse(cur.d + 'T00:00:00Z');
    if (!Number.isFinite(curMs) || curMs < cutoffMs || !(prev.p > 0)) continue;
    const ret = (cur.p / prev.p - 1) * 100;
    if (!worst || ret < worst.ret) worst = { ret, d: cur.d, prev: prev.p };
  }
  if (!worst) return { worst1d: null, shockDate: null, preShockPrice: null, residualFromPreShock: null };
  const current = Number(G.price) > 0 ? Number(G.price) : last.p;
  const residual = worst.prev > 0 ? (current / worst.prev - 1) * 100 : null;
  return { worst1d: worst.ret, shockDate: worst.d, preShockPrice: worst.prev, residualFromPreShock: residual };
}

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
  const growthPercentile = percentile(x.epsGrowth, 'eps_growth');
  const fy1RevisionPercentile = percentile(x.fy1.c30, 'fy1_c30');
  const coverageInfo = analystCoverage(G);
  const shock = recentPriceShock(G, 7);
  const fundamentalPreserved =
    growthPercentile != null && growthPercentile >= 60 &&
    shock.worst1d != null && shock.worst1d <= -8 &&
    shock.residualFromPreShock != null && shock.residualFromPreShock <= -5 &&
    x.fy1.c30 != null && x.fy1.c30 >= 0 &&
    (x.fy1.c7 == null || x.fy1.c7 >= -1) &&
    (x.q1.c30 == null || x.q1.c30 >= -1) &&
    (x.tp.c7 == null || x.tp.c7 >= -3) &&
    (x.br == null || x.br >= 50) &&
    G.g !== 'spent';

  const dislocationSeverity = fundamentalPreserved ? weighted([
    [range(-shock.worst1d, 8, 18), 60],
    [range(-shock.residualFromPreShock, 5, 18), 40],
  ]).score : null;
  const fundamentalStrength = fundamentalPreserved ? weighted([
    [growthPercentile, 35],
    [fy1RevisionPercentile, 25],
    [x.br, 20],
    [x.tp.c7 == null ? null : range(x.tp.c7, -3, 5), 20],
  ]).score : null;
  const dislocationBonus = fundamentalPreserved && dislocationSeverity != null
    ? clamp((dislocationSeverity / 100) * (0.6 + 0.4 * ((fundamentalStrength ?? 50) / 100)) * 10, 0, 10)
    : 0;

  const revision = weighted([
    [percentile(x.q1.c30, 'q1_c30'), 30], [percentile(x.q1.c90, 'q1_c90'), 15],
    [percentile(x.fy1.c30, 'fy1_c30'), 35], [percentile(x.fy1.c90, 'fy1_c90'), 20],
  ]);
  const rawGrowthScore = growthPercentile;
  const rawValuationScore = weighted([[x.fwdPE == null ? null : 100 - percentile(x.fwdPE, 'fwd_pe'), 60], [percentile(x.garp, 'garp'), 40]]).score;
  const growth = weighted([[shrinkToNeutral(rawGrowthScore, coverageInfo.confidence), 100]]);
  const valuation = weighted([[shrinkToNeutral(rawValuationScore, coverageInfo.confidence), 100]]);
  const consensus = weighted([[x.br, 60], [x.rating.mean == null ? null : 100 - percentile(x.rating.mean, 'rating'), 40]]);
  const gap30 = x.px.c30 == null || x.fy1.c30 == null ? null : x.px.c30 - x.fy1.c30;
  // 최근 급락이 있었지만 EPS/목표가/컨센서스가 유지되는 성장주는 30일 누적 과열 신호를
  // 그대로 적용하지 않는다. 아직 회복되지 않은 급락폭만큼 과거 30일 가격 선행분을 상쇄한다.
  const resetCredit = fundamentalPreserved && shock.residualFromPreShock != null
    ? clamp(-shock.residualFromPreShock, 0, 15)
    : 0;
  const resetAdjustedGap30 = gap30 == null ? null : Math.max(0, gap30 - resetCredit);
  const estimateLead = weighted([[resetAdjustedGap30 == null ? null : clamp(100 - resetAdjustedGap30 / 30 * 100, 0, 100), 100]]);
  const dims = [['revisionMomentum', revision, 35], ['growth', growth, 20], ['valuation', valuation, 20], ['consensus', consensus, 10], ['estimateLead', estimateLead, 15]];
  let available = 0, value = 0, coverageWeight = 0;
  for (const [, d, w] of dims) {
    coverageWeight += w * d.coverage;
    if (d.score != null) { available += w; value += d.score * w; }
  }
  const baseDataScore = available ? value / available : null, coverage = coverageWeight / 100;
  // dislocationBonus는 가격 하락 그 자체가 아니라 '성장성 + 실적추정 유지 + 목표가/컨센서스 비훼손'
  // 조건을 모두 통과한 경우에만 외생 데이터 점수에 더한다. Falling knife에는 0점이다.
  const dataScore = baseDataScore == null ? null : clamp(baseDataScore + dislocationBonus, 0, 100);
  const gammaAdjustment = ({ open: 2, flagged: -2, spent: -6 })[G.g] ?? 0;
  const stageAdjustment = ({ '태동': 0, '초입': 2, '가속': 1, '성숙': -2, '과열': -5 })[G.stage] ?? 0;
  const adjustment = gammaAdjustment + stageAdjustment;
  const score = coverage >= .55 && dataScore != null ? Math.round(clamp(dataScore + adjustment, 0, 100)) : null;
  const absoluteRevision = x.fy1.c30 == null ? '자료없음' : x.fy1.c30 > 0 ? '상향' : x.fy1.c30 < 0 ? '하향' : '보합';
  const label = score == null ? '자료부족' : score >= 80 && x.fy1.c30 > 0 && x.q1.c30 >= 0 ? '최우선' : score >= 68 && x.fy1.c30 > 0 ? '우선' : score >= 55 ? '중립' : score >= 45 ? '관찰' : '후순위';
  return {
    score, label, dataScore, baseDataScore, opportunityAdjustment: dislocationBonus,
    adjustment, adjustmentDetail: { gamma: gammaAdjustment, stage: stageAdjustment }, coverage,
    dimensions: Object.fromEntries(dims.map(([k, d]) => [k, d.score])),
    inputs: {
      epsGrowth: x.epsGrowth, fwdPE: x.fwdPE, garp: x.garp, breadth: x.br,
      gap30, resetAdjustedGap30, resetCredit, fy1c30: x.fy1.c30, absoluteRevision,
      analystCoverage: {
        analystCount: coverageInfo.count,
        confidence: coverageInfo.confidence,
        lowCoverage: coverageInfo.lowCoverage,
        adjustedDimensions: coverageInfo.lowCoverage ? ['growth', 'valuation'] : [],
        rawGrowthScore,
        rawValuationScore,
      },
      fundamentalDislocation: {
        qualified: fundamentalPreserved,
        shock7dWorst1d: shock.worst1d,
        shockDate: shock.shockDate,
        preShockPrice: shock.preShockPrice,
        residualFromPreShock: shock.residualFromPreShock,
        growthPercentile,
        fy1RevisionPercentile,
        severity: dislocationSeverity,
        fundamentalStrength,
        bonus: dislocationBonus,
        gates: {
          growth: growthPercentile != null && growthPercentile >= 60,
          priceShock: shock.worst1d != null && shock.worst1d <= -8,
          stillDislocated: shock.residualFromPreShock != null && shock.residualFromPreShock <= -5,
          fy1Revision: x.fy1.c30 != null && x.fy1.c30 >= 0 && (x.fy1.c7 == null || x.fy1.c7 >= -1),
          nearTermRevision: x.q1.c30 == null || x.q1.c30 >= -1,
          targetPreserved: x.tp.c7 == null || x.tp.c7 >= -3,
          consensusPreserved: x.br == null || x.br >= 50,
          gammaNotSpent: G.g !== 'spent',
        },
      },
    },
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
  schema: 'investment-scores-v4', modelVersion: '4.2.0', asOf: new Date().toISOString(),
  gammaAsOf: gammaDoc.asOf || null, benchmarkAsOf: benchmark.asOf,
  displayedModel: 'v4', methodology: 'external data score + low-analyst-coverage shrinkage for growth/valuation + fundamental-preserving growth-stock dislocation bonus + explicit internal judgment adjustment; no duplicate downside penalties', rows,
};
fs.writeFileSync('scores.json', JSON.stringify(output, null, 2) + '\n');
console.log(`wrote scores.json for ${Object.keys(rows).length} tickers`);
