// 00 시장 지도용 가격 상대강도 프록시 수집기.
// 실제 펀드 순유입이 아니라 주요 ETF/달러지수의 종가 상대강도를 저장한다.
// GitHub Actions에서 매일 미국 장 마감 후 실행하며, 모든 필수 시계열이 검증될 때만 market-flow.json을 교체한다.

import fs from 'node:fs';

const OUT = 'market-flow.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const SYMBOLS = [
  { id: 'spy',  ticker: 'SPY',       name: 'S&P500' },
  { id: 'qqq',  ticker: 'QQQ',       name: 'NASDAQ 성장' },
  { id: 'rsp',  ticker: 'RSP',       name: 'S&P500 동일가중' },
  { id: 'iwm',  ticker: 'IWM',       name: 'Russell 2000' },
  { id: 'soxx', ticker: 'SOXX',      name: 'AI 반도체' },
  { id: 'xlu',  ticker: 'XLU',       name: '전력·유틸리티' },
  { id: 'xli',  ticker: 'XLI',       name: '산업재' },
  { id: 'xlf',  ticker: 'XLF',       name: '금융' },
  { id: 'xlv',  ticker: 'XLV',       name: '헬스케어' },
  { id: 'ita',  ticker: 'ITA',       name: '방산' },
  { id: 'dxy',  ticker: 'DX-Y.NYB',  name: '달러 DXY' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const res = j?.chart?.result?.[0];
      const ts = res?.timestamp || [];
      const close = res?.indicators?.quote?.[0]?.close || [];
      const t = [], c = [];
      for (let i = 0; i < ts.length; i++) {
        const v = Number(close[i]);
        // Yahoo chart feed can occasionally emit a zero placeholder for an otherwise
        // valid symbol/day. Treat non-positive closes as missing observations instead
        // of letting them poison short-horizon return calculations.
        if (!(v > 0)) continue;
        t.push(Math.floor(Number(ts[i]) / 86400));
        c.push(+v.toFixed(v >= 1000 ? 0 : 2));
      }
      if (c.length < 120 || t.length !== c.length) throw new Error(`insufficient series ${c.length}`);
      return { t, c };
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(attempt * 1200);
    }
  }
  throw lastErr || new Error('unknown fetch error');
}

function perf(c, n) {
  if (!Array.isArray(c) || c.length <= n) return null;
  const a = Number(c[c.length - 1 - n]), b = Number(c[c.length - 1]);
  if (!(a > 0) || !Number.isFinite(b)) return null;
  return +(((b / a) - 1) * 100).toFixed(2);
}

function epochDayToIso(day) {
  return new Date(Number(day) * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const series = {};
  let newest = 0;
  for (const s of SYMBOLS) {
    const raw = await fetchYahoo(s.ticker);
    const lastDay = raw.t[raw.t.length - 1];
    newest = Math.max(newest, lastDay);
    series[s.id] = {
      ticker: s.ticker,
      name: s.name,
      latest: raw.c[raw.c.length - 1],
      seriesAsOf: epochDayToIso(lastDay),
      perf5d: perf(raw.c, 5),
      perf20d: perf(raw.c, 20),
      perf60d: perf(raw.c, 60),
      t: raw.t,
      c: raw.c,
    };
    console.log(`${s.id.padEnd(5)} ${s.ticker.padEnd(9)} ${series[s.id].latest} 20D=${series[s.id].perf20d}% 60D=${series[s.id].perf60d}%`);
    await sleep(250);
  }

  for (const s of SYMBOLS) {
    const row = series[s.id];
    if (!row || row.t.length !== row.c.length || row.c.length < 120) throw new Error(`invalid ${s.id} series`);
    if (![row.latest, row.perf5d, row.perf20d, row.perf60d].every(Number.isFinite)) throw new Error(`invalid ${s.id} metrics`);
  }

  const out = {
    schema: 'market-flow-v1',
    asOf: epochDayToIso(newest),
    generatedAt: new Date().toISOString(),
    source: {
      provider: 'Yahoo Finance chart feed',
      interval: '1d',
      range: '1y',
      note: '가격 상대강도 관측용. 실제 펀드 순유입/설정·환매 데이터가 아님.',
    },
    definition: '돈의 흐름 = 주요 ETF·달러지수의 가격 상대강도 프록시. 실제 자금 유입액으로 해석하지 않는다.',
    series,
  };

  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`wrote ${OUT} asOf=${out.asOf} series=${Object.keys(series).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
