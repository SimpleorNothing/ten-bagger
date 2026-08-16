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
  APH:'앰페놀','005930':'삼성전자',VRT:'버티브','000660':'SK하이닉스',BE:'블룸에너지',AMD:'AMD',TSLA:'테슬라',
  PLTR:'Palantir',ALAB:'Astera Labs',CBRS:'Cerebras',SNDK:'SanDisk','009150':'삼성전기','353200':'대덕전자',
  '471990':'KODEX AI반도체핵심장비','089030':'테크윙','0522':'ASMPT',SMCI:'Supermicro',COHR:'Coherent',
  '0173Y0':'KODEX 미국AI광통신네트워크',VICR:'Vicor',OKLO:'Oklo',TER:'테라다인'
};

function loadSnap(ref){
  if(!ref||!fs.existsSync(ref))return null;
  try{return readJson(ref);}catch{return null;}
}
function fy0(s){return s?.earningsTrend?.fy0||null;}
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
  const cfy0=fy0(cur),cfy1=fy1(cur),pfy1=fy1(prev);
  const tpNow=r2(cur?.financialData?.targetMeanPrice ?? e.target);
  const tpPrev=r2(prev?.financialData?.targetMeanPrice);
  const epsCurrentYear=r2(cfy0?.epsTrend?.current);
  const epsNextYear=r2(cfy1?.epsTrend?.current);
  const epsPrevRun=r2(pfy1?.epsTrend?.current);
  const eps30Ago=r2(cfy1?.epsTrend?.['30daysAgo']);
  const eps90Ago=r2(cfy1?.epsTrend?.['90daysAgo']);
  const upd=cur?.retrievedAt||curMap.get(tk)?.retrievedAt||e.rev?.provenance?.retrievedAt||g.asOf||'';
  const provider=cur?.provider||e.rev?.provenance?.provider||'';
  const quoteSource=sourceUrl(cur)||e.rev?.provenance?.sourceUrl||'';
  const chartSource='Yahoo Finance chart API → charts.json';
  const rawSource=curRef;
  const sem=e.rev?.epsSemantics||{};
  const quality=e.rev?.quality||{};
  const epsEligible=sem.scoringEligible===true;
  const row={
    종목:NAMES[tk]||tk,
    티커:tk,
    업데이트시점:upd,
    데이터검증상태:quality.status||'미검증',
    현재가검증:quality.fields?.price||'미검증',
    TP검증:quality.fields?.tp||'미검증',
    EPS검증:quality.fields?.eps||'미검증',
    검증경고:[...(quality.warnings||[]),...(quality.blocking||[])].join(' | '),
    목표가:tpNow,
    TP이전값:tpPrev,
    TP현재값:tpNow,
    TP리비전변화율:pct(tpNow,tpPrev),
    TP리비전7일:e.rev?.tp?.c7??null,
    TP리비전30일:e.rev?.tp?.c30??null,
    EPS정의:'Yahoo Finance quoteSummary: 0y=Current Year, +1y=Next Year. 달력연도는 기간 검증 통과 시에만 사용',
    EPS현재연도값:epsCurrentYear,
    EPS다음연도값:epsNextYear,
    EPS다음연도30일전:eps30Ago,
    EPS다음연도90일전:eps90Ago,
    EPS원기간현재연도종료일:cfy0?.endDate||null,
    EPS원기간다음연도종료일:cfy1?.endDate||null,
    EPS기간검증:sem.periodState||'미검증',
    EPS표시연도:sem.displayYear??null,
    EPS스코어사용여부:epsEligible?'사용':'제외',
    EPS직전수집값:epsPrevRun,
    EPS현재수집값:epsNextYear,
    EPS수집간변화율:pct(epsNextYear,epsPrevRun),
    EPS리비전30일:epsEligible?(e.rev?.eps?.fy1?.c30??cfy1?.epsRevisionPct?.d30??null):null,
    EPS리비전90일:epsEligible?(e.rev?.eps?.fy1?.c90??cfy1?.epsRevisionPct?.d90??null):null,
    EPS리비전30일원자료:cfy1?.epsRevisionPct?.d30??null,
    EPS리비전90일원자료:cfy1?.epsRevisionPct?.d90??null,
    상향30일:epsEligible?(e.rev?.eps?.fy1?.up30??cfy1?.epsRevisions?.upLast30days??null):null,
    하향30일:epsEligible?(e.rev?.eps?.fy1?.dn30??cfy1?.epsRevisions?.downLast30days??null):null,
    주가30일:e.rev?.px?.c30??null,
    주가90일:e.rev?.px?.c90??null,
    강등게이트:epsEligible?(e.rev?.gate?.d30??null):null,
    현재가소스:`${provider} financialData.currentPrice | ${quoteSource}`,
    TP소스:`${provider} financialData.targetMeanPrice | ${quoteSource}`,
    EPS소스:`${provider} earningsTrend.trend period=0y/+1y | ${quoteSource}`,
    상향하향소스:`${provider} earningsTrend(+1y).epsRevisions | ${quoteSource}`,
    주가30일90일소스:chartSource,
    강등게이트소스:'계산값 = 주가30일 변화율 - 검증된 Next Year EPS 30일 리비전율',
    원천데이터:rawSource
  };
  rows.push(row);
}

const headers=Object.keys(rows[0]||{});
const csv='\uFEFF'+headers.map(esc).join(',')+'\n'+rows.map(r=>headers.map(h=>esc(r[h])).join(',')).join('\n')+'\n';
fs.writeFileSync(OUT_CSV,csv);
fs.writeFileSync(OUT_JSON,JSON.stringify({schema:'revision-report-v3',generatedAt:new Date().toISOString(),currentRun:curRun.retrievedAt||null,previousRun:prevRun?.retrievedAt||null,integrity:g.revisionIntegrity||null,rows},null,2)+'\n');
console.log(`revision report: ${rows.length} rows -> ${OUT_CSV}, ${OUT_JSON}`);
