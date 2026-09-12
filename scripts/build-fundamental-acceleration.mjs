import fs from 'node:fs';

const SRC = 'fundamental-acceleration-source.json';
const OUT = 'fundamental-acceleration.json';
const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
if (doc.schema !== 'fundamental-acceleration-source-v1') throw new Error('fundamental-acceleration-source-v1 required');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const range = (v, lo, hi) => v == null ? null : clamp((Number(v) - lo) / (hi - lo) * 100, 0, 100);
const weighted = (items) => {
  let value = 0, weight = 0, full = 0;
  for (const [score, w] of items) {
    full += w;
    if (score != null && Number.isFinite(score)) { value += score * w; weight += w; }
  }
  return { score: weight ? value / weight : null, coverage: full ? weight / full : 0 };
};
const guidanceScore = (state) => ({ raised: 100, strong: 80, reaffirmed: 50, cut: 0 })[state] ?? null;

function build(row) {
  const backlog = row.backlogYoyPct ?? row.backlogSequentialPct;
  const demand = weighted([
    [range(backlog, 0, 80), 45],
    [range(row.bookToBill, 1.0, 1.5), 30],
    [range(row.ordersYoyPct, 0, 100), 25],
  ]);
  const revenue = weighted([[range(row.revenueYoyPct, 10, 100), 100]]);
  const earningsSpread = row.earningsGrowthPct == null || row.revenueYoyPct == null ? null : Number(row.earningsGrowthPct) - Number(row.revenueYoyPct);
  const operatingLeverage = weighted([
    [range(row.marginDeltaBps, 0, 1000), 60],
    [range(earningsSpread, 0, 100), 40],
  ]);
  const guidance = weighted([[guidanceScore(row.guidanceState), 100]]);
  const overall = weighted([
    [demand.score, 35],
    [revenue.score, 25],
    [operatingLeverage.score, 25],
    [guidance.score, 15],
  ]);
  const score = overall.score == null ? null : Math.round(overall.score);
  const label = score == null ? '자료부족' : score >= 80 ? '가속 강함' : score >= 65 ? '가속' : score >= 50 ? '확인' : '관찰';
  return {
    score,
    label,
    coverage: Number(overall.coverage.toFixed(3)),
    dimensions: {
      demandVisibility: demand.score == null ? null : Number(demand.score.toFixed(1)),
      revenueGrowth: revenue.score == null ? null : Number(revenue.score.toFixed(1)),
      operatingLeverage: operatingLeverage.score == null ? null : Number(operatingLeverage.score.toFixed(1)),
      guidance: guidance.score == null ? null : Number(guidance.score.toFixed(1)),
    },
    inputs: {
      revenueYoyPct: row.revenueYoyPct ?? null,
      backlogYoyPct: row.backlogYoyPct ?? null,
      backlogSequentialPct: row.backlogSequentialPct ?? null,
      bookToBill: row.bookToBill ?? null,
      ordersYoyPct: row.ordersYoyPct ?? null,
      marginDeltaBps: row.marginDeltaBps ?? null,
      earningsGrowthPct: row.earningsGrowthPct ?? null,
      earningsGrowthMinusRevenueGrowthPct: earningsSpread,
      guidanceState: row.guidanceState ?? null,
    },
  };
}

const rows = {};
for (const [ticker, row] of Object.entries(doc.rows || {})) {
  rows[ticker] = { ticker, name: row.name, period: row.period, ...build(row), facts: row.facts || [], sources: row.sources || [] };
}
const ranking = Object.values(rows)
  .filter((x) => x.score != null)
  .sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker))
  .map((x, i) => ({ rank: i + 1, ticker: x.ticker, score: x.score, label: x.label }));

const out = {
  schema: 'fundamental-acceleration-v1',
  asOf: doc.asOf,
  generatedAt: new Date().toISOString(),
  method: {
    purpose: 'Find companies where structural demand is already converting into orders/backlog, revenue, operating leverage and raised guidance.',
    weights: { demandVisibility: 35, revenueGrowth: 25, operatingLeverage: 25, guidance: 15 },
    ranges: {
      backlogGrowthPct: [0, 80],
      bookToBill: [1.0, 1.5],
      ordersGrowthPct: [0, 100],
      revenueGrowthPct: [10, 100],
      marginExpansionBps: [0, 1000],
      earningsGrowthMinusRevenueGrowthPct: [0, 100],
    },
    missingData: 'No imputation. Available dimensions are reweighted; coverage is shown separately.',
  },
  ranking,
  rows,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${OUT} for ${ranking.length} tickers`);
