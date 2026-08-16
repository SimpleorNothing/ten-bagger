import fs from 'node:fs';

const GAMMA='gamma.json';
const INDEX='raw/revisions/index.json';
const OUT_CSV='raw/revisions/latest.csv';
const OUT_JSON='raw/revisions/latest.json';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const esc=(v)=>{
  if(v==null)return '';
  const s=String(v);
  return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
};
const r2=(v)=>Number.isFinite(Number(v))?+Number(v).toFixed(2):null;
const pct=(now,prev)=>(Number.isFinite(Number(now))&&Number.isFinite(Number(prev))&&Number(prev)!==0)
  ? +(((Number(now)/Number(prev))-1)*100).toFixed(2):null;

const NAMES={
  CEG:'컨스텔레이션',LITE:'루멘텀',MRVL:'마벨',MU:'마이크론',QCOM:'퀄컴',BESI:'BESI',RMBS:'램버스',
  APH:'앰페놀','005930':'삼성전자',VRT:'버티브','000660':'SK하이닉스',BE:'블룸에너지',AMD:'AMD',TSLA:'테슬라'
};

function loadSnap(ref){
  if(!ref||!fs.existsSync(ref))return null;
  try{return readJson(ref);}catch{return null;}
}
function fy1(s){return s?.earningsTrend?.fy1||null;}
function sourceUrl(s){return s?.sourceUrl||'';}
function latestFileMap(run){return new Map((run?.files||[]).map(x=>[x.ticker,x]));}

const g=readJson(GAMMA);
const idx=readJson(INDEX);
const runs=Array.isArray(idx.runs)?idx.runs:[];
if(!runs.length)throw new Error('raw/revisions/index.json has no runs');
const curRun=runs[runs.length-1];
const prevRun=runs.length>1?runs[runs.length-2]:null;
const curMap=latestFileMap(curRun),prevMap=latestFileMap(prevRun);

const rows=[];
for(const [tk,e] of Object.entries(g.gamma||{})){
  const curRef=curMap.get(tk)?.ref||e.rev?.provenance?.rawRef||'';
  const prevRef=prevMap.get(tk)?.ref||'';
  const cur=loadSnap(curRef),prev=loadSnap(prevRef);
  const cfy=fy1(cur),pfy=fy1(prev);
  const tpNow=r2(cur?.financialData?.targetMeanPrice ?? e.target);
  const tpPrev=r2(prev?.financialData?.targetMeanPrice);
  const epsNow=r2(cfy?.epsTrend?.current ?? e.rev?.eps?.fy1?.now);
  const epsPrev=r2(pfy?.epsTrend?.current);
  const upd=cur?.retrievedAt||curMap.get(tk)?.retrievedAt||e.rev?.provenance?.retrievedAt||g.asOf||'';
  const provider=cur?.provider||e.rev?.provenance?.provider||'';
  const quoteSource=sourceUrl(cur)||e.rev?.provenance?.sourceUrl||'';
  const chartSource='Yahoo Finance chart API → charts.json';
  const rawSource=curRef;
  const row={
    종목:NAMES[tk]||tk,
    티커:tk,
    업데이트시점:upd,
    목표가:tpNow,
    TP이전값:tpPrev,
    TP현재값:tpNow,
    TP리비전변화율:pct(tpNow,tpPrev),
    TP리비전7일:e.rev?.tp?.c7??null,
    TP리비전30일:e.rev?.tp?.c30??null,
    'FY+1 EPS':epsNow,
    EPS이전값:epsPrev,
    EPS현재값:epsNow,
    EPS리비전변화율:pct(epsNow,epsPrev),
    EPS리비전30일:e.rev?.eps?.fy1?.c30??cfy?.epsRevisionPct?.d30??null,
    EPS리비전90일:e.rev?.eps?.fy1?.c90??cfy?.epsRevisionPct?.d90??null,
    상향30일:e.rev?.eps?.fy1?.up30??cfy?.epsRevisions?.upLast30days??null,
    하향30일:e.rev?.eps?.fy1?.dn30??cfy?.epsRevisions?.downLast30days??null,
    주가30일:e.rev?.px?.c30??null,
    주가90일:e.rev?.px?.c90??null,
    강등게이트:e.rev?.gate?.d30??null,
    현재가소스:`${provider} financialData.currentPrice | ${quoteSource}`,
    TP소스:`${provider} financialData.targetMeanPrice | ${quoteSource}`,
    EPS소스:`${provider} earningsTrend(+1y).epsTrend | ${quoteSource}`,
    상향하향소스:`${provider} earningsTrend(+1y).epsRevisions | ${quoteSource}`,
    주가30일90일소스:chartSource,
    강등게이트소스:'계산값 = 주가30일 변화율 - FY+1 EPS 30일 리비전율',
    원천데이터:rawSource
  };
  rows.push(row);
}

const headers=Object.keys(rows[0]||{});
const csv='\uFEFF'+headers.map(esc).join(',')+'\n'+rows.map(r=>headers.map(h=>esc(r[h])).join(',')).join('\n')+'\n';
fs.writeFileSync(OUT_CSV,csv);
fs.writeFileSync(OUT_JSON,JSON.stringify({schema:'revision-report-v2',generatedAt:new Date().toISOString(),currentRun:curRun.retrievedAt||null,previousRun:prevRun?.retrievedAt||null,rows},null,2)+'\n');
console.log(`revision report: ${rows.length} rows -> ${OUT_CSV}, ${OUT_JSON}`);
